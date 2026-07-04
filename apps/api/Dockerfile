FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN pnpm install --filter @streetbite2/api... --frozen-lockfile=false

COPY . .

WORKDIR /app/apps/api
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "dev"]
