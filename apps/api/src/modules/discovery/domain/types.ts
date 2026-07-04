import { Id, Coordinates } from '../../../shared/types.js';

export interface VendorSearchResult {
  id: Id;
  name: string;
  category: string;
  slug: string;
  priceLevel: number | null;
  isOpen: boolean;
  distanceMeters: number;
  location: Coordinates;
  ratingAvg: number | null;
  reviewCount: number;
}

export interface NearbySearchInput {
  lat: number;
  lng: number;
  radiusMeters: number;
  category?: string;
  openNow?: boolean;
  limit?: number;
  offset?: number;
}

export interface DiscoveryFilters {
  category?: string;
  minRating?: number;
  maxPrice?: number;
  openNow?: boolean;
}
