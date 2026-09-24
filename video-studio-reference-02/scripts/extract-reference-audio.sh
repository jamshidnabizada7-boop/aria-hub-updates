#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: ./scripts/extract-reference-audio.sh /path/to/reference-video.mp4"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/audio"

ffmpeg -y -i "$1" -vn -c:a copy "$ROOT/public/audio/reference-02-original.m4a"

echo "Reference 02 audio extracted to:"
echo "$ROOT/public/audio/reference-02-original.m4a"
