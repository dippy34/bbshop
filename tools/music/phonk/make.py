#!/usr/bin/env python3
"""NO REHEARSAL: an original phonk track in G minor at 128 beats a minute, and a slowed + reverb version of it.

    python3 tools/music/phonk/make.py <piano.wav> <out folder> [soundfont.sf2]

<piano.wav> is the piano part (piano.mjs beside this file), recorded first on the Salamander grand with:
    SCORE=tools/music/phonk/piano.mjs HALL=-8 node tools/music/rhapsody/render.mjs <salamander folder> "" piano.wav

Where the sounds come from:
- Drums and the cowbell are the TR-808 kit of the MuseScore_General SoundFont (MIT licence), played one hit at a
  time by FluidSynth. The cowbell is re-pitched note by note to play the tune, as phonk producers do.
- The choir and the pad are SoundFont instruments too, played by FluidSynth.
- The 808 bass is made the way the TR-808 itself makes it: a sine wave whose pitch drops as each note is struck.
  Here it also glides between notes and is driven into saturation for the phonk growl.

Needs numpy, scipy, fluidsynth and ffmpeg.
"""
import os
import struct
import subprocess
import sys
import tempfile
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
BPM = 128
STEP = 60 / BPM / 4                 # one sixteenth note
BAR = 16 * STEP
BARS = 52
N = int((BARS * BAR + 7) * SR)      # the music, the last chord's hold and a tail
PIANO_LEAD = 0.4                    # render.mjs puts the first beat this far into its file
rng = np.random.default_rng(128)


def at(bar, step=0.0):
    """Seconds at a bar (counted from 1) and a sixteenth within it."""
    return ((bar - 1) * 16 + step) * STEP


NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    accidental = {'b': -1, '#': 1}.get(name[1], 0)
    return 12 * (int(name[1 + abs(accidental):]) + 1) + NOTE[name[0]] + accidental


def hz(name):
    return 440 * 2 ** ((midi(name) - 69) / 12)


def filt(x, kind, freq, order=2):
    return sosfilt(butter(order, freq, kind, fs=SR, output='sos'), x, axis=0)


def stereo(x):
    return x if x.ndim == 2 else np.stack([x, x], 1)


def db(x):
    return 20 * np.log10(max(float(np.sqrt(np.mean(np.square(x)))), 1e-9))


def track():
    return np.zeros((N, 2), dtype=np.float32)


def place(into, sound, time, gain=1.0, pan=0.0, ratio=1.0, length=None):
    """Add a sound at a time: re-pitched by ratio, panned (-1 left … 1 right), cut short after length seconds."""
    s = stereo(sound)
    if ratio != 1.0:
        where = np.arange(0, len(s) - 1, ratio)
        s = np.stack([np.interp(where, np.arange(len(s)), s[:, c]) for c in range(2)], 1)
    if length is not None and int(length * SR) < len(s):
        s = s[:int(length * SR)].copy()
        fade = min(len(s), int(0.012 * SR))
        s[len(s) - fade:] *= np.linspace(1, 0, fade)[:, None]
    i = int(round(time * SR))
    if i >= N:
        return
    s = s[:N - i]
    angle = (pan + 1) * np.pi / 4
    into[i:i + len(s), 0] += s[:, 0] * gain * np.sqrt(2) * np.cos(angle)
    into[i:i + len(s), 1] += s[:, 1] * gain * np.sqrt(2) * np.sin(angle)


# ---------------------------------------------------------------- the SoundFont, through FluidSynth

def vlq(n):
    out = [n & 0x7F]
    n >>= 7
    while n:
        out.insert(0, (n & 0x7F) | 0x80)
        n >>= 7
    return bytes(out)


