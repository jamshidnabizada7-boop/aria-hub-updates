#!/bin/bash
# Synthesize the reels soundtrack: suspense drone → beat builds at the mystery
# scene → impacts/whooshes/ding aligned to the cut timeline → final hit.
# Output: _advideo/aud/mix.wav   Usage: bash _advideo/make-audio.sh
set -euo pipefail
ROOT="/d/ARIA HUB UPDATE 09 13 2026/workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)"
FF="$ROOT/_advideo/tools/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe"
AUD="$ROOT/_advideo/aud"
mkdir -p "$AUD"

echo "== stem: 2-beat bar (112 BPM) =="
"$FF" -y -loglevel error -filter_complex "
sine=f=55:d=0.30,afade=t=out:st=0.03:d=0.27,volume=1.5[k1];
sine=f=55:d=0.30,afade=t=out:st=0.03:d=0.27,volume=1.5,adelay=536[k2];
anoisesrc=d=0.045:color=white:seed=11,highpass=f=8000,afade=t=out:st=0.005:d=0.04,volume=0.30,adelay=268[h1];
anoisesrc=d=0.045:color=white:seed=12,highpass=f=8000,afade=t=out:st=0.005:d=0.04,volume=0.30,adelay=804[h2];
sine=f=55:d=0.24,afade=t=out:st=0.05:d=0.19,volume=0.75,adelay=0[b1];
sine=f=65.4:d=0.24,afade=t=out:st=0.05:d=0.19,volume=0.75,adelay=268[b2];
sine=f=55:d=0.24,afade=t=out:st=0.05:d=0.19,volume=0.75,adelay=536[b3];
sine=f=65.4:d=0.24,afade=t=out:st=0.05:d=0.19,volume=0.75,adelay=804[b4];
[k1][k2][h1][h2][b1][b2][b3][b4]amix=inputs=8:normalize=0,apad=whole_dur=1.0715[a]" \
  -map "[a]" -ar 44100 -ac 1 "$AUD/bar.wav"

echo "== stem: beat loop 29.5s =="
"$FF" -y -loglevel error -stream_loop 28 -i "$AUD/bar.wav" -t 29.5 -ar 44100 -ac 1 "$AUD/beat.wav"

echo "== stem: suspense drone 0–7.6s =="
"$FF" -y -loglevel error -filter_complex "
sine=f=55:d=7.6,volume=0.30[d1];
sine=f=55.7:d=7.6,volume=0.30[d2];
anoisesrc=d=7.6:color=brown:seed=7,lowpass=f=300,volume=0.12[d3];
[d1][d2][d3]amix=inputs=3:normalize=0,tremolo=f=4.5:d=0.55[a]" \
  -map "[a]" -ar 44100 -ac 1 "$AUD/drone.wav"

echo "== stem: riser 4.5–7.6s =="
"$FF" -y -loglevel error -filter_complex "
anoisesrc=d=3.1:color=pink:seed=21,lowpass=f=2400,afade=t=in:st=0:d=2.9,volume=0.55,
tremolo=f=9:d=0.4[a]" -map "[a]" -ar 44100 -ac 1 "$AUD/riser.wav"

