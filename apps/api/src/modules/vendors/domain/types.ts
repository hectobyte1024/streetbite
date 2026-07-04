import { Id } from '../../../shared/types.js';

export type VendorId = string;

export enum VendorStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export interface VendorEntity {
  id: VendorId;
  ownerId: string;
  name: string;
  slug: string;
  status: VendorStatus;
  category: string;
  priceLevel: number | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVendorInput {
  name: string;
  category: string;
  description?: string;
  priceLevel?: number;
}

export interface UpdateVendorInput {
  name?: string;
  description?: string;
  priceLevel?: number;
  status?: VendorStatus;
}

export interface VendorFollowEntity {
  id: string;
  vendorId: VendorId;
  userId: Id;
  createdAt: Date;
}

export interface FollowedVendor extends VendorEntity {
  followedAt: Date;
}

export interface VendorHoursEntity {
  id: string;
  vendorId: VendorId;
  weekday: number;
  opensAt: Date;
  closesAt: Date;
}

export interface UpsertVendorHoursInput {
  weekday: number;
  opensAt: Date;
  closesAt: Date;
}
