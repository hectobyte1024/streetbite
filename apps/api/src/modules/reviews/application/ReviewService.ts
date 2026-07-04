import { ReviewRepository } from '../domain/repositories.js';
import { CreateReviewInput, UpdateReviewInput, ReviewWithAuthor, VendorRatingSummary } from '../domain/types.js';
import { validateRating, validateReviewBody } from '../domain/services.js';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError, 
  ConflictError,
} from '../../../shared/errors.js';

export class ReviewService {
  constructor(private reviewRepository: ReviewRepository) {}

  /**
   * Create a new review for a vendor.
   * One review per user per vendor.
   */
  async createReview(userId: string, input: CreateReviewInput): Promise<ReviewWithAuthor> {
    if (!validateRating(input.rating)) {
      throw new ValidationError('Rating must be an integer between 1 and 5');
    }
    if (!validateReviewBody(input.body)) {
      throw new ValidationError('Review body must be 1-1000 characters');
    }

    const existing = await this.reviewRepository.findByVendorAndUser(input.vendorId, userId);
    if (existing) {
      throw new ConflictError('You have already reviewed this vendor');
    }

    return this.reviewRepository.create(input.vendorId, userId, input.rating, input.body || null);
  }

  /**
   * Get a review by ID.
   */
  async getReview(reviewId: string): Promise<ReviewWithAuthor> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review', reviewId);
    }
    return review as ReviewWithAuthor;
  }

  /**
   * Get all reviews for a vendor.
   */
  async getVendorReviews(vendorId: string, limit?: number, offset?: number): Promise<ReviewWithAuthor[]> {
    return this.reviewRepository.findByVendor(vendorId, limit, offset);
  }

  /**
   * Get all reviews by a user.
   */
  async getUserReviews(userId: string, limit?: number, offset?: number): Promise<ReviewWithAuthor[]> {
    return this.reviewRepository.findByUser(userId, limit, offset);
  }

  /**
   * Update a review (user can only update their own).
   */
  async updateReview(reviewId: string, userId: string, input: UpdateReviewInput): Promise<ReviewWithAuthor> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review', reviewId);
    }

    if (review.userId !== userId) {
      throw new ForbiddenError('You can only update your own reviews');
    }

    if (input.rating !== undefined && !validateRating(input.rating)) {
      throw new ValidationError('Rating must be an integer between 1 and 5');
    }
    if (input.body !== undefined && !validateReviewBody(input.body)) {
      throw new ValidationError('Review body must be 1-1000 characters');
    }

    return this.reviewRepository.update(reviewId, input.rating, input.body);
  }

  /**
   * Delete a review (user can only delete their own).
   */
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review', reviewId);
    }

    if (review.userId !== userId) {
      throw new ForbiddenError('You can only delete your own reviews');
    }

    await this.reviewRepository.delete(reviewId);
  }

  /**
   * Get rating summary for a vendor (used in discovery results).
   */
  async getVendorRatingSummary(vendorId: string): Promise<VendorRatingSummary> {
    return this.reviewRepository.getVendorRatingSummary(vendorId);
  }
}
