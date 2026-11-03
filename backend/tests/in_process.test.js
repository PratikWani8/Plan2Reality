import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../dist/app.js';
import { EventEmitter } from 'events';

// In-process mock request caller for express
function mockRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { 'content-type': 'application/json', ...headers };
    req.query = {};
    req.params = {};
    req.body = body;
    req.ip = '127.0.0.1';
    req.socket = { remoteAddress: '127.0.0.1' };

    const resEvents = new EventEmitter();
    let statusCode = 200;
    let responseData = '';
    const resHeaders = {};

    const res = {
      _headers: resHeaders,
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader(name, val) {
        resHeaders[name.toLowerCase()] = val;
      },
      getHeader(name) {
        return resHeaders[name.toLowerCase()];
      },
      hasHeader(name) {
        return name.toLowerCase() in resHeaders;
      },
      removeHeader(name) {
        delete resHeaders[name.toLowerCase()];
      },
      json(data) {
        resolve({
          status: statusCode,
          headers: resHeaders,
          body: data,
        });
      },
      send(data) {
        resolve({
          status: statusCode,
          headers: resHeaders,
          body: data,
        });
      },
    };

    app(req, res, (err) => {
      if (err) {
        resolve({
          status: 500,
          body: { error: err.message },
        });
      }
    });
  });
}

test('In-Process Auth & Project Controller Testing', async () => {
  // Test 1: Health check
  const healthRes = await mockRequest('GET', '/api/v1/health');
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.body.status, 'online');

  // Test 2: Register Alice
  const regAlice = await mockRequest('POST', '/api/v1/auth/register', {
    name: 'Alice Architect',
    email: `alice_${Date.now()}@test.com`,
    password: 'Password123!',
  });
  assert.equal(regAlice.status, 201);
  assert.ok(regAlice.body.token);
  const tokenAlice = regAlice.body.token;

  // Test 3: Register Bob
  const regBob = await mockRequest('POST', '/api/v1/auth/register', {
    name: 'Bob Contractor',
    email: `bob_${Date.now()}@test.com`,
    password: 'Password123!',
  });
  assert.equal(regBob.status, 201);
  assert.ok(regBob.body.token);
  const tokenBob = regBob.body.token;

  // Test 4: Alice creates a project
  const createProj = await mockRequest(
    'POST',
    '/api/v1/projects',
    {
      name: 'Modern Lakeside Villa',
      description: 'Single-story cantilevered villa with 3 rooms',
      geometry: { walls: [], rooms: [] },
    },
    { authorization: `Bearer ${tokenAlice}` }
  );
  assert.equal(createProj.status, 201);
  const proj = createProj.body.data;
  const projectId = proj._id || proj.id;
  assert.ok(projectId);

  // Test 5: Alice updates geometry
  const updatedGeometry = {
    version: '1.0.0',
    metadata: { units: 'meters' },
    walls: [{ id: 'w_ext_1', start: { x: 0, z: 0 }, end: { x: 8, z: 0 }, height: 3.0, thickness: 0.2 }],
    rooms: [{ id: 'r1', name: 'Living Room', polygon: [] }],
  };
  const updateGeom = await mockRequest(
    'PUT',
    `/api/v1/projects/${projectId}/geometry`,
    { geometry: updatedGeometry },
    { authorization: `Bearer ${tokenAlice}` }
  );
  assert.equal(updateGeom.status, 200);

  // Test 6: Bob attempts to read Alice's project -> MUST fail with 403 or 404
  const bobGet = await mockRequest(
    'GET',
    `/api/v1/projects/${projectId}`,
    null,
    { authorization: `Bearer ${tokenBob}` }
  );
  assert.ok(bobGet.status === 403 || bobGet.status === 404);

  // Test 7: Bob attempts to overwrite Alice's geometry -> MUST fail with 403 or 404
  const bobPut = await mockRequest(
    'PUT',
    `/api/v1/projects/${projectId}/geometry`,
    { geometry: { hacked: true } },
    { authorization: `Bearer ${tokenBob}` }
  );
  assert.ok(bobPut.status === 403 || bobPut.status === 404);

  // Test 8: Alice retrieves her geometry -> perfectly intact
  const aliceGet = await mockRequest(
    'GET',
    `/api/v1/projects/${projectId}/geometry`,
    null,
    { authorization: `Bearer ${tokenAlice}` }
  );
  assert.equal(aliceGet.status, 200);
  assert.equal(aliceGet.body.geometry.walls.length, 1);
  assert.equal(aliceGet.body.geometry.walls[0].id, 'w_ext_1');

  // Test 9: Project duplication
  const dup = await mockRequest(
    'POST',
    `/api/v1/projects/${projectId}/duplicate`,
    null,
    { authorization: `Bearer ${tokenAlice}` }
  );
  assert.equal(dup.status, 201);
  assert.equal(dup.body.data.name, 'Modern Lakeside Villa (Copy)');

  // Test 10: Project deletion
  const del = await mockRequest(
    'DELETE',
    `/api/v1/projects/${projectId}`,
    null,
    { authorization: `Bearer ${tokenAlice}` }
  );
  assert.equal(del.status, 200);

  console.log('All In-Process Backend & Ownership tests PASSED!');
});
