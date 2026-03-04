# Audio Sample Credits

Niragas uses audio samples from the following sources. All samples are
licensed under Creative Commons 0 (CC0, public domain) unless noted.

## Tabla Bols

**Source:** [tabla bols](https://freesound.org/people/mmiron/packs/8058/) by mmiron on Freesound  
**License:** CC0 1.0 Universal  
**Files:** `public/samples/tabla/` — Individual tabla stroke recordings (Dha, Na, Tin, etc.)

## Tanpura

**Source:** [Tanpura C Sharp](https://freesound.org/people/luckylittleraven/packs/26218/) by luckylittleraven on Freesound  
**License:** CC0 1.0 Universal  
**Files:** `public/samples/tanpura/` — Tanpura string pluck recordings in C#

## Manjira

**Source:** TBD — searching for CC0 finger cymbal / manjira samples  
**License:** CC0 1.0 Universal  
**Files:** `public/samples/manjira/`

---

## How to Add Your Own Samples

If samples are not present in `public/samples/`, Niragas automatically falls
back to real-time synthesis. To use real samples:

### Tabla
Place WAV files in `public/samples/tabla/` named after each bol:
- `Dha.wav`, `Dhin.wav`, `Dhi.wav`
- `Na.wav`, `Ta.wav`, `Tin.wav`, `Tun.wav`
- `Ge.wav`, `Ghe.wav`, `Ke.wav`, `Ka.wav`
- `Ti.wav`, `Tu.wav`, `Te.wav`
- `Trkt.wav`, `Kat.wav`

### Tanpura
Place WAV files in `public/samples/tanpura/` named after notes:
- `Sa.wav` (C#4 — middle Sa)
- `Sa-low.wav` (C#3 — low Sa)
- `Pa.wav` (G#3 — Pa)
- `Ma.wav` (F#3 — Ma)
- `Ni.wav` (B3 — Ni)

The Tone.js Sampler will pitch-shift these reference samples to play any other
note required by the tanpura configuration.

### Manjira
Place WAV files in `public/samples/manjira/`:
- `hit.wav` — normal hit
- `accent.wav` — accented hit (sam/taali)
