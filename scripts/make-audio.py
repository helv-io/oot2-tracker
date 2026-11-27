#!/usr/bin/env python3
"""Synthesize the tracker's background music and the item-get fanfare.

No official recording of the Switch 2 remake's music or sound effects is
published for download (Zelda Wiki hosts none, and the soundtrack only
streams in Nintendo Music), so these are original renditions made here:

  twelve ocarina songs: a soft, warm ocarina over a quiet harp, written
    as short ambient pieces that the site crossfades in a playlist
  item-get: a short rising "item get" style flourish for a completed
    section (an original phrase, not the game's jingle)

    python3 scripts/make-audio.py

Needs numpy and ffmpeg (libopus + aac). Writes client/assets/audio/
{name}.{webm,m4a}. See client/assets/official/SOURCES.md.
"""
import os, subprocess, tempfile, wave
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "client", "assets", "audio")
rng = np.random.default_rng(7)

NOTES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

SHAPES = {
    "G": ["G3", "D4", "G4", "B4"],
    "D": ["D3", "A3", "D4", "F#4"],
    "A": ["A2", "E3", "A3", "C#4"],
    "Am": ["A2", "E3", "A3", "C4"],
    "C": ["C3", "G3", "C4", "E4"],
    "Em": ["E3", "B3", "E4", "G4"],
    "F": ["F3", "C4", "F4", "A4"],
    "Bb": ["A#2", "F3", "A#3", "D4"],
    "Dm": ["D3", "A3", "D4", "F4"],
    "Gm": ["G2", "D3", "G3", "A#3"],
    "Asus": ["A2", "E3", "A3", "D4"],
}


def hz(name):
    acc = name[1:-1]
    n = NOTES[name[0]] + (1 if acc == "#" else -1 if acc == "b" else 0)
    octave = int(name[-1])
    return 440.0 * 2 ** ((n + 12 * (octave + 1) - 69) / 12)


def env(n, attack, release, atk_pow=2.2, rel_pow=1.6):
    e = np.ones(n)
    a = min(n, int(attack * SR))
    r = min(n - a, int(release * SR))
    if a:
        e[:a] = np.linspace(0, 1, a) ** atk_pow
    if r:
        e[n - r :] *= np.linspace(1, 0, r) ** rel_pow
    return e


def lowpass(x, cutoff=2400, order=3):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1 / (1 + (np.maximum(f, 1e-6) / cutoff) ** (2 * order))
    return np.fft.irfft(X * H, n=len(x))


