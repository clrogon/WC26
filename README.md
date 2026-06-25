# World Cup 26 — Live Dashboard

A single-file React dashboard for the 2026 FIFA World Cup (Canada · Mexico · USA). Computes group standings, third-place race, and knockout bracket entirely in-browser from match results. Pulls live scores via the Claude API web-search tool, with an openfootball.json fallback.

## Features

| Feature | Detail |
|---------|--------|
| **Live scores** | Refreshes via Claude API (`claude-sonnet-4-6` + `web_search`) |
| **Standings engine** | Points → GD → GF → mini-league tiebreaker per FIFA rules |
| **Third-place race** | Ranks all 12 group-3 finishers; top 8 advance to R32 |
| **Knockout bracket** | Resolves group/match winners recursively through all rounds |
| **Share cards** | Canvas-rendered PNG cards (1080×1080 / 1080×1350) via `navigator.share` or modal |
| **Timezone** | All times displayed in Luanda WAT (UTC+1) |
| **Snapshot fallback** | Embedded match data works fully offline |

## Quick start

```bash
# Any static-file dev server works — it's a single JSX file
npx vite          # or
npx serve .
```

The component is a default export from `WC26.jsx` — drop it into any React + Vite project and render `<App />`.

## Live score refresh

Refresh calls the Anthropic API directly from the browser. You need an API key with the `web_search` tool enabled (Anthropic Console → API keys).

**Setting your key (two options):**

1. **UI** — tap the 🔑 icon in the header, paste your key. It is saved to `localStorage` under `wc26_api_key` and never sent anywhere except `api.anthropic.com`.
2. **Env** — set `window.ANTHROPIC_API_KEY` before the component mounts (e.g. in your HTML `<script>` tag).

If no key is set, the app falls back to the openfootball GitHub source, then to the embedded snapshot.

> **Security note:** API keys stored in `localStorage` are readable by any JS on the same origin. Use this for personal/local use only. For a production deploy, proxy the API call through a backend.

## Data sources

| Priority | Source | Notes |
|----------|--------|-------|
| 1 | Claude API + web search | Requires `x-api-key`; returns structured JSON merged into snapshot |
| 2 | `openfootball/worldcup.json` (GitHub raw) | Public domain; may lag by hours |
| 3 | Embedded `SNAPSHOT` | Bundled in `WC26.jsx`; updated manually |

The status indicator in the header shows **Live** (green pulse), **Updating…** (gold), or **Snapshot** (grey).

## Updating the snapshot

When the openfootball source is unavailable and you want to bake in new results, edit the `SNAPSHOT` constant at the top of `WC26.jsx` and bump `DATA_AS_OF` to today's date (`YYYY-MM-DD`). The stale-data banner fires when `DATA_AS_OF` is ≥ 1 day behind today.

## Architecture

```
WC26.jsx  (single file, ~830 lines)
│
├── Data layer
│   ├── SNAPSHOT          — embedded match objects (group + knockout)
│   ├── refresh()         — fetch → mergeResults() → setData(prev=>…)
│   └── mergeResults()    — reconciles web-search JSON into current state
│
├── Compute (pure functions, no side-effects)
│   ├── computeGroups()   — builds W/D/L/GF/GA/GD/Pts rows per group
│   ├── breakTies()       — mini-league tiebreaker for equal Pts+GD+GF
│   ├── computeThirds()   — ranks all group-3 finishers
│   └── buildResolver()   — resolves bracket token (e.g. "W74") → team name
│
├── UI components
│   ├── GroupsTab         — 12 group tables + third-place race
│   ├── FixturesTab       — date-grouped fixtures with group filter chips
│   ├── BracketTab        — horizontally scrolling knockout bracket
│   ├── RulesTab          — format and tiebreaker explainer
│   ├── TodayStrip        — horizontal card strip for today's matches
│   └── MatchDetail       — modal with goalscorers + share/search links
│
└── Canvas share system
    ├── drawStandings()   — 1080×1350 all-group overview card
    ├── drawMatch()       — 1080×1080 single match card
    ├── drawGroup()       — 1080×720 single group card
    ├── drawToday()       — 1080×1080 today's matches card
    └── drawThirds()      — 1080×1080 third-place race card
```

## Known limitations

- **Tiebreaker simplification:** after mini-league results, FIFA uses disciplinary points then drawing of lots. This dashboard falls back to alphabetical order.
- **Third-place slot assignment:** FIFA's combination table (which groups supply which R32 slot) is not computed — the bracket shows the correct 8 qualifiers but not their specific slot assignments until all 12 groups are complete.
- **Canvas emoji rendering:** flag emoji on canvas may render as boxes on systems without full emoji font support.

## License

Match data: [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) — public domain.  
Dashboard code: MIT.
