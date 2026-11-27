#!/usr/bin/env python3
"""Synthesize the tracker's two sounds and encode them small.

No official recording of the Switch 2 remake's music or sound effects is
published for download (Zelda Wiki hosts none, and the soundtrack only
streams in Nintendo Music), so these are original renditions made here:

  lullaby: a soft ocarina-style performance of Zelda's Lullaby over a
           quiet harp, looped, for the faint background music
  item-get: a short rising "item get" style flourish for a completed
           section (an original phrase, not the game's jingle)

    python3 scripts/make-audio.py

Needs numpy and ffmpeg (libopus + aac). Writes client/assets/audio/
{lullaby,item-get}.{webm,m4a}. See client/assets/official/SOURCES.md.
"""
import os, subprocess, tempfile, wave
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "client", "assets", "audio")
rng = np.random.default_rng(7)

NOTES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hz(name):
    acc = name[1:-1]
    n = NOTES[name[0]] + (1 if acc == "#" else -1 if acc == "b" else 0)
    octave = int(name[-1])
    return 440.0 * 2 ** ((n + 12 * (octave + 1) - 69) / 12)


def env(n, attack, release):
    e = np.ones(n)
    a = min(n, int(attack * SR))
    r = min(n - a, int(release * SR))
    if a:
        e[:a] = np.linspace(0, 1, a) ** 1.6
    if r:
        e[n - r:] *= np.linspace(1, 0, r) ** 1.4
    return e


def ocarina(freq, dur, amp=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib_depth = np.clip((t - 0.18) / 0.35, 0, 1) * 0.0045
    phase = 2 * np.pi * np.cumsum(freq * (1 + vib_depth * np.sin(2 * np.pi * 5.1 * t))) / SR
    tone = np.sin(phase) + 0.22 * np.sin(2 * phase) + 0.07 * np.sin(3 * phase) + 0.03 * np.sin(4 * phase)
    # Breath: band-passed noise (roughly 1 to 5 kHz), kept quiet.
    noise = rng.standard_normal(n)
    breath = np.convolve(noise, np.ones(5) / 5, mode="same") - np.convolve(noise, np.ones(40) / 40, mode="same")
    breath *= 0.018
    return (tone + breath) * env(n, 0.05, min(0.18, dur * 0.4)) * amp


def harp(freq, dur, amp=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    decay = np.exp(-t * (2.2 + freq / 900))
    tone = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) * np.exp(-t * 4) + 0.12 * np.sin(6 * np.pi * freq * t) * np.exp(-t * 7)
    return tone * decay * env(n, 0.004, 0.08) * amp


def place(buf, sig, at):
    i = int(at * SR)
    end = min(len(buf), i + len(sig))
    buf[i:end] += sig[: end - i]


def reverb(x, seconds=2.4, wet=0.28):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 3.2)
    ir[: int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x) + n]
    out = np.zeros(len(x) + n)
    out[: len(x)] += x * (1 - wet)
    out += y * wet
    return out


def lullaby():
    beat = 60 / 80
    a = [("B4", 2), ("D5", 1), ("A4", 2), ("G4", .5), ("A4", .5), ("B4", 2), ("D5", 1), ("A4", 3),
         ("B4", 2), ("D5", 1), ("A5", 2), ("G5", 1), ("D5", 2), ("C5", .5), ("B4", .5), ("A4", 3)]
    b = a[:12] + [("D6", 6)]
    melody = a + b
    chords = ["G", "D", "G", "D", "G", "C", "Am", "D", "G", "D", "G", "D", "G", "C", "G", "G"]
    shapes = {"G": ["G3", "D4", "G4", "B4"], "D": ["D3", "A3", "D4", "F#4"], "C": ["C3", "G3", "C4", "E4"], "Am": ["A2", "E3", "A3", "C4"]}
    bars = len(chords)
    length = (bars * 3 + 3) * beat
    buf = np.zeros(int(length * SR) + SR)
    at = 0.0
    for note, beats in melody:
        place(buf, ocarina(hz(note), beats * beat * 0.98, 0.5), at)
        at += beats * beat
    for i, ch in enumerate(chords):
        notes = shapes[ch]
        start = i * 3 * beat
        place(buf, harp(hz(notes[0]), 3.2 * beat, 0.26), start)
        for k, nm in enumerate(notes[1:]):
            place(buf, harp(hz(nm), 2.6 * beat, 0.15), start + (k + 1) * beat * 0.5 + beat * 0.5)
    wet = reverb(buf[: int(length * SR)], 2.6, 0.3)
    # Fold the tail back onto the start so the loop is seamless.
    loop = wet[: int(length * SR)].copy()
    tail = wet[int(length * SR):]
    loop[: len(tail)] += tail
    return loop


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
    return reverb(buf, 1.4, 0.24)[: int(2.4 * SR)]


def write(name, sig, opus_kbps, aac_kbps):
    sig = sig / (np.max(np.abs(sig)) + 1e-9) * 0.89
    fade = int(0.01 * SR)
    sig[-fade:] *= np.linspace(1, 0, fade)
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
        print(f"{p}: {os.path.getsize(p)} bytes, {len(sig) / SR:.1f}s")


os.makedirs(OUT, exist_ok=True)
write("lullaby", lullaby(), 20, 40)
write("item-get", item_get(), 32, 48)
