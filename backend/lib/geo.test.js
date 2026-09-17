const { test } = require('node:test');
const assert = require('node:assert/strict');
const { convexHull, hullToGeometry } = require('./geo');

test('convex hull of a square keeps the four corners', () => {
  const pts = [
    [0, 0], [1, 0], [1, 1], [0, 1],
    [0.5, 0.5], [0.2, 0.3],
  ];
  const hull = convexHull(pts);
  assert.equal(hull.length, 4);
});

test('hullToGeometry closes a polygon ring in lon/lat order', () => {
  const geom = hullToGeometry([
    [-87.64, 41.87],
    [-87.62, 41.87],
    [-87.62, 41.89],
    [-87.64, 41.89],
    [-87.63, 41.88],
  ]);
  assert.equal(geom.type, 'Polygon');
  const ring = geom.coordinates[0];
  assert.ok(ring.length >= 4);
  assert.deepEqual(ring[0], ring[ring.length - 1]);
});
