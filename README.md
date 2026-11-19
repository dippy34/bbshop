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

"Enter with sound" plays *Concerto in D minor for piano and strings*, an original piece in the Baroque manner written for this site, over the ambience. `audio/concerto.mp3` is the recording; `js/music.js` only starts and stops it with the sound control and plays it again after a breath. The file is not downloaded until a visitor asks for sound.

The piece is written out as text in `tools/music/score.mjs`, one line per instrument per bar. `tools/music/render.mjs` turns that into a performance played on recordings of real instruments: a concert grand piano and a string orchestra. To change the music, edit the score, download the 44.1 kHz 16-bit piano recordings from https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html, and run:

```sh
apt install fluidsynth ffmpeg musescore-general-soundfont-lossless
node tools/music/render.mjs path/to/SalamanderGrandPianoV3_44.1khz16bit/44.1khz16bit
```

To check how original the piece's tunes are, `node tools/music/tune-check.mjs` compares them with RISM Online's catalogue of the opening themes of music surviving from about 1600 to 1850 and reports how many notes in a row any catalogued piece shares with each one.

Piano recordings: Salamander Grand Piano V3 by Alexander Holm, licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). String samples: the MuseScore General SoundFont by S. Christian Collins and contributors, MIT licence, played by FluidSynth.

## A second piece: the Rhapsody

`audio/rhapsody.mp3` is *Rhapsody in D minor for piano and orchestra* (3:35), an original showpiece for the same grand piano and a full orchestra: flute, oboe, clarinet, bassoon, horns, trumpets, trombones, tuba, timpani, percussion and strings. The site does not play it; to make it the site's music, point `FILE` in `js/music.js` at it.

Its score is `tools/music/rhapsody/score.mjs`. Most accompaniment is not typed out note by note: each bar names its harmony and small helpers voice it for each instrument. `engine.mjs` beside it turns the score into timed notes, and `render.mjs` records it, with the same piano recordings and SoundFont as above:

```sh
node tools/music/rhapsody/render.mjs path/to/SalamanderGrandPianoV3_44.1khz16bit/44.1khz16bit
node tools/music/tune-check.mjs tools/music/rhapsody/score.mjs
```

`tools/music/ringtone/` holds two more scores, both 25-second piano solos written to be phone ringtones. `score.mjs` is *Lightning Toccata*. `impossible.mjs` is *Impossible Étude in A minor*, which is written for four hands at once and is deliberately more than one pianist could play. Neither has an orchestra, so they need no SoundFont; their recordings are not kept in this repo:

```sh
SCORE=tools/music/ringtone/score.mjs HALL=-13 node tools/music/rhapsody/render.mjs path/to/44.1khz16bit "" toccata.wav
SCORE=tools/music/ringtone/impossible.mjs HALL=-15 node tools/music/rhapsody/render.mjs path/to/44.1khz16bit "" impossible.wav
```

`tools/music/phonk/` makes *NO REHEARSAL*, an original phonk track in G minor at 128 beats a minute, plus a slowed + reverb version of it. `piano.mjs` is its piano part, recorded on the same grand. `make.py` builds everything else and mixes it. The drums and cowbell come from the SoundFont's TR-808 kit, with the cowbell re-tuned note by note for the hook; the choir comes from the same SoundFont; the 808 bass is a sine wave with a falling pitch at each strike, glides and saturation. It needs Python with numpy and scipy:

```sh
SCORE=tools/music/phonk/piano.mjs HALL=-8 node tools/music/rhapsody/render.mjs path/to/44.1khz16bit "" piano.wav
python3 tools/music/phonk/make.py piano.wav out/
```

## Review tools

The scripts in `tools/` use a recent Node.js with built-in WebSocket support and Google Chrome installed at its standard macOS location. Start the local server first.

```sh
node tools/shoot.mjs http://localhost:5178/ review/desktop 1440 900 0 0 go:bonegrit:0
node tools/qa.mjs http://localhost:5178/ review/checks 390 844 1
```

See [POLISH-REVIEW.md](POLISH-REVIEW.md) for completed visual and functional checks.
