import { VendorRepository } from '../domain/repositories.js';
import { VendorEntity, VendorStatus, CreateVendorInput, UpdateVendorInput } from '../domain/types.js';
import { generateSlug, validatePriceLevel } from '../domain/services.js';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError, 
  ConflictError,
} from '../../../shared/errors.js';
import { validateRequired, validateString, validateNumber } from '../../../shared/validation.js';

export class VendorService {
  constructor(private vendorRepository: VendorRepository) {}

  /**
   * Create a new vendor for the authenticated owner.
   */
  async createVendor(ownerId: string, input: CreateVendorInput): Promise<VendorEntity> {
    validateRequired(input.name, 'Name');
    validateString(input.name, 'Name', 1, 255);
    validateRequired(input.category, 'Category');

    if (input.priceLevel !== undefined) {
      if (!validatePriceLevel(input.priceLevel)) {
        throw new ValidationError('Price level must be between 1 and 5');
      }
    }

    const slug = generateSlug(input.name);
    const existingVendor = await this.vendorRepository.findBySlug(slug);
    if (existingVendor) {
      throw new ConflictError('A vendor with this name already exists');
    }

    return this.vendorRepository.create(ownerId, slug, input);
  }

  /**
   * Get vendor by ID.
   */
  async getVendor(vendorId: string): Promise<VendorEntity> {
    const vendor = await this.vendorRepository.findById(vendorId);
    if (!vendor) {
      throw new NotFoundError('Vendor', vendorId);
    }
    return vendor;
  }

  /**
   * Get all vendors owned by a user.
   */
  async getVendorsByOwner(ownerId: string): Promise<VendorEntity[]> {
    return this.vendorRepository.findByOwnerId(ownerId);
  }

  /**
   * Update vendor (owner only).
   */
  async updateVendor(vendorId: string, ownerId: string, input: UpdateVendorInput): Promise<VendorEntity> {
    const vendor = await this.getVendor(vendorId);
    if (vendor.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to update this vendor');
    }

    if (input.priceLevel !== undefined) {
      if (!validatePriceLevel(input.priceLevel)) {
        throw new ValidationError('Price level must be between 1 and 5');
      }
    }

    const updateData: any = {};
    if (input.name) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.priceLevel !== undefined) {
      updateData.priceLevel = input.priceLevel;
    }
    if (input.status) {
      updateData.status = input.status;
    }

    return this.vendorRepository.update(vendorId, updateData);
  }

  /**
   * Update vendor status (owner only).
   */
  async updateVendorStatus(vendorId: string, ownerId: string, status: VendorStatus): Promise<VendorEntity> {
    const vendor = await this.getVendor(vendorId);
    if (vendor.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to update this vendor');
    }
    return this.vendorRepository.updateStatus(vendorId, status);
  }

  /**
   * Delete vendor (owner only).
   */
  async deleteVendor(vendorId: string, ownerId: string): Promise<void> {
    const vendor = await this.getVendor(vendorId);
    if (vendor.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to delete this vendor');
    }
    await this.vendorRepository.delete(vendorId);
  }
}
