# Build from the repo root so the context is the whole project:
#   docker build -f deploy/Dockerfile --target runtime .
#
# Targets:
#   builder — full source + dev deps, runs `next build` (standalone output)
#   runtime — slim image: standalone server + system Chromium for the
#             social-publisher screenshot renderer (CHROME_PATH)

FROM oven/bun:1.3-slim AS builder
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install deps first (layer-cached); prisma generate needs the schema.
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

COPY . .
# NEXT_PUBLIC_* values are inlined at build time — pass via build args.
ARG NEXT_PUBLIC_SITE_URL=https://www.myariahub.com
ARG NEXT_PUBLIC_ADSENSE_CLIENT=
ARG NEXT_PUBLIC_ADSENSE_SLOT_LISTING=
ARG NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_MID=
ARG NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_END=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT \
    NEXT_PUBLIC_ADSENSE_SLOT_LISTING=$NEXT_PUBLIC_ADSENSE_SLOT_LISTING \
    NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_MID=$NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_MID \
    NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_END=$NEXT_PUBLIC_ADSENSE_SLOT_DETAIL_END \
    STANDALONE=1 \
    NODE_ENV=production
RUN bunx prisma generate \
  && bun run build

FROM oven/bun:1.3-slim AS runtime
# chromium  — system browser for playwright-core screenshots (src/lib/social/publisher.ts)
# fonts-*   — fallback glyphs for Persian/Arabic rendering inside Chromium
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       openssl ca-certificates chromium fonts-noto-core fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    CHROME_PATH=/usr/bin/chromium

# Standalone bundle already contains .next/static and public/ (see build script).
COPY --from=builder /app/.next/standalone ./
RUN mkdir -p /app/public/generated-posts /app/public/uploads

EXPOSE 3000
CMD ["bun", "server.js"]
