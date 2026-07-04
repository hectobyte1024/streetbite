import { getPrisma } from '../../../shared/db.js';
import { UserProfileRepository } from '../domain/repositories.js';
import { UpdateUserProfileInput, UserProfile, UserRole } from '../domain/types.js';

export class PrismaUserProfileRepository implements UserProfileRepository {
  private db = getPrisma();

  async findById(id: string): Promise<UserProfile | null> {
    const user = await this.db.user.findUnique({ where: { id } });
    return user ? this.mapToProfile(user) : null;
  }

  async update(id: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    const user = await this.db.user.update({
      where: { id },
      data: input,
    });
    return this.mapToProfile(user);
  }

  private mapToProfile(user: any): UserProfile {
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
