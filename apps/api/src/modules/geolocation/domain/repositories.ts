import { VendorLocationEntity, LocationThrottleInput, LocationThrottleResult } from './types.js';

export interface GeolocationRepository {
  /**
   * Save a new location for a vendor.
   * Automatically marks previous location as not current.
   */
  saveLocation(
    vendorId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
  ): Promise<VendorLocationEntity>;

  /**
   * Get the current (most recent) location for a vendor.
   */
  getCurrentLocation(vendorId: string): Promise<VendorLocationEntity | null>;

  /**
   * Get location history for a vendor (for analytics or replay).
   */
  getLocationHistory(vendorId: string, limit?: number, offset?: number): Promise<VendorLocationEntity[]>;

  /**
   * Check if a new location should be accepted based on throttling rules.
   * Returns info about the last location and distance from it.
   */
  checkThrottle(input: LocationThrottleInput): Promise<LocationThrottleResult>;

  /**
   * Mark a vendor's location as inactive (e.g., vendor went offline).
   */
  markLocationInactive(vendorId: string): Promise<void>;
}
