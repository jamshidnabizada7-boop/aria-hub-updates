# ARIA HUB — Reference 06 (ad-only recreation)

This project recreates **only the SaaS advertisement visible inside the uploaded recording**.

It intentionally does **not** recreate:
- the physical monitor
- desk / room environment
- tablet/iPad storyboard
- phone-camera perspective
- `POV: Nobody watches your demo` overlay
- creator/social context

## Ad style extracted from the reference

- soft pink / peach / violet SaaS gradient world
- translucent floating product cards
- fast brand reveal
- short product-positioning phrase
- connected-user/use-case visualization
- automation rules/toggles
- personalized workflow/result proof
- laptop/dashboard product proof
- mobile notifications
- KPI card cloud / final brand CTA

## ARIA HUB production

The content is transcreated around real ARIA HUB functions: opportunity discovery, matching, saved opportunities, deadlines, alerts, and multilingual opportunity information.

Typography:
- **Noto Kufi Arabic Variable** — Persian advertising headlines
- **Vazirmatn Variable** — UI and supporting Persian copy

Output:
- **1920×1080**, 30 fps
- **3840×2160**, 30 fps
- 16 seconds / 480 frames

## Audio

The uploaded Reference 06 video contains **no audio stream**. This project is therefore silent by default rather than inserting unrelated music.

## Run

```bash
cd video-studio-reference-06
npm install
npm run studio
npm run render
```

For 4K:

```bash
npm run render:4k
```
