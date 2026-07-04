import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { ReviewService } from './ReviewService.js';
import type { ReviewRepository } from '../domain/repositories.js';
import { ReviewEntity, ReviewWithAuthor, VendorRatingSummary } from '../domain/types.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors.js';

class InMemoryReviewRepository implements ReviewRepository {
  reviews = new Map<string, ReviewWithAuthor>();

  async create(vendorId: string, userId: string, rating: number, body: string | null): Promise<ReviewWithAuthor> {
    const review = makeReview({
      id: `review-${this.reviews.size + 1}`,
      vendorId,
      userId,
      rating,
      body,
    });
    this.reviews.set(review.id, review);
    return review;
  }

  async findById(id: string): Promise<ReviewEntity | null> {
    return this.reviews.get(id) ?? null;
  }

  async findByVendorAndUser(vendorId: string, userId: string): Promise<ReviewEntity | null> {
    return [...this.reviews.values()].find((review) => review.vendorId === vendorId && review.userId === userId) ?? null;
  }

  async findByVendor(vendorId: string, limit: number = 50, offset: number = 0): Promise<ReviewWithAuthor[]> {
    return [...this.reviews.values()].filter((review) => review.vendorId === vendorId).slice(offset, offset + limit);
  }

  async findByUser(userId: string, limit: number = 50, offset: number = 0): Promise<ReviewWithAuthor[]> {
    return [...this.reviews.values()].filter((review) => review.userId === userId).slice(offset, offset + limit);
  }

  async update(id: string, rating?: number, body?: string | null): Promise<ReviewWithAuthor> {
    const current = this.reviews.get(id);
    if (!current) {
      throw new Error('Review not found');
    }
    const updated = {
      ...current,
      rating: rating ?? current.rating,
      body: body === undefined ? current.body : body,
      updatedAt: new Date(),
    };
    this.reviews.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.reviews.delete(id);
  }

  async getVendorRatingSummary(vendorId: string): Promise<VendorRatingSummary> {
    const reviews = [...this.reviews.values()].filter((review) => review.vendorId === vendorId);
    const total = reviews.length;
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of reviews) {
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] ?? 0) + 1;
    }
    return {
      vendorId,
      averageRating: total === 0 ? 0 : reviews.reduce((sum, review) => sum + review.rating, 0) / total,
      totalReviews: total,
      ratingDistribution,
    };
  }

  async countByVendor(vendorId: string): Promise<number> {
    return [...this.reviews.values()].filter((review) => review.vendorId === vendorId).length;
  }
}

function makeReview(overrides: Partial<ReviewWithAuthor> = {}): ReviewWithAuthor {
  return {
    id: 'review-1',
    vendorId: 'vendor-1',
    userId: 'user-1',
    rating: 5,
    body: 'Excellent tacos',
    authorName: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ReviewService', () => {
  let repository: InMemoryReviewRepository;
  let service: ReviewService;

  beforeEach(() => {
    repository = new InMemoryReviewRepository();
    service = new ReviewService(repository);
  });

  test('createReview stores a valid review', async () => {
    const review = await service.createReview('user-1', {
      vendorId: 'vendor-1',
      rating: 5,
      body: 'Excellent tacos',
    });

    assert.equal(review.userId, 'user-1');
    assert.equal(review.vendorId, 'vendor-1');
    assert.equal(review.rating, 5);
  });

  test('createReview rejects invalid ratings', async () => {
    await assert.rejects(
      service.createReview('user-1', { vendorId: 'vendor-1', rating: 0 }),
      ValidationError,
    );
  });

  test('createReview enforces one review per user per vendor', async () => {
    repository.reviews.set('review-1', makeReview({ vendorId: 'vendor-1', userId: 'user-1' }));

    await assert.rejects(
      service.createReview('user-1', { vendorId: 'vendor-1', rating: 4 }),
      ConflictError,
    );
  });

  test('updateReview rejects edits by non-authors', async () => {
    repository.reviews.set('review-1', makeReview({ userId: 'user-1' }));

    await assert.rejects(
      service.updateReview('review-1', 'user-2', { rating: 4 }),
      ForbiddenError,
    );
  });

  test('deleteReview removes reviews for the author', async () => {
    repository.reviews.set('review-1', makeReview({ userId: 'user-1' }));

    await service.deleteReview('review-1', 'user-1');

    assert.equal(await repository.findById('review-1'), null);
  });

  test('getReview rejects missing reviews', async () => {
    await assert.rejects(service.getReview('missing-review'), NotFoundError);
  });
});
