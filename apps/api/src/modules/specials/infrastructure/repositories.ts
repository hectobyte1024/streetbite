import { getPrisma } from '../../../shared/db.js';
import { DailySpecialRepository } from '../domain/repositories.js';
import { CreateDailySpecialInput, DailySpecialEntity, UpdateDailySpecialInput } from '../domain/types.js';

export class PrismaDailySpecialRepository implements DailySpecialRepository {
  private db = getPrisma();

  async create(vendorId: string, input: CreateDailySpecialInput): Promise<DailySpecialEntity> {
    const special = await this.db.dailySpecial.create({
      data: {
        vendorId,
        title: input.title,
        currency: input.currency ?? 'MXN',
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      },
    });
    return this.mapToEntity(special);
  }

  async findById(id: string): Promise<DailySpecialEntity | null> {
    const special = await this.db.dailySpecial.findUnique({ where: { id } });
    return special ? this.mapToEntity(special) : null;
  }

  async findByVendor(vendorId: string, limit: number = 50, offset: number = 0): Promise<DailySpecialEntity[]> {
    const specials = await this.db.dailySpecial.findMany({
      where: { vendorId },
      orderBy: { startsAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return specials.map((special: any) => this.mapToEntity(special));
  }

  async findActive(now: Date, limit: number = 50, offset: number = 0): Promise<DailySpecialEntity[]> {
    const specials = await this.db.dailySpecial.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { startsAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return specials.map((special: any) => this.mapToEntity(special));
  }

  async update(id: string, input: UpdateDailySpecialInput): Promise<DailySpecialEntity> {
    const special = await this.db.dailySpecial.update({
      where: { id },
      data: input,
    });
    return this.mapToEntity(special);
  }

  async delete(id: string): Promise<void> {
    await this.db.dailySpecial.delete({ where: { id } });
  }

  private mapToEntity(special: any): DailySpecialEntity {
    return {
      id: special.id,
      vendorId: special.vendorId,
      title: special.title,
      description: special.description,
      priceCents: special.priceCents,
      currency: special.currency,
      startsAt: special.startsAt,
      endsAt: special.endsAt,
      isActive: special.isActive,
      createdAt: special.createdAt,
      updatedAt: special.updatedAt,
    };
  }
}
