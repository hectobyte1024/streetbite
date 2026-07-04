import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaVendorRepository } from '../../vendors/infrastructure/repositories.js';
import { MenuItemService } from '../application/MenuItemService.js';
import { UpdateMenuItemInput } from '../domain/types.js';
import { PrismaMenuItemRepository } from '../infrastructure/repositories.js';

const menuItemParamsSchema = {
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

const menuQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    includeUnavailable: { type: 'string', enum: ['true', 'false'] },
  },
} as const;

const createMenuItemBodySchema = {
  type: 'object',
  required: ['name', 'priceCents'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', minLength: 1, maxLength: 1000 },
    category: { type: 'string', minLength: 1, maxLength: 80 },
    priceCents: { type: 'integer', minimum: 0 },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    isAvailable: { type: 'boolean' },
    sortOrder: { type: 'integer' },
  },
} as const;

const updateMenuItemBodySchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    description: { anyOf: [{ type: 'string', minLength: 1, maxLength: 1000 }, { type: 'null' }] },
    category: { anyOf: [{ type: 'string', minLength: 1, maxLength: 80 }, { type: 'null' }] },
    priceCents: { type: 'integer', minimum: 0 },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    isAvailable: { type: 'boolean' },
    sortOrder: { type: 'integer' },
  },
} as const;

export function registerMenuRoutes(app: FastifyInstance): void {
  const vendorRepository = new PrismaVendorRepository();
  const menuItemRepository = new PrismaMenuItemRepository();
  const menuItemService = new MenuItemService(menuItemRepository, vendorRepository);

  app.get<{ Params: { vendorId: string }; Querystring: { includeUnavailable?: string } }>(
    '/vendors/:vendorId/menu',
    { schema: { params: vendorParamsSchema, querystring: menuQuerySchema } },
    async (
      request: FastifyRequest<{ Params: { vendorId: string }; Querystring: { includeUnavailable?: string } }>,
      reply: FastifyReply,
    ) => {
      const includeUnavailable = request.query.includeUnavailable === 'true';
      const items = await menuItemService.getVendorMenu(request.params.vendorId, includeUnavailable);
      return reply.send({ data: items, meta: { count: items.length } });
    },
  );

  app.post<{
    Params: { vendorId: string };
    Body: {
      name: string;
      description?: string;
      category?: string;
      priceCents: number;
      currency?: string;
      isAvailable?: boolean;
      sortOrder?: number;
    };
  }>(
    '/vendors/:vendorId/menu',
    { preHandler: app.verifyJWT, schema: { params: vendorParamsSchema, body: createMenuItemBodySchema } },
    async (
      request: FastifyRequest<{
        Params: { vendorId: string };
        Body: {
          name: string;
          description?: string;
          category?: string;
          priceCents: number;
          currency?: string;
          isAvailable?: boolean;
          sortOrder?: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const item = await menuItemService.createMenuItem(request.params.vendorId, request.userId, request.body);
      return reply.status(201).send({ data: item });
    },
  );

  app.patch<{
    Params: { id: string };
    Body: UpdateMenuItemInput;
  }>(
    '/menu-items/:id',
    { preHandler: app.verifyJWT, schema: { params: menuItemParamsSchema, body: updateMenuItemBodySchema } },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateMenuItemInput;
      }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const item = await menuItemService.updateMenuItem(request.params.id, request.userId, request.body);
      return reply.send({ data: item });
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/menu-items/:id',
    { preHandler: app.verifyJWT, schema: { params: menuItemParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      await menuItemService.deleteMenuItem(request.params.id, request.userId);
      return reply.status(204).send();
    },
  );
}
