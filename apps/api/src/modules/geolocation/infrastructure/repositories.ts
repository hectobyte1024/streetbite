import { getPrisma } from '../../../shared/db.js';
import { GeolocationRepository } from '../domain/repositories.js';
import { VendorLocationEntity, LocationThrottleInput, LocationThrottleResult } from '../domain/types.js';
import { haversineDistance } from '../domain/services.js';

export class PrismaGeolocationRepository implements GeolocationRepository {
  private db = getPrisma();

  async saveLocation(
    vendorId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
  ): Promise<VendorLocationEntity> {
    // Mark all previous locations as not current
    await this.db.vendorLocation.updateMany({
      where: { vendorId, isCurrent: true },
      data: { isCurrent: false },
    });

    // Use raw SQL to insert with PostGIS geography point
    // ST_PointZ creates a point from longitude, latitude
    const wktPoint = `POINT(${longitude} ${latitude})`;
    const result = (await this.db.$queryRaw`
      INSERT INTO vendor_locations (id, vendor_id, location, accuracy_meters, captured_at, is_current)
      VALUES (
        gen_random_uuid()::text,
        ${vendorId},
        ST_GeomFromText(${wktPoint}, 4326)::geography,
        ${accuracy},
        CURRENT_TIMESTAMP,
        true
      )
      RETURNING 
        id, 
        vendor_id as "vendorId", 
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        accuracy_meters as "accuracy",
        captured_at as "capturedAt",
        is_current as "isCurrent"
    `) as any[];

    if (!result || result.length === 0) {
      throw new Error('Failed to save location');
    }

    return result[0];
  }

  async getCurrentLocation(vendorId: string): Promise<VendorLocationEntity | null> {
    const locations = (await this.db.$queryRaw`
      SELECT
        id,
        vendor_id as "vendorId",
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        accuracy_meters as "accuracy",
        captured_at as "capturedAt",
        is_current as "isCurrent"
      FROM vendor_locations
      WHERE vendor_id = ${vendorId} AND is_current = true
      ORDER BY captured_at DESC
      LIMIT 1
    `) as any[];
    return locations[0] ? this.mapToEntity(locations[0]) : null;
  }

  async getLocationHistory(
    vendorId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<VendorLocationEntity[]> {
    const locations = (await this.db.$queryRaw`
      SELECT
        id,
        vendor_id as "vendorId",
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        accuracy_meters as "accuracy",
        captured_at as "capturedAt",
        is_current as "isCurrent"
      FROM vendor_locations
      WHERE vendor_id = ${vendorId}
      ORDER BY captured_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as any[];
    return locations.map((location: any) => this.mapToEntity(location));
  }

  async checkThrottle(input: LocationThrottleInput): Promise<LocationThrottleResult> {
    const {
      vendorId,
      candidate,
      minDistanceMeters = 20,
      minIntervalSeconds = 10,
    } = input;
    const lastLocation = await this.getCurrentLocation(vendorId);

    if (!lastLocation) {
      // No previous location, accept the update
      return { accepted: true };
    }

    const now = new Date();
    const timeSinceLastUpdate = (now.getTime() - lastLocation.capturedAt.getTime()) / 1000;

    if (timeSinceLastUpdate < minIntervalSeconds) {
      return {
        accepted: false,
        reason: `Wait ${Math.ceil(minIntervalSeconds - timeSinceLastUpdate)}s before next update`,
        lastLocationAt: lastLocation.capturedAt,
      };
    }

    if (!candidate) {
      return { accepted: true, lastLocationAt: lastLocation.capturedAt };
    }

    const distance = haversineDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      candidate.lat,
      candidate.lng,
    );

    if (distance < minDistanceMeters && timeSinceLastUpdate < 300) {
      // Less than min distance moved, and within 5 min threshold
      return {
        accepted: false,
        reason: `Moved only ${Math.round(distance)}m; threshold is ${minDistanceMeters}m`,
        lastLocationAt: lastLocation.capturedAt,
        distanceFromLast: distance,
      };
    }

    return { accepted: true, lastLocationAt: lastLocation.capturedAt };
  }

  async markLocationInactive(vendorId: string): Promise<void> {
    await this.db.vendorLocation.updateMany({
      where: { vendorId },
      data: { isCurrent: false },
    });
  }

  private mapToEntity(location: any): VendorLocationEntity {
    return {
      id: location.id,
      vendorId: location.vendorId,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      accuracy: location.accuracy ?? location.accuracyMeters ?? 0,
      capturedAt: location.capturedAt,
      isCurrent: location.isCurrent,
    };
  }
}
