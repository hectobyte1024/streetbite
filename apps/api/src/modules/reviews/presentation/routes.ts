import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ReviewService } from '../application/ReviewService.js';
import { PrismaReviewRepository } from '../infrastructure/repositories.js';

const reviewParamsSchema = {
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

const createReviewBodySchema = {
  type: 'object',
  required: ['vendorId', 'rating'],
  additionalProperties: false,
  properties: {
    vendorId: { type: 'string', minLength: 1 },
    rating: { type: 'integer', minimum: 1, maximum: 5 },
    body: { type: 'string', minLength: 1, maxLength: 1000 },
  },
} as const;

const updateReviewBodySchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    rating: { type: 'integer', minimum: 1, maximum: 5 },
    body: { anyOf: [{ type: 'string', minLength: 1, maxLength: 1000 }, { type: 'null' }] },
  },
} as const;

export function registerReviewRoutes(app: FastifyInstance): void {
  const reviewRepository = new PrismaReviewRepository();
  const reviewService = new ReviewService(reviewRepository);

  // Create review
  app.post<{
    Body: { vendorId: string; rating: number; body?: string };
  }>(
    '/reviews',
    { preHandler: app.verifyJWT, schema: { body: createReviewBodySchema } },
    async (
      request: FastifyRequest<{
        Body: { vendorId: string; rating: number; body?: string };
      }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const input: any = {
        vendorId: request.body.vendorId,
        rating: request.body.rating,
      };
      if (request.body.body !== undefined) {
        input.body = request.body.body;
      }
      const review = await reviewService.createReview(request.userId, input);
      return reply.status(201).send({ data: review });
    },
  );

  // Get review by ID
  app.get<{ Params: { id: string } }>(
    '/reviews/:id',
    { schema: { params: reviewParamsSchema } },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const review = await reviewService.getReview(request.params.id);
      return reply.send({ data: review });
    },
  );

  // Get all reviews for a vendor
  app.get<{
    Params: { vendorId: string };
    Querystring: { limit?: string; offset?: string };
  }>(
    '/vendors/:vendorId/reviews',
    { schema: { params: vendorParamsSchema, querystring: paginationQuerySchema } },
    async (
      request: FastifyRequest<{
        Params: { vendorId: string };
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
      const reviews = await reviewService.getVendorReviews(request.params.vendorId, limit, offset);
      return reply.send({ data: reviews, meta: { count: reviews.length } });
    },
  );

  // Get all reviews by current user
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/reviews/my/list',
    { preHandler: app.verifyJWT, schema: { querystring: paginationQuerySchema } },
    async (
      request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
      const reviews = await reviewService.getUserReviews(request.userId, limit, offset);
      return reply.send({ data: reviews, meta: { count: reviews.length } });
    },
  );

  // Update review
  app.patch<{
    Params: { id: string };
    Body: { rating?: number; body?: string | null };
  }>(
    '/reviews/:id',
    { preHandler: app.verifyJWT, schema: { params: reviewParamsSchema, body: updateReviewBodySchema } },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { rating?: number; body?: string | null };
      }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const input: any = {};
      if (request.body.rating !== undefined) {
        input.rating = request.body.rating;
      }
      if (request.body.body !== undefined) {
        input.body = request.body.body;
      }
      const review = await reviewService.updateReview(request.params.id, request.userId, input);
      return reply.send({ data: review });
    },
  );

  // Delete review
  app.delete<{ Params: { id: string } }>(
    '/reviews/:id',
    { preHandler: app.verifyJWT, schema: { params: reviewParamsSchema } },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      await reviewService.deleteReview(request.params.id, request.userId);
      return reply.status(204).send();
    },
  );

  // Get rating summary for a vendor
  app.get<{ Params: { vendorId: string } }>(
    '/vendors/:vendorId/rating-summary',
    { schema: { params: vendorParamsSchema } },
    async (
      request: FastifyRequest<{ Params: { vendorId: string } }>,
      reply: FastifyReply,
    ) => {
      const summary = await reviewService.getVendorRatingSummary(request.params.vendorId);
      return reply.send({ data: summary });
    },
  );
}
