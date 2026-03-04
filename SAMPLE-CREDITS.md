# Audio Sample Credits

Niragas uses audio samples from the following sources. All samples are
licensed under Creative Commons 0 (CC0, public domain).

## Tabla Bols

**Source:** [tabla bols](https://freesound.org/people/mmiron/packs/8058/) by mmiron on Freesound
**License:** CC0 1.0 Universal (Public Domain)
**Files:** `public/samples/tabla/`

| File | Original | Description |
|------|----------|-------------|
| Dha.wav | dhec.wav | Bass + treble composite stroke |
| Dhin.wav | ghe_4.wav | Bass with resonance (maps to Dhin) |
| Dhi.wav | ghe_3.wav | Bass variant (maps to Dhi) |
| Na.wav | na.wav | Open treble stroke |
| Ta.wav | tas.wav | Closed treble stroke |
| Tin.wav | na-open.wav | Open resonant treble |
| Tun.wav | tun.wav | Deep open treble |
| Ge.wav | ghe.wav | Bass stroke |
| Ghe.wav | ghe_2.wav | Heavy bass stroke |
| Ke.wav | ke.wav | Sharp bass tap |
| Ka.wav | ke_2.wav | Bass tap variant |
| Te.wav | te.wav | Closed treble tap |
| Ti.wav | te_2.wav | Light treble tap |
| Tu.wav | te_middlefinger.wav | Finger tap |
| Trkt.wav | re.wav | Rolling compound stroke |
| Kat.wav | ke_3.wav | Sharp cut stroke |

## Tanpura

**Source:** [Tanpura C Sharp](https://freesound.org/people/luckylittleraven/packs/26218/) by luckylittleraven on Freesound
**License:** CC0 1.0 Universal (Public Domain)
**Files:** `public/samples/tanpura/`

| File | Original | Description |
|------|----------|-------------|
| Sa.wav | tanpura-note-c-sharp.wav | C#4 — middle Sa (converted to mono) |
| Sa-low.wav | tanpura-note-low-c-sharp.wav | C#3 — low Sa (converted to mono) |
| Pa.wav | tanpura-note-g-sharp.wav | G#3 — Pa (converted to mono) |
| Ni.wav | tanpura-note-a-sharp.wav | B3/A#3 — Ni region (converted to mono) |
| pluck.wav | tanpura-short-drone-pluck-c-sharp.wav | Short pluck reference (converted to mono) |

Tone.js Sampler pitch-shifts these 4 reference pitches to cover all notes.

## Manjira

Not yet sourced — using synthesis fallback.

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
- `Ni.wav` (B3 — Ni)

The Tone.js Sampler will pitch-shift these reference samples to play any other
note required by the tanpura configuration.

### Manjira
Place WAV files in `public/samples/manjira/`:
- `hit.wav` — normal hit
- `accent.wav` — accented hit (sam/taali)
