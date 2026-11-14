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
- `js/music.js`: starts, stops and loops the site's music.
- `audio/concerto.mp3`: the recording of that music.
- `tools/music/`: the score of the piece and the script that recorded it.
- `images/`: supplied artwork and future approved map screenshots.
- `vendor/`: bundled libraries, fonts and available license files.

The trailer and official-link sections stay hidden until configured. Empty map-image slots also stay hidden. See [HANDOFF.md](HANDOFF.md) for configuration details, [PHOTOS-NEEDED.md](PHOTOS-NEEDED.md) for asset filenames, and [SITE-REQUIREMENTS.md](SITE-REQUIREMENTS.md) for remaining factual questions.

## Music

"Enter with sound" plays *Concerto in D minor for harpsichord and strings*, an original piece in the Baroque manner written for this site, over the ambience. `audio/concerto.mp3` is the recording; `js/music.js` only starts and stops it with the sound control and plays it again after a breath. The file is not downloaded until a visitor asks for sound.

The piece is written out as text in `tools/music/score.mjs`, one line per instrument per bar. `tools/music/render.mjs` turns that into a performance and has FluidSynth play it with sampled instruments: a harpsichord and a string orchestra. To change the music, edit the score and run:

```sh
apt install fluidsynth ffmpeg musescore-general-soundfont-lossless
node tools/music/render.mjs
```

Instrument samples: the MuseScore General SoundFont by S. Christian Collins and contributors, MIT licence. Any General MIDI SoundFont with a harpsichord and a string section can be passed as the first argument instead.

## Review tools

The scripts in `tools/` use a recent Node.js with built-in WebSocket support and Google Chrome installed at its standard macOS location. Start the local server first.

```sh
node tools/shoot.mjs http://localhost:5178/ review/desktop 1440 900 0 0 go:bonegrit:0
node tools/qa.mjs http://localhost:5178/ review/checks 390 844 1
```

See [POLISH-REVIEW.md](POLISH-REVIEW.md) for completed visual and functional checks.
