import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { FastifyInstance } from 'fastify';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'test';

const { buildApp } = await import('./app.js');

describe('API routes', () => {
  let app: FastifyInstance;

  before(async () => {
    app = buildApp();
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  test('health endpoint is public', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      ok: true,
      service: 'streetbite2-api',
    });
  });

  test('protected vendor routes reject missing JWTs', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/vendors',
      payload: {
        name: 'Taco Stand',
        category: 'tacos',
      },
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      },
    });
  });

  test('auth register rejects invalid request bodies before service logic', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'not-an-email',
        password: 'short',
      },
    });

    assert.equal(response.statusCode, 400);
  });

  test('nearby discovery requires valid coordinates', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/vendors/nearby?lat=abc&lng=-99.1332',
    });

    assert.equal(response.statusCode, 400);
  });

  test('review creation rejects invalid ratings before authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/reviews',
      payload: {
        vendorId: 'vendor-1',
        rating: 6,
      },
    });

    assert.equal(response.statusCode, 400);
  });

  test('vendor location updates validate geospatial bounds', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/vendors/vendor-1/location',
      payload: {
        lat: 100,
        lng: -99.1332,
        accuracy: 25,
      },
    });

    assert.equal(response.statusCode, 400);
  });

  test('vendor onboarding validates GPS payloads before authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/vendors/onboarding',
      payload: {
        name: 'Taco Stand',
        category: 'tacos',
        location: {
          lat: 19.4326,
          lng: -181,
          accuracy: 20,
        },
      },
    });

    assert.equal(response.statusCode, 400);
  });
});
