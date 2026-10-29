"""Macht aus eingesprochenen Aufnahmen Summis Stimme.

Ablauf für jede Aufnahme in stimme-aufnahmen/ (beliebig viele Dateien, beliebige Reihenfolge):
  1. Rauschen und Brummen entfernen
  2. Spracherkennung (Whisper) hört zu und erkennt, welcher Satz der Sprechliste gesagt wurde
  3. Jeder Satz wird einzeln ausgeschnitten, Stille am Rand entfernt, Lautstärke angeglichen
  4. Zwei Fassungen: "natur" (die echte Stimme) und "biene" (etwas höher und flotter)
Wurde ein Satz mehrmals gesprochen, gilt der letzte gut erkannte Versuch.

Ergebnis: lernapp/stimme/{natur,biene}/<nr>.mp3, lernapp/stimme/stimme.js und app/stimme/bericht.md

  python app/stimme/verarbeiten.py                    alle Aufnahmen verarbeiten
  python app/stimme/verarbeiten.py --selbsttest       mit einer Computerstimme prüfen, ob alles funktioniert
  python app/stimme/verarbeiten.py --woerter X.json   Erkennung aus Datei statt Whisper (zum Testen)
"""
import argparse
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
RATE = 44100
FRAME = 0.02                      # 20 ms je Messpunkt für die Lautstärke
AUDIO = (".m4a", ".mp3", ".ogg", ".opus", ".wav", ".aac", ".amr", ".3gp", ".webm", ".flac", ".mp4")
ACCEPT = 0.72                     # so ähnlich muss das Gehörte dem Satz sein
CHECK = 0.86                      # darunter steht der Satz im Bericht unter "bitte anhören"

ZAHLEN = "null eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn zwanzig".split()


def norm(text):
    """Text zum Vergleichen: klein, ohne Satzzeichen, Zahlen als Wörter."""
    t = text.lower().replace("ß", "ss")
    t = re.sub(r"\d+", lambda m: ZAHLEN[int(m.group())] if int(m.group()) < len(ZAHLEN) else m.group(), t)
    t = re.sub(r"[^a-zäöü0-9 ]+", " ", t)
    return " ".join(t.replace("ss", "s").split())


def similar(a, b):
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def load(path, filters=None):
    """Aufnahme als Zahlenreihe (mono, 44,1 kHz), auf Wunsch mit ffmpeg-Filtern."""
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(RATE)]
    if filters:
        cmd += ["-af", filters]
    cmd += ["-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, check=True, capture_output=True).stdout, dtype=np.float32).copy()


def levels(x):
    """Lautstärke in dB je 20-ms-Abschnitt."""
    n = int(RATE * FRAME)
    frames = x[: len(x) // n * n].reshape(-1, n)
    return 20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-9)


def save_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1",
                    "-i", "-", path], input=pcm, check=True)


# ---------- Spracherkennung ----------
_model = None


def transcribe(path, prompt):
    """Wörter mit Zeitmarken: [(start, ende, wort), ...]"""
    global _model
    from faster_whisper import WhisperModel
    if _model is None:
        _model = WhisperModel(os.environ.get("WHISPER_MODELL", "small"), device="cpu", compute_type="int8")
    segments, _ = _model.transcribe(path, language="de", word_timestamps=True, initial_prompt=prompt,
                                    vad_filter=True, vad_parameters={"min_silence_duration_ms": 400},
                                    condition_on_previous_text=False, beam_size=5)
    return [(w.start, w.end, w.word) for s in segments for w in (s.words or [])]


# ---------- Sätze in der Aufnahme finden ----------
def chunks_from(words, x_levels, floor):
    """Teilt die Wörter an Pausen in Stücke. Pause = Lücke zwischen Wörtern, in der es wirklich leise ist."""
    quiet = x_levels < floor + 8
    chunks, cur = [], []
    for w in words:
        if cur:
            gap_from, gap_to = cur[-1][1], w[0]
            a, b = int(gap_from / FRAME), int(gap_to / FRAME)
            silent = b > a and quiet[a:b].mean() > 0.6 if b - a > 0 else False
            if gap_to - gap_from > 0.85 or (gap_to - gap_from > 0.4 and silent):
                chunks.append(cur)
                cur = []
        cur.append(w)
    if cur:
        chunks.append(cur)
    return chunks


