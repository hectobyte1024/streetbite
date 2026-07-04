import { getPrisma } from '../../../shared/db.js';
import { ReviewRepository } from '../domain/repositories.js';
import { ReviewEntity, ReviewWithAuthor, VendorRatingSummary } from '../domain/types.js';

export class PrismaReviewRepository implements ReviewRepository {
  private db = getPrisma();

  async create(
    vendorId: string,
    userId: string,
    rating: number,
    body: string | null,
  ): Promise<ReviewWithAuthor> {
    const review = await this.db.review.create({
      data: {
        vendorId,
        userId,
        rating,
        body,
      },
      include: { user: true },
    });
    return {
      ...this.mapToEntity(review),
      authorName: review.user.displayName || review.user.email,
    };
  }

  async findById(id: string): Promise<ReviewEntity | null> {
    const review = await this.db.review.findUnique({ where: { id } });
    if (!review) return null;
    return this.mapToEntity(review);
  }

  async findByVendorAndUser(vendorId: string, userId: string): Promise<ReviewEntity | null> {
    const review = await this.db.review.findUnique({
      where: { vendorId_userId: { vendorId, userId } },
    });
    if (!review) return null;
    return this.mapToEntity(review);
  }

  async findByVendor(
    vendorId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ReviewWithAuthor[]> {
    const reviews = await this.db.review.findMany({
      where: { vendorId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return reviews.map((r: any) => ({
      ...this.mapToEntity(r),
      authorName: r.user.displayName || r.user.email,
    }));
  }

  async findByUser(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ReviewWithAuthor[]> {
    const reviews = await this.db.review.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return reviews.map((r: any) => ({
      ...this.mapToEntity(r),
      authorName: r.user.displayName || r.user.email,
    }));
  }

  async update(id: string, rating?: number, body?: string | null): Promise<ReviewWithAuthor> {
    const data: any = {};
    if (rating !== undefined) {
      data.rating = rating;
    }
    if (body !== undefined) {
      data.body = body;
    }

    const review = await this.db.review.update({
      where: { id },
      data,
      include: { user: true },
    });
    return {
      ...this.mapToEntity(review),
      authorName: review.user.displayName || review.user.email,
    };
  }

  async delete(id: string): Promise<void> {
    await this.db.review.delete({ where: { id } });
  }

  async getVendorRatingSummary(vendorId: string): Promise<VendorRatingSummary> {
    const reviews = await this.db.review.findMany({
      where: { vendorId },
      select: { rating: true },
    });

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    for (const review of reviews as Array<{ rating: number }>) {
      totalRating += review.rating;
      const key = review.rating as 1 | 2 | 3 | 4 | 5;
      if (key in distribution) {
        distribution[key]++;
      }
    }

    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      vendorId,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
      ratingDistribution: distribution as Record<number, number>,
    };
  }

  async countByVendor(vendorId: string): Promise<number> {
    return this.db.review.count({ where: { vendorId } });
  }

  private mapToEntity(review: any): ReviewEntity {
    return {
      id: review.id,
      vendorId: review.vendorId,
      userId: review.userId,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
