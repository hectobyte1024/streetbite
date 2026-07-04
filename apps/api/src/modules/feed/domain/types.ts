export type FeedItemType = 'DAILY_SPECIAL';

export interface FeedVendorSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
}

export interface FeedItem {
  id: string;
  type: FeedItemType;
  vendor: FeedVendorSummary;
  title: string;
  description: string | null;
  priceCents: number | null;
  currency: string;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
}
