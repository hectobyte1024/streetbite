'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type RequestState = 'idle' | 'loading' | 'success' | 'error';

type Vendor = {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: string;
  priceLevel: number | null;
  description: string | null;
};

type VendorLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

type VendorHours = {
  weekday: number;
  opensAt: string;
  closesAt: string;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
};

type DailySpecial = {
  id: string;
  title: string;
  description: string | null;
  priceCents: number | null;
  currency: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

type Review = {
  id: string;
  rating: number;
  body: string | null;
  authorName: string;
  createdAt: string;
};

type RatingSummary = {
  averageRating: number;
  totalReviews: number;
};

type VendorProfile = {
  vendor: Vendor;
  location: VendorLocation | null;
  hours: VendorHours[];
  menu: MenuItem[];
  specials: DailySpecial[];
  reviews: Review[];
  ratingSummary: RatingSummary | null;
};

type ProfileResponse = {
  data?: VendorProfile;
  error?: string | { message?: string };
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function VendorDetailPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [status, setStatus] = useState<RequestState>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadProfile();
  }, [vendorId]);

  const availableMenu = useMemo(() => {
    return profile?.menu.filter((item) => item.isAvailable) ?? [];
  }, [profile]);

  async function loadProfile() {
    setStatus('loading');
    setMessage('');

    const response = await fetch(`/api/vendor-profile/${vendorId}`);
    const body = (await response.json().catch(() => ({}))) as ProfileResponse;

    if (!response.ok || !body.data) {
      setStatus('error');
      setMessage(getErrorMessage(body, 'Could not load vendor profile'));
      return;
    }

    setProfile(body.data);
    setStatus('success');
  }

  return (
    <main className="shell">
      <section className="workspace" aria-label="Vendor profile workspace">
        <div className="masthead">
          <div>
            <p className="eyebrow">StreetBite vendor profile</p>
            <h1>{profile?.vendor.name ?? 'Loading vendor'}</h1>
          </div>
          <div className="mastheadActions">
            <Link className="navLink" href="/nearby">
              Nearby vendors
            </Link>
            <Link className="navLink" href="/">
              Vendor onboarding
            </Link>
          </div>
        </div>

        {status === 'error' ? (
          <section className="panel">
            <p className="message error">{message}</p>
            <button className="primaryButton retryButton" type="button" onClick={loadProfile}>
              Retry
            </button>
          </section>
        ) : null}

        {!profile && status !== 'error' ? (
          <section className="panel loadingPanel">
            <p className="panelKicker">Profile</p>
            <h2>Loading details...</h2>
          </section>
        ) : null}

        {profile ? (
          <div className="profileGrid">
            <aside className="panel profileSummary">
              <p className="panelKicker">{profile.vendor.category}</p>
              <h2>{profile.vendor.name}</h2>
              <p>{profile.vendor.description ?? 'No description yet.'}</p>

              <div className="vendorMeta profileMeta">
                <span>{formatPriceLevel(profile.vendor.priceLevel)}</span>
                <span>{profile.vendor.status}</span>
                <span>{formatRating(profile.ratingSummary)}</span>
              </div>

              <div className="miniMap profileMap" aria-label={`Current location for ${profile.vendor.name}`}>
                <span />
                <small>
                  {profile.location
                    ? `${profile.location.latitude}, ${profile.location.longitude}`
                    : 'No current location'}
                </small>
              </div>
            </aside>

            <section className="profileStack">
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">Menu</p>
                    <h2>Available items</h2>
                  </div>
                </div>
                {availableMenu.length === 0 ? (
                  <p className="mutedText">No menu items yet.</p>
                ) : (
                  <div className="itemList">
                    {availableMenu.map((item) => (
                      <article className="listItem" key={item.id}>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.description ?? item.category ?? 'Menu item'}</small>
                        </div>
                        <span>{formatMoney(item.priceCents, item.currency)}</span>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">Specials</p>
                    <h2>Today and upcoming</h2>
                  </div>
                </div>
                {profile.specials.length === 0 ? (
                  <p className="mutedText">No specials posted yet.</p>
                ) : (
                  <div className="itemList">
                    {profile.specials.map((special) => (
                      <article className="listItem" key={special.id}>
                        <div>
                          <strong>{special.title}</strong>
                          <small>{special.description ?? formatDateWindow(special.startsAt, special.endsAt)}</small>
                        </div>
                        <span>{special.priceCents === null ? 'Deal' : formatMoney(special.priceCents, special.currency)}</span>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="detailColumns">
                <div className="panel">
                  <p className="panelKicker">Hours</p>
                  <h2>Weekly schedule</h2>
                  {profile.hours.length === 0 ? (
                    <p className="mutedText">No hours set.</p>
                  ) : (
                    <div className="compactList">
                      {profile.hours.map((hour) => (
                        <div key={`${hour.weekday}-${hour.opensAt}`}>
                          <span>{weekdays[hour.weekday] ?? `Day ${hour.weekday}`}</span>
                          <strong>{formatClock(hour.opensAt)} - {formatClock(hour.closesAt)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="panel">
                  <p className="panelKicker">Reviews</p>
                  <h2>Recent notes</h2>
                  {profile.reviews.length === 0 ? (
                    <p className="mutedText">No reviews yet.</p>
                  ) : (
                    <div className="compactList">
                      {profile.reviews.map((review) => (
                        <div key={review.id}>
                          <span>{review.authorName}</span>
                          <strong>{review.rating}/5</strong>
                          <small>{review.body ?? 'No written review.'}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function getErrorMessage(body: ProfileResponse, fallback: string): string {
  if (typeof body.error === 'string') {
    return body.error;
  }
  return body.error?.message ?? fallback;
}

function formatMoney(priceCents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(priceCents / 100);
}

function formatPriceLevel(priceLevel: number | null): string {
  return priceLevel ? '$'.repeat(priceLevel) : 'Price unknown';
}

function formatRating(summary: RatingSummary | null): string {
  if (!summary || summary.totalReviews === 0) {
    return 'No reviews';
  }
  return `${summary.averageRating.toFixed(1)} (${summary.totalReviews})`;
}

function formatClock(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateWindow(startsAt: string, endsAt: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
  });
  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
}
