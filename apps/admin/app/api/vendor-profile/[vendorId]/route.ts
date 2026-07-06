import { NextResponse } from 'next/server';
import { getBackendUrl } from '../../_lib/backend';

type RouteContext = {
  params: Promise<{ vendorId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { vendorId } = await context.params;

  try {
    const [vendor, location, hours, menu, specials, reviews, ratingSummary] = await Promise.all([
      fetchData(`/vendors/${vendorId}`),
      fetchData(`/vendors/${vendorId}/location`, true),
      fetchList(`/vendors/${vendorId}/hours`),
      fetchList(`/vendors/${vendorId}/menu`),
      fetchList(`/vendors/${vendorId}/specials?limit=5`),
      fetchList(`/vendors/${vendorId}/reviews?limit=5`),
      fetchData(`/vendors/${vendorId}/rating-summary`, true),
    ]);

    if (!vendor) {
      return NextResponse.json({ error: { message: 'Vendor not found' } }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        vendor,
        location,
        hours,
        menu,
        specials,
        reviews,
        ratingSummary,
      },
    });
  } catch {
    return NextResponse.json(
      { error: { message: 'StreetBite API is not reachable' } },
      { status: 502 },
    );
  }
}

async function fetchData(path: string, optional = false) {
  const response = await fetch(getBackendUrl(path), { cache: 'no-store' });
  if (!response.ok) {
    if (optional && response.status === 404) {
      return null;
    }
    throw new Error(`Request failed: ${path}`);
  }
  const body = await response.json();
  return body.data ?? null;
}

async function fetchList(path: string) {
  const data = await fetchData(path, true);
  return Array.isArray(data) ? data : [];
}
