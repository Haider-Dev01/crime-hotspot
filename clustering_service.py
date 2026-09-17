#!/usr/bin/env python3
"""
clustering_service.py
Flask microservice: DBSCAN on Chicago crime coordinates with optional
temporal / type / district filters and tunable eps / min_samples.
"""

import json
import math
import os
from collections import OrderedDict

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.cluster import DBSCAN

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

ROOT_DIR = os.environ.get("PROJECT_ROOT", os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT_DIR, "data", "cleaned", "crime_cleaned.csv")
MANIFEST_PATH = os.path.join(ROOT_DIR, "data", "cleaned", "data_manifest.json")

CLUSTER_COLORS = [
    "#f43f5e", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4",
    "#ec4899", "#84cc16", "#ef4444", "#6366f1", "#14b8a6", "#f97316",
    "#a855f7", "#22c55e", "#eab308", "#0ea5e9",
]

_df_cache = None
_result_cache = OrderedDict()
CACHE_LIMIT = 24


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def convex_hull(points):
    """Monotone-chain convex hull. Points are (x, y) tuples; returns hull vertices in order."""
    pts = sorted(set((float(x), float(y)) for x, y in points))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def hull_geojson(lats, lons):
    """GeoJSON polygon [lon, lat] ring for a DBSCAN cluster (or a tiny buffer if degenerate)."""
    coords = list(zip(lons, lats))
    hull = convex_hull(coords)
    if len(hull) < 3:
        lon, lat = float(np.mean(lons)), float(np.mean(lats))
        pad = 0.0015
        hull = [
            (lon - pad, lat - pad),
            (lon + pad, lat - pad),
            (lon + pad, lat + pad),
            (lon - pad, lat + pad),
        ]
    ring = [[round(lon, 6), round(lat, 6)] for lon, lat in hull]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return {"type": "Polygon", "coordinates": [ring]}


def load_crimes_frame():
    global _df_cache
    if _df_cache is None:
        df = pd.read_csv(CSV_PATH)
        df = df.dropna(subset=["Latitude", "Longitude"]).copy()
        date_col = "Date" if "Date" in df.columns else None
        if date_col:
            df["_dt"] = pd.to_datetime(df[date_col], errors="coerce")
        else:
            df["_dt"] = pd.NaT
        type_col = "Primary Type" if "Primary Type" in df.columns else "PrimaryType"
        df["_type"] = df[type_col].astype(str)
        _df_cache = df
        print(f"[+] Clustering service loaded {len(df)} crime rows.")
    return _df_cache


def parse_cluster_params():
    try:
        eps_km = float(request.args.get("eps", 0.5))
    except (TypeError, ValueError):
        eps_km = 0.5
    try:
        min_samples = int(request.args.get("min_samples", 10))
    except (TypeError, ValueError):
        min_samples = 10

    eps_km = min(max(eps_km, 0.15), 5.0)
    min_samples = min(max(min_samples, 3), 80)

    crime_type = (request.args.get("type") or "").strip()
    district = (request.args.get("district") or "").strip()
    date_from = (request.args.get("from") or "").strip()
    date_to = (request.args.get("to") or "").strip()

    return {
        "eps_km": round(eps_km, 3),
        "min_samples": min_samples,
        "type": crime_type.upper() if crime_type else "",
        "district": district,
        "from": date_from,
        "to": date_to,
    }


def filter_frame(df, params):
    subset = df
    if params["type"]:
        subset = subset[subset["_type"].str.upper() == params["type"]]
    if params["district"]:
        subset = subset[subset["District"].astype(str) == str(params["district"])]
    if params["from"]:
        start = pd.to_datetime(params["from"], errors="coerce")
        if pd.notna(start):
            subset = subset[subset["_dt"] >= start]
    if params["to"]:
        end = pd.to_datetime(params["to"], errors="coerce")
        if pd.notna(end):
            end = end + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
            subset = subset[subset["_dt"] <= end]
    return subset


