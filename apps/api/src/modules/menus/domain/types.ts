import { Id } from '../../../shared/types.js';

export type MenuItemId = string;

export interface MenuItemEntity {
  id: MenuItemId;
  vendorId: Id;
  name: string;
  description: string | null;
  category: string | null;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMenuItemInput {
  name: string;
  description?: string;
  category?: string;
  priceCents: number;
  currency?: string;
  isAvailable?: boolean;
  sortOrder?: number;
}

export interface UpdateMenuItemInput {
  name?: string;
  description?: string | null;
  category?: string | null;
  priceCents?: number;
  currency?: string;
  isAvailable?: boolean;
  sortOrder?: number;
}
