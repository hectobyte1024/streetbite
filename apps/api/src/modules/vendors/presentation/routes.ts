import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { VendorService } from '../application/VendorService.js';
import { VendorFollowService } from '../application/VendorFollowService.js';
import { VendorHoursService } from '../application/VendorHoursService.js';
import { PrismaVendorFollowRepository, PrismaVendorHoursRepository, PrismaVendorRepository } from '../infrastructure/repositories.js';
import { CreateVendorInput, VendorStatus } from '../domain/types.js';
import { ValidationError } from '../../../shared/errors.js';
import { GeolocationService } from '../../geolocation/application/GeolocationService.js';
import { PrismaGeolocationRepository } from '../../geolocation/infrastructure/repositories.js';

const vendorParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
  },
} as const;

const createVendorBodySchema = {
  type: 'object',
  required: ['name', 'category'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    category: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', minLength: 1, maxLength: 2000 },
    priceLevel: { type: 'integer', minimum: 1, maximum: 5 },
  },
} as const;

const onboardVendorBodySchema = {
  type: 'object',
  required: ['name', 'category', 'location'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    category: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', minLength: 1, maxLength: 2000 },
    priceLevel: { type: 'integer', minimum: 1, maximum: 5 },
    location: {
      type: 'object',
      required: ['lat', 'lng', 'accuracy'],
      additionalProperties: false,
      properties: {
        lat: { type: 'number', minimum: -90, maximum: 90 },
        lng: { type: 'number', minimum: -180, maximum: 180 },
        accuracy: { type: 'number', exclusiveMinimum: 0, maximum: 10000 },
      },
    },
  },
} as const;

const updateVendorBodySchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', minLength: 1, maxLength: 2000 },
    priceLevel: { type: 'integer', minimum: 1, maximum: 5 },
    status: { type: 'string', enum: Object.values(VendorStatus) },
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

const replaceVendorHoursBodySchema = {
  type: 'object',
  required: ['hours'],
  additionalProperties: false,
  properties: {
    hours: {
      type: 'array',
      maxItems: 7,
      items: {
        type: 'object',
        required: ['weekday', 'opensAt', 'closesAt'],
        additionalProperties: false,
        properties: {
          weekday: { type: 'integer', minimum: 0, maximum: 6 },
          opensAt: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          closesAt: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
        },
      },
    },
  },
} as const;

export function registerVendorRoutes(app: FastifyInstance): void {
  const vendorRepository = new PrismaVendorRepository();
  const vendorFollowRepository = new PrismaVendorFollowRepository();
  const vendorHoursRepository = new PrismaVendorHoursRepository();
  const geolocationRepository = new PrismaGeolocationRepository();
  const vendorService = new VendorService(vendorRepository);
  const vendorFollowService = new VendorFollowService(vendorRepository, vendorFollowRepository);
  const vendorHoursService = new VendorHoursService(vendorRepository, vendorHoursRepository);
  const geolocationService = new GeolocationService(geolocationRepository);

  // Create vendor
  app.post<{ Body: { name: string; category: string; description?: string; priceLevel?: number } }>(
    '/vendors',
    { preHandler: app.verifyJWT, schema: { body: createVendorBodySchema } },
    async (request: FastifyRequest<{ Body: { name: string; category: string; description?: string; priceLevel?: number } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const vendor = await vendorService.createVendor(request.userId, request.body);
      return reply.status(201).send({ data: vendor });
    },
  );

  app.post<{
    Body: {
      name: string;
      category: string;
      description?: string;
      priceLevel?: number;
      location: { lat: number; lng: number; accuracy: number };
    };
  }>(
    '/vendors/onboarding',
    { preHandler: app.verifyJWT, schema: { body: onboardVendorBodySchema } },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          category: string;
          description?: string;
          priceLevel?: number;
          location: { lat: number; lng: number; accuracy: number };
        };
      }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const vendorInput: CreateVendorInput = {
        name: request.body.name,
        category: request.body.category,
      };
      if (request.body.description !== undefined) {
        vendorInput.description = request.body.description;
      }
      if (request.body.priceLevel !== undefined) {
        vendorInput.priceLevel = request.body.priceLevel;
      }

      const vendor = await vendorService.createVendor(request.userId, vendorInput);
      const location = await geolocationService.publishLocation(vendor.id, {
        vendorId: vendor.id,
        coordinates: { lat: request.body.location.lat, lng: request.body.location.lng },
        accuracy: request.body.location.accuracy,
      });
      const activeVendor = await vendorService.updateVendorStatus(vendor.id, request.userId, VendorStatus.ACTIVE);

      return reply.status(201).send({
        data: {
          vendor: activeVendor,
          location,
        },
      });
    },
  );

  // Get vendor by ID
  app.get<{ Params: { id: string } }>(
    '/vendors/:id',
    { schema: { params: vendorParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const vendor = await vendorService.getVendor(request.params.id);
      return reply.send({ data: vendor });
    },
  );

  // Get my vendors
  app.get('/vendors/my/list', { preHandler: app.verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const vendors = await vendorService.getVendorsByOwner(request.userId);
    return reply.send({ data: vendors });
  });

  app.get<{ Params: { id: string } }>(
    '/vendors/:id/hours',
    { schema: { params: vendorParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const hours = await vendorHoursService.getVendorHours(request.params.id);
      return reply.send({ data: hours, meta: { count: hours.length } });
    },
  );

  app.put<{
    Params: { id: string };
    Body: { hours: Array<{ weekday: number; opensAt: string; closesAt: string }> };
  }>(
    '/vendors/:id/hours',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema, body: replaceVendorHoursBodySchema } },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { hours: Array<{ weekday: number; opensAt: string; closesAt: string }> };
      }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const hours = await vendorHoursService.replaceVendorHours(
        request.params.id,
        request.userId,
        request.body.hours.map((hour) => ({
          weekday: hour.weekday,
          opensAt: parseClockTime(hour.opensAt),
          closesAt: parseClockTime(hour.closesAt),
        })),
      );
      return reply.send({ data: hours, meta: { count: hours.length } });
    },
  );

  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/vendors/following',
    { preHandler: app.verifyJWT, schema: { querystring: paginationQuerySchema } },
    async (request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
      const vendors = await vendorFollowService.getFollowedVendors(request.userId, limit, offset);
      return reply.send({ data: vendors, meta: { count: vendors.length } });
    },
  );

  app.post<{ Params: { id: string } }>(
    '/vendors/:id/follow',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const follow = await vendorFollowService.followVendor(request.params.id, request.userId);
      return reply.status(201).send({ data: follow });
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/vendors/:id/follow',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      await vendorFollowService.unfollowVendor(request.params.id, request.userId);
      return reply.status(204).send();
    },
  );

  // Update vendor
  app.patch<{ Params: { id: string }; Body: { name?: string; description?: string; priceLevel?: number; status?: VendorStatus } }>(
    '/vendors/:id',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema, body: updateVendorBodySchema } },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { name?: string; description?: string; priceLevel?: number; status?: VendorStatus } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const vendor = await vendorService.updateVendor(request.params.id, request.userId, request.body);
      return reply.send({ data: vendor });
    },
  );

  // Delete vendor
  app.delete<{ Params: { id: string } }>(
    '/vendors/:id',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      await vendorService.deleteVendor(request.params.id, request.userId);
      return reply.status(204).send();
    },
  );
}

function parseClockTime(value: string): Date {
  const [hour, minute] = value.split(':').map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new ValidationError('Time must use HH:MM format');
  }
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0, 0));
}
