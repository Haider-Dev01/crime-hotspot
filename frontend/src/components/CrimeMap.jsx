import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Layers, Eye, Target, Landmark } from 'lucide-react';

// ── Heatmap Layer (leaflet.heat) ────────────────────────────────────────────
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !points || points.length === 0) return;
    const heatPoints = points
      .filter((p) => p.Latitude && p.Longitude)
      .map((p) => [p.Latitude, p.Longitude, 0.6]);
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 18, blur: 13, maxZoom: 16, max: 1.0,
      gradient: { 0.3: 'blue', 0.5: 'cyan', 0.7: 'lime', 0.9: 'yellow', 1.0: '#f43f5e' },
    });
    heatLayer.addTo(map);
    return () => { if (map && heatLayer) map.removeLayer(heatLayer); };
  }, [map, points]);
  return null;
};

// ── Map view updater ────────────────────────────────────────────────────────
const MapUpdater = ({ center }) => {
  const map = useMap();
  const didFit = React.useRef(false);
  useEffect(() => {
    if (center && !didFit.current) {
      map.setView(center, 11, { animate: false });
      didFit.current = true;
    }
  }, [center, map]);
  return null;
};

const rateColor = (value, min, max) => {
  if (max <= min) return '#f97316';
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const r = Math.round(14 + t * (244 - 14));
  const g = Math.round(165 - t * (165 - 63));
  const b = Math.round(233 - t * (233 - 94));
  return `rgb(${r},${g},${b})`;
};

const DistrictChoropleth = ({ geojson, selectedDistrict }) => {
  const rates = (geojson?.features || []).map((f) => f.properties.sample_rate_per_10k || 0);
  const min = rates.length ? Math.min(...rates) : 0;
  const max = rates.length ? Math.max(...rates) : 1;

  const styleFeature = (feature) => {
    const district = String(feature.properties.district);
    const active = !selectedDistrict || selectedDistrict.toString() === district;
    return {
      color: rateColor(feature.properties.sample_rate_per_10k, min, max),
      weight: active ? 2 : 1,
      fillColor: rateColor(feature.properties.sample_rate_per_10k, min, max),
      fillOpacity: active ? 0.55 : 0.12,
    };
  };

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    layer.bindPopup(`
      <div style="font-size:0.85rem;line-height:1.55;min-width:180px">
        <h4 style="color:#f43f5e;margin-bottom:6px;font-weight:bold">Police District ${p.district}</h4>
        <p><strong>Mapped crimes:</strong> ${Number(p.crime_count).toLocaleString()}</p>
        <p><strong>Pop. proxy:</strong> ${Number(p.population_proxy).toLocaleString()}</p>
        <p><strong>Sample rate / 10k:</strong> ${Number(p.sample_rate_per_10k).toFixed(2)}</p>
        <p><strong>Location quotient:</strong> ${Number(p.location_quotient).toFixed(2)}</p>
      </div>
    `);
  };

  if (!geojson || !geojson.features?.length) return null;
  return <GeoJSON key={`${selectedDistrict}-${geojson.features.length}`} data={geojson} style={styleFeature} onEachFeature={onEachFeature} />;
};

