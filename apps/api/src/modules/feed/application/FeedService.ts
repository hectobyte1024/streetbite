import { FeedRepository } from '../domain/repositories.js';
import { FeedItem } from '../domain/types.js';

export class FeedService {
  constructor(private feedRepository: FeedRepository) {}

  async getPersonalFeed(userId: string, now: Date = new Date(), limit?: number, offset?: number): Promise<FeedItem[]> {
    const boundedLimit = Math.min(limit ?? 50, 100);
    const boundedOffset = offset ?? 0;
    return this.feedRepository.findFollowedActiveSpecials(userId, now, boundedLimit, boundedOffset);
  }
}
