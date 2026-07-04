# Copilot Instructions for StreetBite2

- Follow the modular monolith architecture.
- Keep backend code in `apps/api` with bounded contexts under `src/modules`.
- Keep shared contracts and utilities in `packages/shared`.
- Use PostgreSQL + PostGIS for geospatial data.
- Use REST for core APIs and Socket.IO for realtime updates.
- Prefer small, focused changes over broad refactors.
- Preserve TypeScript strictness.
- Keep the first release optimized for Mexico City and nearby discovery.