def find_sentences(chunks, saetze, max_parts=4):
    """Für jeden Satz die besten Stellen (zusammenhängende Stücke) mit Ähnlichkeit."""
    texts = [norm("".join(w[2] for w in c)) for c in chunks]
    found = []
    for s in saetze:
        target = norm(s["text"])
        for i in range(len(chunks)):
            heard = ""
            for k in range(i, min(i + max_parts, len(chunks))):
                heard = (heard + " " + texts[k]).strip()
                if len(heard) > len(target) * 1.6 + 6:
                    break
                if len(heard) * 1.6 + 6 < len(target):
                    continue
                score = similar(heard, target)
                if score >= ACCEPT - 0.1:
                    found.append({"id": s["id"], "von": i, "bis": k, "score": score, "gehoert": heard})
    return found


def choose(found_per_file):
    """Pro Satz eine Stelle wählen. Längere Sätze zuerst, damit kurze ("Super!") nicht aus langen geklaut werden.
    Bei fast gleich guten Versuchen gewinnt der spätere: Wer sich verspricht, sagt den Satz einfach nochmal."""
    by_id = {}
    for f_index, found in enumerate(found_per_file):
        for c in found:
            by_id.setdefault(c["id"], []).append(dict(c, datei=f_index))
    used = set()
    chosen = {}
    for sid in sorted(by_id, key=lambda i: -max(len(c["gehoert"]) for c in by_id[i])):
        options = [c for c in by_id[sid]
                   if c["score"] >= ACCEPT and not any((c["datei"], k) in used for k in range(c["von"], c["bis"] + 1))]
        if not options:
            continue
        best = max(c["score"] for c in options)
        # Überlappende Stellen sind derselbe Versuch: davon die ähnlichste. Von mehreren Versuchen gewinnt der späteste.
        attempts = []
        for c in sorted(options, key=lambda c: -c["score"]):
            if not any(a["datei"] == c["datei"] and a["von"] <= c["bis"] and c["von"] <= a["bis"] for a in attempts):
                attempts.append(c)
        c = max((a for a in attempts if a["score"] >= best - 0.06), key=lambda a: (a["datei"], a["von"]))
        chosen[sid] = c
        used.update((c["datei"], k) for k in range(c["von"], c["bis"] + 1))
    return chosen, by_id


# ---------- Ausschneiden und Klang ----------
def cut(y, y_levels, floor, chunks, c):
    """Satz ausschneiden: etwas Luft um die Wörter, dann Stille am Rand abschneiden."""
    start, end = chunks[c["von"]][0][0], chunks[c["bis"]][-1][1]
    prev_end = chunks[c["von"] - 1][-1][1] if c["von"] > 0 else 0
    next_start = chunks[c["bis"] + 1][0][0] if c["bis"] + 1 < len(chunks) else len(y) / RATE
    a = max(prev_end + 0.05, start - 0.3, 0)
    b = min(next_start - 0.05, end + 0.45, len(y) / RATE)
    fa, fb = int(a / FRAME), int(b / FRAME)
    loud = np.where(y_levels[fa:fb] > floor + 12)[0]
    if len(loud):
        a = max(a, (fa + loud[0]) * FRAME - 0.06)
        b = min(b, (fa + loud[-1] + 1) * FRAME + 0.14)
    return y[int(a * RATE): int(b * RATE)].copy()


def polish(clip, floor):
    """Gleiche Lautstärke für alle Sätze, sanft ein- und ausblenden, kurze Stille davor und danach."""
    lv = levels(clip)
    speech = lv[lv > floor + 12]
    rms = 10 ** (np.mean(speech) / 20) if len(speech) else np.sqrt((clip ** 2).mean()) + 1e-9
    gain = 10 ** (-19 / 20) / rms
    peak = np.abs(clip).max() + 1e-9
    gain = min(gain, 10 ** (-1.5 / 20) / peak, 30)
    clip = clip * gain
    fi, fo = int(0.015 * RATE), int(0.06 * RATE)
    clip[:fi] *= np.linspace(0, 1, fi)
    clip[-fo:] *= np.linspace(1, 0, fo)
    pad = np.zeros(int(0.04 * RATE), dtype=np.float32)
    return np.concatenate([pad, clip, pad])


