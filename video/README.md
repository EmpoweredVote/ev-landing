# Explainer films

The four films the home page plays in its lightbox: the play triangle beside the
Essentials, Compass, Treasury Tracker and Civic Trivia Championships tiles in the
hero. They are served from
this site, not from YouTube, so that nothing reaches Google before a visitor asks
for it — the same reason the talk thumbnails are local (see `talks/README.md`).

| File | What it is |
|---|---|
| `compass.mp4` | Empowered Compass, 5:06 |
| `essentials.mp4` | Empowered Essentials, 5:25 |
| `treasury.mp4` | Treasury Tracker, 5:10 |
| `ctc.mp4` | Civic Trivia Championships, 3:13 |
| `*.vtt` | captions, which is why the browser offers a CC control at all |
| `*.jpg` | the poster frame, so the box is not black before play |

## Rebuilding a film

The master is the built cut in `tools/video/build/<episode>/`. Do not commit that
file: it is 1080p with the voice at 162 kbps and runs 14-17 MB. These copies are
720p, which is all the lightbox asks for at its widest, and the voice at 64 kbps
mono, which is plenty for one person speaking.

```bash
ffmpeg -y -i tools/video/build/essentials/Essentials_v1.mp4 \
  -vf "scale=1280:720:flags=lanczos" \
  -c:v libx264 -crf 24 -preset medium -tune animation -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 64k -ac 1 \
  -movflags +faststart video/essentials.mp4
```

Treasury and Civic Trivia have no `_v1.mp4` to point that command at. Compass and
Essentials were exported from Resolve; the other two never left the pipeline, so
each of their masters is two files and the encode takes both:

```bash
ffmpeg -y -i tools/video/build/treasury/treasury-silent.mp4 \
  -i tools/video/build/treasury/vo-synced.wav \
  -map 0:v:0 -map 1:a:0 \
  -vf "scale=1280:720:flags=lanczos" \
  -c:v libx264 -crf 24 -preset medium -tune animation -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 64k -ac 1 \
  -movflags +faststart video/treasury.mp4
```

Civic Trivia is the same command with `ctc` in place of `treasury`.

That is not a shortcut past a mix. `vo-synced.wav` is the real read — cut out of
Chris's take by `split.mjs` and resynced to the locked picture by the build — and
the only level change anywhere in it is the single gain that lifts the loudest
take to -3 dBFS. Measured against the two that did go through Resolve, Treasury is
in family: mean -27.7 dBFS and peak -3.0, against -28.4/-3.9 for Compass and
-26.6/-3.1 for Essentials. If either is ever given a mix pass, re-encode from that
export and this paragraph comes out.

**Civic Trivia is cut at `--peak -1.2`, not the default -3.** That is what puts it
in family at mean -27.7 dBFS and peak -3.0, which is Treasury's number exactly.
`split.mjs` lifts the loudest point of the whole TAKE to the peak it is given, and
on DJI_42 that point is not inside any line the film uses, so the default left the
finished track at -29.5 and -4.8 — about 1.8 dB under the other three, which is
audible because the lightbox never changes level between films. Re-cut that
episode WITH THE FLAG or the levels revert and nothing says so: the cut points
come out identical either way, so the re-split report stays silent about it.
`tools/video/episodes/ctc/cuts.json` carries the same warning, which is the copy
that is in reach when somebody is re-cutting.

`-tune animation` is not decoration. These films are flat drawn shapes, and it
tells x264 to spend its bits on clean edges rather than on grain that is not
there. `+faststart` puts the index at the front of the file so the browser can
begin playing without fetching the whole thing.

Re-encoding the picture buys less than it looks. The masters are already about
200 kbps, so most of what comes off is the voice track. Going from 1080p to 720p
took the pair from 22.7 MB to 16.2 MB; leaving the picture alone and dropping
only the audio would have been 22.7 MB.

## Captions

`tools/video/make-captions.mjs` writes them from the real read, so they never
show a word the recogniser misheard:

```bash
node tools/video/make-captions.mjs tools/video/episodes/essentials
cp tools/video/build/essentials/essentials.vtt video/essentials.vtt
```

Re-run it after any re-split, or the captions drift against the new timing.

## Posters

Cut down from the share cards in `tools/video/thumbnails/`, which are generated:

```bash
ffmpeg -y -i tools/video/thumbnails/empowered-essentials-1280x720.png \
  -q:v 4 video/essentials.jpg
```

## What this costs

About 29 MB in the repository, and git keeps every version of a file forever —
a new cut committed here is another whole copy, because video does not store as
a difference. Replace a film only when it is settled.

Nothing downloads until a visitor presses play (`preload="none"`), so pageviews
cost no bandwidth. A full play is about 4-9 MB against the Render workspace's
monthly allowance, which is shared with every other Empowered Vote service.

## The one that is not here yet

Read & Rank has a finished script and finished artwork in `tools/video/episodes/`
and has not been recorded. Nothing reaches this directory until there is a take to
cut. When it is ready: encode it the same way, drop the three files in beside
these, add it to `FILMS` in `index.html`, wrap its tile in a `.tool-row` with a
play triangle, and add its key to `FILMS` in
`tests/layout/explainer-lightbox.cjs` — that test counts the triangles, so it
fails until the markup and the registry agree.
