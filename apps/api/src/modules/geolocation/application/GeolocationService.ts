import { GeolocationRepository } from '../domain/repositories.js';
import { Coordinates } from '../../../shared/types.js';
import { LocationUpdate, LocationThrottleResult, VendorLocationEntity } from '../domain/types.js';
import {
  validateCoordinates,
  validateAccuracy,
} from '../domain/services.js';
import {
  ValidationError,
  ConflictError,
} from '../../../shared/errors.js';

export class GeolocationService {
  // Minimum distance in meters to trigger a location update (prevent GPS jitter)
  private minDistanceMeters = 20;
  // Minimum interval in seconds between updates
  private minIntervalSeconds = 10;

  constructor(private geolocationRepository: GeolocationRepository) {}

  /**
   * Publish a vendor's current location.
   * Includes throttling to prevent excessive updates.
   */
  async publishLocation(vendorId: string, update: LocationUpdate): Promise<VendorLocationEntity> {
    this.validateLocationUpdate(update);

    // Check throttle rules
    const throttle = await this.geolocationRepository.checkThrottle({
      vendorId,
      candidate: update.coordinates,
      minDistanceMeters: this.minDistanceMeters,
      minIntervalSeconds: this.minIntervalSeconds,
    });

    if (!throttle.accepted) {
      throw new ConflictError(throttle.reason || 'Location update throttled');
    }

    // Save the location
    return this.geolocationRepository.saveLocation(
      vendorId,
      update.coordinates.lat,
      update.coordinates.lng,
      update.accuracy,
    );
  }

  /**
   * Get the current location for a vendor.
   */
  async getCurrentLocation(vendorId: string) {
    return this.geolocationRepository.getCurrentLocation(vendorId);
  }

  /**
   * Get location history for a vendor (for analytics or debugging).
   */
  async getLocationHistory(vendorId: string, limit?: number, offset?: number) {
    return this.geolocationRepository.getLocationHistory(vendorId, limit, offset);
  }

  /**
   * Mark a vendor as offline (clear active location).
   */
  async goOffline(vendorId: string): Promise<void> {
    await this.geolocationRepository.markLocationInactive(vendorId);
  }

  /**
   * Check if a location would be accepted (for client-side hints).
   */
  async checkLocationAcceptance(vendorId: string, candidate?: Coordinates): Promise<LocationThrottleResult> {
    if (candidate && !validateCoordinates(candidate.lat, candidate.lng)) {
      throw new ValidationError('Invalid coordinates');
    }

    const input = {
      vendorId,
      minDistanceMeters: this.minDistanceMeters,
      minIntervalSeconds: this.minIntervalSeconds,
      ...(candidate ? { candidate } : {}),
    };

    return this.geolocationRepository.checkThrottle(input);
  }

  private validateLocationUpdate(update: LocationUpdate): void {
    if (!validateCoordinates(update.coordinates.lat, update.coordinates.lng)) {
      throw new ValidationError('Invalid coordinates');
    }
    if (!validateAccuracy(update.accuracy)) {
      throw new ValidationError('Accuracy must be between 0 and 10000 meters');
    }
  }
}
