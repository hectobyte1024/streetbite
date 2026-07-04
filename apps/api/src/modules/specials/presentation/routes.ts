import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaVendorRepository } from '../../vendors/infrastructure/repositories.js';
import { DailySpecialService } from '../application/DailySpecialService.js';
import { PrismaDailySpecialRepository } from '../infrastructure/repositories.js';
import { UpdateDailySpecialInput } from '../domain/types.js';

const specialParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
  },
} as const;

const vendorParamsSchema = {
  type: 'object',
  required: ['vendorId'],
  additionalProperties: false,
  properties: {
    vendorId: { type: 'string', minLength: 1 },
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

const createSpecialBodySchema = {
  type: 'object',
  required: ['title', 'startsAt', 'endsAt'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', minLength: 1, maxLength: 1000 },
    priceCents: { type: 'integer', minimum: 0 },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    startsAt: { type: 'string', format: 'date-time' },
    endsAt: { type: 'string', format: 'date-time' },
  },
} as const;

const updateSpecialBodySchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 120 },
    description: { anyOf: [{ type: 'string', minLength: 1, maxLength: 1000 }, { type: 'null' }] },
    priceCents: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }] },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    startsAt: { type: 'string', format: 'date-time' },
    endsAt: { type: 'string', format: 'date-time' },
    isActive: { type: 'boolean' },
  },
} as const;

export function registerSpecialRoutes(app: FastifyInstance): void {
  const vendorRepository = new PrismaVendorRepository();
  const dailySpecialRepository = new PrismaDailySpecialRepository();
  const dailySpecialService = new DailySpecialService(dailySpecialRepository, vendorRepository);

  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/specials/active',
    { schema: { querystring: paginationQuerySchema } },
    async (request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
      const specials = await dailySpecialService.getActiveSpecials(new Date(), limit, offset);
      return reply.send({ data: specials, meta: { count: specials.length } });
    },
  );

  app.get<{ Params: { vendorId: string }; Querystring: { limit?: string; offset?: string } }>(
    '/vendors/:vendorId/specials',
    { schema: { params: vendorParamsSchema, querystring: paginationQuerySchema } },
    async (
      request: FastifyRequest<{ Params: { vendorId: string }; Querystring: { limit?: string; offset?: string } }>,
      reply: FastifyReply,
    ) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
      const specials = await dailySpecialService.getVendorSpecials(request.params.vendorId, limit, offset);
      return reply.send({ data: specials, meta: { count: specials.length } });
    },
  );

  app.post<{
    Params: { vendorId: string };
    Body: { title: string; description?: string; priceCents?: number; currency?: string; startsAt: string; endsAt: string };
  }>(
    '/vendors/:vendorId/specials',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema, body: createSpecialBodySchema } },
    async (
      request: FastifyRequest<{
        Params: { vendorId: string };
        Body: { title: string; description?: string; priceCents?: number; currency?: string; startsAt: string; endsAt: string };
      }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const special = await dailySpecialService.createSpecial(request.params.vendorId, request.userId, {
        ...request.body,
        startsAt: new Date(request.body.startsAt),
        endsAt: new Date(request.body.endsAt),
      });
      return reply.status(201).send({ data: special });
    },
  );

  app.patch<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string | null;
      priceCents?: number | null;
      currency?: string;
      startsAt?: string;
      endsAt?: string;
      isActive?: boolean;
    };
  }>(
    '/specials/:id',
    { preHandler: app.verifyJWT, schema: { params: specialParamsSchema, body: updateSpecialBodySchema } },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          title?: string;
          description?: string | null;
          priceCents?: number | null;
          currency?: string;
          startsAt?: string;
          endsAt?: string;
          isActive?: boolean;
        };
      }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const input: UpdateDailySpecialInput = {};
      if (request.body.title !== undefined) input.title = request.body.title;
      if (request.body.description !== undefined) input.description = request.body.description;
      if (request.body.priceCents !== undefined) input.priceCents = request.body.priceCents;
      if (request.body.currency !== undefined) input.currency = request.body.currency;
      if (request.body.startsAt !== undefined) input.startsAt = new Date(request.body.startsAt);
      if (request.body.endsAt !== undefined) input.endsAt = new Date(request.body.endsAt);
      if (request.body.isActive !== undefined) input.isActive = request.body.isActive;

      const special = await dailySpecialService.updateSpecial(request.params.id, request.userId, input);
      return reply.send({ data: special });
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/specials/:id',
    { preHandler: app.verifyJWT, schema: { params: specialParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      await dailySpecialService.deleteSpecial(request.params.id, request.userId);
      return reply.status(204).send();
    },
  );
}
