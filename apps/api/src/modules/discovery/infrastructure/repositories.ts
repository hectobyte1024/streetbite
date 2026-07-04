import { Prisma } from '@prisma/client';
import { getPrisma } from '../../../shared/db.js';
import { DiscoveryRepository } from '../domain/repositories.js';
import { VendorSearchResult, NearbySearchInput, DiscoveryFilters } from '../domain/types.js';

export class PrismaDiscoveryRepository implements DiscoveryRepository {
  private db = getPrisma();

  async findNearby(input: NearbySearchInput): Promise<VendorSearchResult[]> {
    const { lat, lng, radiusMeters, category, openNow, limit = 50, offset = 0 } = input;

    const categoryFilter = category ? Prisma.sql`AND v.category = ${category}` : Prisma.empty;
    const openNowFilter = openNow
      ? Prisma.sql`AND vh.opens_at::time <= CURRENT_TIME AND CURRENT_TIME < vh.closes_at::time`
      : Prisma.empty;

    // PostGIS geography distance functions use meters, which keeps radius search precise.
    const results = await this.db.$queryRaw<any[]>(Prisma.sql`
      SELECT
        v.id,
        v.name,
        v.category,
        v.slug,
        v.price_level as "priceLevel",
        CASE 
          WHEN vh.opens_at IS NULL THEN false
          ELSE vh.opens_at::time <= CURRENT_TIME AND CURRENT_TIME < vh.closes_at::time
        END as "isOpen",
        ST_Distance(
          vl.location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) as "distanceMeters",
        ST_X(vl.location::geometry) as "locationLng",
        ST_Y(vl.location::geometry) as "locationLat",
        COALESCE(ROUND(AVG(r.rating)::numeric, 1)::float, NULL) as "ratingAvg",
        COUNT(r.id)::integer as "reviewCount"
      FROM vendors v
      LEFT JOIN vendor_locations vl ON v.id = vl.vendor_id AND vl.is_current = true
      LEFT JOIN vendor_hours vh ON v.id = vh.vendor_id AND vh.weekday = EXTRACT(DOW FROM CURRENT_DATE)
      LEFT JOIN reviews r ON v.id = r.vendor_id
      WHERE v.status = 'ACTIVE'
        AND vl.location IS NOT NULL
        AND ST_DWithin(
          vl.location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )
        ${categoryFilter}
        ${openNowFilter}
      GROUP BY v.id, v.name, v.category, v.slug, v.price_level, vl.location, vh.opens_at, vh.closes_at
      ORDER BY "distanceMeters" ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return results.map((row) => this.mapToSearchResult(row));
  }

  async search(input: NearbySearchInput & DiscoveryFilters): Promise<VendorSearchResult[]> {
    // For now, reuse findNearby as the base implementation
    // Later we can add more sophisticated filtering for price, min rating, etc.
    return this.findNearby(input);
  }

  async getTrending(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit: number = 10,
  ): Promise<VendorSearchResult[]> {
    const results = await this.db.$queryRaw<any[]>(Prisma.sql`
      SELECT
        v.id,
        v.name,
        v.category,
        v.slug,
        v.price_level as "priceLevel",
        true as "isOpen",
        ST_Distance(
          vl.location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) as "distanceMeters",
        ST_X(vl.location::geometry) as "locationLng",
        ST_Y(vl.location::geometry) as "locationLat",
        COALESCE(ROUND(AVG(r.rating)::numeric, 1)::float, NULL) as "ratingAvg",
        COUNT(r.id)::integer as "reviewCount"
      FROM vendors v
      LEFT JOIN vendor_locations vl ON v.id = vl.vendor_id AND vl.is_current = true
      LEFT JOIN reviews r ON v.id = r.vendor_id
      WHERE v.status = 'ACTIVE'
        AND vl.location IS NOT NULL
        AND ST_DWithin(
          vl.location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )
      GROUP BY v.id, v.name, v.category, v.slug, v.price_level, vl.location
      ORDER BY "reviewCount" DESC, "ratingAvg" DESC
      LIMIT ${limit}
    `);
    return results.map((row) => this.mapToSearchResult(row));
  }

  async getFeatured(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit: number = 10,
  ): Promise<VendorSearchResult[]> {
    // Placeholder: later this will check a "promoted" flag in the database
    return this.getTrending(lat, lng, radiusMeters, limit);
  }

  private mapToSearchResult(row: any): VendorSearchResult {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      slug: row.slug,
      priceLevel: row.priceLevel,
      isOpen: row.isOpen,
      distanceMeters: Math.round(row.distanceMeters),
      location: {
        lat: row.locationLat,
        lng: row.locationLng,
      },
      ratingAvg: row.ratingAvg,
      reviewCount: row.reviewCount,
    };
  }
}
