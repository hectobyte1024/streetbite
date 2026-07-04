import { getPrisma } from '../../../shared/db.js';
import { VendorFollowRepository, VendorHoursRepository, VendorRepository } from '../domain/repositories.js';
import { FollowedVendor, UpsertVendorHoursInput, VendorEntity, VendorFollowEntity, VendorHoursEntity, VendorStatus } from '../domain/types.js';

export class PrismaVendorRepository implements VendorRepository {
  private db = getPrisma();

  async findById(id: string): Promise<VendorEntity | null> {
    const vendor = await this.db.vendor.findUnique({ where: { id } });
    if (!vendor) return null;
    return this.mapToEntity(vendor);
  }

  async findBySlug(slug: string): Promise<VendorEntity | null> {
    const vendor = await this.db.vendor.findUnique({ where: { slug } });
    if (!vendor) return null;
    return this.mapToEntity(vendor);
  }

  async findByOwnerId(ownerId: string): Promise<VendorEntity[]> {
    const vendors = await this.db.vendor.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return vendors.map((v) => this.mapToEntity(v));
  }

  async create(ownerId: string, name: string, slug: string, category: string): Promise<VendorEntity> {
    const vendor = await this.db.vendor.create({
      data: {
        ownerId,
        name,
        slug,
        category,
      },
    });
    return this.mapToEntity(vendor);
  }

  async update(id: string, data: Partial<VendorEntity>): Promise<VendorEntity> {
    const vendor = await this.db.vendor.update({
      where: { id },
      data: data as any,
    });
    return this.mapToEntity(vendor);
  }

  async updateStatus(id: string, status: VendorStatus): Promise<VendorEntity> {
    const vendor = await this.db.vendor.update({
      where: { id },
      data: { status },
    });
    return this.mapToEntity(vendor);
  }

  async delete(id: string): Promise<void> {
    await this.db.vendor.delete({ where: { id } });
  }

  private mapToEntity(vendor: any): VendorEntity {
    return {
      id: vendor.id,
      ownerId: vendor.ownerId,
      name: vendor.name,
      slug: vendor.slug,
      status: vendor.status as VendorStatus,
      category: vendor.category,
      priceLevel: vendor.priceLevel,
      description: vendor.description,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }
}

export class PrismaVendorFollowRepository implements VendorFollowRepository {
  private db = getPrisma();

  async findFollow(vendorId: string, userId: string): Promise<VendorFollowEntity | null> {
    const follow = await this.db.vendorFollow.findFirst({
      where: { vendorId, userId },
    });
    return follow ? this.mapToEntity(follow) : null;
  }

  async follow(vendorId: string, userId: string): Promise<VendorFollowEntity> {
    const follow = await this.db.vendorFollow.create({
      data: { vendorId, userId },
    });
    return this.mapToEntity(follow);
  }

  async unfollow(vendorId: string, userId: string): Promise<void> {
    await this.db.vendorFollow.deleteMany({
      where: { vendorId, userId },
    });
  }

  async findFollowedVendors(userId: string, limit: number = 50, offset: number = 0): Promise<FollowedVendor[]> {
    const follows = await this.db.vendorFollow.findMany({
      where: { userId },
      include: { vendor: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return follows.map((follow) => ({
      ...this.mapVendorToEntity(follow.vendor),
      followedAt: follow.createdAt,
    }));
  }

  private mapToEntity(follow: any): VendorFollowEntity {
    return {
      id: follow.id,
      vendorId: follow.vendorId,
      userId: follow.userId,
      createdAt: follow.createdAt,
    };
  }

  private mapVendorToEntity(vendor: any): VendorEntity {
    return {
      id: vendor.id,
      ownerId: vendor.ownerId,
      name: vendor.name,
      slug: vendor.slug,
      status: vendor.status as VendorStatus,
      category: vendor.category,
      priceLevel: vendor.priceLevel,
      description: vendor.description,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }
}

export class PrismaVendorHoursRepository implements VendorHoursRepository {
  private db = getPrisma();

  async findByVendor(vendorId: string): Promise<VendorHoursEntity[]> {
    const hours = await this.db.vendorHours.findMany({
      where: { vendorId },
      orderBy: { weekday: 'asc' },
    });
    return hours.map((hour) => this.mapToEntity(hour));
  }

  async replaceForVendor(vendorId: string, hours: UpsertVendorHoursInput[]): Promise<VendorHoursEntity[]> {
    await this.db.$transaction(async (tx) => {
      await tx.vendorHours.deleteMany({ where: { vendorId } });
      if (hours.length > 0) {
        await tx.vendorHours.createMany({
          data: hours.map((hour) => ({
            vendorId,
            weekday: hour.weekday,
            opensAt: hour.opensAt,
            closesAt: hour.closesAt,
          })),
        });
      }
    });

    return this.findByVendor(vendorId);
  }

  private mapToEntity(hour: any): VendorHoursEntity {
    return {
      id: hour.id,
      vendorId: hour.vendorId,
      weekday: hour.weekday,
      opensAt: hour.opensAt,
      closesAt: hour.closesAt,
    };
  }
}
