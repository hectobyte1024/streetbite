import { UserEntity, UserRole } from './types.js';

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findAuthByEmail(email: string): Promise<{ user: UserEntity; passwordHash: string } | null>;
  create(email: string, passwordHash: string, role: UserRole): Promise<UserEntity>;
  updateDisplayName(userId: string, displayName: string): Promise<UserEntity>;
}

export interface RefreshTokenRepository {
  save(userId: string, tokenHash: string, deviceId: string, expiresAt: Date): Promise<void>;
  findValid(userId: string, tokenHash: string): Promise<boolean>;
  revoke(userId: string, tokenHash: string): Promise<void>;
  revokeAllByUser(userId: string): Promise<void>;
}