def fluid(events, soundfont, seconds):
    """Play (seconds, MIDI bytes) events through FluidSynth, without its own reverb or chorus."""
    with tempfile.TemporaryDirectory() as work:
        body, last = b'', 0
        for time, message in sorted(events, key=lambda e: e[0]):
            tick = round(time * 960)          # 480 ticks a beat at 120 a minute
            body += vlq(tick - last) + bytes(message)
            last = tick
        body += b'\x00\xff\x2f\x00'
        with open(os.path.join(work, 'in.mid'), 'wb') as f:
            f.write(b'MThd' + struct.pack('>IHHH', 6, 0, 1, 480) + b'MTrk' + struct.pack('>I', len(body)) + body)
        subprocess.run(['fluidsynth', '-ni', '-q', '-R', '0', '-C', '0', '-g', '0.6', '-r', str(SR), '-F',
                        os.path.join(work, 'out.wav'), soundfont, os.path.join(work, 'in.mid')], check=True)
        audio = read(os.path.join(work, 'out.wav'))
    out = np.zeros((int(seconds * SR), 2), dtype=np.float32)
    out[:min(len(out), len(audio))] = audio[:len(out)]
    return out


def read(path):
    w = wave.open(path)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x.reshape(-1, w.getnchannels())


KIT = {'kick': 36, 'rim': 37, 'clap': 39, 'snare': 40, 'hat': 42, 'openhat': 46, 'crash': 49, 'tambourine': 54,
       'cowbell': 56, 'tom': 48}


def drum_hits(soundfont):
    """Each 808 sound on its own, trimmed and brought to full scale."""
    events = [(0, [0xC9, 25])]                                     # drum channel, kit 25: TR-808
    for i, key in enumerate(KIT.values()):
        events += [(1 + 5 * i, [0x99, key, 127]), (1 + 5 * i + 4, [0x89, key, 0])]
    audio = fluid(events, soundfont, 2 + 5 * len(KIT))[:, 0]
    hits = {}
    for i, name in enumerate(KIT):
        s = audio[int((1 + 5 * i) * SR):int((1 + 5 * i + 4.9) * SR)]
        s = s[np.argmax(np.abs(s) > 1e-3):]
        loud = np.where(np.abs(s) > np.abs(s).max() * 1e-3)[0]
        hits[name] = s[:loud[-1] + 1] / np.abs(s).max()
    return hits


def pitch_of(sound, around):
    """The strongest frequency near `around`, to tune the cowbell by."""
    spectrum = np.abs(np.fft.rfft(sound * np.hanning(len(sound)), 1 << 18))
    freqs = np.fft.rfftfreq(1 << 18, 1 / SR)
    band = (freqs > around * 0.8) & (freqs < around * 1.2)
    k = np.flatnonzero(band)[np.argmax(spectrum[band])]
    a, b, c = np.log(spectrum[k - 1:k + 2])
    return freqs[k] + 0.5 * (a - c) / (a - 2 * b + c) * (freqs[1] - freqs[0])


# ---------------------------------------------------------------- effects

def space(seconds, rt60, bright=0.5):
    """A stereo hall: decaying noise that loses its treble faster than its body."""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for c in range(2):
        out[:, c] = (bright * rng.standard_normal(n) * np.exp(-6.91 * t / (rt60 * 0.4))
                     + filt(rng.standard_normal(n), 'low', 3000) * np.exp(-6.91 * t / rt60))
    out[:int(0.022 * SR)] = 0                                      # a little pre-delay
    return out / np.sqrt(np.sum(out ** 2, axis=0))


def convolve(x, ir):
    return np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1).astype(np.float32)


def pingpong(x, delay, feedback=0.4, repeats=7):
    """Echoes bouncing left and right, each darker than the last."""
    source = filt(filt(x.mean(axis=1), 'high', 500), 'low', 4500)
    out = np.zeros_like(x)
    d = int(delay * SR)
    for k in range(1, repeats + 1):
        if k * d >= len(x):
            break
        out[k * d:, (k + 1) % 2] += source[:len(x) - k * d] * feedback ** (k - 1)
    return out


def sweep(x, start, end, f0, f1, kind='low', block=256):
    """A filter whose cutoff glides from f0 to f1 between two times; after the glide the sound is left as it is."""
    y = x.copy()
    i0, i1 = int(start * SR), int(end * SR)
    state = np.zeros((1, 2, x.shape[1]))
    for i in range(i0, i1, block):
        cutoff = f0 * (f1 / f0) ** ((i - i0) / (i1 - i0))
        sos = butter(2, min(cutoff, SR / 2 * 0.95), kind, fs=SR, output='sos')
        y[i:i + block], state = sosfilt(sos, x[i:i + block], axis=0, zi=state)
    return y