def encode(wav, mp3, biene=False):
    # Biene: 12 % höher, insgesamt nur etwas flotter. Klingt nach kleiner Biene, bleibt aber gut verständlich.
    af = ["-af", f"asetrate={RATE}*1.12,aresample={RATE},atempo=0.94"] if biene else []
    ffmpeg("-i", wav, *af, "-ac", "1", "-ar", str(RATE), "-c:a", "libmp3lame", "-b:a", "64k", mp3)


# ---------- Hauptprogramm ----------
def process(files, saetze, out_web, report_path, words_file=None):
    prompt = "Summi die Rechenbiene. " + " ".join(s["text"] for s in saetze[:12])
    preset = json.load(open(words_file)) if words_file else {}
    work = tempfile.mkdtemp()
    per_file, data = [], []
    for path in files:
        name = os.path.basename(path)
        raw = load(path)
        floor = float(np.percentile(levels(raw), 10))
        nf = int(max(-80, min(-25, floor + 3)))
        y = load(path, f"highpass=f=75,lowpass=f=12000,afftdn=nf={nf}:tn=1")
        y_levels = levels(y)
        y_floor = float(np.percentile(y_levels, 10))
        if words_file:
            words = [tuple(w) for w in preset[name]]
        else:
            wav16 = os.path.join(work, "asr.wav")
            ffmpeg("-i", path, "-ac", "1", "-ar", "16000", wav16)
            words = transcribe(wav16, prompt)
        chunks = chunks_from(words, levels(raw), floor)
        found = find_sentences(chunks, saetze)
        per_file.append(found)
        data.append((name, y, y_levels, y_floor, chunks))
        print(f"{name}: {len(raw) / RATE:.0f} s, {len(words)} Wörter, {len(chunks)} Stücke, Grundrauschen {floor:.0f} dB")

    chosen, by_id = choose(per_file)

    for variant in ("natur", "biene"):
        shutil.rmtree(os.path.join(out_web, variant), ignore_errors=True)
        os.makedirs(os.path.join(out_web, variant))
    clips = []
    for s in saetze:
        c = chosen.get(s["id"])
        if not c:
            continue
        name, y, y_levels, y_floor, chunks = data[c["datei"]]
        clip = polish(cut(y, y_levels, y_floor, chunks, c), y_floor)
        wav = os.path.join(work, "satz.wav")
        save_wav(wav, clip)
        encode(wav, os.path.join(out_web, "natur", f"{s['id']}.mp3"))
        encode(wav, os.path.join(out_web, "biene", f"{s['id']}.mp3"), biene=True)
        clips.append([s["id"], s["text"], round(len(clip) / RATE, 2)])
        c["datei_name"], c["dauer"] = name, len(clip) / RATE
    shutil.rmtree(work, ignore_errors=True)

    with open(os.path.join(out_web, "stimme.js"), "w", encoding="utf-8") as f:
        f.write("// Automatisch erzeugt von app/stimme/verarbeiten.py aus den Aufnahmen in stimme-aufnahmen/. Nicht von Hand ändern.\n")
        f.write("window.RW_STIMME = " + json.dumps({"clips": clips}, ensure_ascii=False) + ";\n")

    missing = [s for s in saetze if s["id"] not in chosen]
    unsure = [s for s in saetze if s["id"] in chosen and chosen[s["id"]]["score"] < CHECK]
    lines = ["# Summis Stimme: Bericht", "",
             f"**{len(chosen)} von {len(saetze)} Sätzen** sind aufgenommen und bearbeitet. "
             "Fehlende Sätze spricht weiter die Computerstimme.", ""]
    if unsure:
        lines += ["## Bitte einmal anhören", "", "Diese Sätze wurden nicht ganz sicher erkannt:", "",
                  "| Nr. | Satz | Gehört | Aufnahme |", "|---|---|---|---|"]
        lines += [f"| {s['id']} | {s['text']} | {chosen[s['id']]['gehoert']} | {chosen[s['id']]['datei_name']} |" for s in unsure]
        lines.append("")
    if missing:
        blocks = sorted({s["block"] for s in saetze})
        empty = [b for b in blocks if all(s["id"] not in chosen for s in saetze if s["block"] == b)]
        if empty:
            lines += ["## Noch nicht aufgenommen", "", "Blöcke: " + ", ".join(str(b) for b in empty), ""]
        single = [s for s in missing if s["block"] not in empty]
        if single:
            lines += ["## Einzelne Sätze fehlen", "", "| Nr. | Block | Satz | Ähnlichster Versuch |", "|---|---|---|---|"]
            for s in single:
                near = max(by_id.get(s["id"], []), key=lambda c: c["score"], default=None)
                hint = f"„{near['gehoert']}“ ({near['score']:.0%})" if near else "nicht gefunden"
                lines.append(f"| {s['id']} | {s['block']} | {s['text']} | {hint} |")
            lines.append("")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Fertig: {len(chosen)} von {len(saetze)} Sätzen, {len(unsure)} unsicher, {len(missing)} fehlen.")
    return chosen


