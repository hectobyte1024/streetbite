import { FollowedVendor, UpsertVendorHoursInput, VendorEntity, VendorFollowEntity, VendorHoursEntity, VendorStatus } from './types.js';

export interface VendorRepository {
  findById(id: string): Promise<VendorEntity | null>;
  findBySlug(slug: string): Promise<VendorEntity | null>;
  findByOwnerId(ownerId: string): Promise<VendorEntity[]>;
  create(ownerId: string, name: string, slug: string, category: string): Promise<VendorEntity>;
  update(id: string, data: Partial<VendorEntity>): Promise<VendorEntity>;
  updateStatus(id: string, status: VendorStatus): Promise<VendorEntity>;
  delete(id: string): Promise<void>;
}

export interface VendorFollowRepository {
  findFollow(vendorId: string, userId: string): Promise<VendorFollowEntity | null>;
  follow(vendorId: string, userId: string): Promise<VendorFollowEntity>;
  unfollow(vendorId: string, userId: string): Promise<void>;
  findFollowedVendors(userId: string, limit?: number, offset?: number): Promise<FollowedVendor[]>;
}

export interface VendorHoursRepository {
  findByVendor(vendorId: string): Promise<VendorHoursEntity[]>;
  replaceForVendor(vendorId: string, hours: UpsertVendorHoursInput[]): Promise<VendorHoursEntity[]>;
}
