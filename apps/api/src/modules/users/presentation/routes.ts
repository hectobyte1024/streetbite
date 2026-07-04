import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { UserProfileService } from '../application/UserProfileService.js';
import { PrismaUserProfileRepository } from '../infrastructure/repositories.js';

const updateProfileBodySchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    displayName: { anyOf: [{ type: 'string', minLength: 1, maxLength: 80 }, { type: 'null' }] },
  },
} as const;

export function registerUserRoutes(app: FastifyInstance): void {
  const userProfileRepository = new PrismaUserProfileRepository();
  const userProfileService = new UserProfileService(userProfileRepository);

  app.get('/users/me', { preHandler: app.verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const profile = await userProfileService.getProfile(request.userId);
    return reply.send({ data: profile });
  });

  app.patch<{ Body: { displayName?: string | null } }>(
    '/users/me',
    { preHandler: app.verifyJWT, schema: { body: updateProfileBodySchema } },
    async (request: FastifyRequest<{ Body: { displayName?: string | null } }>, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const profile = await userProfileService.updateProfile(request.userId, request.body);
      return reply.send({ data: profile });
    },
  );
}
