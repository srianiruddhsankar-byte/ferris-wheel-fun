# Paper Ferris Wheel 🎡

A small paper-craft Ferris wheel ride for two. Plain HTML, CSS and vanilla JS (SVG visuals).

## Run it locally

From this folder, start any static server, then open the address it prints:

```bash
python3 -m http.server 8000      # then open http://localhost:8000
# or: npx serve .
```

Double-clicking `index.html` also works, but a local server is better: sound
crossfades and the postcard download are more reliable that way. The fonts and
html2canvas (for the postcard) load from the internet.

Testing tip: add `?speed=20` to the URL to make the ride 20× faster.

## Controls

- **Start:** enter both names, then click **Board**.
- **Corner buttons:** camera view (side / first person), Rider 1 reactions, Rider 2 reactions, sound (off by default).
- **Keyboard reactions:** Rider 1 uses `1`–`5`, Rider 2 uses `6`–`0` (❤️ ✨ 😂 😳 🥹).
- **Top of the wheel:** each rider types an answer (Enter sends). When both are in, the cards flip.

## Tweaking

- **`script.js` → `CONFIG`** (top of the file): ride duration, pause times, sway, firefly/star/cloud counts,
  the sky palettes for every time of day and when each one appears (`SKY_TIMELINE`),
  cabin and firefly colours, sound file names and volumes, emojis, and the question list.
- **`style.css` → `:root`**: paper, ink, rider and button colours, fonts, and the grain texture.

## Files

```
index.html   markup: stage, overlays, controls
style.css    paper look, layout, animations, reduced-motion rules
script.js    scene building, ride/camera/sky logic, question card, reactions, postcard
assets/      looping sounds (see assets/README.md)
```

## Later: online two-player

All shared actions (start, answers, reactions, continue) go through the `room`
object (`LocalRoom` in `script.js`). To play from two phones, add a `FirebaseRoom`
with the same methods, backed by Firebase Realtime Database at `rooms/{code}`,
and set `LOCAL_RIDERS` to the rider index for that device. The comment above
`LocalRoom` lists the suggested database layout.
