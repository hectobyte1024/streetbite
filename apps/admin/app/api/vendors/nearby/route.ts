import { NextResponse } from 'next/server';
import { getBackendUrl } from '../../_lib/backend';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const response = await fetch(getBackendUrl(`/vendors/nearby${url.search}`), {
      cache: 'no-store',
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: { message: 'StreetBite API is not reachable' } },
      { status: 502 },
    );
  }
}
