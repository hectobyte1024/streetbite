import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { VendorService } from './VendorService.js';
import type { VendorRepository } from '../domain/repositories.js';
import { CreateVendorInput, VendorEntity, VendorStatus } from '../domain/types.js';
import { ConflictError, ForbiddenError, ValidationError } from '../../../shared/errors.js';

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

  async create(ownerId: string, slug: string, input: CreateVendorInput): Promise<VendorEntity> {
    const vendor = makeVendor({
      id: `vendor-${this.vendors.size + 1}`,
      ownerId,
      name: input.name,
      slug,
      category: input.category,
      description: input.description ?? null,
      priceLevel: input.priceLevel ?? null,
    });
    this.vendors.set(vendor.id, vendor);
    return vendor;
  }

  async update(id: string, data: Partial<VendorEntity>): Promise<VendorEntity> {
    const current = this.vendors.get(id);
    if (!current) {
      throw new Error('Vendor not found');
    }
    const updated = { ...current, ...data, updatedAt: new Date() };
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

function makeVendor(overrides: Partial<VendorEntity> = {}): VendorEntity {
  return {
    id: 'vendor-1',
    ownerId: 'owner-1',
    name: 'Taco Stand',
    slug: 'taco-stand',
    status: VendorStatus.DRAFT,
    category: 'tacos',
    priceLevel: null,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('VendorService', () => {
  let repository: InMemoryVendorRepository;
  let service: VendorService;

  beforeEach(() => {
    repository = new InMemoryVendorRepository();
    service = new VendorService(repository);
  });

  test('createVendor generates a slug and stores the vendor for the owner', async () => {
    const vendor = await service.createVendor('owner-1', {
      name: 'Best Tacos CDMX!',
      category: 'tacos',
      description: 'Fresh trompo near the metro',
      priceLevel: 2,
    });

    assert.equal(vendor.ownerId, 'owner-1');
    assert.equal(vendor.slug, 'best-tacos-cdmx');
    assert.equal(vendor.status, VendorStatus.DRAFT);
    assert.equal(vendor.description, 'Fresh trompo near the metro');
    assert.equal(vendor.priceLevel, 2);
  });

  test('createVendor rejects duplicate slugs', async () => {
    repository.vendors.set('vendor-1', makeVendor({ slug: 'taco-stand' }));

    await assert.rejects(
      service.createVendor('owner-1', { name: 'Taco Stand', category: 'tacos' }),
      ConflictError,
    );
  });

  test('createVendor rejects invalid price levels', async () => {
    await assert.rejects(
      service.createVendor('owner-1', { name: 'Taco Stand', category: 'tacos', priceLevel: 6 }),
      ValidationError,
    );
  });

  test('updateVendor rejects non-owner updates', async () => {
    repository.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    await assert.rejects(
      service.updateVendor('vendor-1', 'owner-2', { name: 'New Name' }),
      ForbiddenError,
    );
  });

  test('deleteVendor removes vendor when requested by owner', async () => {
    repository.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    await service.deleteVendor('vendor-1', 'owner-1');

    assert.equal(await repository.findById('vendor-1'), null);
  });
});