const getMarkerOptions = (type) => {
  const t = type ? type.toUpperCase() : '';
  if (t === 'HOMICIDE') return { color: '#ef4444', fillColor: '#ef4444', radius: 8 };
  if (['ASSAULT', 'BATTERY', 'WEAPONS VIOLATION', 'ROBBERY'].includes(t))
    return { color: '#f97316', fillColor: '#f97316', radius: 6 };
  if (['THEFT', 'BURGLARY', 'MOTOR VEHICLE THEFT'].includes(t))
    return { color: '#eab308', fillColor: '#eab308', radius: 5 };
  return { color: '#3b82f6', fillColor: '#3b82f6', radius: 4 };
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const CanvasCrimeMarkers = ({ crimes }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return undefined;
    const renderer = L.canvas({ padding: 0.4 });
    const layer = L.layerGroup();
    crimes.forEach((crime) => {
      if (!crime.Latitude || !crime.Longitude) return;
      const { color, fillColor, radius } = getMarkerOptions(crime.PrimaryType);
      const marker = L.circleMarker([crime.Latitude, crime.Longitude], {
        renderer,
        color,
        fillColor,
        fillOpacity: 0.6,
        weight: 1,
        radius,
      });
      const dateLabel = crime.Date ? new Date(crime.Date).toLocaleString() : 'N/A';
      marker.bindPopup(`
        <div style="font-size:0.85rem;line-height:1.5">
          <h4 style="color:#f43f5e;margin-bottom:4px;font-weight:bold">${escapeHtml(crime.PrimaryType)}</h4>
          <div style="color:#cbd5e1">
            <p><strong>Case:</strong> ${escapeHtml(crime.CaseNumber || 'N/A')}</p>
            <p><strong>Date:</strong> ${escapeHtml(dateLabel)}</p>
            <p><strong>District:</strong> District ${escapeHtml(crime.District || 'N/A')}</p>
            <p style="margin-top:4px">
              <span style="padding:1px 6px;border-radius:4px;font-size:0.73rem;font-weight:bold;background:${crime.Arrest ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};color:${crime.Arrest ? '#10b981' : '#ef4444'}">
                ${crime.Arrest ? 'Arrest Made' : 'No Arrest'}
              </span>
            </p>
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
      if (renderer.remove) renderer.remove();
    };
  }, [map, crimes]);
  return null;
};

const hullPositions = (cluster) => {
  const ring = cluster?.hull?.coordinates?.[0];
  if (!ring?.length) return null;
  return ring.map(([lon, lat]) => [lat, lon]);
};

const FitSelectedCluster = ({ cluster }) => {
  const map = useMap();
  useEffect(() => {
    if (!cluster) return undefined;
    const positions = hullPositions(cluster);
    if (positions?.length) {
      map.fitBounds(positions, { padding: [36, 36], maxZoom: 14, animate: true });
    } else if (cluster.center) {
      map.setView([cluster.center.lat, cluster.center.lon], 14, { animate: true });
    }
    return undefined;
  }, [cluster, map]);
  return null;
};

const CrimeMap = ({
  crimes,
  clusters = [],
  districtGeojson = null,
  selectedDistrict = '',
  focusClusterId = null,
  onViewModeChange,
}) => {
  const [viewMode, setViewMode] = useState('markers');
  const chicagoCenter = [41.8781, -87.6298];
  const focusCluster = clusters.find((c) => c.id === focusClusterId) || null;

  useEffect(() => {
    if (focusClusterId != null) setViewMode('clusters');
  }, [focusClusterId]);

  const setMode = (key) => {
    setViewMode(key);
    onViewModeChange?.(key);
  };

  const viewModes = [
    { key: 'markers', label: 'Markers', icon: Eye },
    { key: 'heatmap', label: 'Heatmap', icon: Layers },
    { key: 'clusters', label: 'DBSCAN', icon: Target },
    { key: 'socio', label: 'Rates', icon: Landmark },
  ];

  return (
    <div className="map-stage">
      <div className="map-toolbar" role="tablist" aria-label="Map view modes">
        {viewModes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={viewMode === key}
            onClick={() => setMode(key)}
            className={`map-toolbar-btn${viewMode === key ? ' is-active' : ''}`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: '12px', left: '12px', zIndex: 1000,
        padding: '10px 14px',
        background: 'rgba(8, 12, 20, 0.92)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px',
        fontSize: '0.68rem', color: 'var(--text-secondary)', pointerEvents: 'none',
        maxWidth: '260px',
      }}>
        <div style={{ fontWeight: '700', color: '#fff', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {viewMode === 'markers' ? 'Marker categories' : viewMode === 'heatmap' ? 'Heatmap intensity' : viewMode === 'socio' ? 'Sample rate / 10k' : 'DBSCAN convex hulls'}
        </div>
        {viewMode === 'markers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              ['#ef4444', 'Homicide (Severe)'],
              ['#f97316', 'Violent (Assault, Weapons)'],
              ['#eab308', 'Property (Theft, Burglary)'],
              ['#3b82f6', 'Other Offenses'],
            ].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
                <span>{l}</span>
              </div>
            ))}
          </div>
        )}
        {viewMode === 'heatmap' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Low</span>
            <div style={{ width: '80px', height: '8px', borderRadius: '4px', background: 'linear-gradient(to right, blue, cyan, lime, yellow, #f43f5e)' }} />
            <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>Peak</span>
          </div>
        )}
        {viewMode === 'socio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Lower</span>
              <div style={{ width: '80px', height: '8px', borderRadius: '4px', background: 'linear-gradient(to right, #0ea5e9, #f43f5e)' }} />
              <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>Higher</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
              Convex hull of mapped incidents per CPD district. Population is area-allocated from the Chicago proxy.
            </div>
          </div>
        )}
        {viewMode === 'clusters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '16px', height: '10px', background: 'rgba(244,63,94,0.28)', border: '2px dashed #f43f5e', display: 'inline-block', flexShrink: 0 }} />
              <span>Cluster convex hull</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e', display: 'inline-block', flexShrink: 0 }} />
              <span>Cluster centroid</span>
            </div>
            <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
              {clusters.length} DBSCAN hotspot zones detected. Noise points excluded.
            </div>
          </div>
        )}
      </div>

      <MapContainer center={chicagoCenter} zoom={11} scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }} preferCanvas={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={
            import.meta.env.VITE_CARTO_API_KEY
              ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`
              : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          }
        />
        <MapUpdater center={chicagoCenter} />
        {viewMode === 'clusters' && <FitSelectedCluster cluster={focusCluster} />}

        {viewMode === 'markers' && <CanvasCrimeMarkers crimes={crimes} />}

        {viewMode === 'heatmap' && <HeatmapLayer points={crimes} />}

        {viewMode === 'clusters' && clusters.map((cluster) => {
          const positions = hullPositions(cluster);
          const isFocus = focusClusterId === cluster.id;
          return (
            <React.Fragment key={cluster.id}>
              {positions ? (
                <Polygon
                  positions={positions}
                  pathOptions={{
                    color: cluster.color,
                    fillColor: cluster.color,
                    fillOpacity: isFocus ? 0.28 : 0.14,
                    weight: isFocus ? 3 : 2,
                    dashArray: '6 4',
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: '0.85rem', lineHeight: '1.6', minWidth: '180px' }}>
                      <h4 style={{ color: cluster.color, marginBottom: '6px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        Hotspot Zone #{cluster.id + 1}
                      </h4>
                      <div style={{ color: '#cbd5e1' }}>
                        <p><strong>Crimes in Zone:</strong> {cluster.crime_count.toLocaleString()}</p>
                        <p><strong>Top Crime:</strong> {cluster.top_crime_type}</p>
                        <p><strong>Police District:</strong> District {cluster.dominant_district || 'N/A'}</p>
                        <p><strong>Shape:</strong> convex hull (not a circle)</p>
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              ) : null}
              <CircleMarker
                center={[cluster.center.lat, cluster.center.lon]}
                radius={isFocus ? 8 : 6}
                pathOptions={{ color: cluster.color, fillColor: cluster.color, fillOpacity: 0.9, weight: 2 }}
              />
            </React.Fragment>
          );
        })}
        {viewMode === 'socio' && (
          <DistrictChoropleth geojson={districtGeojson} selectedDistrict={selectedDistrict} />
        )}
      </MapContainer>
    </div>
  );
};

export default CrimeMap;
