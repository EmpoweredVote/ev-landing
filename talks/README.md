# Talk thumbnails

The four pictures in the "03 / Talks" row on the home page.

They used to be fetched from `img.youtube.com` when the page loaded. That told
Google the IP address of every visitor, before anyone clicked anything. It did
not tell Google which page they were on: `render.yaml` sets `Referrer-Policy:
strict-origin-when-cross-origin`, so only the site's origin was sent. These
files are served from our own site instead, so nothing reaches Google until a
visitor opens a talk.

Google Fonts is still loaded on every page, and PostHog still loads its own
script. Those are separate from this.

| File | Talk | Video |
|---|---|---|
| `nonpartisan-civic-tools.jpg` | 01 | `yTXb3di5-II` |
| `cost-of-being-informed.jpg` | 02 | `xTud12rLWIo` |
| `people-before-parties.jpg` | 03 | `El68xH5sd2Y` |
| `values-seen-through-sacrifice.jpg` | 04 | `dzlx9vpkVY4` |

All four are 960x540. The card is at most 394 CSS pixels wide, which is 788
real pixels on a 2x screen, so 960 covers every size the page asks for without
carrying a 1280x720 file for each one.

Talks 01 to 03 come from each video's `maxresdefault.jpg`, which is the full
size copy of the thumbnail that was uploaded. Talk 04 comes from the original
PNG instead, so it never passed through YouTube's encoder.

To rebuild one:

    curl -o src.jpg https://img.youtube.com/vi/<VIDEO_ID>/maxresdefault.jpg
    ffmpeg -y -i src.jpg -vf "scale=960:540:flags=lanczos" \
      -pix_fmt yuvj420p -q:v 3 talks/<name>.jpg

A video with no custom thumbnail has no `maxresdefault.jpg`. Use
`sddefault.jpg` (640x480) in that case, and expect it to be cropped: only
`maxresdefault` is 16 by 9. The others are 4 by 3 with black bars, which the
card's `object-fit: cover` then has to cut away.

Changing a thumbnail on YouTube does NOT change the file here. Rebuild it.
