# ARIA HUB — Reference 08 (ad-only)

A fully isolated ARIA HUB recreation of the actual product advertisement inside the uploaded Reference 08 recording.

## Ad-only rule

The following are deliberately excluded:

- TikTok watermark / username
- creator/editor brand
- black/purple presentation frame
- Intro / Problem / Use Case / Call to Action editing buttons
- timeline ruler
- any social/editor content outside the actual commercial

## Advertising structure preserved

The commercial is rebuilt around the same persuasive sequence:

1. visual mobile hook
2. universal problem framing
3. too-many-options problem collage
4. simple brand promise
5. desktop product proof
6. mobile use case
7. mobile/link handoff
8. guided in-app workflow
9. short action CTA
10. logo finish

## ARIA HUB adaptation

The content focuses on opportunity discovery, search, categories, saved opportunities, deadlines and actions rather than the unrelated HowDo product.

## Typography

- **Noto Kufi Arabic Variable** — major Persian advertising headlines
- **Vazirmatn Variable** — UI/supporting Persian copy

## Audio

The downloadable source package contains the original reference AAC soundtrack trimmed to the **43.6-second ad-only segment**:

`public/audio/reference-08-ad-original.m4a`

For a GitHub checkout, regenerate it from the reference video with the included script.

## Run

```bash
cd video-studio-reference-08
npm install
npm run studio
npm run render
```

4K:

```bash
npm run render:4k
```
