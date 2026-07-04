import { CreateMenuItemInput, MenuItemEntity, UpdateMenuItemInput } from './types.js';

export interface MenuItemRepository {
  create(vendorId: string, input: CreateMenuItemInput): Promise<MenuItemEntity>;
  findById(id: string): Promise<MenuItemEntity | null>;
  findByVendor(vendorId: string, includeUnavailable?: boolean): Promise<MenuItemEntity[]>;
  update(id: string, input: UpdateMenuItemInput): Promise<MenuItemEntity>;
  delete(id: string): Promise<void>;
}
