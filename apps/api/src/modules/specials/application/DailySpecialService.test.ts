import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { VendorRepository } from '../../vendors/domain/repositories.js';
import { CreateVendorInput, VendorEntity, VendorStatus } from '../../vendors/domain/types.js';
import { DailySpecialService } from './DailySpecialService.js';
import { DailySpecialRepository } from '../domain/repositories.js';
import { CreateDailySpecialInput, DailySpecialEntity, UpdateDailySpecialInput } from '../domain/types.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors.js';

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

class InMemoryDailySpecialRepository implements DailySpecialRepository {
  specials = new Map<string, DailySpecialEntity>();

  async create(vendorId: string, input: CreateDailySpecialInput): Promise<DailySpecialEntity> {
    const special = makeSpecial({
      id: `special-${this.specials.size + 1}`,
      vendorId,
      title: input.title,
      description: input.description ?? null,
      priceCents: input.priceCents ?? null,
      currency: input.currency ?? 'MXN',
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    });
    this.specials.set(special.id, special);
    return special;
  }

  async findById(id: string): Promise<DailySpecialEntity | null> {
    return this.specials.get(id) ?? null;
  }

  async findByVendor(vendorId: string, limit: number = 50, offset: number = 0): Promise<DailySpecialEntity[]> {
    return [...this.specials.values()].filter((special) => special.vendorId === vendorId).slice(offset, offset + limit);
  }

  async findActive(now: Date, limit: number = 50, offset: number = 0): Promise<DailySpecialEntity[]> {
    return [...this.specials.values()]
      .filter((special) => special.isActive && special.startsAt <= now && special.endsAt > now)
      .slice(offset, offset + limit);
  }

  async update(id: string, input: UpdateDailySpecialInput): Promise<DailySpecialEntity> {
    const special = this.specials.get(id);
    if (!special) throw new Error('Special not found');
    const updated = { ...special, ...input, updatedAt: new Date() };
    this.specials.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.specials.delete(id);
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

function makeSpecial(overrides: Partial<DailySpecialEntity> = {}): DailySpecialEntity {
  const startsAt = new Date('2026-07-03T16:00:00.000Z');
  const endsAt = new Date('2026-07-04T02:00:00.000Z');
  return {
    id: 'special-1',
    vendorId: 'vendor-1',
    title: 'Taco Tuesday',
    description: null,
    priceCents: 4500,
    currency: 'MXN',
    startsAt,
    endsAt,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('DailySpecialService', () => {
  let vendors: InMemoryVendorRepository;
  let specials: InMemoryDailySpecialRepository;
  let service: DailySpecialService;

  beforeEach(() => {
    vendors = new InMemoryVendorRepository();
    specials = new InMemoryDailySpecialRepository();
    service = new DailySpecialService(specials, vendors);
  });

  test('createSpecial allows vendor owners to publish specials', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    const special = await service.createSpecial('vendor-1', 'owner-1', {
      title: '  Tacos al pastor  ',
      startsAt: new Date('2026-07-03T16:00:00.000Z'),
      endsAt: new Date('2026-07-04T02:00:00.000Z'),
    });

    assert.equal(special.title, 'Tacos al pastor');
    assert.equal(special.currency, 'MXN');
  });

  test('createSpecial rejects non-owner writes', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    await assert.rejects(
      service.createSpecial('vendor-1', 'owner-2', {
        title: 'Tacos al pastor',
        startsAt: new Date('2026-07-03T16:00:00.000Z'),
        endsAt: new Date('2026-07-04T02:00:00.000Z'),
      }),
      ForbiddenError,
    );
  });

  test('createSpecial rejects invalid time windows', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    await assert.rejects(
      service.createSpecial('vendor-1', 'owner-1', {
        title: 'Tacos al pastor',
        startsAt: new Date('2026-07-04T02:00:00.000Z'),
        endsAt: new Date('2026-07-03T16:00:00.000Z'),
      }),
      ValidationError,
    );
  });

  test('updateSpecial validates ownership through the special vendor', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));
    specials.specials.set('special-1', makeSpecial({ vendorId: 'vendor-1' }));

    await assert.rejects(
      service.updateSpecial('special-1', 'owner-2', { title: 'New special' }),
      ForbiddenError,
    );
  });

  test('deleteSpecial removes existing specials for owners', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));
    specials.specials.set('special-1', makeSpecial({ vendorId: 'vendor-1' }));

    await service.deleteSpecial('special-1', 'owner-1');

    assert.equal(await specials.findById('special-1'), null);
  });

  test('getSpecial rejects missing specials', async () => {
    await assert.rejects(service.getSpecial('missing-special'), NotFoundError);
  });
});
