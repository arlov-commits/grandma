# Grandmother's Health Almanac 🌹

A loving, beautiful little health tracker for Grandma — and her cat.

It keeps a gentle daily record of three things, plus one delight:

- 🍞 **Food intake** — dish, portion, time and notes
- ⚠️ **Allergic reactions** — trigger, symptoms, severity (mild / moderate / severe) and time
- 💊 **Medication** — name, dose, time and whether it was taken
- 🐱 **Whiskers, the cat** — a hand-drawn companion with a button that makes him *meow*

Everything is saved privately in your browser (`localStorage`). No accounts, no
servers, nothing leaves the device.

## Two beautiful themes

Switch instantly between two fully-realised visual styles using the toggle in
the header (your choice is remembered):

| Theme | Mood |
| --- | --- |
| **Victorian Garden** *(default)* | Parchment, gilt frames, deep roses and trailing ivy. Rose petals drift gently down the page. |
| **Ancient Sumer** | A sun-baked clay tablet pressed with cuneiform glyphs, terracotta and burnt-sienna tones, with motes of dust in the air. |

Each theme restyles everything — fonts, colours, ornaments, the cat's coat, and
even the cat's meow speech-bubble (which speaks in cuneiform on the clay tablet).

## The cat 🐈

- **Picture:** Whiskers is drawn entirely in inline **SVG** — no image files, so
  he stays crisp at any size and recolours himself to match the active theme.
  His tail sways, his ears sit alert, and he blinks every so often.
- **Sound:** the *meow* is **synthesised live with the Web Audio API** — a
  pitch-gliding source shaped by two sweeping formant filters, so there's no
  audio file to ship. Pressing the button plays the meow, bounces the cat, and
  pops a little speech bubble.

## Running it

It's a static site with **no build step and no dependencies**. Either:

```bash
# open directly
open index.html            # macOS  (use `xdg-open` on Linux)

# …or serve it locally (recommended, so fonts/audio behave consistently)
python3 -m http.server 8000
# then visit http://localhost:8000
```

> The page links Google Fonts for the display typefaces and cuneiform glyphs.
> Offline, it falls back gracefully to elegant system serifs.

## Project layout

```
.
├── index.html      # structure & the inline SVG cat
├── css/styles.css  # both themes, decorations, animations (CSS variables)
├── js/app.js       # storage, rendering, stats, theme switch, the meow
└── README.md
```

## Accessibility & niceties

- Respects `prefers-reduced-motion` (petals, sway and blink stand still).
- Keyboard-focusable controls with visible focus rings.
- "Today at a glance" tallies meals, reactions and doses taken today.
- User text is rendered as text (never injected as HTML), so entries are safe.

---

Made with love, ivy & roses. 🌿
