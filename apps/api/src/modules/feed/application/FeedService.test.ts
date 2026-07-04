import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { FeedService } from './FeedService.js';
import type { FeedRepository } from '../domain/repositories.js';
import { FeedItem } from '../domain/types.js';

class InMemoryFeedRepository implements FeedRepository {
  calls: Array<{ userId: string; now: Date; limit?: number; offset?: number }> = [];
  items: FeedItem[] = [];

  async findFollowedActiveSpecials(userId: string, now: Date, limit?: number, offset?: number): Promise<FeedItem[]> {
    this.calls.push({
      userId,
      now,
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    });
    return this.items.slice(offset ?? 0, (offset ?? 0) + (limit ?? this.items.length));
  }
}

function makeFeedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'special-1',
    type: 'DAILY_SPECIAL',
    vendor: {
      id: 'vendor-1',
      name: 'Taco Stand',
      slug: 'taco-stand',
      category: 'tacos',
    },
    title: 'Taco Tuesday',
    description: null,
    priceCents: 2500,
    currency: 'MXN',
    startsAt: new Date('2026-07-03T16:00:00.000Z'),
    endsAt: new Date('2026-07-04T02:00:00.000Z'),
    createdAt: new Date('2026-07-03T15:00:00.000Z'),
    ...overrides,
  };
}

describe('FeedService', () => {
  let repository: InMemoryFeedRepository;
  let service: FeedService;

  beforeEach(() => {
    repository = new InMemoryFeedRepository();
    service = new FeedService(repository);
  });

  test('getPersonalFeed returns followed active special feed items', async () => {
    repository.items = [makeFeedItem()];
    const now = new Date('2026-07-03T17:00:00.000Z');

    const items = await service.getPersonalFeed('user-1', now, 10, 0);

    assert.equal(items.length, 1);
    assert.equal(items[0]?.vendor.name, 'Taco Stand');
    assert.deepEqual(repository.calls[0], { userId: 'user-1', now, limit: 10, offset: 0 });
  });

  test('getPersonalFeed caps oversized limits', async () => {
    await service.getPersonalFeed('user-1', new Date('2026-07-03T17:00:00.000Z'), 500, 0);

    assert.equal(repository.calls[0]?.limit, 100);
  });

  test('getPersonalFeed defaults limit and offset', async () => {
    await service.getPersonalFeed('user-1', new Date('2026-07-03T17:00:00.000Z'));

    assert.equal(repository.calls[0]?.limit, 50);
    assert.equal(repository.calls[0]?.offset, 0);
  });
});
