import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../application/AuthService.js';
import { PrismaUserRepository, PrismaRefreshTokenRepository } from '../infrastructure/repositories.js';

const credentialsBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', format: 'email', minLength: 3, maxLength: 320 },
    password: { type: 'string', minLength: 8, maxLength: 256 },
  },
} as const;

const refreshBodySchema = {
  type: 'object',
  required: ['refreshToken'],
  additionalProperties: false,
  properties: {
    refreshToken: { type: 'string', minLength: 1 },
  },
} as const;

export function registerAuthRoutes(app: FastifyInstance): void {
  const userRepository = new PrismaUserRepository();
  const refreshTokenRepository = new PrismaRefreshTokenRepository();
  const authService = new AuthService(userRepository, refreshTokenRepository);

  app.post<{ Body: { email: string; password: string } }>(
    '/auth/register',
    { schema: { body: credentialsBodySchema } },
    async (request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) => {
      const deviceId = request.headers['x-device-id'] as string || 'unknown';
      const tokens = await authService.register(
        { email: request.body.email, password: request.body.password },
        deviceId,
      );
      return reply.status(201).send({ data: tokens });
    },
  );

  app.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    { schema: { body: credentialsBodySchema } },
    async (request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) => {
      const deviceId = request.headers['x-device-id'] as string || 'unknown';
      const tokens = await authService.login(
        { email: request.body.email, password: request.body.password },
        deviceId,
      );
      return reply.send({ data: tokens });
    },
  );

  app.post<{ Body: { refreshToken: string } }>(
    '/auth/refresh',
    { schema: { body: refreshBodySchema } },
    async (request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) => {
      const accessToken = await authService.refreshAccessToken(request.body.refreshToken);
      return reply.send({ data: { accessToken } });
    },
  );

  app.post('/auth/logout', { preHandler: app.verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    await authService.logout(userId);
    return reply.status(204).send();
  });
}
