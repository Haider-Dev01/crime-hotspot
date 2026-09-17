/**
 * Geographic helpers for district hulls and population-share areas.
 * GeoJSON rings use [longitude, latitude].
 */

function convexHull(points) {
  const pts = points
    .map((p) => [p[0], p[1]])
    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));

  if (pts.length <= 2) return pts;

  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = pts.length - 1; i >= 0; i -= 1) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function circlePolygon(lon, lat, radiusDeg = 0.012, steps = 16) {
  const ring = [];
  for (let i = 0; i <= steps; i += 1) {
    const theta = (2 * Math.PI * i) / steps;
    ring.push([lon + radiusDeg * Math.cos(theta), lat + (radiusDeg * 0.75) * Math.sin(theta)]);
  }
  return ring;
}

function closeRing(ring) {
  if (!ring.length) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, first];
  }
  return ring;
}

function polygonAreaKm2(ring) {
  if (!ring || ring.length < 4) return 0;
  const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const lonScale = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const latScale = 110.57;
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const x1 = ring[i][0] * lonScale;
    const y1 = ring[i][1] * latScale;
    const x2 = ring[i + 1][0] * lonScale;
    const y2 = ring[i + 1][1] * latScale;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function hullToGeometry(lonLatPoints) {
  if (!lonLatPoints.length) return null;
  if (lonLatPoints.length < 3) {
    const [lon, lat] = lonLatPoints[0];
    return {
      type: 'Polygon',
      coordinates: [closeRing(circlePolygon(lon, lat))],
    };
  }
  const hull = convexHull(lonLatPoints);
  if (hull.length < 3) {
    const [lon, lat] = lonLatPoints[0];
    return {
      type: 'Polygon',
      coordinates: [closeRing(circlePolygon(lon, lat))],
    };
  }
  return {
    type: 'Polygon',
    coordinates: [closeRing(hull)],
  };
}

module.exports = {
  convexHull,
  hullToGeometry,
  polygonAreaKm2,
};
