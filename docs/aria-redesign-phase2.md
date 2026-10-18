# ARIA HUB 2026 UI redesign — Phase 2

**Branch:** `feat/aria-hub-ui-refresh-2026-10`
**Pull request:** #56 (draft)
**Deployment:** None. No Oracle production changes.
**Scope:** New homepage and navigation. Opportunity directory and applicant dashboard redesigns are separate phases.

## Implemented

- Scoped ARIA v2 design tokens; cream surfaces, navy hero, orange actions and responsive cards.
- Shared redesign fonts: Plus Jakarta Sans for Latin and Estedad for RTL; existing site fonts untouched.
- Search-first responsive hero reusing the existing ARIA logo and hero asset.
- Database-backed category shortcuts and the eight newest opportunities.
- Reused existing queries for featured opportunity, deadline list and active counts.
- Localized EN/FA/PS headings, navigation, form labels and user-facing feedback.
- Desktop drop-downs and mobile expandable navigation with account-awareness.
- Accessible newsletter form calling the existing `/api/newsletter` endpoint.
- Three focused tool links to CV Builder, Matcher and Application Assistant.
- Footer with live local-language links.

## Preview modes

1. **Dedicated route** (default: 404): Set `ARIA_REDESIGN_PREVIEW_ENABLED=true` **only in staging**, then visit `/en/redesign-preview`, `/fa/redesign-preview`, or `/ps/redesign-preview`. The preview is `noindex`.
2. **Staging home replacement** (default: off): Set `ARIA_REDESIGN_HOME_ENABLED=true` **only in staging**. The real `/en`, `/fa`, `/ps` home routes then render the new component, while all other routes continue to use existing components.

**Do not set either variable on the public Oracle service** until approval and QA. These toggles do not provide authentication. Put staging behind suitable access controls. Turning off `ARIA_REDESIGN_HOME_ENABLED` restores the old homepage at the next deployment/restart.

## Validation required before merge

- Confirm Oracle's actual deployed commit, environment, reverse proxy and asset paths. Historical deploy docs still reference Vercel/Neon and are not a production source of truth.
- Ensure dependencies, Prisma client generation, TypeScript checks, tests and Next production build pass in the existing CI workflow (`.github/workflows/ci.yml`).
- Test at 320px, 375px, 768px, 1024px and wide desktop, both directions, long text and low bandwidth.
- Check desktop menus, mobile menu, keyboard focus, language switching, query propagation and signed-in/signed-out CTAs.
- Verify real category slugs, active counts, promoted tags and deadline/date handling with actual staging records.
- Confirm newsletter double-opt-in/SMTP behavior and error messages, without confusing newsletters and matching alerts.
- Confirm brand-approved hero photography. Current hero uses the existing `/images/hero/hero-bg.webp` until a suitable approved asset is supplied.
- Ensure navigation links to employer, CV and applicant tools maintain their current auth protections.
- Ensure headings, contrast, visible focus, reduced motion and no horizontal clipping.
- Check search indexing, Core Web Vitals, and no accidental duplicate nav/skip landmarks.
- Reconcile database-configured public menus with the new curated header before rolling the header out beyond the homepage.

## Known limitations

- The new navigation is connected only to the opt-in redesign surface. Standard site pages still use the existing `Navbar` until their new layout is migrated.
- No Oracle SSH access or deploy parity was established in this change.
- The new homepage does not replace all existing sections; services, news, visas and other features remain in existing routes. Promoting the design requires testing that all desired information is accessible.
- Actual user XP in the header is intentionally not displayed until connected to verified account data (no mock XP).

## Rollback

Keep `main` and Oracle untouched. For a staging regression, disable the redesign flags, rebuild/restart staging, and verify the existing home again. For any future production release, retain the previous deploy artifact and an explicit reverse-proxy rollback procedure before traffic is switched.
