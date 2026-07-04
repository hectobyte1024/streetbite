import { VendorRepository } from '../../vendors/domain/repositories.js';
import { MenuItemRepository } from '../domain/repositories.js';
import { CreateMenuItemInput, MenuItemEntity, UpdateMenuItemInput } from '../domain/types.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors.js';

export class MenuItemService {
  constructor(
    private menuItemRepository: MenuItemRepository,
    private vendorRepository: VendorRepository,
  ) {}

  async createMenuItem(vendorId: string, ownerId: string, input: CreateMenuItemInput): Promise<MenuItemEntity> {
    await this.assertVendorOwner(vendorId, ownerId);
    this.validateCreateInput(input);
    return this.menuItemRepository.create(vendorId, this.normalizeCreateInput(input));
  }

  async getMenuItem(menuItemId: string): Promise<MenuItemEntity> {
    const item = await this.menuItemRepository.findById(menuItemId);
    if (!item) {
      throw new NotFoundError('Menu item', menuItemId);
    }
    return item;
  }

  async getVendorMenu(vendorId: string, includeUnavailable: boolean = false): Promise<MenuItemEntity[]> {
    return this.menuItemRepository.findByVendor(vendorId, includeUnavailable);
  }

  async updateMenuItem(menuItemId: string, ownerId: string, input: UpdateMenuItemInput): Promise<MenuItemEntity> {
    const item = await this.getMenuItem(menuItemId);
    await this.assertVendorOwner(item.vendorId, ownerId);
    this.validateUpdateInput(input);
    return this.menuItemRepository.update(menuItemId, this.normalizeUpdateInput(input));
  }

  async deleteMenuItem(menuItemId: string, ownerId: string): Promise<void> {
    const item = await this.getMenuItem(menuItemId);
    await this.assertVendorOwner(item.vendorId, ownerId);
    await this.menuItemRepository.delete(menuItemId);
  }

  private async assertVendorOwner(vendorId: string, ownerId: string): Promise<void> {
    const vendor = await this.vendorRepository.findById(vendorId);
    if (!vendor) {
      throw new NotFoundError('Vendor', vendorId);
    }
    if (vendor.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to manage this vendor menu');
    }
  }

  private validateCreateInput(input: CreateMenuItemInput): void {
    this.validateName(input.name);
    this.validateOptionalText(input.description, 'Description', 1000);
    this.validateOptionalText(input.category, 'Category', 80);
    this.validatePrice(input.priceCents);
    this.validateCurrency(input.currency ?? 'MXN');
    this.validateSortOrder(input.sortOrder ?? 0);
  }

  private validateUpdateInput(input: UpdateMenuItemInput): void {
    if (input.name !== undefined) this.validateName(input.name);
    if (input.description !== undefined) this.validateOptionalText(input.description, 'Description', 1000);
    if (input.category !== undefined) this.validateOptionalText(input.category, 'Category', 80);
    if (input.priceCents !== undefined) this.validatePrice(input.priceCents);
    if (input.currency !== undefined) this.validateCurrency(input.currency);
    if (input.sortOrder !== undefined) this.validateSortOrder(input.sortOrder);
  }

  private validateName(name: string): void {
    if (name.trim().length === 0 || name.length > 120) {
      throw new ValidationError('Menu item name must be 1-120 characters');
    }
  }

  private validateOptionalText(value: string | null | undefined, fieldName: string, maxLength: number): void {
    if (value === null || value === undefined) return;
    if (value.trim().length === 0 || value.length > maxLength) {
      throw new ValidationError(`${fieldName} must be 1-${maxLength} characters`);
    }
  }

  private validatePrice(priceCents: number): void {
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      throw new ValidationError('Menu item price must be a non-negative integer in cents');
    }
  }

  private validateCurrency(currency: string): void {
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new ValidationError('Currency must be a 3-letter ISO code');
    }
  }

  private validateSortOrder(sortOrder: number): void {
    if (!Number.isInteger(sortOrder)) {
      throw new ValidationError('Sort order must be an integer');
    }
  }

  private normalizeCreateInput(input: CreateMenuItemInput): CreateMenuItemInput {
    return {
      ...input,
      name: input.name.trim(),
      currency: input.currency ?? 'MXN',
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category.trim() } : {}),
    };
  }

  private normalizeUpdateInput(input: UpdateMenuItemInput): UpdateMenuItemInput {
    return {
      ...input,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined && input.description !== null ? { description: input.description.trim() } : {}),
      ...(input.category !== undefined && input.category !== null ? { category: input.category.trim() } : {}),
    };
  }
}
