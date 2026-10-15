# Shared website design

## Theme foundations

The existing corporate blue palette in `src/app/globals.css` is the source of truth for public pages, applicant accounts, employer tools and the admin UI.

Use semantic values for interface colors:

- Main actions and links: `primary` and `primary-foreground`.
- Page, card and popover surfaces: `background`, `card` and `popover` with their matching text tokens.
- Secondary text and inactive controls: `muted-foreground`, `muted` and `accent`.
- Input borders and keyboard focus: `input` and `ring`.
- Tinted panels: `brand-panel` / `--brand-panel-background`.
- Subtle selected states: `--brand-soft`.
- Full-size form actions: `rounded-xl`, or `--control-radius` in plain CSS. These resolve to the same radius.

All brand expressions reference the theme tokens and adapt to light/dark mode. Do not create a separate palette for an account type or page family. Keep status, opportunity category, third-party network and document artwork colors tied to their meaning.

## This consistency pass

- Removed the employer-only teal palette, independent heading colors and navy sign-in surface.
- Matched primary actions to the shared blue across homepage search, account forms, vacancy/application pages, submission tracking, employer tools, contact forms, visas and footer/newsletter controls.
- Reused adaptive branded panels on Get Started, applicant onboarding, employer sign-in and discovery collections.
- Replaced fixed blue/indigo/slate UI palettes in template browsing and editing, letter controls and the CV builder frame with semantic theme colors.
- Kept printable document colors separate from the editing interface.
- Fixed invalid HSL wrappers around the site's complete OKLCH color variables in text selection, listing content, scrollbars and the shared sidebar.
- Kept shared fonts and RTL typography consistent; normalized full-size primary button radii, type sizes and focus states across both account lanes.

## Verification

In a real browser, the homepage action, applicant login and employer login had identical computed background, foreground, font, 14px action text and 18px radius in light mode. The same controls matched after dark-mode navigation. Persian phone sign-in at 390px had no horizontal overflow. These are visual/style changes; authentication and private-data behavior were not changed.
