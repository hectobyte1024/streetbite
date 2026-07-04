import { CreateDailySpecialInput, DailySpecialEntity, UpdateDailySpecialInput } from './types.js';

export interface DailySpecialRepository {
  create(vendorId: string, input: CreateDailySpecialInput): Promise<DailySpecialEntity>;
  findById(id: string): Promise<DailySpecialEntity | null>;
  findByVendor(vendorId: string, limit?: number, offset?: number): Promise<DailySpecialEntity[]>;
  findActive(now: Date, limit?: number, offset?: number): Promise<DailySpecialEntity[]>;
  update(id: string, input: UpdateDailySpecialInput): Promise<DailySpecialEntity>;
  delete(id: string): Promise<void>;
}
