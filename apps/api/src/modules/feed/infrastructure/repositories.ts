import { getPrisma } from '../../../shared/db.js';
import { FeedRepository } from '../domain/repositories.js';
import { FeedItem } from '../domain/types.js';

export class PrismaFeedRepository implements FeedRepository {
  private db = getPrisma();

  async findFollowedActiveSpecials(
    userId: string,
    now: Date,
    limit: number = 50,
    offset: number = 0,
  ): Promise<FeedItem[]> {
    const specials = await this.db.dailySpecial.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gt: now },
        vendor: {
          followers: {
            some: { userId },
          },
        },
      },
      include: {
        vendor: true,
      },
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });

    return specials.map((special: any) => ({
      id: special.id,
      type: 'DAILY_SPECIAL',
      vendor: {
        id: special.vendor.id,
        name: special.vendor.name,
        slug: special.vendor.slug,
        category: special.vendor.category,
      },
      title: special.title,
      description: special.description,
      priceCents: special.priceCents,
      currency: special.currency,
      startsAt: special.startsAt,
      endsAt: special.endsAt,
      createdAt: special.createdAt,
    }));
  }
}
