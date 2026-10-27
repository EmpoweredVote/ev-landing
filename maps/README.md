# maps/

Three standalone pages, served at `empowered.vote/maps/`. The profile menu's **Mind Map**
row points at `purpose-map.html`.

## purpose-map.html is GENERATED — do not edit it here

Its source lives in a **separate local repo**, `C:\Strategy\tools\purpose-map\`, and a
rebuild overwrites whatever is in this folder. Edit there, build, copy the result back:

```
cd C:/Strategy/tools/purpose-map
node build.js                                   # writes purpose-map.html beside the source
cp purpose-map.html C:/ev-landing/ev-landing-main/maps/purpose-map.html
```

Then commit the source files in Strategy (local, no remote) and the built file here.

The pieces, all in that folder: `map-data.json` is the tree, `explainers.js` the per-node
pages, `tmpl.html` the engine and all the styling, `build.js` the merge. The build also
inlines **this repo's `leremy-rig.js`**, so the map's little mascot picks up rig changes
on the next rebuild and nowhere else.

### It reads this repo's films

Each of Essentials, Compass and the Treasury Tracker has an **Explainer** node that opens
the feature's film over the map, from `../video/<key>.mp4` — the same three files the play
buttons on the landing page use, one directory up from here. A feature gets a node only
once its film is shipped in `video/`; a node with nothing behind it opens a player on a
broken source. See the Strategy repo's README for how to add one.

## The other two

- `empowered-vote-map.html` — the big MindMeister-derived map. No build tool; the file is
  the source. It was never themed, and nothing links to it.
- `purpose-deck.html` — the slide version of the same material.
