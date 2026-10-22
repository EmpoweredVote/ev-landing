# Explainer films

The two films the home page plays in its lightbox: the play triangle beside the
Essentials and Compass tiles in the hero. They are served from this site, not
from YouTube, so that nothing reaches Google before a visitor asks for it — the
same reason the talk thumbnails are local (see `talks/README.md`).

| File | What it is |
|---|---|
| `compass.mp4` | Empowered Compass, 5:06 |
| `essentials.mp4` | Empowered Essentials, 5:25 |
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

About 16 MB in the repository, and git keeps every version of a file forever —
a new cut committed here is another whole copy, because video does not store as
a difference. Replace a film only when it is settled.

Nothing downloads until a visitor presses play (`preload="none"`), so pageviews
cost no bandwidth. A full play is about 7-9 MB against the Render workspace's
monthly allowance, which is shared with every other Empowered Vote service.

## Treasury

Episode 3 is built and is not here, because it has not been called public. When
it is: encode it the same way, drop the files in beside these, and add one more
`data-film` row in `index.html`.
