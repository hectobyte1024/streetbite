import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { AuthService } from './AuthService.js';
import type { RefreshTokenRepository, UserRepository } from '../domain/repositories.js';
import { UserEntity, UserRole } from '../domain/types.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../../../shared/errors.js';
import { hashPassword, hashToken } from '../../../shared/crypto.js';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

class InMemoryUserRepository implements UserRepository {
  users = new Map<string, UserEntity & { passwordHash: string }>();

  async findById(id: string): Promise<UserEntity | null> {
    const user = this.users.get(id);
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = [...this.users.values()].find((candidate) => candidate.email === email);
    return user ? this.toEntity(user) : null;
  }

  async findAuthByEmail(email: string): Promise<{ user: UserEntity; passwordHash: string } | null> {
    const user = [...this.users.values()].find((candidate) => candidate.email === email);
    return user ? { user: this.toEntity(user), passwordHash: user.passwordHash } : null;
  }

  async create(email: string, passwordHash: string, role: UserRole): Promise<UserEntity> {
    const user = {
      id: `user-${this.users.size + 1}`,
      email,
      passwordHash,
      role,
      displayName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return this.toEntity(user);
  }

  async updateDisplayName(userId: string, displayName: string): Promise<UserEntity> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.displayName = displayName;
    return this.toEntity(user);
  }

  private toEntity(user: UserEntity & { passwordHash: string }): UserEntity {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  tokens: Array<{ userId: string; tokenHash: string; deviceId: string; expiresAt: Date; revokedAt: Date | null }> = [];

  async save(userId: string, tokenHash: string, deviceId: string, expiresAt: Date): Promise<void> {
    this.tokens.push({ userId, tokenHash, deviceId, expiresAt, revokedAt: null });
  }

  async findValid(userId: string, tokenHash: string): Promise<boolean> {
    return this.tokens.some(
      (token) =>
        token.userId === userId &&
        token.tokenHash === tokenHash &&
        token.revokedAt === null &&
        token.expiresAt > new Date(),
    );
  }

  async revoke(userId: string, tokenHash: string): Promise<void> {
    for (const token of this.tokens) {
      if (token.userId === userId && token.tokenHash === tokenHash) {
        token.revokedAt = new Date();
      }
    }
  }

  async revokeAllByUser(userId: string): Promise<void> {
    for (const token of this.tokens) {
      if (token.userId === userId) {
        token.revokedAt = new Date();
      }
    }
  }
}

describe('AuthService', () => {
  let users: InMemoryUserRepository;
  let refreshTokens: InMemoryRefreshTokenRepository;
  let service: AuthService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    refreshTokens = new InMemoryRefreshTokenRepository();
    service = new AuthService(users, refreshTokens);
  });

  test('register creates a customer and stores a refresh token hash', async () => {
    const tokens = await service.register({ email: 'test@example.com', password: 'Pass1234!' }, 'device-1');

    assert.equal(typeof tokens.accessToken, 'string');
    assert.equal(typeof tokens.refreshToken, 'string');
    assert.equal(refreshTokens.tokens.length, 1);
    assert.equal(refreshTokens.tokens[0]?.deviceId, 'device-1');
    assert.equal(refreshTokens.tokens[0]?.tokenHash, hashToken(tokens.refreshToken));

    const user = await users.findByEmail('test@example.com');
    assert.equal(user?.role, UserRole.CUSTOMER);
  });

  test('register rejects duplicate email addresses', async () => {
    await service.register({ email: 'test@example.com', password: 'Pass1234!' }, 'device-1');

    await assert.rejects(
      service.register({ email: 'test@example.com', password: 'Pass1234!' }, 'device-2'),
      ConflictError,
    );
  });

  test('register rejects weak passwords', async () => {
    await assert.rejects(
      service.register({ email: 'test@example.com', password: 'short' }, 'device-1'),
      ValidationError,
    );
  });

  test('login rejects invalid credentials', async () => {
    await users.create('test@example.com', hashPassword('Pass1234!'), UserRole.CUSTOMER);

    await assert.rejects(
      service.login({ email: 'test@example.com', password: 'wrong-password' }, 'device-1'),
      UnauthorizedError,
    );
  });

  test('refreshAccessToken rejects revoked refresh tokens', async () => {
    const tokens = await service.register({ email: 'test@example.com', password: 'Pass1234!' }, 'device-1');
    await service.logout('user-1');

    await assert.rejects(service.refreshAccessToken(tokens.refreshToken), UnauthorizedError);
  });
});
