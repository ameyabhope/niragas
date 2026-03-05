# Audio Sample Credits

Niragas uses audio samples from the following sources.

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

## Tanpura (Electronic Tanpura Loops)

**Source:** [Electronic Tanpura](https://freesound.org/people/sankalp/packs/9600/) by sankalp on Freesound
**License:** Attribution 4.0 International (CC BY 4.0)
**Attribution:** "Electronic Tanpura" by sankalp, https://freesound.org/people/sankalp/
**Files:** `public/samples/tanpura/`

Recordings of a Raagini-brand electronic tanpura captured via line-in.
Each M4A file is a 20-second crossfade-looped segment extracted from the
middle (~90s in) of the original ~4 minute recordings for seamless looping.

### Sample Matrix

3 tuning types (first string: Pa, Ma, Ni) x 5 base pitches + 2 EQ variants:

| File | Track | Tuning | SA Freq | SA Note | EQ |
|------|-------|--------|---------|---------|-----|
| Pa_A.m4a | #6 (155494) | Pa SA SA sa | 110 Hz | A2 | Neutral |
| Pa_C.m4a | #9 (155499) | Pa SA SA sa | 130.8 Hz | C3 | Neutral |
| Pa_C_bass.m4a | #2 (155491) | Pa SA SA sa | 130.8 Hz | C3 | High bass |
| Pa_C_treble.m4a | #3 (155500) | Pa SA SA sa | 130.8 Hz | C3 | High treble |
| Pa_D.m4a | #12 (155480) | Pa SA SA sa | 146.8 Hz | D3 | Neutral |
| Pa_E.m4a | #15 (155485) | Pa SA SA sa | 164.8 Hz | E3 | Neutral |
| Pa_Fs.m4a | #18 (155489) | Pa SA SA sa | 185 Hz | F#3 | Neutral |
| Ma_A.m4a | #7 (155496) | Ma SA SA sa | 110 Hz | A2 | Neutral |
| Ma_C.m4a | #10 (155482) | Ma SA SA sa | 130.8 Hz | C3 | Neutral |
| Ma_D.m4a | #13 (155487) | Ma SA SA sa | 146.8 Hz | D3 | Neutral |
| Ma_E.m4a | #16 (155484) | Ma SA SA sa | 164.8 Hz | E3 | Neutral |
| Ma_Fs.m4a | #19 (155493) | Ma SA SA sa | 185 Hz | F#3 | Neutral |
| Ni_A.m4a | #8 (155492) | Ni SA SA sa | 110 Hz | A2 | Neutral |
| Ni_C.m4a | #11 (155481) | Ni SA SA sa | 130.8 Hz | C3 | Neutral |
| Ni_D.m4a | #14 (155486) | Ni SA SA sa | 146.8 Hz | D3 | Neutral |
| Ni_E.m4a | #17 (155490) | Ni SA SA sa | 164.8 Hz | E3 | Neutral |
| Ni_Fs.m4a | #20 (155495) | Ni SA SA sa | 185 Hz | F#3 | Neutral |

### Pitch matching

The engine selects the sample closest to the user's SA pitch and applies
a small playbackRate adjustment to match exactly. With 5 base pitches
covering A2-F#3, the maximum pitch shift is ~1.5 semitones.

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
Place M4A files in `public/samples/tanpura/` following the naming pattern:
- `{Tuning}_{Pitch}.m4a` — e.g. `Pa_C.m4a`, `Ma_A.m4a`, `Ni_Fs.m4a`
- Optional EQ variants for Pa+C: `Pa_C_bass.m4a`, `Pa_C_treble.m4a`

Supported pitches: A (110Hz), C (130.8Hz), D (146.8Hz), E (164.8Hz), Fs (185Hz)
Supported tunings: Pa, Ma, Ni

### Manjira
Place WAV files in `public/samples/manjira/`:
- `hit.wav` — normal hit
- `accent.wav` — accented hit (sam/taali)
