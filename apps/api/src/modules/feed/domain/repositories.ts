import { FeedItem } from './types.js';

export interface FeedRepository {
  findFollowedActiveSpecials(userId: string, now: Date, limit?: number, offset?: number): Promise<FeedItem[]>;
}
