import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { VendorHoursService } from './VendorHoursService.js';
import type { VendorHoursRepository, VendorRepository } from '../domain/repositories.js';
import { CreateVendorInput, UpsertVendorHoursInput, VendorEntity, VendorHoursEntity, VendorStatus } from '../domain/types.js';
import { ForbiddenError, ValidationError } from '../../../shared/errors.js';

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
    const vendor = this.vendors.get(id);
    if (!vendor) throw new Error('Vendor not found');
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

class InMemoryVendorHoursRepository implements VendorHoursRepository {
  hours = new Map<string, VendorHoursEntity[]>();

  async findByVendor(vendorId: string): Promise<VendorHoursEntity[]> {
    return this.hours.get(vendorId) ?? [];
  }

  async replaceForVendor(vendorId: string, hours: UpsertVendorHoursInput[]): Promise<VendorHoursEntity[]> {
    const saved = hours.map((hour, index) => ({
      id: `hour-${index + 1}`,
      vendorId,
      weekday: hour.weekday,
      opensAt: hour.opensAt,
      closesAt: hour.closesAt,
    }));
    this.hours.set(vendorId, saved);
    return saved;
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

function clock(hour: number, minute: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0, 0));
}

describe('VendorHoursService', () => {
  let vendors: InMemoryVendorRepository;
  let hours: InMemoryVendorHoursRepository;
  let service: VendorHoursService;

  beforeEach(() => {
    vendors = new InMemoryVendorRepository();
    hours = new InMemoryVendorHoursRepository();
    service = new VendorHoursService(vendors, hours);
  });

  test('replaceVendorHours allows owners to set weekly hours', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    const saved = await service.replaceVendorHours('vendor-1', 'owner-1', [
      { weekday: 1, opensAt: clock(9, 0), closesAt: clock(17, 0) },
    ]);

    assert.equal(saved.length, 1);
    assert.equal(saved[0]?.weekday, 1);
  });

  test('replaceVendorHours rejects non-owner writes', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    await assert.rejects(
      service.replaceVendorHours('vendor-1', 'owner-2', [
        { weekday: 1, opensAt: clock(9, 0), closesAt: clock(17, 0) },
      ]),
      ForbiddenError,
    );
  });

  test('replaceVendorHours rejects duplicate weekdays', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    await assert.rejects(
      service.replaceVendorHours('vendor-1', 'owner-1', [
        { weekday: 1, opensAt: clock(9, 0), closesAt: clock(17, 0) },
        { weekday: 1, opensAt: clock(18, 0), closesAt: clock(20, 0) },
      ]),
      ValidationError,
    );
  });

  test('replaceVendorHours rejects closing before opening', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    await assert.rejects(
      service.replaceVendorHours('vendor-1', 'owner-1', [
        { weekday: 1, opensAt: clock(17, 0), closesAt: clock(9, 0) },
      ]),
      ValidationError,
    );
  });
});
