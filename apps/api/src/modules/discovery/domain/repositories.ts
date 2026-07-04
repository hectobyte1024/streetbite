import { VendorSearchResult, NearbySearchInput, DiscoveryFilters } from './types.js';

export interface DiscoveryRepository {
  /**
   * Find vendors within a radius using PostGIS ST_DWithin.
   * Returns vendors with distance information sorted by distance.
   */
  findNearby(input: NearbySearchInput): Promise<VendorSearchResult[]>;

  /**
   * Search vendors by multiple criteria and location.
   */
  search(input: NearbySearchInput & DiscoveryFilters): Promise<VendorSearchResult[]>;

  /**
   * Get trending vendors (most reviewed or highest rated) in a region.
   */
  getTrending(lat: number, lng: number, radiusMeters: number, limit?: number): Promise<VendorSearchResult[]>;

  /**
   * Get featured or promoted vendors in a region.
   */
  getFeatured(lat: number, lng: number, radiusMeters: number, limit?: number): Promise<VendorSearchResult[]>;
}
