'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type RequestState = 'idle' | 'loading' | 'success' | 'error';

type LocationFix = {
  lat: number;
  lng: number;
  accuracy: number;
};

type NearbyVendor = {
  id: string;
  name: string;
  category: string;
  slug: string;
  priceLevel: number | null;
  isOpen: boolean;
  distanceMeters: number;
  location: {
    lat: number;
    lng: number;
  };
  ratingAvg: number | null;
  reviewCount: number;
};

type NearbyResponse = {
  data?: NearbyVendor[];
  error?: string | { message?: string };
  meta?: {
    count?: number;
    radiusMeters?: number;
  };
};

type CachedNearby = {
  vendors: NearbyVendor[];
  location: LocationFix;
  category: string;
  radiusMeters: string;
  capturedAt: string;
};

const categories = ['all', 'tacos', 'tamales', 'tortas', 'mariscos', 'coffee', 'dessert', 'other'];
const nearbyCacheKey = 'streetbite_nearby_cache';

export default function NearbyVendorsPage() {
  const [location, setLocation] = useState<LocationFix | null>(null);
  const [vendors, setVendors] = useState<NearbyVendor[]>([]);
  const [radiusMeters, setRadiusMeters] = useState('1000');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<RequestState>('idle');
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [cachedAt, setCachedAt] = useState('');

  const sortedVendors = useMemo(() => {
    return [...vendors].sort((first, second) => first.distanceMeters - second.distanceMeters);
  }, [vendors]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const cached = readCachedNearby();
    if (cached) {
      setCachedAt(cached.capturedAt);
    }

    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  function captureLocation() {
    setStatus('loading');
    setMessage('');

    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('GPS is not available in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          lat: roundCoordinate(position.coords.latitude),
          lng: roundCoordinate(position.coords.longitude),
          accuracy: Math.round(position.coords.accuracy),
        };
        setLocation(nextLocation);
        await fetchNearby(nextLocation);
      },
      () => {
        setStatus('error');
        setMessage('Location permission was not granted.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }

  async function fetchNearby(locationOverride = location) {
    if (!locationOverride) {
      setStatus('error');
      setMessage('Capture your location first.');
      return;
    }

    setStatus('loading');
    setMessage('');

    const params = new URLSearchParams({
      lat: String(locationOverride.lat),
      lng: String(locationOverride.lng),
      radius: radiusMeters,
    });
    if (category !== 'all') {
      params.set('category', category);
    }

    try {
      const response = await fetch(`/api/vendors/nearby?${params.toString()}`);
      const body = (await response.json().catch(() => ({}))) as NearbyResponse;

      if (!response.ok || !body.data) {
        useCachedNearby(locationOverride, getErrorMessage(body, 'Could not load nearby vendors'));
        return;
      }

      setVendors(body.data);
      setStatus('success');
      setMessage(body.data.length === 0 ? 'No active vendors found in this area yet.' : `${body.data.length} nearby vendor${body.data.length === 1 ? '' : 's'} found.`);
      const nextCachedAt = new Date().toISOString();
      writeCachedNearby({
        vendors: body.data,
        location: locationOverride,
        category,
        radiusMeters,
        capturedAt: nextCachedAt,
      });
      setCachedAt(nextCachedAt);
    } catch {
      useCachedNearby(locationOverride, 'Could not reach StreetBite. Showing saved nearby results.');
    }
  }

  function useCachedNearby(locationOverride: LocationFix, fallbackMessage: string) {
    const cached = readCachedNearby();
    if (!cached || cached.vendors.length === 0) {
      setStatus('error');
      setMessage(fallbackMessage);
      return;
    }

    const radius = Number.parseInt(radiusMeters, 10);
    const filtered = cached.vendors
      .filter((vendor) => category === 'all' || vendor.category === category)
      .map((vendor) => ({
        ...vendor,
        distanceMeters: calculateDistanceMeters(locationOverride, vendor.location),
      }))
      .filter((vendor) => vendor.distanceMeters <= radius);

    setVendors(filtered);
    setStatus('success');
    setCachedAt(cached.capturedAt);
    setMessage(
      filtered.length === 0
        ? 'No saved vendors match this filter.'
        : `Showing ${filtered.length} saved vendor${filtered.length === 1 ? '' : 's'} from the last successful search.`,
    );
  }

  return (
    <main className="shell">
      <section className="workspace" aria-label="Nearby vendors workspace">
        <div className="masthead">
          <div>
            <p className="eyebrow">StreetBite customer discovery</p>
            <h1>Find food near you</h1>
          </div>
          <div className="mastheadActions">
            <Link className="navLink" href="/vendor/dashboard">
              Vendor dashboard
            </Link>
            <Link className="navLink" href="/">
              Vendor onboarding
            </Link>
            <div className="connection">
              <span className={location ? 'dot dotReady' : 'dot'} />
              {location ? 'Location ready' : 'Needs GPS'}
            </div>
          </div>
        </div>

        <div className="nearbyGrid">
          <section className="panel searchPanel" aria-labelledby="search-title">
            <div className="panelHeader">
              <div>
                <p className="panelKicker">Search</p>
                <h2 id="search-title">Nearby filters</h2>
              </div>
            </div>

            <div className="form">
              <div className="offlineCard nearbyOfflineCard">
                <strong>{isOnline ? 'Live search ready' : 'Offline results ready'}</strong>
                <span>{cachedAt ? `Last saved nearby search: ${formatTimestamp(cachedAt)}` : 'Nearby results save after the first successful search.'}</span>
              </div>

              <div className="fieldPair">
                <label>
                  Radius
                  <select onChange={(event) => setRadiusMeters(event.target.value)} value={radiusMeters}>
                    <option value="500">500 m</option>
                    <option value="1000">1 km</option>
                    <option value="2000">2 km</option>
                    <option value="5000">5 km</option>
                  </select>
                </label>
                <label>
                  Category
                  <select onChange={(event) => setCategory(event.target.value)} value={category}>
                    {categories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="locationBand">
                <div>
                  <span className="panelKicker">Your GPS</span>
                  <strong>{location ? `${location.lat}, ${location.lng}` : 'No location captured'}</strong>
                  <small>{location ? `Accuracy ${location.accuracy} m` : 'Use this on the customer phone.'}</small>
                </div>
                <button className="secondaryButton" disabled={status === 'loading'} type="button" onClick={captureLocation}>
                  {status === 'loading' ? 'Searching...' : 'Use current location'}
                </button>
              </div>

              <button className="primaryButton" disabled={!location || status === 'loading'} type="button" onClick={() => fetchNearby()}>
                Refresh nearby
              </button>
            </div>

            {message ? <p className={status === 'error' ? 'message error' : 'message'}>{message}</p> : null}
          </section>

          <section className="vendorResults" aria-label="Nearby vendor results">
            {sortedVendors.length === 0 ? (
              <div className="emptyState">
                <p className="panelKicker">Results</p>
                <h2>Ready when you are</h2>
                <p>Capture GPS to see active StreetBite vendors nearby.</p>
              </div>
            ) : (
              sortedVendors.map((vendor) => (
                <article className="vendorCard" key={vendor.id}>
                  <div className="vendorCardHeader">
                    <div>
                      <p className="panelKicker">{vendor.category}</p>
                      <h2>{vendor.name}</h2>
                    </div>
                    <span className={vendor.isOpen ? 'statusPill open' : 'statusPill'}>
                      {vendor.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  <div className="vendorMeta">
                    <span>{formatDistance(vendor.distanceMeters)}</span>
                    <span>{formatPriceLevel(vendor.priceLevel)}</span>
                    <span>{formatRating(vendor.ratingAvg, vendor.reviewCount)}</span>
                  </div>

                  <div className="miniMap" aria-label={`Approximate location for ${vendor.name}`}>
                    <span />
                    <small>
                      {vendor.location.lat}, {vendor.location.lng}
                    </small>
                  </div>
                  <Link className="cardLink" href={`/vendors/${vendor.id}`}>
                    View details
                  </Link>
                </article>
              ))
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function getErrorMessage(body: NearbyResponse, fallback: string): string {
  if (typeof body.error === 'string') {
    return body.error;
  }
  return body.error?.message ?? fallback;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatPriceLevel(priceLevel: number | null): string {
  if (!priceLevel) {
    return 'Price unknown';
  }
  return '$'.repeat(priceLevel);
}

function formatRating(ratingAvg: number | null, reviewCount: number): string {
  if (!ratingAvg || reviewCount === 0) {
    return 'No reviews';
  }
  return `${ratingAvg.toFixed(1)} (${reviewCount})`;
}

function readCachedNearby(): CachedNearby | null {
  try {
    const raw = window.localStorage.getItem(nearbyCacheKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.vendors)) {
      return null;
    }
    return parsed as CachedNearby;
  } catch {
    return null;
  }
}

function writeCachedNearby(cache: CachedNearby) {
  window.localStorage.setItem(nearbyCacheKey, JSON.stringify(cache));
}

function calculateDistanceMeters(origin: LocationFix, destination: { lat: number; lng: number }): number {
  const earthRadiusMeters = 6_371_000;
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