def run_dbscan(df, params):
    empty_summary = {
        "total_clusters": 0,
        "total_crimes_analyzed": int(len(df)),
        "total_clustered_crimes": 0,
        "noise_points": int(len(df)),
        "cluster_coverage_pct": 0.0,
        "most_common_crime": "N/A",
        "most_common_crime_count": 0,
        "most_dangerous_area": "Unknown",
        "most_dangerous_cluster_id": None,
        "type_distribution": {},
        "params": params,
    }

    if len(df) < params["min_samples"]:
        return {"clusters": [], "summary": empty_summary}

    coords = df[["Latitude", "Longitude"]].values
    db = DBSCAN(
        eps=params["eps_km"] / 6371.0,
        min_samples=params["min_samples"],
        algorithm="ball_tree",
        metric="haversine",
    ).fit(np.radians(coords))

    labels = db.labels_
    work = df.copy()
    work["cluster"] = labels

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    noise_count = int((labels == -1).sum())

    clusters = []
    for cluster_id in sorted(set(labels)):
        if cluster_id == -1:
            continue
        subset = work[work["cluster"] == cluster_id]
        center_lat = float(subset["Latitude"].mean())
        center_lon = float(subset["Longitude"].mean())
        radius_km = 0.0
        for _, row in subset.iterrows():
            d = haversine_km(center_lat, center_lon, row["Latitude"], row["Longitude"])
            if d > radius_km:
                radius_km = d

        type_counts = subset["_type"].value_counts().to_dict()
        type_counts = {str(k): int(v) for k, v in type_counts.items()}
        top_type = max(type_counts, key=type_counts.get) if type_counts else "UNKNOWN"

        districts = subset["District"].dropna().astype(int).tolist() if "District" in subset.columns else []
        dominant_district = max(set(districts), key=districts.count) if districts else None

        clusters.append({
            "id": int(cluster_id),
            "color": CLUSTER_COLORS[int(cluster_id) % len(CLUSTER_COLORS)],
            "center": {"lat": center_lat, "lon": center_lon},
            "radius_km": round(max(radius_km, 0.15), 3),
            "hull": hull_geojson(subset["Latitude"].tolist(), subset["Longitude"].tolist()),
            "crime_count": int(len(subset)),
            "top_crime_type": top_type,
            "crime_types": type_counts,
            "dominant_district": int(dominant_district) if dominant_district is not None else None,
        })


    clusters.sort(key=lambda x: x["crime_count"], reverse=True)

    clustered = work[work["cluster"] != -1]
    all_type_counts = clustered["_type"].value_counts() if len(clustered) else pd.Series(dtype=int)
    most_common_type = str(all_type_counts.index[0]) if len(all_type_counts) > 0 else "N/A"
    most_common_count = int(all_type_counts.iloc[0]) if len(all_type_counts) > 0 else 0
    total_clustered = int((labels != -1).sum())
    total_points = len(work)

    return {
        "clusters": clusters,
        "summary": {
            "total_clusters": n_clusters,
            "total_crimes_analyzed": total_points,
            "total_clustered_crimes": total_clustered,
            "noise_points": noise_count,
            "cluster_coverage_pct": round((total_clustered / total_points) * 100, 1) if total_points else 0.0,
            "most_common_crime": most_common_type,
            "most_common_crime_count": most_common_count,
            "most_dangerous_area": (
                f"District {clusters[0]['dominant_district']}"
                if clusters and clusters[0]["dominant_district"] is not None
                else "Unknown"
            ),
            "most_dangerous_cluster_id": clusters[0]["id"] if clusters else None,
            "type_distribution": {str(k): int(v) for k, v in all_type_counts.to_dict().items()},
            "params": params,
        },
    }


def get_clusters_for_request():
    params = parse_cluster_params()
    cache_key = tuple(params.items())
    if cache_key in _result_cache:
        return _result_cache[cache_key]

    df = filter_frame(load_crimes_frame(), params)
    print(
        f"[+] DBSCAN eps={params['eps_km']}km min_samples={params['min_samples']} "
        f"n={len(df)} type={params['type'] or '*'} district={params['district'] or '*'}"
    )
    result = run_dbscan(df, params)
    _result_cache[cache_key] = result
    if len(_result_cache) > CACHE_LIMIT:
        _result_cache.popitem(last=False)
    return result


def as_bool(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "t", "yes"}


def serialize_crime(row):
    case = row.get("Case Number", row.get("CaseNumber"))
    date_val = row.get("Date")
    if hasattr(date_val, "strftime"):
        date_val = date_val.strftime("%Y-%m-%d %H:%M:%S")
    elif date_val is not None and not isinstance(date_val, str):
        date_val = str(date_val)
    district = row.get("District")
    crime_id = row.get("ID")
    return {
        "ID": None if pd.isna(crime_id) else int(crime_id),
        "CaseNumber": None if pd.isna(case) else str(case),
        "Date": None if date_val in (None, "NaT") or (isinstance(date_val, float) and pd.isna(date_val)) else str(date_val),
        "PrimaryType": None if pd.isna(row.get("_type")) else str(row.get("_type")),
        "Latitude": None if pd.isna(row.get("Latitude")) else float(row.get("Latitude")),
        "Longitude": None if pd.isna(row.get("Longitude")) else float(row.get("Longitude")),
        "District": None if pd.isna(district) else int(district),
        "Arrest": as_bool(row.get("Arrest", False)),
        "Domestic": as_bool(row.get("Domestic", False)),
    }


@app.route("/")
def health():
    return jsonify({
        "service": "Crime Hotspot DBSCAN Clustering Service",
        "status": "online",
        "port": int(os.environ.get("PORT", "5001")),
        "endpoints": {
            "crimes": "/api/crimes",
            "crimeTypes": "/api/crimes/types",
            "meta": "/api/meta",
            "clusters": "/api/clusters",
            "summary": "/api/clusters/summary",
        },
        "query_params": ["eps", "min_samples", "type", "district", "from", "to"],
    })


@app.route("/api/crimes")
def api_crimes():
    try:
        df = load_crimes_frame()
        crime_type = (request.args.get("type") or "").strip()
        if crime_type:
            df = df[df["_type"].str.upper() == crime_type.upper()]
        data = [serialize_crime(row) for row in df.to_dict("records")]
        return jsonify({"success": True, "count": len(data), "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/crimes/types")
def api_crime_types():
    try:
        types = sorted({str(t) for t in load_crimes_frame()["_type"].dropna().unique() if str(t)})
        return jsonify({"success": True, "count": len(types), "data": types})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/meta")
def api_meta():
    meta = {"crime_source": "unknown", "is_synthetic": False}
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            meta.update(json.load(f))
        meta["is_synthetic"] = meta.get("crime_source") == "synthetic"
        meta["census_tracts"] = meta.get("census_rows")
    return jsonify({"success": True, "data": meta})


@app.route("/api/clusters")
def get_clusters():
    try:
        data = get_clusters_for_request()
        return jsonify({
            "success": True,
            "data": data["clusters"],
            "count": len(data["clusters"]),
            "params": data["summary"].get("params"),
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/clusters/summary")
def get_summary():
    try:
        data = get_clusters_for_request()
        return jsonify({"success": True, "data": data["summary"]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    print("\n" + "=" * 52)
    print("  CRIME HOTSPOT CLUSTERING SERVICE STARTING...")
    print("  Clustering microservice running at: http://localhost:5001")
    print("=" * 52 + "\n")
    load_crimes_frame()
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5001"))
    app.run(host=host, port=port, debug=False)
