import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Layers, Eye, Target } from 'lucide-react';

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
  useEffect(() => {
    if (center) map.setView(center, 11, { animate: true, duration: 1.0 });
  }, [center, map]);
  return null;
};

// ── Main CrimeMap Component ─────────────────────────────────────────────────
const CrimeMap = ({ crimes, clusters = [] }) => {
  const [viewMode, setViewMode] = useState('markers'); // 'markers' | 'heatmap' | 'clusters'
  const chicagoCenter = [41.8781, -87.6298];

  const getMarkerOptions = (type) => {
    const t = type ? type.toUpperCase() : '';
    if (t === 'HOMICIDE') return { color: '#ef4444', fillColor: '#ef4444', radius: 8 };
    if (['ASSAULT', 'BATTERY', 'WEAPONS VIOLATION', 'ROBBERY'].includes(t))
      return { color: '#f97316', fillColor: '#f97316', radius: 6 };
    if (['THEFT', 'BURGLARY', 'MOTOR VEHICLE THEFT'].includes(t))
      return { color: '#eab308', fillColor: '#eab308', radius: 5 };
    return { color: '#3b82f6', fillColor: '#3b82f6', radius: 4 };
  };

  const viewModes = [
    { key: 'markers', label: 'Individual Markers', icon: Eye },
    { key: 'heatmap', label: 'Density Heatmap', icon: Layers },
    { key: 'clusters', label: 'DBSCAN Hotspots', icon: Target },
  ];

  return (
    <div style={{ height: '530px', width: '100%', position: 'relative' }}>
      {/* View Mode Toggle */}
      <div style={{
        position: 'absolute', top: '12px', right: '12px', zIndex: 1000,
        display: 'flex', gap: '4px', padding: '4px',
        background: 'rgba(8, 12, 20, 0.92)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>
        {viewModes.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setViewMode(key)} style={{
            padding: '6px 10px',
            background: viewMode === key ? 'var(--color-primary)' : 'transparent',
            color: viewMode === key ? '#fff' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: '600',
            display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'var(--transition-smooth)',
          }}>
            <Icon size={11} /> {label}
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
          {viewMode === 'markers' ? 'Marker Categories' : viewMode === 'heatmap' ? 'Heatmap Intensity' : 'DBSCAN Hotspot Clusters'}
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
        {viewMode === 'clusters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(244,63,94,0.3)', border: '2px solid #f43f5e', display: 'inline-block', flexShrink: 0 }} />
              <span>Hotspot zone boundary</span>
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
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater center={chicagoCenter} />

        {/* ── Individual Markers Mode ── */}
        {viewMode === 'markers' && crimes.map((crime, idx) => {
          if (!crime.Latitude || !crime.Longitude) return null;
          const { color, fillColor, radius } = getMarkerOptions(crime.PrimaryType);
          return (
            <CircleMarker key={crime.ID || idx}
              center={[crime.Latitude, crime.Longitude]} radius={radius}
              pathOptions={{ color, fillColor, fillOpacity: 0.6, weight: 1.5 }}>
              <Popup>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                  <h4 style={{ color: '#f43f5e', marginBottom: '4px', fontWeight: 'bold' }}>{crime.PrimaryType}</h4>
                  <div style={{ color: '#cbd5e1' }}>
                    <p><strong>Case:</strong> {crime.CaseNumber || 'N/A'}</p>
                    <p><strong>Date:</strong> {crime.Date ? new Date(crime.Date).toLocaleString() : 'N/A'}</p>
                    <p><strong>District:</strong> District {crime.District || 'N/A'}</p>
                    <p style={{ marginTop: '4px' }}>
                      <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '0.73rem', fontWeight: 'bold',
                        background: crime.Arrest ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                        color: crime.Arrest ? '#10b981' : '#ef4444' }}>
                        {crime.Arrest ? 'Arrest Made' : 'No Arrest'}
                      </span>
                    </p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* ── Heatmap Mode ── */}
        {viewMode === 'heatmap' && <HeatmapLayer points={crimes} />}

        {/* ── DBSCAN Cluster Mode ── */}
        {viewMode === 'clusters' && clusters.map((cluster) => (
          <React.Fragment key={cluster.id}>
            {/* Hotspot boundary circle */}
            <Circle
              center={[cluster.center.lat, cluster.center.lon]}
              radius={cluster.radius_km * 1000} // Convert km → meters for Leaflet
              pathOptions={{
                color: cluster.color,
                fillColor: cluster.color,
                fillOpacity: 0.12,
                weight: 2,
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
                    <p><strong>Zone Radius:</strong> {(cluster.radius_km * 1000).toFixed(0)}m</p>
                  </div>
                </div>
              </Popup>
            </Circle>
            {/* Centroid marker dot */}
            <CircleMarker
              center={[cluster.center.lat, cluster.center.lon]}
              radius={6}
              pathOptions={{ color: cluster.color, fillColor: cluster.color, fillOpacity: 0.9, weight: 2 }}
            />
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default CrimeMap;
