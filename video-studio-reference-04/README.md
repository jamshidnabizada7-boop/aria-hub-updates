# ARIA HUB — Reference 04

A fourth, fully isolated Remotion recreation of the supplied **36.9-second vertical motion-design reference**.

## Isolation

This production lives only under `video-studio-reference-04/` in GitHub and `aria-hub-reference-04/` in the downloadable package. It does not modify or import source code from References 01–03.

## Production upgrade

This version intentionally goes beyond a basic text/logo swap. It uses:

- procedural vector motion and SVG paths
- animated luminous orbit systems
- layered blur/glow fields
- frame-controlled easing and spring motion
- vertical 1080p and 4K compositions
- Persian RTL motion typography
- reusable motion components (`GradientField`, `OrbitSystem`, `PathCard`)
- self-contained ARIA HUB vector logo
- the original soundtrack extracted from this exact reference video

## Typography

- **Noto Kufi Arabic Variable** — cinematic Persian headings
- **Vazirmatn Variable** — body/UI/supporting Persian

## Audio

The downloadable package contains `public/audio/reference-04-original.m4a`, extracted directly from the supplied reference.

For repository checkouts, run:

```bash
./scripts/extract-reference-audio.sh /path/to/reference-video.mp4
```

## Run

```bash
cd video-studio-reference-04
npm install
npm run studio
npm run render
```

4K vertical:

```bash
npm run render:4k
```
