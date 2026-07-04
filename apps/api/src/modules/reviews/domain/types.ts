import { Id } from '../../../shared/types.js';

export type ReviewId = string;

export interface ReviewEntity {
  id: ReviewId;
  vendorId: Id;
  userId: Id;
  rating: number;
  body: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewInput {
  vendorId: Id;
  rating: number;
  body?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  body?: string | null;
}

export interface ReviewWithAuthor extends ReviewEntity {
  authorName: string | null;
}

export interface VendorRatingSummary {
  vendorId: Id;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}
