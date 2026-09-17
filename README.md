# Chicago Crime Hotspot Visualization

Academic GIS dashboard: Chicago Police incidents + ACS demographics, DBSCAN hotspot detection, and an interactive React Leaflet map.

Three services run together:

| Service | Stack | Port |
|---|---|---|
| Crime / census API | Node.js, Express | 5000 |
| DBSCAN clustering | Python, Flask, scikit-learn | 5001 |
| Dashboard | React 19, Vite, Leaflet | 5173 |

---

## What it does

- Cleans the official Chicago Crime extract (comma decimals, Chicago bbox, stratified sample of **8,000** rows from **~8.6M** raw incidents) and Cook County ACS tracts.
- Serves crimes in memory with provenance (`sampled_real` vs `synthetic`) via `GET /api/meta`.
- Runs **DBSCAN (haversine)**: tunable `eps` / `min_samples`, filters by type, district, and year; returns **convex hulls** (not circles).
- Maps four modes: canvas markers, density heatmap, DBSCAN hulls, district sample rates / 10k.
- Socio-spatial KPIs: median income, unemployment, location quotient by police district.

---

## Repository layout

```
crime-hotspot/
├── clean_data.py                 # One-shot cleaning + sampling
├── clustering_service.py         # Flask DBSCAN API
├── cleaning_report.md
├── docker-compose.yml
├── data/raw/                     # chicago_crime.csv, ACS tract CSVs (not committed)
├── data/cleaned/                 # crime_cleaned.csv, demographic_cleaned.csv, data_manifest.json
├── backend/                      # Express REST API
├── frontend/                     # React dashboard
└── tests/                        # pytest clustering + Node geo hull tests
```

---

## Data

