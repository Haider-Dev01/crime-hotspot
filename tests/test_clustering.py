import numpy as np
import pandas as pd

from clustering_service import convex_hull, filter_frame, hull_geojson, run_dbscan


def test_convex_hull_square_corners():
    pts = [(0, 0), (1, 0), (1, 1), (0, 1), (0.5, 0.5)]
    hull = convex_hull(pts)
    assert len(hull) == 4


def test_hull_geojson_is_closed_polygon():
    geom = hull_geojson([41.87, 41.87, 41.89, 41.89], [-87.64, -87.62, -87.62, -87.64])
    assert geom["type"] == "Polygon"
    ring = geom["coordinates"][0]
    assert ring[0] == ring[-1]
    assert all(len(pair) == 2 for pair in ring)


def test_filter_frame_type_and_year():
    df = pd.DataFrame({
        "Latitude": [41.88, 41.89],
        "Longitude": [-87.63, -87.64],
        "District": [1, 2],
        "_type": ["THEFT", "BATTERY"],
        "_dt": pd.to_datetime(["2020-03-01", "2023-06-01"]),
    })
    filtered = filter_frame(df, {
        "type": "THEFT",
        "district": "",
        "from": "2020-01-01",
        "to": "2020-12-31",
        "eps_km": 0.5,
        "min_samples": 3,
    })
    assert len(filtered) == 1
    assert filtered.iloc[0]["_type"] == "THEFT"


def test_dbscan_finds_dense_cluster_and_noise():
    rng = np.random.default_rng(0)
    dense = rng.normal(loc=[41.88, -87.63], scale=0.0004, size=(40, 2))
    noise = np.array([[41.99, -87.80], [41.65, -87.53]])
    coords = np.vstack([dense, noise])
    df = pd.DataFrame({
        "Latitude": coords[:, 0],
        "Longitude": coords[:, 1],
        "District": [1] * len(coords),
        "_type": ["THEFT"] * len(coords),
    })
    result = run_dbscan(df, {"eps_km": 0.3, "min_samples": 8})
    assert result["summary"]["total_clusters"] >= 1
    assert result["summary"]["noise_points"] >= 1
    assert result["clusters"][0]["hull"]["type"] == "Polygon"
    assert result["clusters"][0]["crime_count"] >= 8
