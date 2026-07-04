import { UpdateUserProfileInput, UserProfile } from './types.js';

export interface UserProfileRepository {
  findById(id: string): Promise<UserProfile | null>;
  update(id: string, input: UpdateUserProfileInput): Promise<UserProfile>;
}