def duck(times, depth, release=0.16):
    """A gain curve that dips on every kick, so the beat breathes."""
    gain = np.ones(N, dtype=np.float32)
    shape = np.arange(int(0.6 * SR)) / SR
    shape = depth * np.exp(-shape / release) * np.minimum(1, shape / 0.004)
    for t in times:
        i = int(t * SR)
        seg = gain[i:i + len(shape)]
        seg *= 1 - shape[:len(seg)]
    return gain[:, None]


def tape_stop(x, start, length):
    """The sound slows to a halt over `length` seconds, like a turntable switched off; silence after it until the next bar."""
    i0, n = int(start * SR), int(length * SR)
    t = np.arange(n) / SR
    where = i0 + (t - t * t / (2 * length)) * SR
    for c in range(2):
        x[i0:i0 + n, c] = np.interp(where, np.arange(len(x)), x[:, c]) * (1 - t / length) ** 0.6   # dying away to nothing
    x[i0 + n:int((start + length) * SR) + int(0.02 * SR)] = 0


def bass808(notes, drive):
    """notes: (start, end, note, glide) in seconds. A note with a glide time slides from the note before it without
    being struck again; any other note is struck: its pitch starts high and drops into the note, like an 808's.
    Returns the clean sub and the saturated growl separately, so each can be set on its own."""
    sub, growl = np.zeros(N), np.zeros(N)
    groups = []
    for note in notes:
        if note[3] and groups:
            groups[-1].append(note)
        else:
            groups.append([note])
    for group in groups:
        s, e = int(group[0][0] * SR), min(N, int(group[-1][1] * SR))
        f = np.empty(e - s)
        before = None
        for start, end, name, glide in group:
            a, b = int(start * SR) - s, min(N, int(end * SR)) - s
            t = np.arange(b - a) / SR
            target = hz(name)
            f[a:b] = target * (2 ** (1.3 * np.exp(-t / 0.009)) if before is None else (before / target) ** np.exp(-t / glide))
            before = target
        t = np.arange(e - s) / SR
        level = np.exp(-t / max(1.1, 0.7 * t[-1])) * np.minimum(1, t / 0.0015)   # long notes ring longer
        fade = min(len(t), int(0.018 * SR))
        level[len(t) - fade:] *= np.linspace(1, 0, fade)
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * level
        sub[s:e] += tone
        growl[s:e] += np.tanh(drive * (tone + 0.12 * tone ** 2)) / np.tanh(drive)   # a touch of even harmonics too
    sub = filt(sub, 'low', 150, 4)
    growl = filt(filt(growl, 'high', 100, 2), 'low', 3400, 2)
    return stereo(sub).astype(np.float32), stereo(growl).astype(np.float32)


# ---------------------------------------------------------------- the music

