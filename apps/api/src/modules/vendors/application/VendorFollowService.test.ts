import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { VendorFollowService } from './VendorFollowService.js';
import type { VendorFollowRepository, VendorRepository } from '../domain/repositories.js';
import { FollowedVendor, VendorEntity, VendorFollowEntity, VendorStatus } from '../domain/types.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../shared/errors.js';

class InMemoryVendorRepository implements VendorRepository {
  vendors = new Map<string, VendorEntity>();

  async findById(id: string): Promise<VendorEntity | null> {
    return this.vendors.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<VendorEntity | null> {
    return [...this.vendors.values()].find((vendor) => vendor.slug === slug) ?? null;
  }

  async findByOwnerId(ownerId: string): Promise<VendorEntity[]> {
    return [...this.vendors.values()].filter((vendor) => vendor.ownerId === ownerId);
  }

  async create(ownerId: string, name: string, slug: string, category: string): Promise<VendorEntity> {
    const vendor = makeVendor({ id: `vendor-${this.vendors.size + 1}`, ownerId, name, slug, category });
    this.vendors.set(vendor.id, vendor);
    return vendor;
  }

  async update(id: string, data: Partial<VendorEntity>): Promise<VendorEntity> {
    const vendor = this.vendors.get(id);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    const updated = { ...vendor, ...data };
    this.vendors.set(id, updated);
    return updated;
  }

  async updateStatus(id: string, status: VendorStatus): Promise<VendorEntity> {
    return this.update(id, { status });
  }

  async delete(id: string): Promise<void> {
    this.vendors.delete(id);
  }
}

class InMemoryVendorFollowRepository implements VendorFollowRepository {
  follows = new Map<string, VendorFollowEntity>();
  followedVendors: FollowedVendor[] = [];

  async findFollow(vendorId: string, userId: string): Promise<VendorFollowEntity | null> {
    return this.follows.get(this.key(vendorId, userId)) ?? null;
  }

  async follow(vendorId: string, userId: string): Promise<VendorFollowEntity> {
    const follow = {
      id: `follow-${this.follows.size + 1}`,
      vendorId,
      userId,
      createdAt: new Date(),
    };
    this.follows.set(this.key(vendorId, userId), follow);
    return follow;
  }

  async unfollow(vendorId: string, userId: string): Promise<void> {
    this.follows.delete(this.key(vendorId, userId));
  }

  async findFollowedVendors(userId: string, limit: number = 50, offset: number = 0): Promise<FollowedVendor[]> {
    return this.followedVendors.slice(offset, offset + limit);
  }

  private key(vendorId: string, userId: string): string {
    return `${vendorId}:${userId}`;
  }
}

function makeVendor(overrides: Partial<VendorEntity> = {}): VendorEntity {
  return {
    id: 'vendor-1',
    ownerId: 'owner-1',
    name: 'Taco Stand',
    slug: 'taco-stand',
    status: VendorStatus.ACTIVE,
    category: 'tacos',
    priceLevel: null,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('VendorFollowService', () => {
  let vendors: InMemoryVendorRepository;
  let follows: InMemoryVendorFollowRepository;
  let service: VendorFollowService;

  beforeEach(() => {
    vendors = new InMemoryVendorRepository();
    follows = new InMemoryVendorFollowRepository();
    service = new VendorFollowService(vendors, follows);
  });

  test('followVendor creates a follow for an existing vendor', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    const follow = await service.followVendor('vendor-1', 'user-1');

    assert.equal(follow.vendorId, 'vendor-1');
    assert.equal(follow.userId, 'user-1');
  });

  test('followVendor rejects missing vendors', async () => {
    await assert.rejects(service.followVendor('missing-vendor', 'user-1'), NotFoundError);
  });

  test('followVendor rejects following your own vendor', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'user-1' }));

    await assert.rejects(service.followVendor('vendor-1', 'user-1'), ForbiddenError);
  });

  test('followVendor rejects duplicate follows', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));
    await service.followVendor('vendor-1', 'user-1');

    await assert.rejects(service.followVendor('vendor-1', 'user-1'), ConflictError);
  });

  test('unfollowVendor is idempotent', async () => {
    await service.unfollowVendor('vendor-1', 'user-1');

    assert.equal(await follows.findFollow('vendor-1', 'user-1'), null);
  });
});
