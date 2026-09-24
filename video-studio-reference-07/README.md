# ARIA HUB — Reference 07 (ad-only)

A seventh fully isolated ARIA HUB Remotion production.

## Focus rule

Only the **advertisement itself** is recreated. These are intentionally excluded:

- `POV: Client need clean SAAS animation`
- Instagram icons/handles
- creator watermark / editor identity
- social-post framing
- final Instagram creator outro

## Advertising structure preserved

The reference is a long-form SaaS workflow demonstration. Its persuasive structure is retained:

1. brand/product entrance
2. feature navigation
3. user input/profile setup
4. analysis/loading
5. scored recommendation
6. personalization/generation
7. success state
8. compatibility checking
9. optimization
10. interview preparation
11. brand CTA close

ARIA HUB content is rebuilt around opportunity matching and application readiness rather than resume-generation software.

## Typography

- **Noto Kufi Arabic Variable** — cinematic Persian headings
- **Vazirmatn Variable** — UI, labels, cards and supporting Persian

## Audio

The downloadable source package contains `public/audio/reference-07-ad-original.m4a`, extracted from the supplied reference and trimmed to the actual ad segment (~49.23 seconds), excluding the creator outro.

For a GitHub checkout, regenerate the file with:

```bash
./scripts/extract-reference-audio.sh /path/to/reference-video.mp4
```

## Run

```bash
cd video-studio-reference-07
npm install
npm run studio
npm run render
```

4K:

```bash
npm run render:4k
```
