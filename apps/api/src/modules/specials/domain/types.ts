import { Id } from '../../../shared/types.js';

export type DailySpecialId = string;

export interface DailySpecialEntity {
  id: DailySpecialId;
  vendorId: Id;
  title: string;
  description: string | null;
  priceCents: number | null;
  currency: string;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDailySpecialInput {
  title: string;
  description?: string;
  priceCents?: number;
  currency?: string;
  startsAt: Date;
  endsAt: Date;
}

export interface UpdateDailySpecialInput {
  title?: string;
  description?: string | null;
  priceCents?: number | null;
  currency?: string;
  startsAt?: Date;
  endsAt?: Date;
  isActive?: boolean;
}
