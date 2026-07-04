import { VendorRepository } from '../../vendors/domain/repositories.js';
import { DailySpecialRepository } from '../domain/repositories.js';
import { CreateDailySpecialInput, DailySpecialEntity, UpdateDailySpecialInput } from '../domain/types.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors.js';

export class DailySpecialService {
  constructor(
    private dailySpecialRepository: DailySpecialRepository,
    private vendorRepository: VendorRepository,
  ) {}

  async createSpecial(vendorId: string, ownerId: string, input: CreateDailySpecialInput): Promise<DailySpecialEntity> {
    await this.assertVendorOwner(vendorId, ownerId);
    this.validateCreateInput(input);
    return this.dailySpecialRepository.create(vendorId, this.normalizeCreateInput(input));
  }

  async getSpecial(specialId: string): Promise<DailySpecialEntity> {
    const special = await this.dailySpecialRepository.findById(specialId);
    if (!special) {
      throw new NotFoundError('Daily special', specialId);
    }
    return special;
  }

  async getVendorSpecials(vendorId: string, limit?: number, offset?: number): Promise<DailySpecialEntity[]> {
    return this.dailySpecialRepository.findByVendor(vendorId, limit, offset);
  }

  async getActiveSpecials(now: Date = new Date(), limit?: number, offset?: number): Promise<DailySpecialEntity[]> {
    return this.dailySpecialRepository.findActive(now, limit, offset);
  }

  async updateSpecial(specialId: string, ownerId: string, input: UpdateDailySpecialInput): Promise<DailySpecialEntity> {
    const special = await this.getSpecial(specialId);
    await this.assertVendorOwner(special.vendorId, ownerId);
    this.validateUpdateInput(special, input);
    return this.dailySpecialRepository.update(specialId, this.normalizeUpdateInput(input));
  }

  async deleteSpecial(specialId: string, ownerId: string): Promise<void> {
    const special = await this.getSpecial(specialId);
    await this.assertVendorOwner(special.vendorId, ownerId);
    await this.dailySpecialRepository.delete(specialId);
  }

  private async assertVendorOwner(vendorId: string, ownerId: string): Promise<void> {
    const vendor = await this.vendorRepository.findById(vendorId);
    if (!vendor) {
      throw new NotFoundError('Vendor', vendorId);
    }
    if (vendor.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to manage this vendor special');
    }
  }

  private validateCreateInput(input: CreateDailySpecialInput): void {
    this.validateTitle(input.title);
    this.validatePrice(input.priceCents);
    this.validateCurrency(input.currency ?? 'MXN');
    this.validateWindow(input.startsAt, input.endsAt);
  }

  private validateUpdateInput(current: DailySpecialEntity, input: UpdateDailySpecialInput): void {
    if (input.title !== undefined) {
      this.validateTitle(input.title);
    }
    if (input.priceCents !== undefined) {
      this.validatePrice(input.priceCents);
    }
    if (input.currency !== undefined) {
      this.validateCurrency(input.currency);
    }

    const startsAt = input.startsAt ?? current.startsAt;
    const endsAt = input.endsAt ?? current.endsAt;
    this.validateWindow(startsAt, endsAt);
  }

  private validateTitle(title: string): void {
    if (title.trim().length === 0 || title.length > 120) {
      throw new ValidationError('Special title must be 1-120 characters');
    }
  }

  private validatePrice(priceCents: number | null | undefined): void {
    if (priceCents === null || priceCents === undefined) return;
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      throw new ValidationError('Special price must be a non-negative integer in cents');
    }
  }

  private validateCurrency(currency: string): void {
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new ValidationError('Currency must be a 3-letter ISO code');
    }
  }

  private validateWindow(startsAt: Date, endsAt: Date): void {
    if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime())) {
      throw new ValidationError('Special start time must be a valid date');
    }
    if (!(endsAt instanceof Date) || Number.isNaN(endsAt.getTime())) {
      throw new ValidationError('Special end time must be a valid date');
    }
    if (startsAt >= endsAt) {
      throw new ValidationError('Special start time must be before end time');
    }
  }

  private normalizeCreateInput(input: CreateDailySpecialInput): CreateDailySpecialInput {
    return {
      ...input,
      title: input.title.trim(),
      currency: input.currency ?? 'MXN',
    };
  }

  private normalizeUpdateInput(input: UpdateDailySpecialInput): UpdateDailySpecialInput {
    return {
      ...input,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
    };
  }
}
