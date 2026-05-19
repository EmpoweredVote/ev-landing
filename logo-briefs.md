# EV Tool Logo Design Briefs

## Brand context

**Colors**
| Name   | Hex       | Role |
|--------|-----------|------|
| Teal   | `#00657C` | Trust, civic authority, information |
| Coral  | `#FF5740` | Urgency, money, accountability |
| Yellow | `#FED12E` | Energy, discovery, action |

**Style** — Geometric, flat-forward, minimal. Clean shapes, consistent stroke weight across the set. No gradients. No photorealism. Each mark should read clearly at 32×32px and still carry character at 120×120px.

**Set rule** — All four logos share the same visual grammar: a single icon mark (no wordmark needed) inside an implicit square canvas. Think of them as a product icon family, the way iOS app icons feel related even across different apps.

---

## How to use these briefs with Claude

1. Open a new Claude conversation (or Claude Code session)
2. Paste the brand context block above, then paste the individual logo brief below
3. Ask for an **SVG** output — Claude can write clean, editable SVG directly
4. Iterate: ask to "make the stroke heavier," "shift the color to coral," "simplify to fewer paths," etc.
5. Once you're happy with each SVG, save it to `/icons/` and drop it into the card's `.card-glyph` area

**Starter prompt template:**
```
You are a logo designer working on a civic-tech product icon family.
Brand colors: Teal #00657C, Coral #FF5740, Yellow #FED12E.
Style: geometric, flat, minimal. Single icon mark. Must read at 32px. No gradients. No wordmark.

[paste the brief for one logo here]

Output a clean, hand-editable SVG at 120×120px viewBox.
```

---

## Logo 01 — Essentials

**What it does:** Enter your address, see who represents you, where their money comes from, and what they've voted for.

**Concept direction:** A person silhouette (simple, gender-neutral) centered inside a location pin outline. The person *is* the pin — civic identity grounded in place. Alternatively: a layered stack of three horizontal bars (representing data) with a small teal circle at the top-left, suggesting a face/profile.

**Primary color:** Teal `#00657C`
**Accent:** Yellow `#FED12E` (small accent only — a dot, a highlight line)

**Mood:** Trustworthy, civic, grounded. This is the entry point — it should feel like a welcome mat.

**Avoid:** Anything that looks like a party symbol, a ballot, or a government seal.

**Sample prompt addition:**
> Icon for "Essentials" — a civic data tool that shows who represents you. A simplified person/silhouette inside a location pin shape. Primary teal, yellow accent dot. Geometric and flat.

---

## Logo 02 — Compass

**What it does:** You rank where you stand on key issues; Compass shows how your positions compare to politicians on the same scale.

**Concept direction:** A four-pointed star or compass rose, but simplified to clean geometry — not a nautical compass. The cardinal points should feel balanced, not pointing left or right. Alternatively: two overlapping circles (Venn-like) with a shared center dot, suggesting comparison and alignment.

**Primary color:** Yellow `#FED12E`
**Accent:** Teal `#00657C` (one or two points, or the center dot)

**Mood:** Navigational, balanced, exploratory. The whole point of this tool is that it doesn't take sides — the mark should feel equally weighted in all directions.

**Avoid:** An actual compass needle pointing a direction. Anything that reads as a political arrow or a partisan symbol.

**Sample prompt addition:**
> Icon for "Compass" — a civic issue-alignment tool. A balanced four-pointed star or compass rose, strictly symmetrical. Primary yellow, teal accent on one or two details. Geometric, no implied direction.

---

## Logo 03 — Treasury Tracker

**What it does:** Explore municipal budgets line by line — what your city actually spends, and how it shifts year over year.

**Concept direction:** A simplified bar chart or stacked columns inside a thin coin/circle outline. Or: a magnifying glass where the lens contains a small dollar sign rendered as clean geometry (not a currency glyph — think two horizontal bars with a vertical bar through them). The circle-and-bars combination reads as both "money" and "data."

**Primary color:** Coral `#FF5740`
**Accent:** Yellow `#FED12E` (one highlighted bar in the chart, or the lens rim)

**Mood:** Investigative, transparent, slightly urgent. This tool is about accountability — the mark should feel like something being examined.

**Avoid:** A bank building, a vault, a literal wallet. Anything that looks like it belongs to a financial services company.

**Sample prompt addition:**
> Icon for "Treasury Tracker" — a municipal budget transparency tool. A magnifying glass with a simplified bar chart (3 bars, varying heights) inside the lens. Primary coral, yellow accent on the tallest bar. Geometric, flat.

---

## Logo 04 — Civic Trivia Championships

**What it does:** Learn civics through competitive trivia — questions about how government works, who represents you, and how decisions get made.

**Concept direction:** A laurel wreath (classic competition symbol) reduced to just a few leaves on each side — geometric, not decorative — framing a small five-pointed star or a bold question mark rendered as clean geometry. The wreath makes it feel earned; the star/question mark keeps it light.

**Primary color:** Teal `#00657C`
**Accent:** Yellow `#FED12E` (the center star or question mark, or the wreath tips)

**Mood:** Playful but civic. This is the fun one — it can have a little more personality than the others while still sharing the family's clean geometry.

**Avoid:** A graduation cap, a microphone, anything that reads as a quiz-show buzzer. It should feel competitive and civic, not academic or gameshow-y.

**Sample prompt addition:**
> Icon for "Civic Trivia Championships" — a competitive civic-knowledge game. A simplified geometric laurel wreath (3–4 leaf shapes per side) framing a five-pointed star. Primary teal, yellow star. Clean geometry, slightly more character than the other marks in the set.

---

## Iteration tips

- **Simplify first** — ask Claude to "reduce to the fewest possible paths while keeping the concept readable"
- **Test at 32px** — paste the SVG into a browser at `width="32" height="32"` and check legibility
- **Check the set** — once you have all four, lay them side by side and ask Claude to "adjust [logo X] so the stroke weight matches the others"
- **Dark mode** — the SVGs will sit on `var(--card)` backgrounds in both light (`#FFFFFF`) and dark (`#1C1C1F`) mode; make sure the marks are visible on both
