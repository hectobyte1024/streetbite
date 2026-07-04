'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type AuthMode = 'login' | 'register';
type RequestState = 'idle' | 'loading' | 'success' | 'error';

type LocationFix = {
  lat: number;
  lng: number;
  accuracy: number;
};

type ApiResponse<T> = {
  data?: T;
  error?: string | { message?: string };
};

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

type OnboardResponse = {
  vendor: {
    id: string;
    name: string;
    status: string;
    category: string;
  };
  location: LocationFix & {
    capturedAt: string;
  };
};

const categories = ['tacos', 'tamales', 'tortas', 'mariscos', 'coffee', 'dessert', 'other'];

export default function VendorOnboardingPage() {
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [authState, setAuthState] = useState<RequestState>('idle');
  const [authMessage, setAuthMessage] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('tacos');
  const [description, setDescription] = useState('');
  const [priceLevel, setPriceLevel] = useState('2');
  const [location, setLocation] = useState<LocationFix | null>(null);
  const [locationState, setLocationState] = useState<RequestState>('idle');
  const [submitState, setSubmitState] = useState<RequestState>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [createdVendor, setCreatedVendor] = useState<OnboardResponse | null>(null);

  useEffect(() => {
    const savedToken = window.localStorage.getItem('streetbite_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
      setAuthMessage('Signed in on this device.');
    }
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(accessToken && name.trim() && category && location && submitState !== 'loading');
  }, [accessToken, category, location, name, submitState]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthState('loading');
    setAuthMessage('');

    const response = await fetch(`/api/auth/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await parseResponse<TokenResponse>(response);

    if (!response.ok || !body.data) {
      setAuthState('error');
      setAuthMessage(getErrorMessage(body, authMode === 'register' ? 'Could not create account' : 'Could not sign in'));
      return;
    }

    window.localStorage.setItem('streetbite_access_token', body.data.accessToken);
    setAccessToken(body.data.accessToken);
    setAuthState('success');
    setAuthMessage(authMode === 'register' ? 'Account ready.' : 'Signed in.');
  }

  function captureLocation() {
    setLocationState('loading');
    setSubmitMessage('');

    if (!navigator.geolocation) {
      setLocationState('error');
      setSubmitMessage('GPS is not available in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: roundCoordinate(position.coords.latitude),
          lng: roundCoordinate(position.coords.longitude),
          accuracy: Math.round(position.coords.accuracy),
        });
        setLocationState('success');
      },
      () => {
        setLocationState('error');
        setSubmitMessage('Location permission was not granted.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }

  async function handleOnboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location) {
      setSubmitState('error');
      setSubmitMessage('Capture GPS first.');
      return;
    }

    setSubmitState('loading');
    setSubmitMessage('');
    setCreatedVendor(null);

    const response = await fetch('/api/vendors/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        priceLevel: Number.parseInt(priceLevel, 10),
        location,
      }),
    });
    const body = await parseResponse<OnboardResponse>(response);

    if (!response.ok || !body.data) {
      setSubmitState('error');
      setSubmitMessage(getErrorMessage(body, 'Could not onboard vendor'));
      return;
    }

    setCreatedVendor(body.data);
    setSubmitState('success');
    setSubmitMessage('Vendor is active on StreetBite.');
  }

  return (
    <main className="shell">
      <section className="workspace" aria-label="Vendor onboarding workspace">
        <div className="masthead">
          <div>
            <p className="eyebrow">StreetBite vendor onboarding</p>
            <h1>Add a business from the street</h1>
          </div>
          <div className="mastheadActions">
            <Link className="navLink" href="/nearby">
              Customer view
            </Link>
            <div className="connection">
              <span className={accessToken ? 'dot dotReady' : 'dot'} />
              {accessToken ? 'Authenticated' : 'Needs sign in'}
            </div>
          </div>
        </div>

        <div className="grid">
          <section className="panel authPanel" aria-labelledby="auth-title">
            <div className="panelHeader">
              <div>
                <p className="panelKicker">Step 1</p>
                <h2 id="auth-title">Vendor access</h2>
              </div>
              <div className="toggle" aria-label="Authentication mode">
                <button
                  className={authMode === 'register' ? 'toggleButton active' : 'toggleButton'}
                  type="button"
                  onClick={() => setAuthMode('register')}
                >
                  Create
                </button>
                <button
                  className={authMode === 'login' ? 'toggleButton active' : 'toggleButton'}
                  type="button"
                  onClick={() => setAuthMode('login')}
                >
                  Sign in
                </button>
              </div>
            </div>

            <form className="form" onSubmit={handleAuth}>
              <label>
                Email
                <input
                  autoComplete="email"
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="owner@example.com"
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label>
                Password
                <input
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  required
                  type="password"
                  value={password}
                />
              </label>
              <button className="primaryButton" disabled={authState === 'loading'} type="submit">
                {authState === 'loading' ? 'Working...' : authMode === 'register' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            {authMessage ? <p className={authState === 'error' ? 'message error' : 'message'}>{authMessage}</p> : null}
          </section>

          <section className="panel" aria-labelledby="business-title">
            <div className="panelHeader">
              <div>
                <p className="panelKicker">Step 2</p>
                <h2 id="business-title">Business profile</h2>
              </div>
            </div>

            <form className="form" onSubmit={handleOnboard}>
              <div className="fieldPair">
                <label>
                  Business name
                  <input
                    maxLength={255}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Tacos Don Raul"
                    required
                    value={name}
                  />
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

              <label>
                Description
                <textarea
                  maxLength={2000}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Pastor, suadero, fresh salsas"
                  rows={4}
                  value={description}
                />
              </label>

              <label>
                Price level
                <select onChange={(event) => setPriceLevel(event.target.value)} value={priceLevel}>
                  <option value="1">$</option>
                  <option value="2">$$</option>
                  <option value="3">$$$</option>
                  <option value="4">$$$$</option>
                  <option value="5">$$$$$</option>
                </select>
              </label>

              <div className="locationBand">
                <div>
                  <span className="panelKicker">GPS</span>
                  <strong>{location ? `${location.lat}, ${location.lng}` : 'No location captured'}</strong>
                  <small>{location ? `Accuracy ${location.accuracy} m` : 'Use the vendor phone at the business location.'}</small>
                </div>
                <button className="secondaryButton" disabled={locationState === 'loading'} type="button" onClick={captureLocation}>
                  {locationState === 'loading' ? 'Finding...' : 'Use current location'}
                </button>
              </div>

              <button className="primaryButton submitButton" disabled={!canSubmit} type="submit">
                {submitState === 'loading' ? 'Publishing...' : 'Publish vendor'}
              </button>
            </form>

            {submitMessage ? <p className={submitState === 'error' ? 'message error' : 'message'}>{submitMessage}</p> : null}
          </section>

          <aside className="panel summaryPanel" aria-label="Onboarding summary">
            <p className="panelKicker">Live record</p>
            <h2>{createdVendor?.vendor.name ?? 'Waiting for vendor'}</h2>
            <dl>
              <div>
                <dt>Status</dt>
                <dd>{createdVendor?.vendor.status ?? 'Not published'}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{createdVendor?.vendor.category ?? category}</dd>
              </div>
              <div>
                <dt>Latitude</dt>
                <dd>{createdVendor?.location.lat ?? location?.lat ?? '-'}</dd>
              </div>
              <div>
                <dt>Longitude</dt>
                <dd>{createdVendor?.location.lng ?? location?.lng ?? '-'}</dd>
              </div>
            </dl>
          </aside>
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

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
