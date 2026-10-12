"""A recorded take -> the words in it, with the second each one starts and ends.

Used only by `split.mjs`, which needs to know where each numbered line sits in
a continuous take. Nothing here decides anything; the matching is in
`align.mjs`.

    python tools/video/engine/transcribe.py take.wav out.json [--model small.en]

The default model is `small.en`, not `base.en`. The smaller one is twice as
fast and it silently drops text: on the Treasury take it ended a line four
words early, which reads downstream as "he never finished that line" and is
wrong. Transcription here is a measuring instrument, so it is worth the time.

Requires `faster-whisper`. The model is fetched once and cached by the library.
"""
import argparse
import json
import sys


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("wav")
    ap.add_argument("out")
    ap.add_argument("--model", default="small.en")
    args = ap.parse_args()

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("faster-whisper is not installed: pip install faster-whisper", file=sys.stderr)
        return 2

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    # vad_filter off on purpose: the voice-activity filter drops quiet line
    # endings, and a dropped ending is indistinguishable downstream from a line
    # the reader abandoned.
    segments, _info = model.transcribe(
        args.wav, word_timestamps=True, vad_filter=False, beam_size=5, language="en"
    )

    words = []
    for seg in segments:
        for w in seg.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)})

    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump({"model": args.model, "words": words}, fh)
    print(f"{len(words)} words -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