def selftest(saetze):
    """Prüft den ganzen Ablauf mit einer Computerstimme: mit Versprecher, Wiederholung und Rauschen."""
    tmp = tempfile.mkdtemp()
    pick = [s for s in saetze if s["block"] in (1, 2, 5)]
    parts = []
    for n, s in enumerate(pick):
        if n == 3:   # Versprecher: falscher Anfang, dann der ganze Satz nochmal
            parts.append("Hallo, ich bin Sum")
        parts.append(s["text"])
    for n, text in enumerate(parts):
        subprocess.run(["espeak-ng", "-v", "de", "-s", "150", "-w", os.path.join(tmp, f"{n:03}.wav"), text], check=True)
    listing = os.path.join(tmp, "liste.txt")
    with open(listing, "w") as f:
        for n in range(len(parts)):
            f.write(f"file '{n:03}.wav'\nfile 'pause.wav'\n")
    ffmpeg("-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", "1.1", os.path.join(tmp, "pause.wav"))
    joined = os.path.join(tmp, "joined.wav")
    ffmpeg("-f", "concat", "-safe", "0", "-i", listing, "-ar", "22050", "-ac", "1", joined)
    rec = os.path.join(tmp, "Aufnahme 1.m4a")   # wie vom Handy: komprimiert und mit leisem Rauschen
    ffmpeg("-i", joined, "-f", "lavfi", "-i", "anoisesrc=a=0.004:c=pink:r=22050", "-filter_complex",
           "[0][1]amix=inputs=2:duration=first:normalize=0", "-c:a", "aac", "-b:a", "96k", rec)
    out = os.path.join(tmp, "web")
    os.makedirs(out)
    chosen = process([rec], saetze, out, os.path.join(tmp, "bericht.md"))
    print(open(os.path.join(tmp, "bericht.md")).read())
    hit = sum(1 for s in pick if s["id"] in chosen)
    wrong = [s["id"] for s in saetze if s["id"] in chosen and s not in pick]
    print(f"Selbsttest: {hit} von {len(pick)} Sätzen gefunden, falsch zugeordnet: {wrong or 'keine'}")
    durs = [chosen[s["id"]]["dauer"] for s in pick if s["id"] in chosen]
    assert hit >= len(pick) * 0.85, "Zu wenige Sätze erkannt"
    assert not wrong, "Sätze gefunden, die gar nicht gesprochen wurden"
    assert all(0.4 < d < 12 for d in durs), f"Seltsame Längen: {durs}"
    print("Selbsttest bestanden.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--selbsttest", action="store_true")
    ap.add_argument("--woerter", help="Erkannte Wörter aus einer JSON-Datei statt Whisper (zum Testen)")
    ap.add_argument("--aufnahmen", default=os.path.join(ROOT, "stimme-aufnahmen"))
    ap.add_argument("--ausgabe", default=os.path.join(ROOT, "lernapp", "stimme"))
    args = ap.parse_args()
    saetze = json.load(open(os.path.join(HERE, "sprechliste.json"), encoding="utf-8"))["saetze"]
    if args.selbsttest:
        return selftest(saetze)
    # Natürlich sortiert ("Aufnahme 2" vor "Aufnahme 10"), damit spätere Aufnahmen frühere verbessern
    natural = lambda f: [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", f)]
    files = [os.path.join(args.aufnahmen, f) for f in sorted(os.listdir(args.aufnahmen), key=natural) if f.lower().endswith(AUDIO)]
    if not files:
        sys.exit("Keine Aufnahmen in stimme-aufnahmen/ gefunden.")
    os.makedirs(args.ausgabe, exist_ok=True)
    process(files, saetze, args.ausgabe, os.path.join(HERE, "bericht.md"), args.woerter)


if __name__ == "__main__":
    main()
