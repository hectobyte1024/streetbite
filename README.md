# StreetBite2

StreetBite2 is a location-based food discovery platform for food trucks, street vendors, market stalls, and pop-up kitchens.

## Workspace layout

- `apps/api` - Fastify API and modular monolith backend
- `apps/admin` - Next.js admin panel
- `apps/mobile` - Expo React Native app
- `packages/shared` - Shared types and utilities

## Stack

- Node.js + TypeScript
- Fastify
- Prisma
- PostgreSQL + PostGIS
- Socket.IO
- Expo
- Next.js
- OpenStreetMap + Leaflet

## Getting started

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env`.
3. Start the API with `pnpm dev`.

This scaffold is intentionally minimal and ready for feature implementation.