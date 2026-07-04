import { ReviewEntity, ReviewWithAuthor, VendorRatingSummary } from './types.js';

export interface ReviewRepository {
  /**
   * Create a new review. Enforces one review per user per vendor.
   */
  create(vendorId: string, userId: string, rating: number, body: string | null): Promise<ReviewWithAuthor>;

  /**
   * Find a review by ID.
   */
  findById(id: string): Promise<ReviewEntity | null>;

  /**
   * Find existing review for a user and vendor (for uniqueness check).
   */
  findByVendorAndUser(vendorId: string, userId: string): Promise<ReviewEntity | null>;

  /**
   * Get all reviews for a vendor with author info.
   */
  findByVendor(vendorId: string, limit?: number, offset?: number): Promise<ReviewWithAuthor[]>;

  /**
   * Get all reviews by a user.
   */
  findByUser(userId: string, limit?: number, offset?: number): Promise<ReviewWithAuthor[]>;

  /**
   * Update a review (user can only update their own).
   */
  update(id: string, rating?: number, body?: string | null): Promise<ReviewWithAuthor>;

  /**
   * Delete a review.
   */
  delete(id: string): Promise<void>;

  /**
   * Get rating summary for a vendor.
   */
  getVendorRatingSummary(vendorId: string): Promise<VendorRatingSummary>;

  /**
   * Count total reviews for a vendor.
   */
  countByVendor(vendorId: string): Promise<number>;
}
