#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: ./scripts/extract-reference-audio.sh /path/to/reference-video.mp4"
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/audio"
ffmpeg -y -ss 0.9 -i "$1" -t 10.366667 -vn -c:a aac -b:a 192k "$ROOT/public/audio/reference-10-ad-original.m4a"
echo "Saved ad-only soundtrack to $ROOT/public/audio/reference-10-ad-original.m4a"
