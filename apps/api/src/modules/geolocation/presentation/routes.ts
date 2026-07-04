import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GeolocationService } from '../application/GeolocationService.js';
import { PrismaGeolocationRepository } from '../infrastructure/repositories.js';
import { PrismaVendorRepository } from '../../vendors/infrastructure/repositories.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors.js';

const vendorParamsSchema = {
  type: 'object',
  required: ['vendorId'],
  additionalProperties: false,
  properties: {
    vendorId: { type: 'string', minLength: 1 },
  },
} as const;

const locationBodySchema = {
  type: 'object',
  required: ['lat', 'lng', 'accuracy'],
  additionalProperties: false,
  properties: {
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lng: { type: 'number', minimum: -180, maximum: 180 },
    accuracy: { type: 'number', exclusiveMinimum: 0, maximum: 10000 },
  },
} as const;

const paginationQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    limit: { type: 'string', pattern: '^\\d+$' },
    offset: { type: 'string', pattern: '^\\d+$' },
  },
} as const;

const locationCheckQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    lat: { type: 'string', pattern: '^-?\\d+(\\.\\d+)?$' },
    lng: { type: 'string', pattern: '^-?\\d+(\\.\\d+)?$' },
  },
} as const;

export function registerGeolocationRoutes(app: FastifyInstance): void {
  const geolocationRepository = new PrismaGeolocationRepository();
  const geolocationService = new GeolocationService(geolocationRepository);
  const vendorRepository = new PrismaVendorRepository();

  async function assertVendorOwner(vendorId: string, userId: string): Promise<void> {
    const vendor = await vendorRepository.findById(vendorId);
    if (!vendor) {
      throw new NotFoundError('Vendor', vendorId);
    }
    if (vendor.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to manage this vendor location');
    }
  }

  // Publish vendor location
  app.post<{
    Params: { vendorId: string };
    Body: { lat: number; lng: number; accuracy: number };
  }>(
    '/vendors/:vendorId/location',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema, body: locationBodySchema } },
    async (
      request: FastifyRequest<{
        Params: { vendorId: string };
        Body: { lat: number; lng: number; accuracy: number };
      }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      await assertVendorOwner(request.params.vendorId, request.userId);
      await geolocationService.publishLocation(request.params.vendorId, {
        vendorId: request.params.vendorId,
        coordinates: { lat: request.body.lat, lng: request.body.lng },
        accuracy: request.body.accuracy,
      });

      return reply.status(202).send({ ok: true });
    },
  );

  // Get current vendor location
  app.get<{ Params: { vendorId: string } }>(
    '/vendors/:vendorId/location',
    { schema: { params: vendorParamsSchema } },
    async (
      request: FastifyRequest<{ Params: { vendorId: string } }>,
      reply: FastifyReply,
    ) => {
      const location = await geolocationService.getCurrentLocation(request.params.vendorId);
      if (!location) {
        return reply.status(404).send({ error: 'No current location' });
      }
      return reply.send({ data: location });
    },
  );

  // Get location history (vendor only)
  app.get<{
    Params: { vendorId: string };
    Querystring: { limit?: string; offset?: string };
  }>(
    '/vendors/:vendorId/location/history',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema, querystring: paginationQuerySchema } },
    async (
      request: FastifyRequest<{
        Params: { vendorId: string };
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;

      await assertVendorOwner(request.params.vendorId, request.userId);
      const history = await geolocationService.getLocationHistory(request.params.vendorId, limit, offset);
      return reply.send({ data: history, meta: { count: history.length } });
    },
  );

  // Check if location update would be accepted
  app.get<{ Params: { vendorId: string }; Querystring: { lat?: string; lng?: string } }>(
    '/vendors/:vendorId/location/check',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema, querystring: locationCheckQuerySchema } },
    async (
      request: FastifyRequest<{ Params: { vendorId: string }; Querystring: { lat?: string; lng?: string } }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      await assertVendorOwner(request.params.vendorId, request.userId);
      if ((request.query.lat && !request.query.lng) || (!request.query.lat && request.query.lng)) {
        throw new ValidationError('Latitude and longitude must be provided together');
      }
      const candidate =
        request.query.lat && request.query.lng
          ? { lat: parseFloat(request.query.lat), lng: parseFloat(request.query.lng) }
          : undefined;
      const throttle = await geolocationService.checkLocationAcceptance(request.params.vendorId, candidate);
      return reply.send({ data: throttle });
    },
  );

  // Mark vendor as offline
  app.post<{ Params: { vendorId: string } }>(
    '/vendors/:vendorId/location/offline',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema } },
    async (request: FastifyRequest<{ Params: { vendorId: string } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      await assertVendorOwner(request.params.vendorId, request.userId);
      await geolocationService.goOffline(request.params.vendorId);
      return reply.status(204).send();
    },
  );
}
