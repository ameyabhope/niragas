# Audio Sample Credits

Niragas uses audio samples from the following sources.

## Tabla Bols

- **Source:** [tabla bols](https://freesound.org/people/mmiron/packs/8162/) by mmiron on Freesound
- **License:** [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) (Public Domain)
- **Files:** `public/samples/tabla/`

| Bundled file | Original file |
|--------------|---------------|
| Dha.wav | dhec.wav |
| Dhin.wav | ghe_4.wav |
| Dhi.wav | ghe_3.wav |
| Na.wav | na.wav |
| Ta.wav | tas.wav |
| Tin.wav | na-open.wav |
| Tun.wav | tun.wav |
| Ge.wav | ghe.wav |
| Ghe.wav | ghe_2.wav |
| Ke.wav | ke.wav |
| Ka.wav | ke_2.wav |
| Te.wav | te.wav |
| Ti.wav | te_2.wav |
| Tu.wav | te_middlefinger.wav |
| Trkt.wav | re.wav |
| Kat.wav | ke_3.wav |

## Tanpura (Electronic Tanpura Loops)

- **Source:** [Electronic Tanpura](https://freesound.org/people/sankalp/packs/9600/) by sankalp on Freesound
- **License:** [Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Attribution:** "Electronic Tanpura" by [sankalp](https://freesound.org/people/sankalp/)
- **Files:** `public/samples/tanpura/`
- **Changes:** The source recordings were edited into approximately 20-second AAC/M4A loops.

Recordings of a Raagini-brand electronic tanpura captured via line-in.

### Sample Matrix

15 neutral recordings (3 tunings x 5 base pitches), plus two Pa/C tone
variants: 17 files total.

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

The engine selects the nearest source recording and uses pitch shifting to
match the selected Sa while playback rate controls pluck tempo. The bundled
source pitches are A2, C3, D3, E3, and F#3; the app's selectable Sa range
extends from A2 to E4.

## Manjira

No Manjira samples are bundled. A prototype synthesis engine exists but is
not currently connected to app controls.

---

## Replacing Samples in a Source Build

Replace assets using the recognized basenames below, then rebuild the app.
This is not an in-app sample-import feature.

### Tabla
Replace the WAV files in `public/samples/tabla/` named after each bol:
- `Dha.wav`, `Dhin.wav`, `Dhi.wav`
- `Na.wav`, `Ta.wav`, `Tin.wav`, `Tun.wav`
- `Ge.wav`, `Ghe.wav`, `Ke.wav`, `Ka.wav`
- `Ti.wav`, `Tu.wav`, `Te.wav`
- `Trkt.wav`, `Kat.wav`

### Tanpura
Replace files in `public/samples/tanpura/` following the naming pattern. The
loader tries M4A, Ogg, and WAV variants of each recognized basename:
- `{Tuning}_{Pitch}.m4a` - e.g. `Pa_C.m4a`, `Ma_A.m4a`, `Ni_Fs.m4a`
- Optional EQ variants for Pa+C: `Pa_C_bass.m4a`, `Pa_C_treble.m4a`

Supported pitches: A (110Hz), C (130.8Hz), D (146.8Hz), E (164.8Hz), Fs (185Hz)
Supported tunings: Pa, Ma, Ni

The Tabla engine falls back to synthesis if its sample set cannot load.
Tanpura requires a recognized file matching the selected tuning, source pitch,
and Pa/C tone variant when applicable. It reports an error if no supported
format for that selection loads.