LOOP = ['Gm', 'Eb', 'Cm', 'D']                    # one chord a bar, four bars round
CHOIR = {'Gm': ['G3', 'Bb3', 'D4'], 'Eb': ['G3', 'Bb3', 'Eb4'], 'Cm': ['G3', 'C4', 'Eb4'], 'D': ['F#3', 'A3', 'D4']}
# The cowbell tune. Each bar: (sixteenth, note). The rhythm is the same every bar, x.xx.xx. twice; the top keeps
# coming back to G while the chords move under it, and the D bar leans on F# so the loop pulls back home.
HOOK = [
    [(0, 'G5'), (2, 'D5'), (3, 'G5'), (5, 'Bb5'), (6, 'A5'), (8, 'G5'), (10, 'D5'), (11, 'F5'), (13, 'G5'), (14, 'D5')],
    [(0, 'G5'), (2, 'Eb5'), (3, 'G5'), (5, 'Bb5'), (6, 'G5'), (8, 'F5'), (10, 'Eb5'), (11, 'F5'), (13, 'G5'), (14, 'Bb4')],
    [(0, 'G5'), (2, 'C5'), (3, 'Eb5'), (5, 'G5'), (6, 'F5'), (8, 'Eb5'), (10, 'C5'), (11, 'D5'), (13, 'Eb5'), (14, 'G4')],
    [(0, 'F#5'), (2, 'D5'), (3, 'F#5'), (5, 'A5'), (6, 'G5'), (8, 'F#5'), (10, 'D5'), (11, 'A4'), (13, 'C5'), (14, 'F#5')],
]
HOOK_TURN = [(0, 'F#5'), (2, 'D5'), (3, 'F#5'), (5, 'A5'), (6, 'C6'), (8, 'Bb5'), (10, 'A5'), (11, 'G5'), (13, 'F#5'), (14, 'A5')]
# The 808: (sixteenth, length in sixteenths, note, slides from the note before?)
BASS_A = [
    [(0, 3, 'G1', 0), (3, 3, 'G1', 0), (6, 4, 'G2', 1), (10, 6, 'G1', 1)],
    [(0, 3, 'Eb2', 0), (3, 3, 'Eb2', 0), (6, 4, 'Bb1', 1), (10, 6, 'Eb2', 1)],
    [(0, 3, 'C2', 0), (3, 3, 'C2', 0), (6, 4, 'G1', 1), (10, 6, 'C2', 1)],
    [(0, 3, 'D2', 0), (3, 3, 'D2', 0), (6, 4, 'A1', 1), (10, 3, 'D2', 1), (13, 3, 'F#2', 1)],
]
BASS_B = [
    [(0, 3, 'G1', 0), (3, 3, 'G2', 0), (6, 4, 'G1', 1), (10, 3, 'G1', 0), (13, 3, 'Bb1', 1)],
    [(0, 3, 'Eb2', 0), (3, 3, 'Eb2', 0), (6, 4, 'Bb1', 1), (10, 3, 'Eb2', 0), (13, 3, 'G2', 1)],
    [(0, 3, 'C2', 0), (3, 3, 'C3', 1), (6, 4, 'C2', 1), (10, 3, 'C2', 0), (13, 3, 'Eb2', 1)],
    [(0, 3, 'D2', 0), (3, 3, 'D2', 0), (6, 4, 'A1', 1), (10, 3, 'D2', 0), (13, 3, 'F#2', 1)],
]
ROOT = {'Gm': 'G1', 'Eb': 'Eb2', 'Cm': 'C2', 'D': 'D2'}
DOWN = {'Gm': 'G0', 'Eb': 'Eb1', 'Cm': 'C1', 'D': 'D1'}
SECTIONS = [(1, 'Intro'), (9, 'First drop'), (25, 'Break'), (33, 'Second drop'), (49, 'Outro')]


class Song:
    def __init__(self):
        self.kicks, self.claps, self.hats, self.perc, self.perc2, self.bells, self.bass, self.crashes, self.chords = [], [], [], [], [], [], [], [], []

    def hook(self, bar, tune, gain=1.0, until=16, low=0.0):
        for step, note in tune:
            if step < until:
                accent = 1.0 if step % 8 in (0, 3, 6) else 0.78
                self.bells.append((at(bar, step), note, gain * accent, low))

    def beat(self, bar, i, phrase_end, second):
        """One bar of a drop. i: where the bar falls in the four-bar loop."""
        for step in (0, 3, 6, 10) + ((13,) if i == 3 else ()):
            self.kicks.append((at(bar, step), 1.0 if step == 0 else 0.85))
        for step, length, note, slide in (BASS_B if second else BASS_A)[i]:
            self.bass.append((at(bar, step), at(bar, step + length), note, 0.05 if slide else 0))
        self.claps += [(at(bar, 4), 1.0), (at(bar, 12), 1.0)]
        if i in (1, 3):
            self.claps.append((at(bar, 7), 0.3))
        if phrase_end:                                    # a snare roll in 32nds into the next eight bars
            self.claps += [(at(bar, 12 + k / 2), 0.35 + 0.08 * k) for k in range(1, 8)]
        sixteenths = second and bar >= 45
        roll32, triplets = i == 3 and not sixteenths, phrase_end
        for step in range(0, 16, 1 if sixteenths else 2):
            if (roll32 and step >= 12) or (triplets and 8 <= step < 12):
                continue
            self.hats.append((at(bar, step), (0.85 if step % 4 == 2 else 0.6) if step % 2 == 0 else 0.4, False))
        if roll32:                                        # a hi-hat roll in 32nds
            self.hats += [(at(bar, 12 + k / 2), 0.4 + 0.05 * k, False) for k in range(8)]
        if triplets:                                      # and a triplet roll
            self.hats += [(at(bar, 8 + k * 2 / 3), 0.45 + 0.04 * k, False) for k in range(6)]
        if i == 1:
            self.hats.append((at(bar, 14), 0.6, True))
        self.perc += [('rim', at(bar, 7), 0.32, -0.35), ('rim', at(bar, 15), 0.26, 0.35)]
        if second:
            self.perc2 += [('tambourine', at(bar, step), 0.5, 0.45) for step in (2, 6, 10, 14)]
            self.perc2 += [('tom', at(bar, 9 if i % 2 else 13), 1.0, -0.2)]
        self.hook(bar, HOOK_TURN if phrase_end else HOOK[i], low=0.5 if second else 0.0)
        self.chords.append((bar, LOOP[i], 70 if not second else 78, 0, 16))


