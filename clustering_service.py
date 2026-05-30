#!/usr/bin/env python3
"""
clustering_service.py
A lightweight Flask microservice that performs DBSCAN clustering on
Chicago crime coordinates and exposes hotspot results via a REST API.

Runs on port 5001 (separate from the Express backend on port 5000).
"""

import os
import json
import math
import numpy as np
import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the React frontend

CSV_PATH = os.path.join("backend", "data", "crime_cleaned.csv")

# Cluster color palette (distinct colors per cluster)
CLUSTER_COLORS = [
    "#f43f5e",  # Rose
    "#3b82f6",  # Blue
    "#10b981",  # Emerald
    "#f59e0b",  # Amber
    "#8b5cf6",  # Violet
    "#06b6d4",  # Cyan
    "#ec4899",  # Pink
    "#84cc16",  # Lime
    "#ef4444",  # Red
    "#6366f1",  # Indigo
    "#14b8a6",  # Teal
    "#f97316",  # Orange
    "#a855f7",  # Purple
    "#22c55e",  # Green
    "#eab308",  # Yellow
    "#0ea5e9",  # Sky
]


def haversine_km(lat1, lon1, lat2, lon2):
    """Computes the great-circle distance in km between two geographic points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def load_and_cluster():
    """
    Reads the cleaned crime CSV, runs DBSCAN clustering on lat/lon coordinates,
    and returns structured hotspot metadata.
    """
    df = pd.read_csv(CSV_PATH)
    df = df.dropna(subset=["Latitude", "Longitude"])
    coords = df[["Latitude", "Longitude"]].values

    # DBSCAN with haversine metric for geographically accurate distance computation
    # epsilon = 0.5 km radius, min_samples = 10 crimes to form a hotspot
    db = DBSCAN(
        eps=0.5 / 6371.0,  # Convert 500m to radians for haversine
        min_samples=10,
        algorithm="ball_tree",
        metric="haversine",
    ).fit(np.radians(coords))  # haversine needs radians

    labels = db.labels_
    df = df.copy()
    df["cluster"] = labels

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    noise_count = int((labels == -1).sum())

    clusters = []
    for cluster_id in sorted(set(labels)):
        if cluster_id == -1:
            continue  # Skip noise points

        subset = df[df["cluster"] == cluster_id]
        center_lat = float(subset["Latitude"].mean())
        center_lon = float(subset["Longitude"].mean())

        # Compute radius as max great-circle distance from centroid to any member
        radius_km = 0.0
        for _, row in subset.iterrows():
            d = haversine_km(center_lat, center_lon, row["Latitude"], row["Longitude"])
            if d > radius_km:
                radius_km = d

        # Crime type breakdown within this cluster
        type_counts = subset["Primary Type"].value_counts().to_dict() if "Primary Type" in subset.columns else \
                      subset["PrimaryType"].value_counts().to_dict() if "PrimaryType" in subset.columns else {}
        
        top_type = max(type_counts, key=type_counts.get) if type_counts else "UNKNOWN"
        
        # District distribution inside cluster
        district_col = "District" if "District" in subset.columns else None
        districts = subset[district_col].dropna().astype(int).tolist() if district_col else []
        dominant_district = max(set(districts), key=districts.count) if districts else None

        clusters.append({
            "id": int(cluster_id),
            "color": CLUSTER_COLORS[cluster_id % len(CLUSTER_COLORS)],
            "center": {"lat": center_lat, "lon": center_lon},
            "radius_km": round(max(radius_km, 0.15), 3),  # Minimum visual radius 150m
            "crime_count": int(len(subset)),
            "top_crime_type": top_type,
            "crime_types": type_counts,
            "dominant_district": int(dominant_district) if dominant_district else None,
        })

    # Sort by crime count descending (most dangerous first)
    clusters.sort(key=lambda x: x["crime_count"], reverse=True)

    # --- Global analytics ---
    all_type_counts = df[df["cluster"] != -1]["Primary Type"].value_counts() \
        if "Primary Type" in df.columns else df[df["cluster"] != -1]["PrimaryType"].value_counts()

    most_common_type = str(all_type_counts.index[0]) if len(all_type_counts) > 0 else "N/A"
    most_common_count = int(all_type_counts.iloc[0]) if len(all_type_counts) > 0 else 0

    total_clustered = int((labels != -1).sum())
    total_points = len(df)

    return {
        "clusters": clusters,
        "summary": {
            "total_clusters": n_clusters,
            "total_crimes_analyzed": total_points,
            "total_clustered_crimes": total_clustered,
            "noise_points": noise_count,
            "cluster_coverage_pct": round((total_clustered / total_points) * 100, 1),
            "most_common_crime": most_common_type,
            "most_common_crime_count": most_common_count,
            "most_dangerous_area": f"District {clusters[0]['dominant_district']}" if clusters and clusters[0]["dominant_district"] else "Unknown",
            "most_dangerous_cluster_id": clusters[0]["id"] if clusters else None,
            "type_distribution": all_type_counts.to_dict() if len(all_type_counts) > 0 else {},
        },
    }


# ── Cache the result in memory so subsequent calls are instant ──────────────
_cached_result = None

def get_cached_clusters():
    global _cached_result
    if _cached_result is None:
        print("[+] Running DBSCAN clustering on crime coordinates...")
        _cached_result = load_and_cluster()
        n = _cached_result["summary"]["total_clusters"]
        print(f"[+] Clustering complete! Detected {n} crime hotspot zones.")
    return _cached_result


@app.route("/")
def health():
    return jsonify({
        "service": "Crime Hotspot DBSCAN Clustering Service",
        "status": "online",
        "port": 5001,
        "endpoints": {
            "clusters": "/api/clusters",
            "summary": "/api/clusters/summary",
        },
    })


@app.route("/api/clusters")
def get_clusters():
    """Returns all DBSCAN-detected crime hotspot clusters with their centers, radii, and metadata."""
    try:
        data = get_cached_clusters()
        return jsonify({"success": True, "data": data["clusters"], "count": len(data["clusters"])})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/clusters/summary")
def get_summary():
    """Returns a high-level summary of the clustering analysis for the analytics panel."""
    try:
        data = get_cached_clusters()
        return jsonify({"success": True, "data": data["summary"]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    print("\n" + "=" * 52)
    print("  CRIME HOTSPOT CLUSTERING SERVICE STARTING...")
    print("  Clustering microservice running at: http://localhost:5001")
    print("=" * 52 + "\n")
    # Pre-warm the cache before accepting requests
    get_cached_clusters()
    app.run(host="0.0.0.0", port=5001, debug=False)
