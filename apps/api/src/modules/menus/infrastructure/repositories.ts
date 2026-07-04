import { getPrisma } from '../../../shared/db.js';
import { MenuItemRepository } from '../domain/repositories.js';
import { CreateMenuItemInput, MenuItemEntity, UpdateMenuItemInput } from '../domain/types.js';

export class PrismaMenuItemRepository implements MenuItemRepository {
  private db = getPrisma();

  async create(vendorId: string, input: CreateMenuItemInput): Promise<MenuItemEntity> {
    const item = await this.db.menuItem.create({
      data: {
        vendorId,
        name: input.name,
        priceCents: input.priceCents,
        currency: input.currency ?? 'MXN',
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });
    return this.mapToEntity(item);
  }

  async findById(id: string): Promise<MenuItemEntity | null> {
    const item = await this.db.menuItem.findUnique({ where: { id } });
    return item ? this.mapToEntity(item) : null;
  }

  async findByVendor(vendorId: string, includeUnavailable: boolean = false): Promise<MenuItemEntity[]> {
    const items = await this.db.menuItem.findMany({
      where: {
        vendorId,
        ...(includeUnavailable ? {} : { isAvailable: true }),
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    return items.map((item: any) => this.mapToEntity(item));
  }

  async update(id: string, input: UpdateMenuItemInput): Promise<MenuItemEntity> {
    const item = await this.db.menuItem.update({
      where: { id },
      data: input,
    });
    return this.mapToEntity(item);
  }

  async delete(id: string): Promise<void> {
    await this.db.menuItem.delete({ where: { id } });
  }

  private mapToEntity(item: any): MenuItemEntity {
    return {
      id: item.id,
      vendorId: item.vendorId,
      name: item.name,
      description: item.description,
      category: item.category,
      priceCents: item.priceCents,
      currency: item.currency,
      isAvailable: item.isAvailable,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