| Dataset | Source | After cleaning |
|---|---|---|
| Chicago Crime | [Chicago Data Portal](https://data.cityofchicago.org/Public-Safety/Crimes-2001-to-Present/ijzp-q8t2) | 8,000 rows, stratified by police district |
| ACS 2017 tracts | US Census (file may be named `acs2017_census_tract_data.csv`) | 1,319 Cook County tracts |

Place raw files in `data/raw/`, then:

```bash
python clean_data.py
```

Outputs: `data/cleaned/crime_cleaned.csv`, `demographic_cleaned.csv`, `data_manifest.json`.

---

## Local setup

**Need:** Node.js ≥ 18, Python ≥ 3.9, npm.

```bash
python -m pip install -r requirements.txt
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
npm install
```

Optional map tiles (no watermark): copy `frontend/.env.example` → `frontend/.env` and set `VITE_CARTO_API_KEY`.

**One command** (API + clustering + Vite):

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` → `:5000` and `/cluster-api` → `:5001`.

**Docker** (after `python clean_data.py`):

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

**Tests:**

```bash
python -m pytest tests/test_clustering.py
npm test --prefix backend
```

---

## API (local)

Crime API — `http://localhost:5000`

| Method | Path |
|---|---|
| GET | `/api/crimes`, `/api/crimes?type=THEFT` |
| GET | `/api/crimes/types`, `/api/stats/types` |
| GET | `/api/meta` |
| GET | `/api/demographics/summary` |
| GET | `/api/stats/districts` |

Clustering — `http://localhost:5001`

| Method | Path | Query |
|---|---|---|
| GET | `/api/clusters` | `eps`, `min_samples`, `type`, `district`, `from`, `to` |
| GET | `/api/clusters/summary` | same |

Default DBSCAN: `eps = 0.5 km`, `min_samples = 10`, metric **haversine**.

---

## Deploy (Vercel + APIs)

Vercel hosts the **React frontend only**. Express and Flask (scikit-learn) must run as two always-on services (Render is the usual free pairing). Do not put `chicago_crime.csv` (~2.4 GB) or secrets in Git.

### 1. Push the repo to GitHub

```bash
git add -A
git commit -m "Ready for deployment"
git push origin main
```

Keep `frontend/.env` local. Commit `data/cleaned/*.csv` if the hosts should read them from the repo (they are small). Do **not** commit `data/raw/chicago_crime.csv`.

### 2. Deploy the crime API (Render)

1. [render.com](https://render.com) → **New** → **Web Service** → connect the GitHub repo.
2. Name: `crime-hotspot-api`.
3. **Runtime:** Node.
4. **Root directory:** `backend`.
5. **Build:** `npm install`.
6. **Start:** `node server.js`.
7. **Instance:** Free.
8. Environment:
   - `HOST=0.0.0.0`
   - `PORT` — leave Render’s value (do not force 5000).
   - `CORS_ORIGIN=https://TON-PROJET.vercel.app` (set this **after** step 4, then redeploy).
9. The service must see `data/cleaned/`. Easiest: keep cleaned CSVs in git so the path `../data/cleaned` from `backend/` works on Render **or** set the working directory to the **repo root** and start with `node backend/server.js` after `npm install --prefix backend`.

Recommended Render settings if the CSV is at repo root `data/cleaned/`:

- **Root directory:** empty (repo root)
- **Build:** `npm install --prefix backend`
- **Start:** `node backend/server.js`

Copy the URL, e.g. `https://crime-hotspot-api.onrender.com`.

### 3. Deploy clustering (Render)

1. **New Web Service** from the same repo.
2. Name: `crime-hotspot-cluster`.
3. **Runtime:** Python 3.
4. **Root directory:** empty (repo root).
5. **Build:** `pip install -r requirements.txt`.
6. **Start:** `python clustering_service.py`.
7. Environment:
   - `HOST=0.0.0.0`
   - `PORT` — Render injects this; the script already reads `PORT`.
   - `CORS_ORIGIN=https://TON-PROJET.vercel.app` (after step 4).
8. Copy the URL, e.g. `https://crime-hotspot-cluster.onrender.com`.

Free Render services sleep after inactivity; the first dashboard load can take ~30–60 s.

### 4. Deploy the dashboard (Vercel)

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the GitHub repo.
2. **Framework preset:** Vite.
3. **Root Directory:** `frontend` (Edit → `frontend`).
4. **Build command:** `npm run build` (default).
5. **Output directory:** `dist` (default).
6. **Environment variables** (Production):

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://crime-hotspot-api.onrender.com` (no trailing slash) |
| `VITE_CLUSTER_API_URL` | `https://crime-hotspot-cluster.onrender.com` (no trailing slash) |
| `VITE_CARTO_API_KEY` | your CARTO basemap key (optional, avoids the tile watermark) |

These `VITE_*` values are baked in at **build** time. If you change them, click **Redeploy**.

7. Deploy. Copy the URL, e.g. `https://crime-hotspot.vercel.app`.
8. Go back to both Render services, set `CORS_ORIGIN` to that Vercel URL (no trailing slash), **Manual Deploy**.
9. Open the Vercel URL. Confirm the green banner **Sampled official extract** and pills **CRIMES** / **DBSCAN**.

`frontend/vercel.json` already rewrites unknown paths to `index.html`.

### 5. Checklist if the map is empty

- Browser DevTools → Network: `/api/crimes` and `/api/clusters` must be **200**, not CORS errors.
- `VITE_API_URL` / `VITE_CLUSTER_API_URL` must be https URLs of Render, not `localhost`.
- Render logs: CSV found (`Loaded 8000 crime records` / `Clustering service loaded 8000`).
- Redeploy Vercel after any env change.

---

## Methodology (short)

**DBSCAN** is used instead of K-Means: no preset K, noise points, irregular geographic shapes. Distances use **haversine** so `eps` is metres on the globe at ~41.9°N. Hotspot polygons are **convex hulls** of clustered points. The 8,000-row extract is **stratified by CPD district** so neighborhoods stay proportional to the official file.

---

## License

Academic use. Data: [Chicago Data Portal](https://data.cityofchicago.org/) and [US Census ACS](https://www.census.gov/) (public domain).
