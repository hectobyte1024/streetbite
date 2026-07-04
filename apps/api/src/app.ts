import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { registerAuthRoutes } from './modules/auth/index.js';
import { registerVendorRoutes } from './modules/vendors/index.js';
import { registerDiscoveryRoutes } from './modules/discovery/index.js';
import { registerReviewRoutes } from './modules/reviews/index.js';
import { registerGeolocationRoutes } from './modules/geolocation/index.js';
import { registerSpecialRoutes } from './modules/specials/index.js';
import { registerMenuRoutes } from './modules/menus/index.js';
import { registerUserRoutes } from './modules/users/index.js';
import { registerFeedRoutes } from './modules/feed/index.js';
import { AppError, UnauthorizedError } from './shared/errors.js';
import { verifyToken } from './shared/jwt.js';

declare module 'fastify' {
  interface FastifyInstance {
    verifyJWT: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    userId?: string;
    userRole?: string;
  }
}

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV === 'test' ? false : true });

  // Global error handler
  app.setErrorHandler(async (error: Error & { statusCode?: number; code?: string }, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code ?? 'BAD_REQUEST',
          message: error.message,
        },
      });
    }

    // Log unexpected errors
    app.log.error(error);

    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  // JWT verification middleware (optional, only for protected routes)
  app.decorate('verifyJWT', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token, 'access');
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    request.userId = payload.userId;
    request.userRole = payload.role;
  });

  // Register modules
  registerAuthRoutes(app);
  registerVendorRoutes(app);
  registerDiscoveryRoutes(app);
  registerReviewRoutes(app);
  registerGeolocationRoutes(app);
  registerSpecialRoutes(app);
  registerMenuRoutes(app);
  registerUserRoutes(app);
  registerFeedRoutes(app);

  app.get('/health', async () => ({
    ok: true,
    service: 'streetbite2-api',
  }));

  return app;
}
