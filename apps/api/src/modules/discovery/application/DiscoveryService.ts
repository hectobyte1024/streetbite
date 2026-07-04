import { DiscoveryRepository } from '../domain/repositories.js';
import { VendorSearchResult, NearbySearchInput, DiscoveryFilters } from '../domain/types.js';
import { 
  validateLatitude, 
  validateLongitude, 
  validateRadius,
  clampRadius,
} from '../domain/services.js';
import { ValidationError } from '../../../shared/errors.js';
import { validateNumber } from '../../../shared/validation.js';

export class DiscoveryService {
  private maxRadiusMeters = 50_000; // 50km default max

  constructor(private discoveryRepository: DiscoveryRepository) {}

  /**
   * Find nearby vendors with location-based search.
   */
  async findNearby(input: NearbySearchInput): Promise<VendorSearchResult[]> {
    this.validateCoordinates(input.lat, input.lng);
    this.validateRadius(input.radiusMeters);

    const clamped = {
      ...input,
      radiusMeters: clampRadius(input.radiusMeters, this.maxRadiusMeters),
      limit: Math.min(input.limit ?? 50, 200),
      offset: input.offset ?? 0,
    };

    return this.discoveryRepository.findNearby(clamped);
  }

  /**
   * Search vendors with filters applied to the nearby results.
   */
  async search(
    input: NearbySearchInput & DiscoveryFilters,
  ): Promise<VendorSearchResult[]> {
    this.validateCoordinates(input.lat, input.lng);
    this.validateRadius(input.radiusMeters);

    const clamped = {
      ...input,
      radiusMeters: clampRadius(input.radiusMeters, this.maxRadiusMeters),
      limit: Math.min(input.limit ?? 50, 200),
      offset: input.offset ?? 0,
    };

    return this.discoveryRepository.search(clamped);
  }

  /**
   * Get trending vendors in a region (most reviewed or highest rated).
   */
  async getTrending(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit?: number,
  ): Promise<VendorSearchResult[]> {
    this.validateCoordinates(lat, lng);
    this.validateRadius(radiusMeters);

    const clamped = clampRadius(radiusMeters, this.maxRadiusMeters);
    return this.discoveryRepository.getTrending(lat, lng, clamped, limit);
  }

  /**
   * Get featured vendors in a region.
   */
  async getFeatured(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit?: number,
  ): Promise<VendorSearchResult[]> {
    this.validateCoordinates(lat, lng);
    this.validateRadius(radiusMeters);

    const clamped = clampRadius(radiusMeters, this.maxRadiusMeters);
    return this.discoveryRepository.getFeatured(lat, lng, clamped, limit);
  }

  private validateCoordinates(lat: number, lng: number): void {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new ValidationError('Coordinates must be valid numbers');
    }
    if (lat < -90 || lat > 90) {
      throw new ValidationError('Latitude must be between -90 and 90');
    }
    if (lng < -180 || lng > 180) {
      throw new ValidationError('Longitude must be between -180 and 180');
    }
  }

  private validateRadius(radiusMeters: number): void {
    if (radiusMeters < 100) {
      throw new ValidationError('Radius must be at least 100 meters');
    }
    if (radiusMeters > 100_000) {
      throw new ValidationError('Radius must be at most 100 kilometers');
    }
  }
}
