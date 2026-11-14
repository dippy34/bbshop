# Containment Breach

The website for Containment Breach, a free-roam multiplayer VR locomotion game. Built with HTML, CSS and JavaScript, using the supplied game logo and Bonegrit artwork.

## Run locally

From the repository root:

```sh
python3 -m http.server 5178
```

Open http://localhost:5178/. No install or build step is required. Fonts and JavaScript libraries are included locally.

## Edit the site

- `index.html`: page content, image slots and Bonegrit's approved lore.
- `css/style.css`: layout, colours and responsive styles.
- `js/main.js`: CONFIG, navigation, image discovery and optional audio controls.
- `js/sound.js`: synthesized website ambience.
- `js/music.js`: starts, stops and loops the site's piano music.
- `audio/footsteps.mp3`: the recording of that music.
- `tools/music/`: the score of the piece and the script that recorded it.
- `images/`: supplied artwork and future approved map screenshots.
- `vendor/`: bundled libraries, fonts and available license files.

The trailer and official-link sections stay hidden until configured. Empty map-image slots also stay hidden. See [HANDOFF.md](HANDOFF.md) for configuration details, [PHOTOS-NEEDED.md](PHOTOS-NEEDED.md) for asset filenames, and [SITE-REQUIREMENTS.md](SITE-REQUIREMENTS.md) for remaining factual questions.

## Music

"Enter with sound" plays *Rondo agitato in F minor, “Footsteps”*, an original piano piece written for this site, over the ambience. `audio/footsteps.mp3` is the recording; `js/music.js` only starts and stops it with the sound control and plays it again after a short silence. The file is not downloaded until a visitor asks for sound.

The piece is written out as text in `tools/music/score.mjs`. `tools/music/render.mjs` plays that score on the Salamander Grand Piano V3 — a Yamaha C5 concert grand recorded note by note, at 16 loudness levels, by Alexander Holm — and writes the MP3. Nothing in it is synthesized. To change the music, edit the score, download the 44.1 kHz 16-bit recordings from https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html, and run:

```sh
node tools/music/render.mjs path/to/SalamanderGrandPianoV3_44.1khz16bit/44.1khz16bit
```

This needs ffmpeg. Piano recordings: Salamander Grand Piano V3 by Alexander Holm, licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## Review tools

The scripts in `tools/` use a recent Node.js with built-in WebSocket support and Google Chrome installed at its standard macOS location. Start the local server first.

```sh
node tools/shoot.mjs http://localhost:5178/ review/desktop 1440 900 0 0 go:bonegrit:0
node tools/qa.mjs http://localhost:5178/ review/checks 390 844 1
```

See [POLISH-REVIEW.md](POLISH-REVIEW.md) for completed visual and functional checks.
