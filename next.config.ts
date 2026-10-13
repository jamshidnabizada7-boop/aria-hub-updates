import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development" || process.env.__NEXT_DEV === "true";

const nextConfig: NextConfig = {
  // Audit §21: don't advertise the framework version.
  poweredByHeader: false,
  // Translation gateway OpenAPI spec: Next refuses to serve dot-prefixed
  // paths from public/, so the file lives at /aria-translation-gateway.openapi.yaml
  // and the required /.well-known/... discovery URL is rewritten to it
  // before filesystem resolution.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/.well-known/oauth-protected-resource/mcp/repair', destination: '/api/oauth/repair-resource' },
        {
          source: '/.well-known/aria-translation-gateway.openapi.yaml',
          destination: '/aria-translation-gateway.openapi.yaml',
        },
        {
          source: '/.well-known/oauth-protected-resource/mcp/translation',
          destination: '/api/oauth/protected-resource',
        },
        {
          source: '/.well-known/oauth-protected-resource',
          destination: '/api/oauth/protected-resource',
        },
        {
          source: '/.well-known/oauth-authorization-server',
          destination: '/api/oauth/authorization-server',
        },
        {
          source: '/.well-known/openid-configuration',
          destination: '/api/oauth/authorization-server',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [{
      // Frame protection (audit §21): the app is never a legitimate frame
      // target — block clickjacking. HSTS/nosniff/referrer-policy are set by
      // the Caddy edge; these two complete the set at the app layer.
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
      ],
    }, {
      // Translation gateway OpenAPI spec (public, secret-free by scan): a
      // machine-readable copy of docs/translation-gateway.openapi.yaml for
      // ChatGPT Plugin Creator discovery. Long public cache — it changes only
      // with a release.
      source: '/.well-known/aria-translation-gateway.openapi.yaml',
      headers: [{
        key: 'Cache-Control',
        value: 'public, max-age=3600',
      }],
    }, {
      // The public home page is the same for every visitor; the opportunity
      // directory below retains its faster one-minute refresh.
      source: '/:lang(en|fa|ps)',
      headers: [{
        key: 'Vercel-CDN-Cache-Control',
        value: 's-maxage=1800, stale-while-revalidate=1800',
        }, {
        key: 'Cache-Control',
        value: 's-maxage=1800, stale-while-revalidate=1800',
      }],
    }, {
      // The public feed is identical for visitors with the same URL. Cache
      // query variants separately at Vercel's CDN while keeping browsers live.
      source: '/:lang(en|fa|ps)/opportunities',
      headers: [{
        key: 'Vercel-CDN-Cache-Control',
        value: 's-maxage=60, stale-while-revalidate=120',
        }, {
        key: 'Cache-Control',
        value: 's-maxage=60, stale-while-revalidate=120',
      }],
    }, {
      // Opportunity details are public and identical for all visitors. Cache
      // them at the CDN without creating durable ISR writes for every slug.
      source: '/:lang(en|fa|ps)/opportunities/:slug',
      headers: [{
        key: 'Vercel-CDN-Cache-Control',
        value: 's-maxage=3600, stale-while-revalidate=3600',
        }, {
        key: 'Cache-Control',
        value: 's-maxage=3600, stale-while-revalidate=3600',
      }],
    }];
  },
  // Standalone output packs a deployable server bundle — for the Linux
  // container. Set STANDALONE=1 there; on Windows the build fails at the
  // copy step because chunk filenames contain ":" (e.g. node:fs/promises).
  ...(process.env.STANDALONE === "1" ? { output: "standalone" as const } : {}),
  // Oracle release layout: /opt/aria-hub/releases/<id> sits under the workers'
  // /opt/aria-hub checkout, whose bun.lock makes Next infer that parent as the
  // workspace root — which nests standalone output under releases/<id>/. Pin
  // the tracing root to the release directory so standalone lands at
  // .next/standalone/server.js as the start scripts expect.
  ...(process.env.STANDALONE === "1" ? { outputFileTracingRoot: process.cwd() } : {}),
  // Oracle release layout: /opt/aria-hub/releases/<id> sits under the workers'
  // /opt/aria-hub checkout whose bun.lock makes Next infer that parent as the
  // workspace root, nesting standalone output under releases/<id>/. Pin the
  // tracing root to the release directory so standalone lands at
  // .next/standalone/server.js as the start scripts expect.
  ...(process.env.STANDALONE === "1" ? { outputFileTracingRoot: process.cwd() } : {}),
  compress: true,
  // Chromium extracts these archives at runtime when CV PDFs are rendered.
  // Static tracing sees the launcher but does not discover its compressed binaries.
  outputFileTracingIncludes: {
    '/api/cv-builder/pdf': [
      'node_modules/@sparticuz/chromium/bin/**/*',
      'node_modules/playwright-core/browsers.json',
    ],
  },
  // Function Storage reconciliation (2026-10-04): output tracing was pulling
  // playwright-core (~99 MB) into ~140 route traces via the scraper import
  // graph, and the repo-root .env (API keys!) into one API route. Browser
  // automation is Oracle's responsibility now — these exclusions remove the
  // dead weight from every non-PDF function and close the .env leak.
  // The CV PDF function keeps its includes above and is NOT matched here.
  outputFileTracingExcludes: {
    '*': ['.env', '.env.*'],
    '/api/admin/**': [
      'node_modules/playwright-core/**',
      'node_modules/@sparticuz/chromium/**',
    ],
    '/api/opportunities/**': ['node_modules/playwright-core/**'],
    '/api/employers/**': ['node_modules/playwright-core/**'],
    '/api/cv-builder/pdf/../**': ['node_modules/playwright-core/**'],
    '/[lang]/**': ['node_modules/playwright-core/**', 'node_modules/@sparticuz/chromium/**'],
    '/': ['node_modules/playwright-core/**'],
  },
  // Type errors now fail the build — the codebase compiles clean under
  // `tsc --noEmit` (scripts/ and examples/ are excluded from type-checking).
  reactStrictMode: true,
  // Translation gateway: keep node-postgres external (CJS w/ dynamic requires;
  // must be traced as a real dependency, not bundled).
  serverExternalPackages: ["pg"],
  // Allow the sandbox preview proxy + local origins during development
  // (prevents "Cross origin request detected" warnings / aborted requests).
  allowedDevOrigins: ["*.space-z.ai", "http://localhost:3000", "21.0.8.222", "21.0.16.223", "localhost"],
  experimental: {
    optimizeCss: false,
    // 4GB sandbox OOM-kills the dev server when Turbopack's Rust heap grows
    // past ~2.8GB while holding all warm routes. Cap it so Turbopack GCs
    // aggressively instead of growing until the kernel kills the process.
    // (Node-side heap is separately capped via NODE_OPTIONS in dev-restart.sh.)
    ...(isDev ? { turbopackMemoryLimit: 512 } : {}),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" }
    ],
  },
};

export default nextConfig;
