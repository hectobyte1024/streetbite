import { Id, Coordinates } from '../../../shared/types.js';

export type LocationId = string;

export interface LocationUpdate {
  vendorId: Id;
  coordinates: Coordinates;
  accuracy: number; // meters
}

export interface VendorLocationEntity {
  id: LocationId;
  vendorId: Id;
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: Date;
  isCurrent: boolean;
}

export interface LocationValidation {
  isValid: boolean;
  error?: string;
}

export interface LocationThrottleResult {
  accepted: boolean;
  reason?: string;
  lastLocationAt?: Date;
  distanceFromLast?: number;
}

export interface LocationThrottleInput {
  vendorId: Id;
  candidate?: Coordinates;
  minDistanceMeters?: number;
  minIntervalSeconds?: number;
}
