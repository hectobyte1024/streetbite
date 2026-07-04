import { VendorHoursRepository, VendorRepository } from '../domain/repositories.js';
import { UpsertVendorHoursInput, VendorHoursEntity } from '../domain/types.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors.js';

export class VendorHoursService {
  constructor(
    private vendorRepository: VendorRepository,
    private vendorHoursRepository: VendorHoursRepository,
  ) {}

  async getVendorHours(vendorId: string): Promise<VendorHoursEntity[]> {
    return this.vendorHoursRepository.findByVendor(vendorId);
  }

  async replaceVendorHours(
    vendorId: string,
    ownerId: string,
    hours: UpsertVendorHoursInput[],
  ): Promise<VendorHoursEntity[]> {
    await this.assertVendorOwner(vendorId, ownerId);
    this.validateHours(hours);
    return this.vendorHoursRepository.replaceForVendor(vendorId, hours);
  }

  private async assertVendorOwner(vendorId: string, ownerId: string): Promise<void> {
    const vendor = await this.vendorRepository.findById(vendorId);
    if (!vendor) {
      throw new NotFoundError('Vendor', vendorId);
    }
    if (vendor.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to manage this vendor hours');
    }
  }

  private validateHours(hours: UpsertVendorHoursInput[]): void {
    const seenWeekdays = new Set<number>();

    for (const hour of hours) {
      if (!Number.isInteger(hour.weekday) || hour.weekday < 0 || hour.weekday > 6) {
        throw new ValidationError('Weekday must be an integer between 0 and 6');
      }
      if (seenWeekdays.has(hour.weekday)) {
        throw new ValidationError('Only one hours block per weekday is currently supported');
      }
      seenWeekdays.add(hour.weekday);

      if (!(hour.opensAt instanceof Date) || Number.isNaN(hour.opensAt.getTime())) {
        throw new ValidationError('Opening time must be valid');
      }
      if (!(hour.closesAt instanceof Date) || Number.isNaN(hour.closesAt.getTime())) {
        throw new ValidationError('Closing time must be valid');
      }
      if (hour.opensAt >= hour.closesAt) {
        throw new ValidationError('Opening time must be before closing time');
      }
    }
  }
}