def arrange():
    song = Song()
    # intro: piano and choir; the cowbell creeps in under a closed filter; a roll, a riser and a beat of silence
    for bar in range(1, 9):
        song.chords.append((bar, LOOP[(bar - 1) % 4], 82, 0, 16))
    for bar in range(5, 9):
        song.hook(bar, HOOK[bar - 5], gain=0.9, until=12 if bar == 8 else 16)
        for step in range(0, 16 if bar < 8 else 12, 2):
            song.hats.append((at(bar, step), 0.35 if step % 4 else 0.25, False))
    song.bass.append((at(5), at(7), 'G1', 0))
    song.bass.append((at(7), at(8), 'G0', 1.2))
    song.claps += [(at(8, step), 0.25 + 0.05 * step) for step in range(0, 8)] + [(at(8, 8 + k / 2), 0.65 + 0.03 * k) for k in range(8)]
    # first drop
    for bar in range(9, 25):
        song.beat(bar, (bar - 9) % 4, (bar - 9) % 8 == 7, False)
    song.crashes += [at(9), at(17)]
    # break: half time, the 808 diving at the start of every bar, the piano alone on top
    for bar in range(25, 33):
        chord = LOOP[(bar - 25) % 4]
        song.chords.append((bar, chord, 86, 0, 16))
        if bar <= 28:
            song.bass += [(at(bar), at(bar, 4), ROOT[chord], 0), (at(bar, 4), at(bar + 1), DOWN[chord], 0.9)]
            song.claps.append((at(bar, 8), 0.7))
            song.hats += [(at(bar, step), 0.3, False) for step in (0, 4, 8, 12)]
        else:                                             # the build: kicks doubling up, the hook back, a roll
            song.hook(bar, HOOK[bar - 29], gain=0.95, until=12 if bar == 32 else 16)
            song.bass.append((at(bar), at(bar, 12 if bar == 32 else 16), ROOT[chord], 0))
            step_size = {29: 4, 30: 4, 31: 2, 32: 1}[bar]
            song.kicks += [(at(bar, s), 0.8) for s in range(0, 16 if bar < 32 else 12, step_size)]
            if bar >= 31:
                song.claps += [(at(bar, s), 0.3 + 0.03 * s) for s in range(0, 16 if bar < 32 else 12, 2 if bar == 31 else 1)]
            song.hats += [(at(bar, step), 0.4, False) for step in range(0, 16 if bar < 32 else 12, 2)]
    # second drop: everything, plus a lower cowbell, tambourine and toms; it ends in a tape stop
    for bar in range(33, 49):
        song.beat(bar, (bar - 33) % 4, (bar - 33) % 8 == 7, True)
    song.crashes += [at(33), at(41)]
    # outro: the hook twice more, far away; one last 808 dive; the piano ends it
    song.chords += [(49, 'Gm', 76, 0, 16), (50, 'Eb', 76, 0, 16), (51, 'Cm', 76, 0, 8), (51, 'D', 76, 8, 16), (52, 'Gm', 76, 0, 16)]
    song.hook(49, HOOK[0], gain=0.8)
    song.hook(50, HOOK[1], gain=0.7)
    song.bass += [(at(49), at(49, 6), 'G1', 0), (at(49, 6), at(51), 'G0', 1.4)]
    return song


