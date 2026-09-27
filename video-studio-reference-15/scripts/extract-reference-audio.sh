#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: ./scripts/extract-reference-audio.sh /path/to/reference.mp4"
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/audio"
ffmpeg -y -i "$1" -t 17.033333 -vn -c:a aac -b:a 256k "$ROOT/public/audio/reference-15-ad-original.m4a"
echo "Saved ad-only Reference 15 audio. Creator outro excluded."
