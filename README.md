# 🗺️ Crime Hotspot Visualization

> An academic full-stack GIS platform for automated detection, visualization, and analysis of Chicago crime hotspots using DBSCAN spatial clustering, an interactive React Leaflet map, and a Node.js REST API data pipeline.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture & Workflow](#-architecture--workflow)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Dataset Details](#-dataset-details)
- [Backend REST API](#-backend-rest-api)
- [Python Clustering Service](#-python-clustering-service)
- [Frontend Dashboard](#-frontend-dashboard)
- [Installation & Setup](#-installation--setup)
- [Running the Project](#-running-the-project)
- [API Reference](#-api-reference)
- [Academic Methodology](#-academic-methodology)

---

## 📖 Project Overview

This project implements a complete **"Crime Hotspot Visualization"** system as part of an academic GIS and data analytics study. The platform integrates three independently running services:

1. **Python Data Cleaning Pipeline** — Processes raw Chicago Crime and US Census data into lightweight, geographically-focused datasets.
2. **Node.js REST API** — Serves cleaned crime records over HTTP with type filtering capabilities.
3. **Python DBSCAN Clustering Microservice** — Applies spatial clustering algorithms to automatically detect and characterize crime hotspot zones.
4. **React + Vite Frontend Dashboard** — An interactive GIS dashboard featuring an animated heatmap, colored cluster zones, KPI metric cards, advanced filtering, and analytical charts.

---

## 🔄 Architecture & Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PROJECT WORKFLOW                                     │
└─────────────────────────────────────────────────────────────────────────┘

PHASE 1 — DATA ENGINEERING (clean_data.py)
────────────────────────────────────────────────────────────────
  chicago_crime.csv (raw 1.78 GB)
      │
      ├─► DBSCAN-ready spatial stratified sampling
      │       • Filter geographic bounds: Chicago bbox [41.64-42.03, -87.85 to -87.52]
      │       • Drop rows missing Latitude, Longitude, Primary Type
      │       • Drop duplicate IDs
      │       • Geographically stratified sample → 8,000 rows
      │
      └─► data/cleaned/crime_cleaned.csv ✓

  us_census.csv (raw 74,001 tracts)
      │
      ├─► Filter to Cook County, Illinois (1,319 tracts)
      │       • Median imputation for missing economic indicators
      │       • Drop rows missing TotalPop
      │
      └─► data/cleaned/demographic_cleaned.csv ✓


PHASE 2 — BACKEND REST API (backend/server.js) — Port 5000
────────────────────────────────────────────────────────────────
  data/cleaned/crime_cleaned.csv
      │
      ├─► Loaded into in-memory cache on startup
      │       • Streaming CSV parser (csv-parser)
      │       • Type casting: Floats, Integers, Booleans
      │
      └─► REST Endpoints:
              GET /api/crimes                  → All 8,000 records
              GET /api/crimes?type=THEFT       → Filtered by type
              GET /api/crimes/types            → Unique categories
              GET /api/stats/types             → Frequency counts


PHASE 3 — DBSCAN CLUSTERING SERVICE (clustering_service.py) — Port 5001
────────────────────────────────────────────────────────────────
  data/cleaned/crime_cleaned.csv
      │
      ├─► DBSCAN Algorithm (scikit-learn)
      │       • metric: haversine (geographically accurate)
      │       • epsilon: 0.5km radius (500m neighborhood)
      │       • min_samples: 10 crimes per hotspot
      │       • Noise points filtered out
      │
      ├─► Cluster Metadata (per zone):
      │       • Centroid lat/lon
      │       • Zone boundary radius (km)
      │       • Crime count, top crime type
      │       • Dominant police district
      │
      └─► REST Endpoints:
              GET /api/clusters                → All hotspot zones
              GET /api/clusters/summary        → Global analytics


PHASE 4 — REACT GIS DASHBOARD (frontend/) — Port 5173
────────────────────────────────────────────────────────────────
  ┌──────────────────────────────────────────────┐
  │         http://localhost:5000                │  ←── Crime Data
  │         http://localhost:5001                │  ←── DBSCAN Clusters
  └──────────────────────────────────────────────┘
              │
              ▼
  ┌──────────────────────────────────────────────────────────┐
  │                   REACT DASHBOARD                        │
  │                                                          │
  │  ┌────────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐  │
  │  │  KPI Cards │  │  Filter  │  │Leaflet   │  │Chart │  │
  │  │  (5 KPIs)  │  │  Panel   │  │ Map      │  │ Bar  │  │
  │  └────────────┘  └──────────┘  └──────────┘  └──────┘  │
  │                                                          │
  │  Map Modes:                                              │
  │    ● Individual Markers (color-coded by severity)        │
  │    ● Density Heatmap (leaflet.heat Canvas layer)         │
  │    ● DBSCAN Cluster Zones (boundary circles + centroids) │
  │                                                          │
  │  Analytics Panel:                                        │
  │    ● Most dangerous hotspot zones (ranked)               │
  │    ● Crime type distribution bars                        │
  │    ● Cluster coverage & noise statistics                 │
  │    ● Key insights (most dangerous area / crime type)     │
  └──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Data Engineering** | Python 3.x, Pandas, NumPy | Dataset cleaning, filtering, stratified sampling |
| **Spatial Clustering** | scikit-learn DBSCAN, SciPy | Automated hotspot detection with haversine metric |
| **Clustering API** | Flask, Flask-CORS | Expose cluster results over HTTP |
| **Crime Data API** | Node.js, Express, csv-parser | Fast in-memory crime data serving |
| **Frontend Framework** | React 19, Vite 8 | Component-based SPA with HMR |
| **GIS Mapping** | React Leaflet, Leaflet.js | Interactive map tiles and vector layers |
| **Heatmap Engine** | leaflet.heat | GPU-accelerated Canvas density rendering |
| **Analytics Charts** | Chart.js, react-chartjs-2 | Responsive statistical bar charts |
| **HTTP Client** | Axios | REST API consumption with timeout handling |
| **UI Icons** | Lucide React | Premium SVG icon set |
| **Styling** | Vanilla CSS, CSS Variables | Glassmorphism dark-theme design system |

---

## 📂 Project Structure

```
crime-hotspot/
│
├── clean_data.py                   # Data engineering pipeline (run once)
├── clustering_service.py           # Python DBSCAN Flask microservice (port 5001)
├── cleaning_report.md              # Auto-generated data cleaning report
│
├── data/
│   ├── raw/
│   │   ├── chicago_crime.csv       # Raw crime dataset (Git LFS pointer / full CSV)
│   │   └── us_census.csv           # Raw US Census 2017 ACS data
│   └── cleaned/
│       ├── crime_cleaned.csv       # 8,000-row stratified crime sample
│       └── demographic_cleaned.csv # 1,319 Cook County census tracts
│
├── backend/                        # Node.js Express REST API (port 5000)
│   ├── server.js                   # Express app entry point
│   ├── routes/
│   │   └── crimeRoutes.js          # API endpoint definitions
│   ├── controllers/
│   │   └── crimeController.js      # CSV loading, caching, filtering
│   ├── data/
│   │   └── crime_cleaned.csv       # Copy of the cleaned crime dataset
│   └── package.json
│
└── frontend/                       # React + Vite dashboard (port 5173)
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx           # Header + live API connectivity status
    │   │   ├── StatCard.jsx         # Glassmorphic KPI metric card
    │   │   ├── CrimeMap.jsx         # Leaflet map (Markers / Heatmap / DBSCAN)
    │   │   ├── CrimeChart.jsx       # ChartJS bar chart
    │   │   └── AnalyticsPanel.jsx   # DBSCAN intelligence + distribution stats
    │   ├── pages/
    │   │   └── Dashboard.jsx        # Main dashboard page + filter orchestration
    │   ├── services/
    │   │   └── api.js               # Axios clients for port 5000 and 5001
    │   ├── App.jsx
    │   └── index.css                # Design tokens, glassmorphism, typography
    ├── package.json
    └── vite.config.js
```

---

## 📊 Dataset Details

### Chicago Crime Dataset (`crime_cleaned.csv`)
| Attribute | Value |
|---|---|
| **Source** | Chicago Data Portal (City of Chicago) |
| **Raw Size** | ~1.78 GB / ~7,000,000 records |
| **Cleaned Size** | 8,000 records |
| **Sampling Method** | Geographically Stratified (by Police District) |
| **Geographic Bounds** | Latitude [41.64°, 42.03°] · Longitude [-87.85°, -87.52°] |

**Retained Columns:**
| Column | Type | Description |
|---|---|---|
| `ID` | Integer | Unique crime event identifier |
| `Case Number` | String | Case tracking reference |
| `Date` | DateTime | Timestamp of occurrence |
| `Primary Type` | String | Crime category (THEFT, BATTERY, etc.) |
| `Latitude` | Float | Geographic coordinate Y |
| `Longitude` | Float | Geographic coordinate X |
| `District` | Integer | Chicago Police District (1–25) |
| `Arrest` | Boolean | Whether an arrest was made |
| `Domestic` | Boolean | Whether incident was domestic |

### US Census Dataset (`demographic_cleaned.csv`)
| Attribute | Value |
|---|---|
| **Source** | US Census Bureau – ACS 2017 |
| **Raw Size** | 74,001 census tracts (nationwide) |
| **Filtered Size** | 1,319 tracts (Cook County, Illinois only) |

**Retained Columns:** `TractId`, `State`, `County`, `TotalPop`, `Income`, `IncomePerCap`, `Professional`, `Unemployment`

---

## 🌐 Backend REST API

**Server:** `http://localhost:5000`

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/` | Health check + endpoint listing | JSON object |
| `GET` | `/api/crimes` | Returns all 8,000 crime records | JSON array |
| `GET` | `/api/crimes?type=THEFT` | Filter by crime category (case-insensitive) | JSON array |
| `GET` | `/api/crimes/types` | Returns sorted unique crime categories | JSON array of strings |
| `GET` | `/api/stats/types` | Crime counts grouped by category | JSON key-value pairs |

**Design highlights:**
- Streams and parses the CSV once at startup using `csv-parser`
- Caches all 8,000 records in-memory for sub-millisecond response times
- Proper type casting: `Latitude`/`Longitude` → Float, `District` → Integer, `Arrest`/`Domestic` → Boolean

---

## 🔬 Python Clustering Service

**Server:** `http://localhost:5001`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service health check |
| `GET` | `/api/clusters` | All DBSCAN-detected hotspot zones with boundaries and metadata |
| `GET` | `/api/clusters/summary` | Global analytics summary |

**DBSCAN Parameters:**
| Parameter | Value | Reasoning |
|---|---|---|
| `eps` | 0.5 km (converted to radians) | A 500-metre radius captures meaningful geographic crime clusters |
| `min_samples` | 10 | Minimum 10 incidents required to define a hotspot zone |
| `metric` | `haversine` | Geodesically accurate spherical distance calculation |
| `algorithm` | `ball_tree` | Efficient BallTree index for spatial datasets |

**Cluster output per zone:**
- Geographic centroid (lat/lon)
- Zone boundary radius (km)
- Total crime count within zone
- Most common crime type
- Dominant police district
- Per-type crime frequency breakdown
- Assigned display color from a 16-color palette

---

## 🎨 Frontend Dashboard

**Development server:** `http://localhost:5173`

### Features

| Feature | Description |
|---|---|
| **5 KPI Cards** | Total crimes, categories, districts, top crime, DBSCAN hotspot count |
| **Advanced Filters** | Real-time text search, type dropdown, district dropdown |
| **Interactive Leaflet Map** | 3 switchable view modes with floating toggle controls |
| **Individual Markers** | Color-coded by severity (Red → Homicide, Orange → Violent, Yellow → Property, Blue → Other) |
| **Density Heatmap** | Canvas-rendered `leaflet.heat` layer with custom blue-to-crimson gradient |
| **DBSCAN Hotspot Zones** | Dashed boundary circles + centroid markers with interactive popups |
| **Analytics Intelligence Panel** | Most dangerous zones ranked, crime distribution bars, key insight cards |
| **ChartJS Bar Chart** | Dynamic frequency analysis synchronized with active filters |

### Map Toggle Modes

```
┌─────────────────────────────────────────────┐
│  [ Individual Markers ] [ Density Heatmap ] [ DBSCAN Hotspots ] │
└─────────────────────────────────────────────┘
```

---

## ⚙️ Installation & Setup

### Prerequisites

- **Node.js** ≥ 18.x
- **Python** ≥ 3.9
- **npm** ≥ 9.x
- **pip** ≥ 23.x

### Step 1 — Clone and prepare data

```bash
git clone <repository-url>
cd crime-hotspot

# Run the data cleaning pipeline (generates data/cleaned/*.csv)
python clean_data.py
```

### Step 2 — Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### Step 3 — Install frontend dependencies

```bash
cd frontend
npm install --legacy-peer-deps
cd ..
```

### Step 4 — Install Python clustering dependencies

```bash
pip install scikit-learn numpy pandas flask flask-cors
```

---

## 🚀 Running the Project

You need **three terminals** running simultaneously:

### Terminal 1 — Node.js REST API (Port 5000)

```bash
cd backend
node server.js
```

Expected output:
```
==================================================
  CRIME HOTSPOT BACKEND STARTED SUCCESSFULLY!
  Server running at: http://localhost:5000
==================================================
[+] Loaded 8000 crime records into cache successfully!
```

### Terminal 2 — Python DBSCAN Clustering Service (Port 5001)

```bash
python clustering_service.py
```

Expected output:
```
====================================================
  CRIME HOTSPOT CLUSTERING SERVICE STARTING...
  Clustering microservice running at: http://localhost:5001
====================================================
[+] Running DBSCAN clustering on crime coordinates...
[+] Clustering complete! Detected 12 crime hotspot zones.
 * Running on http://127.0.0.1:5001
```

### Terminal 3 — React Vite Frontend (Port 5173)

```bash
cd frontend
npm run dev
```

Then open your browser at **`http://localhost:5173`**.

---

## 📡 API Reference

### Crime API Examples (Port 5000)

```bash
# All crimes
curl http://localhost:5000/api/crimes

# Filter by crime type
curl "http://localhost:5000/api/crimes?type=HOMICIDE"

# Unique crime categories
curl http://localhost:5000/api/crimes/types

# Crime frequency statistics
curl http://localhost:5000/api/stats/types
```

### Clustering API Examples (Port 5001)

```bash
# All DBSCAN hotspot zones
curl http://localhost:5001/api/clusters

# Analytics summary
curl http://localhost:5001/api/clusters/summary
```

---

## 🎓 Academic Methodology

### DBSCAN Spatial Clustering

**Density-Based Spatial Clustering of Applications with Noise (DBSCAN)** was selected over K-Means for this project due to three key advantages in geographic crime analysis:

1. **No fixed cluster count** — DBSCAN automatically discovers the number of hotspot zones from the data density, unlike K-Means which requires pre-specifying K.
2. **Noise isolation** — Crime points that don't belong to any dense cluster are classified as **noise**, preventing isolated incidents from distorting results.
3. **Non-spherical clusters** — DBSCAN correctly identifies organically shaped geographic zones along roads and neighborhood boundaries, whereas K-Means forces circular clusters.

### Haversine Distance Metric

The `haversine` distance metric is used to calculate the **actual geographic distance** between two coordinate pairs on Earth's curved surface, ensuring that the 500m neighbourhood radius (`eps`) is physically accurate at Chicago's latitude (~41.9°N) rather than relying on an approximation from Euclidean distance.

### Geographic Stratified Sampling

The 8,000-record crime sample was drawn using **proportional stratified sampling by Police District** to ensure that each geographic zone of Chicago is represented proportionally to its actual crime frequency. This prevents over- or under-representation of specific neighborhoods in the visualization.

---

## 📄 License

This project was created for academic research purposes. Data sourced from the [Chicago Data Portal](https://data.cityofchicago.org/) (public domain) and the [US Census Bureau ACS 2017](https://www.census.gov/) (public domain).
