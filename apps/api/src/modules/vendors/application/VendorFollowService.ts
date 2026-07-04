import { VendorFollowRepository, VendorRepository } from '../domain/repositories.js';
import { FollowedVendor, VendorFollowEntity } from '../domain/types.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../shared/errors.js';

export class VendorFollowService {
  constructor(
    private vendorRepository: VendorRepository,
    private followRepository: VendorFollowRepository,
  ) {}

  async followVendor(vendorId: string, userId: string): Promise<VendorFollowEntity> {
    const vendor = await this.vendorRepository.findById(vendorId);
    if (!vendor) {
      throw new NotFoundError('Vendor', vendorId);
    }

    if (vendor.ownerId === userId) {
      throw new ForbiddenError('You cannot follow your own vendor');
    }

    const existingFollow = await this.followRepository.findFollow(vendorId, userId);
    if (existingFollow) {
      throw new ConflictError('You already follow this vendor');
    }

    return this.followRepository.follow(vendorId, userId);
  }

  async unfollowVendor(vendorId: string, userId: string): Promise<void> {
    await this.followRepository.unfollow(vendorId, userId);
  }

  async getFollowedVendors(userId: string, limit?: number, offset?: number): Promise<FollowedVendor[]> {
    return this.followRepository.findFollowedVendors(userId, limit, offset);
  }
}
