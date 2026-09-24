#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: ./scripts/extract-reference-audio.sh /path/to/reference-video.mp4"
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/audio"
ffmpeg -y -i "$1" -t 49.233333 -vn -c:a aac -b:a 192k "$ROOT/public/audio/reference-07-ad-original.m4a"
echo "Saved ad-only soundtrack to $ROOT/public/audio/reference-07-ad-original.m4a"
