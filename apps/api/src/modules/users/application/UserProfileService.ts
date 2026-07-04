import { UserProfileRepository } from '../domain/repositories.js';
import { UpdateUserProfileInput, UserProfile } from '../domain/types.js';
import { NotFoundError, ValidationError } from '../../../shared/errors.js';

export class UserProfileService {
  constructor(private userProfileRepository: UserProfileRepository) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userProfileRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return user;
  }

  async updateProfile(userId: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    const normalized = this.normalize(input);
    this.validate(normalized);
    await this.getProfile(userId);
    return this.userProfileRepository.update(userId, normalized);
  }

  private normalize(input: UpdateUserProfileInput): UpdateUserProfileInput {
    if (input.displayName === undefined || input.displayName === null) {
      return input;
    }
    return {
      ...input,
      displayName: input.displayName.trim(),
    };
  }

  private validate(input: UpdateUserProfileInput): void {
    if (input.displayName === undefined || input.displayName === null) {
      return;
    }
    if (input.displayName.length < 1 || input.displayName.length > 80) {
      throw new ValidationError('Display name must be 1-80 characters');
    }
  }
}
