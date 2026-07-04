import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { UserProfileService } from './UserProfileService.js';
import type { UserProfileRepository } from '../domain/repositories.js';
import { UpdateUserProfileInput, UserProfile, UserRole } from '../domain/types.js';
import { NotFoundError, ValidationError } from '../../../shared/errors.js';

class InMemoryUserProfileRepository implements UserProfileRepository {
  users = new Map<string, UserProfile>();

  async findById(id: string): Promise<UserProfile | null> {
    return this.users.get(id) ?? null;
  }

  async update(id: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }
    const updated = { ...user, ...input, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }
}

function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: null,
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('UserProfileService', () => {
  let repository: InMemoryUserProfileRepository;
  let service: UserProfileService;

  beforeEach(() => {
    repository = new InMemoryUserProfileRepository();
    service = new UserProfileService(repository);
  });

  test('getProfile returns existing users', async () => {
    repository.users.set('user-1', makeUser({ displayName: 'Ana' }));

    const profile = await service.getProfile('user-1');

    assert.equal(profile.email, 'test@example.com');
    assert.equal(profile.displayName, 'Ana');
  });

  test('getProfile rejects missing users', async () => {
    await assert.rejects(service.getProfile('missing-user'), NotFoundError);
  });

  test('updateProfile trims display names', async () => {
    repository.users.set('user-1', makeUser());

    const profile = await service.updateProfile('user-1', { displayName: '  Ana Foodie  ' });

    assert.equal(profile.displayName, 'Ana Foodie');
  });

  test('updateProfile allows clearing display names', async () => {
    repository.users.set('user-1', makeUser({ displayName: 'Ana' }));

    const profile = await service.updateProfile('user-1', { displayName: null });

    assert.equal(profile.displayName, null);
  });

  test('updateProfile rejects empty display names', async () => {
    repository.users.set('user-1', makeUser());

    await assert.rejects(service.updateProfile('user-1', { displayName: '   ' }), ValidationError);
  });
});
