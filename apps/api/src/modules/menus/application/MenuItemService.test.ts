import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { VendorRepository } from '../../vendors/domain/repositories.js';
import { CreateVendorInput, VendorEntity, VendorStatus } from '../../vendors/domain/types.js';
import { MenuItemService } from './MenuItemService.js';
import { MenuItemRepository } from '../domain/repositories.js';
import { CreateMenuItemInput, MenuItemEntity, UpdateMenuItemInput } from '../domain/types.js';
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

class InMemoryMenuItemRepository implements MenuItemRepository {
  items = new Map<string, MenuItemEntity>();

  async create(vendorId: string, input: CreateMenuItemInput): Promise<MenuItemEntity> {
    const item = makeMenuItem({
      id: `item-${this.items.size + 1}`,
      vendorId,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      priceCents: input.priceCents,
      currency: input.currency ?? 'MXN',
      isAvailable: input.isAvailable ?? true,
      sortOrder: input.sortOrder ?? 0,
    });
    this.items.set(item.id, item);
    return item;
  }

  async findById(id: string): Promise<MenuItemEntity | null> {
    return this.items.get(id) ?? null;
  }

  async findByVendor(vendorId: string, includeUnavailable: boolean = false): Promise<MenuItemEntity[]> {
    return [...this.items.values()].filter((item) => item.vendorId === vendorId && (includeUnavailable || item.isAvailable));
  }

  async update(id: string, input: UpdateMenuItemInput): Promise<MenuItemEntity> {
    const item = this.items.get(id);
    if (!item) throw new Error('Menu item not found');
    const updated = { ...item, ...input, updatedAt: new Date() };
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
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

function makeMenuItem(overrides: Partial<MenuItemEntity> = {}): MenuItemEntity {
  return {
    id: 'item-1',
    vendorId: 'vendor-1',
    name: 'Taco al pastor',
    description: null,
    category: 'tacos',
    priceCents: 2500,
    currency: 'MXN',
    isAvailable: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MenuItemService', () => {
  let vendors: InMemoryVendorRepository;
  let menuItems: InMemoryMenuItemRepository;
  let service: MenuItemService;

  beforeEach(() => {
    vendors = new InMemoryVendorRepository();
    menuItems = new InMemoryMenuItemRepository();
    service = new MenuItemService(menuItems, vendors);
  });

  test('createMenuItem allows vendor owners to add items', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    const item = await service.createMenuItem('vendor-1', 'owner-1', {
      name: '  Taco al pastor  ',
      priceCents: 2500,
    });

    assert.equal(item.name, 'Taco al pastor');
    assert.equal(item.currency, 'MXN');
  });

  test('createMenuItem rejects non-owner writes', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    await assert.rejects(
      service.createMenuItem('vendor-1', 'owner-2', { name: 'Taco al pastor', priceCents: 2500 }),
      ForbiddenError,
    );
  });

  test('createMenuItem rejects invalid prices', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));

    await assert.rejects(
      service.createMenuItem('vendor-1', 'owner-1', { name: 'Taco al pastor', priceCents: -1 }),
      ValidationError,
    );
  });

  test('getVendorMenu hides unavailable items by default', async () => {
    menuItems.items.set('item-1', makeMenuItem({ isAvailable: true }));
    menuItems.items.set('item-2', makeMenuItem({ id: 'item-2', isAvailable: false }));

    const publicItems = await service.getVendorMenu('vendor-1');
    const ownerItems = await service.getVendorMenu('vendor-1', true);

    assert.equal(publicItems.length, 1);
    assert.equal(ownerItems.length, 2);
  });

  test('updateMenuItem validates ownership through the item vendor', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));
    menuItems.items.set('item-1', makeMenuItem({ vendorId: 'vendor-1' }));

    await assert.rejects(
      service.updateMenuItem('item-1', 'owner-2', { name: 'New taco' }),
      ForbiddenError,
    );
  });

  test('deleteMenuItem removes items for owners', async () => {
    vendors.vendors.set('vendor-1', makeVendor({ ownerId: 'owner-1' }));
    menuItems.items.set('item-1', makeMenuItem({ vendorId: 'vendor-1' }));

    await service.deleteMenuItem('item-1', 'owner-1');

    assert.equal(await menuItems.findById('item-1'), null);
  });

  test('getMenuItem rejects missing items', async () => {
    await assert.rejects(service.getMenuItem('missing-item'), NotFoundError);
  });
});
