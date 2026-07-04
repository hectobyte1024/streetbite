/**
 * Validate latitude is within acceptable range.
 */
export function validateLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude is within acceptable range.
 */
export function validateLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

/**
 * Validate search radius is reasonable (between 100m and 100km).
 */
export function validateRadius(radiusMeters: number): boolean {
  return radiusMeters >= 100 && radiusMeters <= 100_000;
}

/**
 * Clamp radius to avoid expensive queries.
 */
export function clampRadius(radiusMeters: number, maxRadius: number = 50_000): number {
  return Math.min(radiusMeters, maxRadius);
}