def make(piano_path, out, soundfont):
    os.makedirs(out, exist_ok=True)
    song = arrange()
    hits = drum_hits(soundfont)
    cowbell_hz = pitch_of(hits['cowbell'], 510)
    stems = {}

    kick = filt(hits['kick'][:int(0.2 * SR)], 'high', 40) * np.linspace(1, 0, int(0.2 * SR))
    stems['kick'] = track()
    for time, gain in song.kicks:
        place(stems['kick'], kick, time, gain)

    stems['clap'] = track()
    clap = hits['clap'] + 0.6 * np.pad(hits['snare'], (0, max(0, len(hits['clap']) - len(hits['snare']))))[:len(hits['clap'])]
    for time, gain in song.claps:
        place(stems['clap'], clap, time, gain, ratio=0.94)

    stems['hats'] = track()
    for time, gain, opened in sorted(song.hats):
        later = [t for t, _, _ in song.hats if t > time + 1e-4]
        place(stems['hats'], hits['openhat' if opened else 'hat'], time, gain, pan=0.18,
              length=(min(later) - time) if opened and later else None)

    for stem, hits_list in (('perc', song.perc), ('perc2', song.perc2)):     # perc2: the second drop's tambourine and toms
        stems[stem] = track()
        for name, time, gain, pan in hits_list:
            place(stems[stem], hits[name], time, gain, pan=pan)

    # the cowbell plays the tune: each note re-pitched from the 808 cowbell, cut off by the next
    stems['cowbell'] = track()
    bells = sorted(song.bells)
    for k, (time, note, gain, low) in enumerate(bells):
        length = bells[k + 1][0] - time + 0.02 if k + 1 < len(bells) and bells[k + 1][0] - time < 0.6 else 0.6
        place(stems['cowbell'], hits['cowbell'], time, gain, ratio=hz(note) / cowbell_hz, length=length)
        if low:
            place(stems['cowbell'], hits['cowbell'], time, gain * low, ratio=hz(note) / 2 / cowbell_hz, length=length)
    bell = filt(stems['cowbell'], 'high', 220)
    stems['cowbell'] = (np.tanh(1.6 * bell / np.abs(bell).max()) / np.tanh(1.6)).astype(np.float32)   # a little grit
    stems['cowbell'] = sweep(stems['cowbell'], at(5), at(8, 8), 350, 14000)          # the intro's filter opening
    stems['cowbell'] = sweep(stems['cowbell'], at(29), at(32, 8), 500, 14000)        # and the build's
    stems['cowbell'] = sweep(stems['cowbell'], at(49), at(51), 9000, 700)            # closing again at the end

    stems['sub'], stems['growl'] = bass808(song.bass, drive=3.2)
    # the second drop's 808 is driven harder
    _, harder = bass808([n for n in song.bass if at(33) <= n[0] < at(49)], drive=5.0)
    first, second = slice(int(at(9) * SR), int(at(25) * SR)), slice(int(at(33) * SR), int(at(49) * SR))
    stems['growl'][second] = harder[second] * 10 ** ((db(stems['growl'][first]) + 1.5 - db(harder[second])) / 20)   # 1.5 dB more than the first

    # the tape stop at the end of the second drop takes the whole beat down with it
    for name in ('kick', 'clap', 'hats', 'perc', 'perc2', 'cowbell', 'sub', 'growl'):
        tape_stop(stems[name], at(48, 12), 4 * STEP)

    # choir and pad, from the SoundFont
    events = [(0, [0xC0, 52]), (0, [0xC1, 94]), (0, [0xB0, 7, 110]), (0, [0xB1, 7, 90])]
    stops = {8: 12, 32: 12, 48: 12}
    for bar, chord, velocity, first, last in song.chords:
        start = 1 + at(bar, first) - 0.06
        end = 1 + (at(bar, stops[bar]) if bar in stops else at(bar, last) + 0.05) + (3.0 if bar == 52 else 0)
        for note in CHOIR[chord]:
            events += [(start, [0x90, midi(note), velocity]), (end, [0x80, midi(note), 0])]
            if not 9 <= bar <= 24:                       # the pad sits out the first drop
                events += [(start, [0x91, midi(note) + 12, velocity - 16]), (end, [0x81, midi(note) + 12, 0])]
    stems['choir'] = fluid(events, soundfont, N / SR + 2)[int(SR):int(SR) + N]

    piano = read(piano_path)[int(PIANO_LEAD * SR):]
    stems['piano'] = track()
    stems['piano'][:min(N, len(piano))] = piano[:N]

    # effects: crashes, risers, reversed cymbals, vinyl crackle
    stems['fx'] = track()
    for time in song.crashes:
        place(stems['fx'], hits['crash'], time, 0.55)
    swell = hits['crash'][:int(1.4 * SR)][::-1] * np.linspace(0, 1, int(1.4 * SR)) ** 2
    for drop in (9, 33):
        place(stems['fx'], swell, at(drop) - len(swell) / SR, 0.22)
        riser = track()
        start, end = at(drop - 2), at(drop - 1, 12)
        n = int((end - start) * SR)
        riser[int(start * SR):int(start * SR) + n] = (rng.standard_normal((n, 2)) * np.linspace(0, 1, n)[:, None] ** 2.5)
        riser = sweep(riser, start, end, 300, 9000, kind='high')
        riser[int(end * SR) - int(0.01 * SR):int(end * SR)] *= np.linspace(1, 0, int(0.01 * SR))[:, None]
        stems['fx'] += filt(riser, 'low', 11000) * 0.35
    vinyl = filt(rng.standard_normal((N, 2)) * 0.05, 'band', [900, 5000])
    pops = np.zeros((N, 2))
    count = int(N / SR * 14)
    pops[rng.integers(0, N, count), rng.integers(0, 2, count)] = rng.standard_normal(count) * rng.random(count) ** 4
    vinyl += filt(pops, 'band', [700, 7000])
    crackle = np.interp(np.arange(N) / SR, [0, at(9) - 0.01, at(9), at(25), at(25) + 0.01, at(33) - 0.01, at(33), at(49), at(49) + 0.01, N / SR],
                         [1, 1, .4, .4, 1, 1, .4, .4, 1, 1])
    stems['vinyl'] = (vinyl * crackle[:, None]).astype(np.float32)

    # levels: each part set by how loud it is where it matters, in dB of average level
    drop1, drop2 = slice(int(at(9) * SR), int(at(25) * SR)), slice(int(at(33) * SR), int(at(49) * SR))
    intro = slice(0, int(at(8) * SR))
    targets = {'sub': (-15, drop1), 'growl': (-20.5, drop1), 'kick': (-21, drop1), 'clap': (-21.5, drop1), 'hats': (-29, drop1),
               'perc': (-31, drop1), 'perc2': (-30, drop2), 'cowbell': (-19.5, drop1), 'choir': (-30.5, drop1), 'piano': (-23, intro),
               'vinyl': (-43, intro)}
    for name, (target, where) in targets.items():
        stems[name] *= 10 ** ((target - db(stems[name][where])) / 20)
    stems['fx'] *= 10 ** ((-17 - db(stems['fx'][int(at(8) * SR):int(at(8, 12) * SR)])) / 20)

    # space: echoes and a hall for the cowbell, a darker, longer hall for the piano, choir and claps
    hall, dark = space(2.6, 2.0), space(4.0, 3.4, bright=0.25)
    stems['cowbell fx'] = 0.18 * pingpong(stems['cowbell'], 3 * STEP) + 0.25 * convolve(stems['cowbell'], hall)
    outro = slice(int(at(49) * SR), N)
    stems['cowbell fx'][outro] *= 2.2                                  # far away at the end
    stems['clap'] += 0.22 * convolve(stems['clap'], hall)
    stems['piano'] += 0.5 * convolve(stems['piano'], dark)
    stems['choir'] += 0.45 * convolve(stems['choir'], dark)

    # the kick makes the pads, the piano and the echoes breathe
    breathe = duck([t for t, _ in song.kicks], 0.55)
    for name in ('choir', 'piano', 'cowbell fx', 'vinyl'):
        stems[name] *= breathe

    # the beat of silence before each drop: everything cut, reverb tails too, except the reversed cymbal rushing in
    gate = np.ones((N, 1), dtype=np.float32)
    for bar in (8, 32):
        i0, i1, fade = int(at(bar, 12) * SR), int(at(bar + 1) * SR), int(0.015 * SR)
        gate[i0:i0 + fade, 0] = np.linspace(1, 0, fade)
        gate[i0 + fade:i1] = 0
    mix = sum(stem * (1 if name == 'fx' else gate) for name, stem in stems.items())
    # the mixer's faders: intro, break and outro sit well under the drops, and the builds climb into them
    ride = [(0, -6), (at(7), -6), (at(8, 12), -3), (at(9) - 0.02, -3), (at(9), 0), (at(25) - 0.02, 0), (at(25), -4.5),
            (at(29), -4.5), (at(32, 12), -0.5), (at(33) - 0.02, -0.5), (at(33), 0), (at(49) - 0.02, 0), (at(49), -5), (N / SR, -5)]
    mix *= (10 ** (np.interp(np.arange(N) / SR, *zip(*ride)) / 20)).astype(np.float32)[:, None]
    if os.environ.get('KEEP_STEMS'):
        for name, stem in stems.items():
            write(os.path.join(out, 'stem-' + name.replace(' ', '-') + '.wav'), stem)
    write(os.path.join(out, 'premaster.wav'), mix / np.abs(mix).max() * 0.9)
    master(os.path.join(out, 'premaster.wav'), os.path.join(out, 'NO REHEARSAL.wav'), -9.5)
    slowed(os.path.join(out, 'NO REHEARSAL.wav'), os.path.join(out, 'NO REHEARSAL (slowed + reverb).wav'))
    print('cowbell tuned from %.1f Hz; sections at %s' % (cowbell_hz, ', '.join('%s %d:%04.1f' % (name, at(bar) // 60, at(bar) % 60) for bar, name in SECTIONS)))


def write(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def loudness(path):
    text = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                          capture_output=True, text=True).stderr
    summary = text[text.rfind('Summary'):]
    return float(summary.split('I:')[1].split('LUFS')[0])


def master(source, out, target):
    """Glue, then a limiter, with the gain into it found so the track lands at the target loudness."""
    peak = float(np.abs(read(source)).max())
    gain = -20 * np.log10(peak)
    for _ in range(4):
        chain = ('highpass=f=27,acompressor=threshold=-14dB:ratio=1.8:attack=15:release=160:knee=6,'
                 'volume=%.2fdB,alimiter=limit=0.75:attack=3:release=70:level=disabled' % gain)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', source, '-af', chain, '-c:a', 'pcm_s16le', out], check=True)
        reached = loudness(out)
        if abs(reached - target) < 0.3:
            break
        gain += target - reached


def slowed(source, out):
    """The whole track at 85% speed, which also lowers it by about three semitones, in a big hall."""
    with tempfile.TemporaryDirectory() as work:
        slow = os.path.join(work, 'slow.wav')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', source, '-af', 'asetrate=%d,aresample=%d' % (SR * 0.85, SR),
                        '-c:a', 'pcm_s16le', slow], check=True)
        x = read(slow).astype(np.float64)
        wet = convolve(np.pad(x, ((0, int(4 * SR)), (0, 0))), space(4.5, 3.6, bright=0.2))
        x = np.pad(x, ((0, int(4 * SR)), (0, 0))) * 0.85 + 0.42 * wet
        write(os.path.join(work, 'wet.wav'), x / np.abs(x).max() * 0.7)
        master(os.path.join(work, 'wet.wav'), out, -10)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    make(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '/usr/share/sounds/sf2/MuseScore_General_Full.sf2')
