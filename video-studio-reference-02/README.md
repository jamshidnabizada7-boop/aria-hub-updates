# ARIA HUB — Reference 02 (26s)

A separate Remotion recreation of the second uploaded reference video. It does not share source files with the earlier 45.2-second recreation.

## Creative mapping

Reference Pinterest/app-dock interaction → ARIA HUB selected from a multi-source dock.  
Pinterest search → Persian opportunity discovery.  
Visual pin grid → ARIA HUB opportunity/category grid.  
Save interaction → save/shortlist opportunity.  
Kinetic verbs → ARIA HUB discovery/application actions.  
“Save the Vibe!” → «فرصتت را پیدا کن!».  
Pinterest logo particle resolve → ARIA HUB navy/gold logo resolve.  
Reference creator outro → owned ARIA HUB end card.

The production is self-contained inside `video-studio-reference-02/`.

Typography:
- **Vazirmatn Variable** — UI, search, cards and supporting Persian text
- **Noto Kufi Arabic Variable** — cinematic headings and kinetic display typography

Audio:
- `public/audio/reference-02-original.m4a` — the original soundtrack extracted directly from the supplied second reference video (AAC stereo, 44.1 kHz)
- Recreate it from the reference at any time with: `./scripts/extract-reference-audio.sh /path/to/reference-video.mp4`

Brand mark:
- `public/logo-vector.svg` — isolated copy of the ARIA HUB vector mark for this production

## Run

```bash
cd video-studio-reference-02
npm install
npm run studio
npm run render
```

4K:

```bash
npm run render:4k
```

The composition is **26.0 seconds / 780 frames / 30 fps**.
