import { getPrisma } from '../../../shared/db.js';
import { UserRepository, RefreshTokenRepository } from '../domain/repositories.js';
import { UserEntity, UserRole } from '../domain/types.js';

export class PrismaUserRepository implements UserRepository {
  private db = getPrisma();

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) return null;
    return this.mapToEntity(user);
  }

  async findAuthByEmail(email: string): Promise<{ user: UserEntity; passwordHash: string } | null> {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) return null;

    return {
      user: this.mapToEntity(user),
      passwordHash: user.passwordHash,
    };
  }

  async create(email: string, passwordHash: string, role: UserRole): Promise<UserEntity> {
    const user = await this.db.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
    });
    return this.mapToEntity(user);
  }

  async updateDisplayName(userId: string, displayName: string): Promise<UserEntity> {
    const user = await this.db.user.update({
      where: { id: userId },
      data: { displayName },
    });
    return this.mapToEntity(user);
  }

  private mapToEntity(user: any): UserEntity {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as UserRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  private db = getPrisma();

  async save(userId: string, tokenHash: string, deviceId: string, expiresAt: Date): Promise<void> {
    await this.db.refreshToken.create({
      data: {
        userId,
        tokenHash,
        deviceId,
        expiresAt,
      },
    });
  }

  async findValid(userId: string, tokenHash: string): Promise<boolean> {
    const token = await this.db.refreshToken.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return !!token;
  }

  async revoke(userId: string, tokenHash: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllByUser(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }
}
