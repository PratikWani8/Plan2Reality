import test from 'node:test';
import assert from 'node:assert';
import { app } from '../dist/app.js';

function createMockReqRes(options) {
  const req = {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
    socket: { remoteAddress: '127.0.0.1' },
    ip: '127.0.0.1',
    get(name) {
      return this.headers[name.toLowerCase()];
    },
    header(name) {
      return this.headers[name.toLowerCase()];
    },
  };

  const headers = {};
  const res = {
    statusCode: 200,
    headersSent: false,
    _body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, val) {
      headers[name.toLowerCase()] = val;
      return this;
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    hasHeader(name) {
      return Boolean(headers[name.toLowerCase()]);
    },
    removeHeader(name) {
      delete headers[name.toLowerCase()];
      return this;
    },
    json(data) {
      this._body = data;
      this.headersSent = true;
      if (options.onComplete) options.onComplete(this);
      return this;
    },
    send(data) {
      this._body = data;
      this.headersSent = true;
      if (options.onComplete) options.onComplete(this);
      return this;
    },
  };

  return { req, res };
}

test('Assistant API Endpoints', async (t) => {
  await t.test('GET /api/v1/assistant/status returns configuration status', async () => {
    await new Promise((resolve, reject) => {
      const { req, res } = createMockReqRes({
        method: 'GET',
        url: '/api/v1/assistant/status',
        onComplete: (mockRes) => {
          try {
            assert.strictEqual(mockRes.statusCode, 200);
            assert.ok('hasServerKey' in mockRes._body);
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
      app(req, res);
    });
  });

  await t.test('POST /api/v1/assistant/chat requires message', async () => {
    await new Promise((resolve, reject) => {
      const { req, res } = createMockReqRes({
        method: 'POST',
        url: '/api/v1/assistant/chat',
        body: {},
        onComplete: (mockRes) => {
          try {
            assert.strictEqual(mockRes.statusCode, 400);
            assert.ok(mockRes._body.error);
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
      app(req, res);
    });
  });

  await t.test('POST /api/v1/assistant/chat returns onboarding reply if no key', async () => {
    await new Promise((resolve, reject) => {
      const { req, res } = createMockReqRes({
        method: 'POST',
        url: '/api/v1/assistant/chat',
        body: {
          message: 'Make walls grey',
          context: { wallsCount: 10, rooms: [] },
        },
        onComplete: (mockRes) => {
          try {
            assert.strictEqual(mockRes.statusCode, 200);
            assert.ok(mockRes._body.reply);
            assert.ok(mockRes._body.provider);
            resolve();
          } catch (e) {
            reject(e);
          }
        },
      });
      app(req, res);
    });
  });
});
