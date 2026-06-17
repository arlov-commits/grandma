# Grandmother's Health Almanac 🐱

A neon-lit (or ancient-clay) health tracker for Grandma — and her very vocal cat.

It keeps a gentle daily record, with a live dashboard on top:

- 🍞 **Food intake** — dish, portion, time and notes
- ⚠️ **Reactions linked to each meal** — *not* a separate allergy list. Every
  reaction (digestive, skin, mood, or "no issue at all") is logged **against the
  specific meal that may have caused it**, so food and reaction always stay tied
  together.
- 💊 **Medication** — name, dose, time and whether it was taken
- 📊 **Dashboard summary** — today's meals, reactions and doses; an all-time
  severity breakdown; **which foods are linked to reactions**; and medication
  adherence for today
- 🐈 **Whiskers the cat** — a hand-drawn companion with **four** synthesised
  voices: **Meow, Purr, Chirp** and **Hiss**

Everything is saved privately in your browser (`localStorage`). No accounts, no
servers, nothing leaves the device.

## Made for Grandma

Grandma is of **Jewish–Slavic** heritage, so the food log comes pre-stocked with
her kind of cooking. One-tap **Quick add** chips (and a fuller type-ahead list)
offer dishes like *matzo ball soup, borscht, gefilte fish, latkes, challah,
blintzes, kreplach, kasha varnishkes, kugel, rugelach, brisket, tzimmes,
cholent, holishkes, pierogi, varenyky, holodets, herring, black rye bread,
babka, kompot* and *tea with lemon*. Common medications are pre-stocked too.

## Two beautiful themes

Switch instantly with the toggle in the header (your choice is remembered):

| Theme | Mood |
| --- | --- |
| **Neon City** *(default)* | Full cyberpunk — a dark grid horizon, neon cyan/magenta glow, animated scanlines, a glitching title and a glowing cyber-cat. Neon shards rain down the page. |
| **Ancient Sumer** | A sun-baked clay tablet pressed with cuneiform glyphs, terracotta and burnt-sienna tones, with motes of dust in the air. |

Each theme restyles everything — fonts, colours, ornaments, the cat's coat, and
even the cat's speech bubble (which speaks in cuneiform on the clay tablet).

## The cat 🐈

- **Picture:** Whiskers is drawn entirely in inline **SVG** — no image files — so
  he stays crisp at any size, recolours to match the theme, sways his tail and
  blinks.
- **Sounds:** all four voices are **synthesised live with the Web Audio API** —
  no audio files:
  - **Meow** — a pitch-glide through two sweeping formant filters
  - **Purr** — a low filtered rumble under a ~26 Hz amplitude tremolo
  - **Chirp** — a quick rising trill with three little pulses
  - **Hiss** — a burst of band-passed noise

  Each button plays its sound, animates the cat (a bounce, or an arch for the
  hiss) and pops a matching speech bubble.

## Running it

A static site with **no build step and no dependencies**. Either:

```bash
open index.html            # macOS  (use `xdg-open` on Linux)

# …or serve it locally (recommended)
python3 -m http.server 8000
# then visit http://localhost:8000
```

> The page links Google Fonts for the display typefaces and cuneiform glyphs.
> Offline, it falls back gracefully to system fonts.

## Project layout

```
.
├── index.html      # structure & the inline SVG cat
├── css/styles.css  # both themes, decorations, animations (CSS variables)
├── js/app.js       # storage, rendering, the dashboard, theming, cat sounds
└── README.md
```

## Accessibility & niceties

- Respects `prefers-reduced-motion` (shards, scanline sweep, sway, blink and the
  title glitch all stand still).
- Keyboard-focusable controls with visible focus rings.
- User-entered text is rendered as text (never injected as HTML).

---

Made for Grandma, with love. 🌃🐈
