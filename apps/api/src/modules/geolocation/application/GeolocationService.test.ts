import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { GeolocationService } from './GeolocationService.js';
import type { GeolocationRepository } from '../domain/repositories.js';
import { LocationThrottleInput, LocationThrottleResult, VendorLocationEntity } from '../domain/types.js';
import { ConflictError, ValidationError } from '../../../shared/errors.js';

class InMemoryGeolocationRepository implements GeolocationRepository {
  locations: VendorLocationEntity[] = [];
  throttleResult: LocationThrottleResult = { accepted: true };
  lastThrottleInput: LocationThrottleInput | null = null;

  async saveLocation(
    vendorId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
  ): Promise<VendorLocationEntity> {
    this.locations = this.locations.map((location) =>
      location.vendorId === vendorId ? { ...location, isCurrent: false } : location,
    );

    const location = {
      id: `location-${this.locations.length + 1}`,
      vendorId,
      latitude,
      longitude,
      accuracy,
      capturedAt: new Date(),
      isCurrent: true,
    };
    this.locations.push(location);
    return location;
  }

  async getCurrentLocation(vendorId: string): Promise<VendorLocationEntity | null> {
    return this.locations.find((location) => location.vendorId === vendorId && location.isCurrent) ?? null;
  }

  async getLocationHistory(vendorId: string, limit: number = 100, offset: number = 0): Promise<VendorLocationEntity[]> {
    return this.locations.filter((location) => location.vendorId === vendorId).slice(offset, offset + limit);
  }

  async checkThrottle(input: LocationThrottleInput): Promise<LocationThrottleResult> {
    this.lastThrottleInput = input;
    return this.throttleResult;
  }

  async markLocationInactive(vendorId: string): Promise<void> {
    this.locations = this.locations.map((location) =>
      location.vendorId === vendorId ? { ...location, isCurrent: false } : location,
    );
  }
}

describe('GeolocationService', () => {
  let repository: InMemoryGeolocationRepository;
  let service: GeolocationService;

  beforeEach(() => {
    repository = new InMemoryGeolocationRepository();
    service = new GeolocationService(repository);
  });

  test('publishLocation validates and saves accepted updates', async () => {
    await service.publishLocation('vendor-1', {
      vendorId: 'vendor-1',
      coordinates: { lat: 19.4326, lng: -99.1332 },
      accuracy: 25,
    });

    assert.equal(repository.locations.length, 1);
    assert.equal(repository.locations[0]?.latitude, 19.4326);
    assert.equal(repository.locations[0]?.longitude, -99.1332);
    assert.deepEqual(repository.lastThrottleInput?.candidate, { lat: 19.4326, lng: -99.1332 });
    assert.equal(repository.lastThrottleInput?.minDistanceMeters, 20);
    assert.equal(repository.lastThrottleInput?.minIntervalSeconds, 10);
  });

  test('publishLocation rejects invalid coordinates', async () => {
    await assert.rejects(
      service.publishLocation('vendor-1', {
        vendorId: 'vendor-1',
        coordinates: { lat: 100, lng: -99.1332 },
        accuracy: 25,
      }),
      ValidationError,
    );
  });

  test('publishLocation rejects throttled updates', async () => {
    repository.throttleResult = { accepted: false, reason: 'Moved only 5m; threshold is 20m' };

    await assert.rejects(
      service.publishLocation('vendor-1', {
        vendorId: 'vendor-1',
        coordinates: { lat: 19.4326, lng: -99.1332 },
        accuracy: 25,
      }),
      ConflictError,
    );
    assert.equal(repository.locations.length, 0);
  });

  test('checkLocationAcceptance passes optional candidate coordinates', async () => {
    await service.checkLocationAcceptance('vendor-1', { lat: 19.433, lng: -99.134 });

    assert.deepEqual(repository.lastThrottleInput?.candidate, { lat: 19.433, lng: -99.134 });
  });

  test('goOffline marks current locations inactive', async () => {
    await repository.saveLocation('vendor-1', 19.4326, -99.1332, 25);

    await service.goOffline('vendor-1');

    assert.equal(await repository.getCurrentLocation('vendor-1'), null);
  });
});