def ocarina(freq, dur, amp=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    # Vibrato comes in late and stays shallow, like a quiet breath.
    vib = np.clip((t - 0.32) / 0.55, 0, 1) * 0.003
    phase = 2 * np.pi * np.cumsum(freq * (1 + vib * np.sin(2 * np.pi * 4.5 * t))) / SR
    tone = np.sin(phase) + 0.11 * np.sin(2 * phase) + 0.025 * np.sin(3 * phase)
    noise = rng.standard_normal(n)
    breath = np.convolve(noise, np.ones(8) / 8, mode="same") - np.convolve(noise, np.ones(52) / 52, mode="same")
    breath *= 0.01
    att = min(0.18, dur * 0.4)
    rel = min(0.36, dur * 0.55)
    return (tone + breath) * env(n, att, rel) * amp


def harp(freq, dur, amp=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    decay = np.exp(-t * (1.7 + freq / 1400))
    tone = (
        np.sin(2 * np.pi * freq * t)
        + 0.22 * np.sin(4 * np.pi * freq * t) * np.exp(-t * 3.2)
        + 0.06 * np.sin(6 * np.pi * freq * t) * np.exp(-t * 6)
    )
    return tone * decay * env(n, 0.012, 0.12, atk_pow=1.8, rel_pow=1.3) * amp


def place(buf, sig, at):
    i = int(at * SR)
    end = min(len(buf), i + len(sig))
    if end > i:
        buf[i:end] += sig[: end - i]


def reverb(x, seconds=3.0, wet=0.34):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 2.5)
    ir[: int(0.018 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-12
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x) + n]
    out = np.zeros(len(x) + n)
    out[: len(x)] += x * (1 - wet)
    out += y * wet
    return out


def arrange(melody, chords, beat, chord_len=3, shapes=None, rest=2.4):
    shapes = shapes or SHAPES
    mel_dur = sum(b for _, b in melody) * beat
    ch_dur = len(chords) * chord_len * beat
    length = max(mel_dur, ch_dur) + rest
    buf = np.zeros(int(length * SR) + SR)
    at = 0.4
    for note, beats in melody:
        place(buf, ocarina(hz(note), beats * beat * 0.98, 0.36), at)
        at += beats * beat
    for i, ch in enumerate(chords):
        notes = shapes[ch]
        start = 0.4 + i * chord_len * beat
        hold = chord_len * beat + 0.7
        place(buf, harp(hz(notes[0]), hold, 0.2), start)
        for k, nm in enumerate(notes[1:]):
            place(buf, harp(hz(nm), hold * 0.85, 0.11), start + (k + 1) * beat * 0.45)
    body = buf[: int(length * SR)]
    # Warm the whole mix, then a soft room, then a slow fade in and out
    # so neighbouring tracks can crossfade without a hard edge.
    body = lowpass(body, cutoff=2600, order=3)
    wet = reverb(body, 3.1, 0.36)
    fade_in = int(0.9 * SR)
    fade_out = int(3.6 * SR)
    wet[:fade_in] *= np.linspace(0, 1, fade_in) ** 1.4
    wet[-fade_out:] *= np.linspace(1, 0, fade_out) ** 1.2
    return wet


def lullaby():
    beat = 60 / 72
    phrase = [("B4", 2), ("D5", 1), ("A4", 2), ("G4", 0.5), ("A4", 0.5), ("B4", 2), ("D5", 1), ("A4", 3)]
    rise = [("B4", 2), ("D5", 1), ("A5", 2), ("G5", 1), ("D5", 2), ("C5", 0.5), ("B4", 0.5), ("A4", 3)]
    last = [("B4", 2), ("D5", 1), ("A4", 3), ("G4", 1), ("A4", 2), ("B4", 6)]
    chords = ["G", "D", "G", "D", "G", "C", "Am", "D", "G", "D", "G", "Em", "C", "G"]
    return arrange(phrase + rise + last, chords, beat, 3)


def epona():
    beat = 60 / 74
    a = [("D5", 1), ("B4", 1), ("A4", 1), ("D5", 1), ("B4", 1), ("A4", 3)]
    b = [("D5", 1), ("B4", 1), ("A4", 1), ("F#5", 1), ("E5", 1), ("D5", 3)]
    c = [("A4", 2), ("B4", 1), ("D5", 2), ("B4", 1), ("A4", 6)]
    chords = ["D", "G", "D", "A", "D", "G", "Em", "A", "D"]
    return arrange(a + a + b + c, chords, beat, 3)


def saria():
    beat = 60 / 76
    a = [("F5", 1), ("A5", 1), ("B5", 1), ("F5", 1), ("A5", 1), ("B5", 3)]
    b = [("F5", 1), ("A5", 1), ("B5", 1), ("A5", 1), ("F5", 2), ("E5", 1), ("D5", 5)]
    c = [("F4", 1), ("A4", 1), ("B4", 2), ("A4", 2), ("F4", 6)]
    chords = ["F", "C", "F", "C", "Dm", "Am", "Bb", "C", "F"]
    return arrange(a + a + b + c, chords, beat, 3)


def sun():
    beat = 60 / 72
    a = [("A4", 1), ("F4", 1), ("D5", 2), ("A4", 1), ("F4", 1), ("D5", 4)]
    b = [("A4", 1), ("F4", 1), ("D5", 1), ("E5", 1), ("F5", 2), ("A4", 2), ("D5", 6)]
    chords = ["Dm", "F", "Dm", "C", "Bb", "F", "C", "Dm"]
    return arrange(a + a + b, chords, beat, 4)


def time_song():
    beat = 60 / 64
    a = [("A4", 2), ("D4", 2), ("F4", 4), ("A4", 2), ("D4", 2), ("F4", 4)]
    b = [("A4", 2), ("C5", 2), ("B4", 2), ("G4", 2), ("F4", 8)]
    c = [("D4", 4), ("F4", 2), ("A4", 2), ("D4", 8)]
    chords = ["Dm", "F", "Dm", "C", "Am", "Dm", "Bb", "C", "Dm"]
    return arrange(a + b + c, chords, beat, 4)


def storms():
    beat = 60 / 76
    a = [("D4", 1), ("F4", 1), ("D5", 2), ("D4", 1), ("F4", 1), ("D5", 4)]
    b = [("E5", 1), ("F5", 1), ("G5", 2), ("A5", 2), ("D5", 6)]
    c = [("D4", 2), ("F4", 2), ("A4", 2), ("D4", 6)]
    chords = ["Dm", "C", "Dm", "Am", "Bb", "C", "Dm", "A", "Dm"]
    return arrange(a + a + b + c, chords, beat, 4)


def minuet():
    beat = 60 / 70
    a = [("D4", 1), ("D5", 2), ("B4", 1), ("A4", 2), ("B4", 1), ("A4", 5)]
    b = [("G4", 1), ("A4", 1), ("B4", 2), ("A4", 2), ("F#4", 2), ("D4", 6)]
    chords = ["D", "G", "D", "A", "G", "Em", "A", "D"]
    return arrange(a + a + b, chords, beat, 3)


def bolero():
    beat = 60 / 66
    cell = [("F4", 0.5), ("D4", 0.5), ("F4", 0.5), ("D4", 0.5), ("A4", 0.5), ("F4", 0.5), ("A4", 0.5), ("D4", 0.5)]
    rise = [("F4", 0.5), ("D4", 0.5), ("F4", 0.5), ("A4", 0.5), ("C5", 0.5), ("A4", 0.5), ("D5", 2)]
    fall = [("A4", 2), ("F4", 2), ("D4", 8)]
    chords = ["Dm", "Dm", "F", "C", "Dm", "Bb", "C", "Dm", "A", "Dm"]
    return arrange(cell * 6 + rise + fall, chords, beat, 4)


def serenade():
    beat = 60 / 68
    a = [("D4", 2), ("F4", 2), ("A4", 2), ("A4", 1), ("B4", 5)]
    b = [("D4", 2), ("F4", 2), ("A4", 3), ("G4", 1), ("F4", 2), ("E4", 2), ("D4", 8)]
    chords = ["D", "F", "C", "G", "D", "Am", "G", "A", "D"]
    return arrange(a + a + b, chords, beat, 4)


def nocturne():
    beat = 60 / 58
    a = [("B4", 1), ("A4", 1), ("A4", 1), ("D4", 3), ("B4", 1), ("A4", 2), ("F4", 5)]
    b = [("B3", 1), ("A3", 1), ("A3", 1), ("D4", 3), ("E4", 2), ("F4", 6)]
    chords = ["Dm", "Am", "Bb", "Dm", "C", "Am", "Bb", "Dm"]
    return arrange(a + a + b, chords, beat, 3)


def requiem():
    beat = 60 / 62
    a = [("D4", 2), ("F4", 2), ("D4", 2), ("A4", 2), ("F4", 2), ("D4", 6)]
    b = [("D5", 2), ("F5", 2), ("D5", 2), ("A4", 2), ("F4", 2), ("D4", 8)]
    chords = ["Dm", "F", "Dm", "C", "Bb", "Dm", "Gm", "A", "Dm"]
    return arrange(a + a + b, chords, beat, 4)


def prelude():
    beat = 60 / 74
    a = [("D5", 2), ("A4", 2), ("D5", 2), ("A4", 2), ("B4", 2), ("D5", 6)]
    b = [("A4", 2), ("F#4", 2), ("G4", 2), ("A4", 2), ("D5", 8)]
    chords = ["D", "A", "G", "D", "Em", "A", "G", "A", "D"]
    return arrange(a + a + b, chords, beat, 4)


def item_get():
    buf = np.zeros(int(2.4 * SR))
    step = 0.085
    for i, nm in enumerate(["A4", "D5", "F#5", "A5"]):
        place(buf, harp(hz(nm), 1.2, 0.35), i * step)
        place(buf, ocarina(hz(nm), step * 1.1, 0.3), i * step)
    hold = 4 * step
    place(buf, ocarina(hz("D6"), 1.05, 0.55), hold)
    for nm in ["D4", "A4", "D5", "F#5"]:
        place(buf, harp(hz(nm), 1.8, 0.2), hold)
    for k, nm in enumerate(["A6", "D7", "F#6", "A6"]):
        place(buf, harp(hz(nm), 0.6, 0.06), hold + 0.25 + k * 0.11)
    # Keep the jingle a little brighter than the room music.
    return lowpass(reverb(buf, 1.4, 0.24)[: int(2.4 * SR)], cutoff=4200, order=2)


def write(name, sig, opus_kbps, aac_kbps, target_rms=0.22):
    sig = sig / (np.max(np.abs(sig)) + 1e-9) * 0.82
    rms = float(np.sqrt(np.mean(sig ** 2)))
    if target_rms and rms > 1e-6:
        sig = sig * (target_rms / rms)
        peak = float(np.max(np.abs(sig)))
        if peak > 0.89:
            sig *= 0.89 / peak
        rms = float(np.sqrt(np.mean(sig ** 2)))
    pcm = (sig * 32767).astype("<i2")
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, f"{name}.wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        common = ["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-map_metadata", "-1"]
        subprocess.run(common + ["-c:a", "libopus", "-b:a", f"{opus_kbps}k", os.path.join(OUT, f"{name}.webm")], check=True)
        subprocess.run(common + ["-c:a", "aac", "-b:a", f"{aac_kbps}k", "-movflags", "+faststart", os.path.join(OUT, f"{name}.m4a")], check=True)
    for ext in ("webm", "m4a"):
        p = os.path.join(OUT, f"{name}.{ext}")
        print(f"{p}: {os.path.getsize(p)} bytes, {len(sig) / SR:.1f}s, rms={rms:.3f}")
    return rms


os.makedirs(OUT, exist_ok=True)
SONGS = [
    ("lullaby", lullaby),
    ("epona", epona),
    ("saria", saria),
    ("sun", sun),
    ("time", time_song),
    ("storms", storms),
    ("minuet", minuet),
    ("bolero", bolero),
    ("serenade", serenade),
    ("nocturne", nocturne),
    ("requiem", requiem),
    ("prelude", prelude),
]
levels = []
for name, fn in SONGS:
    levels.append((name, write(name, fn(), 16, 32)))
write("item-get", item_get(), 32, 48, target_rms=None)
print("rms:", ", ".join(f"{n}={v:.3f}" for n, v in levels))
