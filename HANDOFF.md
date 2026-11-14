# Containment Breach website

The site presents Containment Breach as a free-roam VR locomotion game where friends travel between different levels, explore varied maps and escape. Some maps are liminal spaces. It is not presented as a Backrooms game.

Bonegrit is the only confirmed entity. His image and exact owner-supplied lore are installed. The site states that he is blind and deaf, senses ground vibrations, and absorbs blood through his skin.

## Run locally

```sh
python3 -m http.server 5178
```

Open http://localhost:5178/. No build step is required. Fonts and runtime scripts are local.

## Design and behaviour

The visual direction uses the supplied gold logo, charcoal backgrounds, large Teko headings, readable Barlow body copy, and the real Bonegrit artwork. Sections use open layouts and restrained scroll movement. Reduced-motion settings disable smooth scrolling and scroll effects.

The entry screen offers optional music with website ambience, or silent entry. Keyboard focus stays inside the entry screen; Escape enters silently. Returning in the same tab skips entry and starts muted. Sound also mutes when the page is hidden. The music picks up from where it stopped.

The page works without JavaScript, showing the core content and supplied images. Optional gallery/trailer/link configuration requires JavaScript.

## Edit points

- `index.html`: approved copy, exact lore, image slots, accessible descriptions and EDIT markers.
- `css/style.css`: colours, typography and responsive layout.
- `js/main.js`: CONFIG, entry, navigation, optional ambience controls and image discovery.
- `js/sound.js`: locally synthesized website ambience.
- `js/music.js`: starts, stops and loops the music, *Concerto in D minor for harpsichord and strings*, an original Baroque-style piece written for the site.
- `audio/concerto.mp3`: the recording, played by a sampled harpsichord and string orchestra. `tools/music/` holds the score and the script that recorded it; see README.
- `PHOTOS-NEEDED.md`: installed images, future artwork and replacement instructions.
- `SITE-REQUIREMENTS.md`: remaining factual questions, one per bullet.

CONFIG supports `photoLabels`, `photoFormats`, `trailerYouTubeID`, and `officialLinks`. Each official link is an object with `label` and `url`; only HTTPS links with a label appear. The trailer needs the official 11-character YouTube video ID, either in CONFIG or the trailer frame's `data-youtube`. Both sections stay hidden while empty.

No store/platform commitments, release date, player cap, other entities, microphone mechanics, equipment claims, merchandise or prices are assumed. Missing map images stay hidden. No fake map art or gameplay is generated.

## Review tools

```sh
node tools/shoot.mjs http://localhost:5178/ review/desktop 1440 900 0 0 go:game:0 go:bonegrit:0 go:lore:0
QA_REDUCED=1 node tools/shoot.mjs http://localhost:5178/ review/phone 390 844 1 0 go:bonegrit:1
node tools/qa.mjs http://localhost:5178/ review/checks 390 844 1
```

Screenshots include companion JSON with viewport, image and section information. `window.__go(id, progress)` returns section scroll coordinates for review tools. `QA_AXE=/path/to/axe.min.js` optionally enables the automated accessibility audit.

See `POLISH-REVIEW.md` for completed checks. The site is served locally; it has not been deployed externally.
