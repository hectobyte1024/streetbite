'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type RequestState = 'idle' | 'loading' | 'success' | 'error';
type MessageTone = 'neutral' | 'error';

type ApiResponse<T> = {
  data?: T;
  error?: string | { message?: string };
};

type Vendor = {
  id: string;
  name: string;
  status: string;
  category: string;
};

type LocationFix = {
  lat: number;
  lng: number;
  accuracy: number;
};

type PendingLocation = LocationFix & {
  id: string;
  vendorId: string;
  capturedAt: string;
};

type MenuItem = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
};

type DailySpecial = {
  id: string;
  title: string;
};

type VendorHours = {
  weekday: number;
  opensAt: string;
  closesAt: string;
};

const weekdays = [
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
];

const pendingLocationKey = 'streetbite_pending_locations';

export default function VendorDashboardPage() {
  const [accessToken, setAccessToken] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [loadState, setLoadState] = useState<RequestState>('idle');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('neutral');

  const [location, setLocation] = useState<LocationFix | null>(null);
  const [locationState, setLocationState] = useState<RequestState>('idle');
  const [pendingLocationCount, setPendingLocationCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const [menuName, setMenuName] = useState('');
  const [menuDescription, setMenuDescription] = useState('');
  const [menuCategory, setMenuCategory] = useState('');
  const [menuPrice, setMenuPrice] = useState('');
  const [menuState, setMenuState] = useState<RequestState>('idle');

  const [specialTitle, setSpecialTitle] = useState('');
  const [specialDescription, setSpecialDescription] = useState('');
  const [specialPrice, setSpecialPrice] = useState('');
  const [specialStartsAt, setSpecialStartsAt] = useState('');
  const [specialEndsAt, setSpecialEndsAt] = useState('');
  const [specialState, setSpecialState] = useState<RequestState>('idle');

  const [hoursWeekday, setHoursWeekday] = useState('1');
  const [opensAt, setOpensAt] = useState('09:00');
  const [closesAt, setClosesAt] = useState('18:00');
  const [hoursState, setHoursState] = useState<RequestState>('idle');

  const selectedVendor = useMemo(() => {
    return vendors.find((vendor) => vendor.id === selectedVendorId) ?? null;
  }, [selectedVendorId, vendors]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem('streetbite_access_token') ?? '';
    setAccessToken(savedToken);
    setPendingLocationCount(readPendingLocations().length);
    setIsOnline(navigator.onLine);
    if (savedToken) {
      void loadVendors(savedToken);
    }
  }, []);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      void syncPendingLocations();
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
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && pendingLocationCount > 0 && navigator.onLine) {
      void syncPendingLocations();
    }
  }, [accessToken, pendingLocationCount]);

  async function loadVendors(token = accessToken) {
    if (!token) {
      setLoadState('error');
      setMessage('Sign in or publish a vendor first.');
      setMessageTone('error');
      return;
    }

    setLoadState('loading');
    setMessage('');
    setMessageTone('neutral');

    const response = await fetch('/api/vendors/my/list', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await parseResponse<Vendor[]>(response);

    if (!response.ok || !body.data) {
      setLoadState('error');
      setMessage(getErrorMessage(body, 'Could not load vendors'));
      setMessageTone('error');
      return;
    }

    window.localStorage.setItem('streetbite_access_token', token);
    setVendors(body.data);
    setSelectedVendorId((current) => current || body.data?.[0]?.id || '');
    setLoadState('success');
    setMessage(body.data.length ? 'Vendor list loaded.' : 'No vendors on this account yet.');
    setMessageTone('neutral');
  }

  function captureLocation() {
    if (!selectedVendorId) {
      setLocationState('error');
      setMessage('Choose a vendor first.');
      setMessageTone('error');
      return;
    }

    setLocationState('loading');
    setMessage('');
    setMessageTone('neutral');

    if (!navigator.geolocation) {
      setLocationState('error');
      setMessage('GPS is not available in this browser.');
      setMessageTone('error');
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
        await publishLocation(nextLocation);
      },
      () => {
        setLocationState('error');
        setMessage('Location permission was not granted.');
        setMessageTone('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }

  async function publishLocation(nextLocation: LocationFix) {
    const saved = await sendOrQueueLocation(selectedVendorId, nextLocation);
    if (!saved) {
      return;
    }

    setLocationState('success');
    setMessage('Location updated.');
    setMessageTone('neutral');
  }

  async function sendOrQueueLocation(vendorId: string, nextLocation: LocationFix): Promise<boolean> {
    try {
      const response = await fetch(`/api/vendors/${vendorId}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(nextLocation),
      });
      const body = await parseResponse<{ ok: true }>(response);

      if (response.ok) {
        return true;
      }

      const errorMessage = getErrorMessage(body, 'Could not publish GPS location');
      if (isRetryableLocationStatus(response.status)) {
        queueLocation(vendorId, nextLocation);
        setLocationState('success');
        setMessage('GPS saved offline. It will sync when the connection returns.');
        setMessageTone('neutral');
        return false;
      }

      setLocationState('error');
      setMessage(errorMessage);
      setMessageTone('error');
      return false;
    } catch {
      queueLocation(vendorId, nextLocation);
      setLocationState('success');
      setMessage('GPS saved offline. It will sync when the connection returns.');
      setMessageTone('neutral');
      return false;
    }
  }

  function queueLocation(vendorId: string, nextLocation: LocationFix) {
    const pending = readPendingLocations().filter((item) => item.vendorId !== vendorId);
    pending.push({
      ...nextLocation,
      id: `${vendorId}-${Date.now()}`,
      vendorId,
      capturedAt: new Date().toISOString(),
    });
    writePendingLocations(pending);
    setPendingLocationCount(pending.length);
  }

  async function syncPendingLocations() {
    if (!accessToken) {
      setMessage('Sign in before syncing saved GPS updates.');
      setMessageTone('error');
      return;
    }

    const pending = readPendingLocations();
    if (pending.length === 0) {
      setPendingLocationCount(0);
      return;
    }

    if (!navigator.onLine) {
      setIsOnline(false);
      setMessage('GPS updates are saved on this device until connection returns.');
      setMessageTone('neutral');
      return;
    }

    setLocationState('loading');
    setMessage('Syncing saved GPS updates...');
    setMessageTone('neutral');

    const remaining: PendingLocation[] = [];
    let syncError = '';
    for (const item of pending) {
      try {
        const response = await fetch(`/api/vendors/${item.vendorId}/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            lat: item.lat,
            lng: item.lng,
            accuracy: item.accuracy,
          }),
        });

        if (!response.ok) {
          const body = await parseResponse<{ ok: true }>(response);
          if (response.status === 401 || response.status === 403) {
            remaining.push(item);
            syncError = 'Sign in again before syncing saved GPS updates.';
          } else if (isRetryableLocationStatus(response.status)) {
            remaining.push(item);
          } else {
            syncError = getErrorMessage(body, 'Could not sync a saved GPS update');
          }
        }
      } catch {
        remaining.push(item);
      }
    }

    writePendingLocations(remaining);
    setPendingLocationCount(remaining.length);
    setLocationState('success');
    if (syncError) {
      setMessage(syncError);
      setMessageTone('error');
    } else if (remaining.length) {
      setMessage(`${remaining.length} GPS update${remaining.length === 1 ? '' : 's'} still saved offline.`);
      setMessageTone('neutral');
    } else {
      setMessage('Saved GPS updates synced.');
      setMessageTone('neutral');
    }
  }

  async function handleMenuSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMenuState('loading');
    setMessage('');
    setMessageTone('neutral');

    const response = await fetch(`/api/vendors/${selectedVendorId}/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: menuName.trim(),
        description: menuDescription.trim() || undefined,
        category: menuCategory.trim() || undefined,
        priceCents: moneyToCents(menuPrice),
        currency: 'MXN',
        isAvailable: true,
      }),
    });
    const body = await parseResponse<MenuItem>(response);

    if (!response.ok || !body.data) {
      setMenuState('error');
      setMessage(getErrorMessage(body, 'Could not add menu item'));
      setMessageTone('error');
      return;
    }

    setMenuName('');
    setMenuDescription('');
    setMenuCategory('');
    setMenuPrice('');
    setMenuState('success');
    setMessage(`${body.data.name} added to the menu.`);
    setMessageTone('neutral');
  }

  async function handleSpecialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSpecialState('loading');
    setMessage('');
    setMessageTone('neutral');

    const response = await fetch(`/api/vendors/${selectedVendorId}/specials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        title: specialTitle.trim(),
        description: specialDescription.trim() || undefined,
        priceCents: specialPrice.trim() ? moneyToCents(specialPrice) : undefined,
        currency: 'MXN',
        startsAt: new Date(specialStartsAt).toISOString(),
        endsAt: new Date(specialEndsAt).toISOString(),
      }),
    });
    const body = await parseResponse<DailySpecial>(response);

    if (!response.ok || !body.data) {
      setSpecialState('error');
      setMessage(getErrorMessage(body, 'Could not add special'));
      setMessageTone('error');
      return;
    }

    setSpecialTitle('');
    setSpecialDescription('');
    setSpecialPrice('');
    setSpecialStartsAt('');
    setSpecialEndsAt('');
    setSpecialState('success');
    setMessage(`${body.data.title} posted as a special.`);
    setMessageTone('neutral');
  }

  async function handleHoursSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHoursState('loading');
    setMessage('');
    setMessageTone('neutral');

    const response = await fetch(`/api/vendors/${selectedVendorId}/hours`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        hours: [
          {
            weekday: Number.parseInt(hoursWeekday, 10),
            opensAt,
            closesAt,
          },
        ],
      }),
    });
    const body = await parseResponse<VendorHours[]>(response);

    if (!response.ok || !body.data) {
      setHoursState('error');
      setMessage(getErrorMessage(body, 'Could not update hours'));
      setMessageTone('error');
      return;
    }

    setHoursState('success');
    setMessage('Hours updated.');
    setMessageTone('neutral');
  }

  const canManage = Boolean(accessToken && selectedVendorId);

  return (
    <main className="shell">
      <section className="workspace" aria-label="Vendor dashboard workspace">
        <div className="masthead">
          <div>
            <p className="eyebrow">StreetBite vendor dashboard</p>
            <h1>Keep the stand live</h1>
          </div>
          <div className="mastheadActions">
            <Link className="navLink" href="/">
              Onboarding
            </Link>
            <Link className="navLink" href="/nearby">
              Customer view
            </Link>
            <div className="connection">
              <span className={canManage ? 'dot dotReady' : 'dot'} />
              {canManage ? 'Ready' : 'Needs vendor'}
            </div>
          </div>
        </div>

        <div className="dashboardGrid">
          <aside className="panel dashboardSide">
            <div className="panelHeader">
              <div>
                <p className="panelKicker">Account</p>
                <h2>Vendor access</h2>
              </div>
            </div>

            <div className="form">
              <label>
                Access token
                <input
                  onChange={(event) => setAccessToken(event.target.value)}
                  placeholder="Saved after sign in"
                  value={accessToken}
                />
              </label>
              <button className="primaryButton" disabled={loadState === 'loading'} type="button" onClick={() => loadVendors()}>
                {loadState === 'loading' ? 'Loading...' : 'Load my vendors'}
              </button>

              <label>
                Active vendor
                <select
                  disabled={vendors.length === 0}
                  onChange={(event) => setSelectedVendorId(event.target.value)}
                  value={selectedVendorId}
                >
                  {vendors.length === 0 ? <option value="">No vendors loaded</option> : null}
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <dl className="lightList">
              <div>
                <dt>Status</dt>
                <dd>{selectedVendor?.status ?? '-'}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{selectedVendor?.category ?? '-'}</dd>
              </div>
              <div>
                <dt>Vendor ID</dt>
                <dd>{selectedVendor?.id ?? '-'}</dd>
              </div>
              <div>
                <dt>Connection</dt>
                <dd>{isOnline ? 'Online' : 'Offline'}</dd>
              </div>
              <div>
                <dt>Saved GPS</dt>
                <dd>{pendingLocationCount}</dd>
              </div>
            </dl>
          </aside>

          <section className="dashboardMain">
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <p className="panelKicker">Location</p>
                  <h2>Publish current GPS</h2>
                </div>
              </div>
              <div className="locationBand">
                <div>
                  <span className="panelKicker">Latest capture</span>
                  <strong>{location ? `${location.lat}, ${location.lng}` : 'No location captured'}</strong>
                  <small>{location ? `Accuracy ${location.accuracy} m` : 'Use this from the store phone.'}</small>
                </div>
                <button className="secondaryButton" disabled={!canManage || locationState === 'loading'} type="button" onClick={captureLocation}>
                  {locationState === 'loading' ? 'Finding...' : 'Use my GPS'}
                </button>
                <button className="secondaryButton" disabled={!accessToken || pendingLocationCount === 0 || locationState === 'loading'} type="button" onClick={syncPendingLocations}>
                  Sync saved GPS
                </button>
              </div>
              {pendingLocationCount > 0 ? (
                <p className="offlineNote">
                  {pendingLocationCount} GPS update{pendingLocationCount === 1 ? '' : 's'} saved on this device.
                </p>
              ) : null}
            </section>

            <section className="dashboardForms">
              <form className="panel form" onSubmit={handleMenuSubmit}>
                <div>
                  <p className="panelKicker">Menu</p>
                  <h2>Add an item</h2>
                </div>
                <label>
                  Name
                  <input maxLength={120} onChange={(event) => setMenuName(event.target.value)} required value={menuName} />
                </label>
                <label>
                  Description
                  <textarea maxLength={1000} onChange={(event) => setMenuDescription(event.target.value)} rows={3} value={menuDescription} />
                </label>
                <div className="fieldPair">
                  <label>
                    Category
                    <input maxLength={80} onChange={(event) => setMenuCategory(event.target.value)} placeholder="tacos" value={menuCategory} />
                  </label>
                  <label>
                    Price MXN
                    <input inputMode="decimal" min="0" onChange={(event) => setMenuPrice(event.target.value)} placeholder="35" required type="number" value={menuPrice} />
                  </label>
                </div>
                <button className="primaryButton" disabled={!canManage || menuState === 'loading'} type="submit">
                  {menuState === 'loading' ? 'Adding...' : 'Add menu item'}
                </button>
              </form>

              <form className="panel form" onSubmit={handleSpecialSubmit}>
                <div>
                  <p className="panelKicker">Special</p>
                  <h2>Post a deal</h2>
                </div>
                <label>
                  Title
                  <input maxLength={120} onChange={(event) => setSpecialTitle(event.target.value)} required value={specialTitle} />
                </label>
                <label>
                  Description
                  <textarea maxLength={1000} onChange={(event) => setSpecialDescription(event.target.value)} rows={3} value={specialDescription} />
                </label>
                <div className="fieldPair">
                  <label>
                    Starts
                    <input onChange={(event) => setSpecialStartsAt(event.target.value)} required type="datetime-local" value={specialStartsAt} />
                  </label>
                  <label>
                    Ends
                    <input onChange={(event) => setSpecialEndsAt(event.target.value)} required type="datetime-local" value={specialEndsAt} />
                  </label>
                </div>
                <label>
                  Price MXN
                  <input inputMode="decimal" min="0" onChange={(event) => setSpecialPrice(event.target.value)} placeholder="Optional" type="number" value={specialPrice} />
                </label>
                <button className="primaryButton" disabled={!canManage || specialState === 'loading'} type="submit">
                  {specialState === 'loading' ? 'Posting...' : 'Post special'}
                </button>
              </form>

              <form className="panel form" onSubmit={handleHoursSubmit}>
                <div>
                  <p className="panelKicker">Hours</p>
                  <h2>Set today block</h2>
                </div>
                <label>
                  Weekday
                  <select onChange={(event) => setHoursWeekday(event.target.value)} value={hoursWeekday}>
                    {weekdays.map((weekday) => (
                      <option key={weekday.value} value={weekday.value}>
                        {weekday.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="fieldPair">
                  <label>
                    Opens
                    <input onChange={(event) => setOpensAt(event.target.value)} required type="time" value={opensAt} />
                  </label>
                  <label>
                    Closes
                    <input onChange={(event) => setClosesAt(event.target.value)} required type="time" value={closesAt} />
                  </label>
                </div>
                <button className="primaryButton" disabled={!canManage || hoursState === 'loading'} type="submit">
                  {hoursState === 'loading' ? 'Saving...' : 'Save hours'}
                </button>
              </form>
            </section>

            {message ? (
              <p className={messageTone === 'error' ? 'message error' : 'message'}>
                {message}
              </p>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return {};
  }
}

function getErrorMessage<T>(body: ApiResponse<T>, fallback: string): string {
  if (typeof body.error === 'string') {
    return body.error;
  }
  return body.error?.message ?? fallback;
}

function moneyToCents(value: string): number {
  return Math.round(Number.parseFloat(value) * 100);
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function readPendingLocations(): PendingLocation[] {
  try {
    const raw = window.localStorage.getItem(pendingLocationKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingLocations(locations: PendingLocation[]) {
  window.localStorage.setItem(pendingLocationKey, JSON.stringify(locations));
}

function isRetryableLocationStatus(status: number): boolean {
  return status === 409 || status === 429 || status >= 500;
}
