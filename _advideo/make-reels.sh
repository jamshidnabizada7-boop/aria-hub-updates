#!/bin/bash
# Assemble the Persian reels ad: kinetic cuts, glitch accents, concat, audio.
# Output: public/videos/ariahub-reels-fa.mp4 (1080×1920@30, ~29.7s)
set -euo pipefail
ROOT="/d/ARIA HUB UPDATE 09 13 2026/workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)"
FF="$ROOT/_advideo/tools/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe"
C="$ROOT/_advideo/vcards"
TMP="$ROOT/_advideo/rclips"
OUT="$ROOT/public/videos/ariahub-reels-fa.mp4"
mkdir -p "$TMP" "$ROOT/public/videos"
FPS=30

# clip <name> <dur> <card> <zoomexpr> [glitch]
clip() {
  local name="$1" dur="$2" card="$3" zexpr="$4" glitch="${5:-}"
  local frames=$(awk "BEGIN{printf \"%d\", $dur*$FPS}")
  local vf="zoompan=z='$zexpr':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=$FPS"
  if [ "$glitch" = "glitch" ]; then
    "$FF" -y -loglevel error -i "$C/$card.png" -filter_complex \
      "[0:v]$vf,format=yuv420p,split[a][b];[b]chromashift=crh=14:cbh=-14,noise=alls=22:allf=t[gl];[a][gl]overlay=format=auto:enable='lte(t,0.10)'[v]" \
      -map "[v]" -t "$dur" -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p "$TMP/$name.mp4"
  else
    "$FF" -y -loglevel error -i "$C/$card.png" -vf "$vf,format=yuv420p" \
      -t "$dur" -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p "$TMP/$name.mp4"
  fi
  echo "clip $name ($dur s)"
}

echo "== pass 1: cuts =="
# opening black + fade-in of the frame
"$FF" -y -loglevel error -f lavfi -i "color=c=0x0B1226:s=1080x1920:d=0.25:r=$FPS" \
  -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p "$TMP/00-black.mp4"
clip 01-h1 0.55 h1  '1.30-0.30*min(on/7\,1)'
clip 02-h2 0.55 h2  '1.30-0.30*min(on/7\,1)'
clip 03-h3 0.60 h3  '1.30-0.30*min(on/7\,1)'
clip 04-h4 1.05 h4  '1.35-0.35*min(on/8\,1)'
clip 05-f1 0.45 f1  '1.30-0.30*min(on/6\,1)' glitch
clip 06-f2 0.45 f2  '1.30-0.30*min(on/6\,1)' glitch
clip 07-f3 0.50 f3  '1.30-0.30*min(on/6\,1)' glitch
clip 08-m1 1.70 m1  '1.02+0.03*on/(1.7*30)'
clip 09-m2 1.50 m2  '1.05+0.05*on/(1.5*30)'
"$FF" -y -loglevel error -f lavfi -i "color=c=white:s=1080x1920:d=0.08:r=$FPS" \
  -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p "$TMP/10-flash.mp4"
clip 11-reveal 3.40 reveal '1.06+0.10*on/(3.4*30)'
clip 12-jobs  1.10 s-jobs  '1.00+0.14*on/(1.1*30)'
clip 13-sch   1.10 s-sch   '1.14-0.14*on/(1.1*30)'
clip 14-int   1.10 s-int   '1.00+0.14*on/(1.1*30)'
clip 15-tools 1.10 s-tools '1.14-0.14*on/(1.1*30)'
clip 16-dead  1.10 s-dead  '1.00+0.14*on/(1.1*30)'
clip 17-pop1 0.35 pop1 '1.25-0.25*min(on/5\,1)'
clip 18-pop2 0.35 pop2 '1.25-0.25*min(on/5\,1)'
clip 19-pop3 1.30 pop3 '1.25-0.25*min(on/5\,1)+0.05*on/(1.3*30)'
clip 20-opp1 2.50 opp1 '1.00+0.08*on/(2.5*30)'
clip 21-opp2 2.30 opp2 '1.08-0.08*on/(2.3*30)'
clip 22-c1 1.40 c1 '1.30-0.30*min(on/7\,1)'
"$FF" -y -loglevel error -f lavfi -i "color=c=white:s=1080x1920:d=0.08:r=$FPS" \
  -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p "$TMP/23-flash.mp4"
clip 24-c2 1.40 c2 '1.30-0.30*min(on/7\,1)'
clip 25-sitecta 2.00 sitecta '1.00+0.07*on/(2.0*30)'
"$FF" -y -loglevel error -i "$C/end.png" -vf \
  "zoompan=z='1.06-0.06*on/(1.4*30)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=42:s=1080x1920:fps=$FPS,fade=t=out:st=1.0:d=0.4,format=yuv420p" \
  -t 1.4 -c:v libx264 -crf 16 -preset medium -pix_fmt yuv420p "$TMP/26-end.mp4"

echo "== pass 2: concat =="
LIST="$TMP/list.txt"; : > "$LIST"
for f in "$TMP"/[0-9]*.mp4; do echo "file '$(basename "$f")'" >> "$LIST"; done
(cd "$TMP" && "$FF" -y -loglevel error -f concat -safe 0 -i "list.txt" -c copy "reels-silent.mp4")

echo "== pass 3: mux audio =="
"$FF" -y -loglevel error -i "$TMP/reels-silent.mp4" -i "$ROOT/_advideo/aud/mix.wav" \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"

"$FF" -i "$OUT" 2>&1 | grep -E "Duration|Stream #0" || true
ls -la "$OUT"
echo "done"
