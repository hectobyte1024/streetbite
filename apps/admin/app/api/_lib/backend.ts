import { NextResponse } from 'next/server';

const defaultApiUrl = 'http://localhost:3000';

export function getBackendUrl(path: string): string {
  const baseUrl = process.env.STREETBITE_API_URL ?? defaultApiUrl;
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

export async function forwardJson(
  path: string,
  init: RequestInit,
): Promise<NextResponse> {
  try {
    const response = await fetch(getBackendUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
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