echo "== stem: hits / ticks / whooshes / pops / ding / crash =="
# one big graph; every source is delayed to its cut position (ms)
HITS="$AUD/hits.wav"
"$FF" -y -loglevel error -filter_complex "
sine=f=42:d=1.0,afade=t=out:st=0.05:d=0.95,volume=1.7,adelay=250|0[i1];
anoisesrc=d=0.18:color=white:seed=31,lowpass=f=900,afade=t=out:st=0.02:d=0.16,volume=0.8,adelay=250|0[i1n];
sine=f=42:d=1.0,afade=t=out:st=0.05:d=0.95,volume=1.7,adelay=7600|0[i2];
anoisesrc=d=0.20:color=white:seed=32,lowpass=f=1100,afade=t=out:st=0.02:d=0.18,volume=0.9,adelay=7600|0[i2n];
sine=f=42:d=0.9,afade=t=out:st=0.05:d=0.85,volume=1.4,adelay=16500|0[i3];
sine=f=42:d=0.9,afade=t=out:st=0.05:d=0.85,volume=1.4,adelay=23300|0[i4];
sine=f=38:d=1.6,afade=t=out:st=0.06:d=1.5,volume=2.0,adelay=28100|0[i5];
anoisesrc=d=1.3:color=white:seed=33,highpass=f=2800,afade=t=out:st=0.05:d=1.2,volume=0.5,adelay=28100|0[i5n];
anoisesrc=d=0.02:color=white:seed=41,highpass=f=6500,volume=0.45,adelay=800|0[t1];
anoisesrc=d=0.02:color=white:seed=42,highpass=f=6500,volume=0.45,adelay=1350|0[t2];
anoisesrc=d=0.02:color=white:seed=43,highpass=f=6500,volume=0.45,adelay=1950|0[t3];
anoisesrc=d=0.02:color=white:seed=44,highpass=f=6500,volume=0.45,adelay=3000|0[t4];
anoisesrc=d=0.02:color=white:seed=45,highpass=f=6500,volume=0.45,adelay=3450|0[t5];
anoisesrc=d=0.02:color=white:seed=46,highpass=f=6500,volume=0.45,adelay=3900|0[t6];
anoisesrc=d=0.30:color=pink:seed=51,bandpass=f=1300:w=900,afade=t=in:st=0:d=0.14,afade=t=out:st=0.14:d=0.16,volume=0.55,adelay=11000|0[w1];
anoisesrc=d=0.30:color=pink:seed=52,bandpass=f=1300:w=900,afade=t=in:st=0:d=0.14,afade=t=out:st=0.14:d=0.16,volume=0.55,adelay=12100|0[w2];
anoisesrc=d=0.30:color=pink:seed=53,bandpass=f=1300:w=900,afade=t=in:st=0:d=0.14,afade=t=out:st=0.14:d=0.16,volume=0.55,adelay=13200|0[w3];
anoisesrc=d=0.30:color=pink:seed=54,bandpass=f=1300:w=900,afade=t=in:st=0:d=0.14,afade=t=out:st=0.14:d=0.16,volume=0.55,adelay=14300|0[w4];
anoisesrc=d=0.30:color=pink:seed=55,bandpass=f=1300:w=900,afade=t=in:st=0:d=0.14,afade=t=out:st=0.14:d=0.16,volume=0.55,adelay=15400|0[w5];
sine=f=480:d=0.10,afade=t=out:st=0.02:d=0.08,volume=0.5,adelay=16850|0[p1];
sine=f=480:d=0.10,afade=t=out:st=0.02:d=0.08,volume=0.5,adelay=17200|0[p2];
sine=f=480:d=0.10,afade=t=out:st=0.02:d=0.08,volume=0.5,adelay=17550|0[p3];
sine=f=880:d=0.7,afade=t=out:st=0.08:d=0.6,volume=0.42,adelay=21000|0[g1];
sine=f=1318:d=0.7,afade=t=out:st=0.08:d=0.6,volume=0.30,adelay=21000|0[g2];
[i1][i1n][i2][i2n][i3][i4][i5][i5n][t1][t2][t3][t4][t5][t6][w1][w2][w3][w4][w5][p1][p2][p3][g1][g2]amix=inputs=24:normalize=0,apad=whole_dur=29.5[a]" \
  -map "[a]" -ar 44100 -ac 1 "$HITS"

echo "== final mix =="
"$FF" -y -loglevel error \
  -i "$AUD/beat.wav" -i "$AUD/drone.wav" -i "$AUD/riser.wav" -i "$HITS" -filter_complex "
[0:a]adelay=4300|0,volume=0.72[beat];
[1:a]volume=0.95[drone];
[2:a]adelay=4500|0,volume=0.5[riser];
[3:a]volume=0.9[hits];
[beat][drone][riser][hits]amix=inputs=4:normalize=0,alimiter=limit=0.85,afade=t=out:st=28.8:d=0.7[a]" \
  -map "[a]" -t 29.5 -ar 44100 -ac 2 "$AUD/mix.wav"

"$FF" -i "$AUD/mix.wav" -af "volumedetect" -f null - 2>&1 | grep -E "mean_volume|max_volume" || true
echo "audio done → $AUD/mix.wav"
