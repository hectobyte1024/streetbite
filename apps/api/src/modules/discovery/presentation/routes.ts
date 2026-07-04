import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DiscoveryService } from '../application/DiscoveryService.js';
import { PrismaDiscoveryRepository } from '../infrastructure/repositories.js';

const nearbyQuerySchema = {
  type: 'object',
  required: ['lat', 'lng'],
  additionalProperties: false,
  properties: {
    lat: { type: 'string', pattern: '^-?\\d+(\\.\\d+)?$' },
    lng: { type: 'string', pattern: '^-?\\d+(\\.\\d+)?$' },
    radius: { type: 'string', pattern: '^\\d+(\\.\\d+)?$' },
    category: { type: 'string', minLength: 1, maxLength: 100 },
    openNow: { type: 'string', enum: ['true', 'false'] },
    limit: { type: 'string', pattern: '^\\d+$' },
    offset: { type: 'string', pattern: '^\\d+$' },
  },
} as const;

const regionalQuerySchema = {
  type: 'object',
  required: ['lat', 'lng'],
  additionalProperties: false,
  properties: {
    lat: { type: 'string', pattern: '^-?\\d+(\\.\\d+)?$' },
    lng: { type: 'string', pattern: '^-?\\d+(\\.\\d+)?$' },
    radius: { type: 'string', pattern: '^\\d+(\\.\\d+)?$' },
    limit: { type: 'string', pattern: '^\\d+$' },
  },
} as const;

export function registerDiscoveryRoutes(app: FastifyInstance): void {
  const discoveryRepository = new PrismaDiscoveryRepository();
  const discoveryService = new DiscoveryService(discoveryRepository);

  app.get<{
    Querystring: {
      lat: string;
      lng: string;
      radius?: string;
      category?: string;
      openNow?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    '/vendors/nearby',
    { schema: { querystring: nearbyQuerySchema } },
    async (
      request: FastifyRequest<{
        Querystring: {
          lat: string;
          lng: string;
          radius?: string;
          category?: string;
          openNow?: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const lat = parseFloat(request.query.lat);
      const lng = parseFloat(request.query.lng);
      const radius = request.query.radius ? parseFloat(request.query.radius) : 2000;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;

      const input: any = {
        lat,
        lng,
        radiusMeters: radius,
        limit,
        offset,
      };

      if (request.query.category) {
        input.category = request.query.category;
      }
      if (request.query.openNow === 'true') {
        input.openNow = true;
      }

      const vendors = await discoveryService.findNearby(input);

      return reply.send({
        data: vendors,
        meta: { count: vendors.length, radiusMeters: radius },
      });
    },
  );

  // Get trending vendors in a region
  app.get<{
    Querystring: {
      lat: string;
      lng: string;
      radius?: string;
      limit?: string;
    };
  }>(
    '/vendors/trending',
    { schema: { querystring: regionalQuerySchema } },
    async (
      request: FastifyRequest<{
        Querystring: {
          lat: string;
          lng: string;
          radius?: string;
          limit?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const lat = parseFloat(request.query.lat);
      const lng = parseFloat(request.query.lng);
      const radius = request.query.radius ? parseFloat(request.query.radius) : 5000;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;

      const vendors = await discoveryService.getTrending(lat, lng, radius, limit);

      return reply.send({
        data: vendors,
        meta: { count: vendors.length, radiusMeters: radius },
      });
    },
  );

  // Get featured vendors in a region
  app.get<{
    Querystring: {
      lat: string;
      lng: string;
      radius?: string;
      limit?: string;
    };
  }>(
    '/vendors/featured',
    { schema: { querystring: regionalQuerySchema } },
    async (
      request: FastifyRequest<{
        Querystring: {
          lat: string;
          lng: string;
          radius?: string;
          limit?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const lat = parseFloat(request.query.lat);
      const lng = parseFloat(request.query.lng);
      const radius = request.query.radius ? parseFloat(request.query.radius) : 5000;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 10;

      const vendors = await discoveryService.getFeatured(lat, lng, radius, limit);

      return reply.send({
        data: vendors,
        meta: { count: vendors.length, radiusMeters: radius },
      });
    },
  );
}
