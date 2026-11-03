import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../dist/app.js';

let server;
let port;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://localhost:${port}/api/v1`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('Backend Auth & Project Ownership Workflow', async () => {
  // 1. Health check
  const healthRes = await fetch(`${baseUrl}/health`);
  assert.equal(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'online');

  // 2. Register User A (Alice)
  const regAlice = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Architect',
      email: `alice_${Date.now()}@studio.com`,
      password: 'SuperSecretPassword123!',
    }),
  });
  assert.equal(regAlice.status, 201);
  const aliceData = await regAlice.json();
  assert.ok(aliceData.token);
  const tokenAlice = aliceData.token;

  // 3. Register User B (Bob)
  const regBob = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Builder',
      email: `bob_${Date.now()}@contractor.com`,
      password: 'BobSecretPassword456!',
    }),
  });
  assert.equal(regBob.status, 201);
  const bobData = await regBob.json();
  assert.ok(bobData.token);
  const tokenBob = bobData.token;

  // 4. Alice creates a project
  const createProj = await fetch(`${baseUrl}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAlice}`,
    },
    body: JSON.stringify({
      name: 'Glass Pavilion Residence',
      description: 'Modern luxury retreat with floor to ceiling glass',
      geometry: { walls: [], rooms: [] },
    }),
  });
  assert.equal(createProj.status, 201);
  const projData = await createProj.json();
  const projectId = projData.data._id || projData.data.id;
  assert.ok(projectId);

  // 5. Alice updates geometry
  const newGeometry = {
    version: '1.0.0',
    metadata: { units: 'meters' },
    walls: [{ id: 'w1', start: { x: 0, z: 0 }, end: { x: 6, z: 0 }, height: 3.0, thickness: 0.2 }],
    rooms: [{ id: 'r1', name: 'Master Lounge', polygon: [] }],
  };
  const updateGeom = await fetch(`${baseUrl}/projects/${projectId}/geometry`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAlice}`,
    },
    body: JSON.stringify({ geometry: newGeometry }),
  });
  assert.equal(updateGeom.status, 200);

  // 6. Security Check: Bob tries to access Alice's project by ID -> MUST return 403 or 404
  const bobAccess = await fetch(`${baseUrl}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${tokenBob}` },
  });
  assert.ok(bobAccess.status === 403 || bobAccess.status === 404, `Expected 403 or 404, got ${bobAccess.status}`);

  // 7. Security Check: Bob tries to update Alice's geometry -> MUST return 403 or 404
  const bobHacksGeometry = await fetch(`${baseUrl}/projects/${projectId}/geometry`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenBob}`,
    },
    body: JSON.stringify({ geometry: { hacked: true } }),
  });
  assert.ok(bobHacksGeometry.status === 403 || bobHacksGeometry.status === 404);

  // 8. Alice re-opens her project -> geometry is intact!
  const getAliceProj = await fetch(`${baseUrl}/projects/${projectId}/geometry`, {
    headers: { Authorization: `Bearer ${tokenAlice}` },
  });
  assert.equal(getAliceProj.status, 200);
  const aliceSavedGeom = await getAliceProj.json();
  assert.equal(aliceSavedGeom.geometry.walls.length, 1);
  assert.equal(aliceSavedGeom.geometry.walls[0].id, 'w1');

  // 9. Alice duplicates project
  const duplicateRes = await fetch(`${baseUrl}/projects/${projectId}/duplicate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenAlice}` },
  });
  assert.equal(duplicateRes.status, 201);

  // 10. Alice deletes original project
  const delRes = await fetch(`${baseUrl}/projects/${projectId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenAlice}` },
  });
  assert.equal(delRes.status, 200);

  console.log('All Backend Authentication, Ownership, and Geometry Persistence tests PASSED!');
});
