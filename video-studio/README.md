# ARIA HUB — 45.2s Remotion reference recreation

This package recreates the supplied reference commercial's scene order, pacing, frosted visual language, radial ecosystem motif, UI-demo arc and final brand lockup while transcreating the content for ARIA HUB.

It is **not** a text/logo swap. Nexus/real-estate content is replaced with ARIA HUB opportunity discovery, real platform categories, trilingual UI, current site stats and ARIA HUB's own navy/gold identity. The reference creator watermark is not copied.

The package deliberately reuses repository-owned assets via Remotion's public directory:

- public/images/logo-vector.svg
- public/fonts/Vazirmatn-Medium.ttf
- public/fonts/Vazirmatn-Bold.ttf
- public/fonts/Vazirmatn-Black.ttf
- public/advideo/audio-38s.wav

The product UI is reconstructed as React rather than enlarging a low-resolution screenshot.

## Run

    cd video-studio
    npm install
    npm run studio
    npm run render

For 4K:

    npm run render:4k

The composition is 45.2 seconds at 30 fps (1356 frames). See REFERENCE_TIMELINE.md for the frame-locked adaptation map.

## Audio

The code uses ARIA HUB's existing owned 38-second bed for the main body and leaves the final end card quiet. A cleared/licensed 45.2-second campaign master can replace it without changing the locked scene timing.
