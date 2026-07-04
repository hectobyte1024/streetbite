import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { FeedService } from '../application/FeedService.js';
import { PrismaFeedRepository } from '../infrastructure/repositories.js';

const feedQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    limit: { type: 'string', pattern: '^\\d+$' },
    offset: { type: 'string', pattern: '^\\d+$' },
  },
} as const;

export function registerFeedRoutes(app: FastifyInstance): void {
  const feedRepository = new PrismaFeedRepository();
  const feedService = new FeedService(feedRepository);

  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/feed',
    { preHandler: app.verifyJWT, schema: { querystring: feedQuerySchema } },
    async (request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
      const items = await feedService.getPersonalFeed(request.userId, new Date(), limit, offset);
      return reply.send({ data: items, meta: { count: items.length } });
    },
  );
}
