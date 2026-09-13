#!/bin/bash
# Assemble the ARIA HUB promo: Ken Burns motion on brand cards + site shots,
# 0.8s crossfades, 1920×1080@30 H.264. Usage: bash _advideo/make-video.sh
set -euo pipefail
ROOT="/d/ARIA HUB UPDATE 09 13 2026/workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)"
FF="$ROOT/_advideo/tools/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe"
CARDS="$ROOT/_advideo/cards"
TMP="$ROOT/_advideo/clips"
OUT="$ROOT/public/videos/ariahub-promo-1080.mp4"
mkdir -p "$TMP" "$ROOT/public/videos"

DUR=3.6; FPS=30; FRAMES=108; FADE=0.8

# [file, amp, mode] — mode: in|out (alternate for visual rhythm; cards get gentler push)
scenes=(
  "01-intro.png|0.05|in"
  "02-scene-hero.png|0.11|out"
  "03-scene-opps.png|0.11|in"
  "04-scene-cv.png|0.11|out"
  "05-scene-interview.png|0.11|in"
  "06-scene-visas.png|0.11|out"
  "07-stats.png|0.05|in"
  "08-cta.png|0.05|out"
)

echo "== pass 1: Ken Burns clips =="
i=0
for s in "${scenes[@]}"; do
  IFS='|' read -r file amp mode <<< "$s"
  if [ "$mode" = "in" ]; then Z="'1+$amp*on/$FRAMES'"; else Z="'1+$amp-$amp*on/$FRAMES'"; fi
  "$FF" -y -loglevel error -i "$CARDS/$file" \
    -filter_complex "zoompan=z=$Z:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$FRAMES:s=1920x1080:fps=$FPS" \
    -t "$DUR" -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p "$TMP/s$i.mp4"
  echo "clip s$i ($file, $mode)"
  i=$((i+1))
done

echo "== pass 2: crossfade chain =="
N=${#scenes[@]}
FILTER=""
INPUTS=()
for ((k=0; k<N; k++)); do INPUTS+=(-i "$TMP/s$k.mp4"); done
PREV="[0:v]"
for ((k=1; k<N; k++)); do
  OFF=$(python -c "print(round($k*($DUR-$FADE),3))" 2>/dev/null || awk "BEGIN{printf \"%.3f\", $k*($DUR-$FADE)}")
  OUTL="v$k"
  FILTER+="$PREV[$k:v]xfade=transition=fade:duration=$FADE:offset=$OFF[$OUTL];"
  PREV="[$OUTL]"
done
FILTER+="${PREV}format=yuv420p[vout]"

"$FF" -y -loglevel error "${INPUTS[@]}" \
  -filter_complex "$FILTER" -map "[vout]" \
  -c:v libx264 -crf 19 -preset medium -movflags +faststart -an "$OUT"

echo "== done =="
"$FF" -loglevel error -i "$OUT" 2>&1 | grep -E "Duration|Stream" || true
ls -la "$OUT"
