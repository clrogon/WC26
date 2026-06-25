# World Cup 26 — Live Dashboard

A single-file React component (`WC26.jsx`) that displays live standings, fixtures, and the knockout bracket for the 2026 FIFA World Cup (Canada · Mexico · USA). All standings computation runs in-browser from raw match results; no backend required.

**Tournament status (as of snapshot):** Group stage Matchday 15 in progress — Groups A–C complete (MD 14 played 24 Jun), Groups D/E/F playing today (25 Jun), Groups G–L finish 26–27 Jun. Round of 32 begins 28 Jun.

---

## Features

| Feature | Detail |
|---------|--------|
| **Live scores** | Refreshes via Claude API (`claude-sonnet-4-6` + `web_search` tool) |
| **Standings engine** | Points → GD → GF → mini-league tiebreaker per FIFA rules |
| **Third-place race** | Ranks all 12 group-3 finishers; top 8 advance to Round of 32 |
| **Knockout bracket** | Recursively resolves group/match winners through all rounds |
| **Share cards** | Five canvas-rendered PNG cards (1080×1080 / 1080×1350 / 1080×720) via `navigator.share` or modal fallback |
| **Timezone** | All kickoff times displayed in Luanda WAT (UTC+1) |
| **Offline fallback** | Embedded snapshot data — works fully without network |

---

## Quick start

### Vite (recommended)

```bash
npm create vite@latest wc26-app -- --template react
cd wc26-app
cp /path/to/WC26.jsx src/App.jsx
npm install
npm run dev
```

### Any static dev server

```bash
# serve as-is if your toolchain handles JSX
npx serve .
```

`WC26.jsx` has no dependencies beyond React. It is a self-contained default export — import it and render `<App />`.

---

## Live score refresh

On load and on tap of the **Refresh** button, the app tries three paths in order:

| Priority | Source | Requires |
|----------|--------|---------|
| 1 | **Claude API + web search** | Anthropic API key (see below) |
| 2 | **openfootball/worldcup.json** (GitHub raw) | Network; may lag by hours |
| 3 | **Embedded snapshot** | Nothing — always available |

The status dot in the header shows:
- 🟢 **Live** — successfully refreshed from API or openfootball
- 🟡 **Updating…** — refresh in progress
- ⚪ **Snapshot** — showing embedded data (refresh failed or not yet attempted)

A **stale banner** appears whenever the snapshot date (`DATA_AS_OF`) is ≥ 1 day behind today's date in Luanda (WAT).

### Setting your Anthropic API key

You need an API key with the `web_search` tool permitted (create one at [console.anthropic.com](https://console.anthropic.com)).

**Option 1 — UI (recommended for personal use)**

Tap the 🔑 icon in the header, paste your key, tap **OK**. The key is saved to `localStorage` under `wc26_api_key` and sent only to `api.anthropic.com`.

**Option 2 — Script tag**

```html
<script>window.ANTHROPIC_API_KEY = "sk-ant-...";</script>
```

> **Security:** `localStorage` keys are readable by any JS on the same origin. For a shared/production deployment, proxy the API call through a backend and never expose the key client-side.

---

## Updating the embedded snapshot

The snapshot (`SNAPSHOT` constant in `WC26.jsx`) is a JSON object matching the [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json/blob/master/2026/worldcup.json) schema.

**To bake in new results manually:**

1. Copy fresh JSON from the openfootball source (or construct it yourself).
2. Replace the `SNAPSHOT` value at line 19 of `WC26.jsx`.
3. Bump `DATA_AS_OF` (line 16) to today's ISO date (`"YYYY-MM-DD"`).

**Match object shape:**

```jsonc
{
  "round": "Matchday 1",         // display label
  "num": 73,                     // knockout matches only; used for bracket resolution
  "date": "2026-06-11",
  "time": "13:00 UTC-6",
  "team1": "Mexico",
  "team2": "South Africa",
  "score": { "ft": [2, 0], "ht": [1, 0] },   // omit if unplayed
  "goals1": [{ "name": "Julián Quiñones", "minute": "9" }],
  "goals2": [],
  "group": "Group A",            // omit for knockout rounds
  "ground": "Mexico City",
  "src": "web"                   // set by the refresh path; marks result as unverified
}
```

---

## Architecture

```
WC26.jsx  (~830 lines, zero external dependencies)
│
├── Constants & lookup tables
│   ├── SOURCE_URL     — openfootball fallback URL
│   ├── DATA_AS_OF     — snapshot freshness date (YYYY-MM-DD)
│   ├── COOLDOWN_MS    — minimum ms between manual refreshes (20 000)
│   ├── LS_KEY         — localStorage key for the API key ("wc26_api_key")
│   ├── SNAPSHOT       — full match list (group + knockout skeleton)
│   ├── FLAGS          — team name → flag emoji
│   ├── CODE3          — team name → 3-letter code
│   └── ALIAS          — alternate spellings → canonical name
│
├── Pure compute functions (no React, no side effects)
│   ├── computeGroups(matches)
│   │     Builds W/D/L/GF/GA/GD/Pts row per team per group; calls breakTies()
│   ├── breakTies(matches, group, rows)
│   │     Identifies tied blocks and re-ranks via mini-league
│   ├── miniLeague(matches, group, teams)
│   │     Head-to-head sub-table for a tied block
│   ├── computeThirds(groupTables)
│   │     Collects position-3 team from each group, sorts by Pts→GD→GF
│   └── buildResolver(matches, groupTables)
│         Returns resolve(token) — converts e.g. "1A", "W74", "L101" → team name
│
├── App component (state + refresh logic)
│   ├── data / setData          — full match array (starts from SNAPSHOT)
│   ├── status                  — "snapshot" | "loading" | "live" | "error"
│   ├── apiKey / setApiKey      — from localStorage; drives 🔑 UI
│   ├── refresh(auto)           — useCallback; tries API → openfootball → snapshot
│   └── mergeResults(currentMatches, arr)
│         Reconciles web-search JSON array into current match state;
│         counts filled (new) vs corrected (changed) results
│
├── UI components
│   ├── TodayStrip     — horizontal scroll card strip for today's group matches
│   ├── GroupsTab      — 12 GroupCards + ThirdPlaceRace
│   ├── FixturesTab    — date-grouped fixtures, filterable by group or knockout
│   ├── BracketTab     — horizontally scrollable knockout bracket (R32 → Final)
│   ├── RulesTab       — tournament format + tiebreaker rules explainer
│   ├── MatchDetail    — modal: scorers, time/venue, share button, Google search link
│   └── ShareModal     — shows generated PNG; native share or long-press to save
│
└── Canvas share system (five card types, all async)
    ├── drawStandings(gt, played, total, dataAsOf, unverified)
    │     1080×1350 — all 12 group tables, top-2 per group highlighted
    ├── drawMatch(m, resolve, dataAsOf)
    │     1080×1080 — single match with score, goalscorers, venue
    ├── drawGroup(g, rows, dataAsOf)
    │     1080×720  — single group full standings table
    ├── drawToday(matches, resolve, dataAsOf)
    │     1080×1080 — all of today's fixtures/results
    └── drawThirds(thirds, dataAsOf)
          1080×1080 — third-place race, qualification cut-line at position 8
```

---

## Tournament schedule reference

| Dates | Round | Groups |
|-------|-------|--------|
| 11–17 Jun | Matchday 1 (MD 1–7) | A–L (one per day) |
| 18–21 Jun | Matchday 2 (MD 8–11) | A–D, then E–H, then I–L |
| 22–25 Jun | Matchday 3 (MD 12–15) | concurrent pairs |
| 26–27 Jun | Matchday 3 (MD 16–17) | G–L |
| 28 Jun – 3 Jul | Round of 32 | 16 ties |
| 4–7 Jul | Round of 16 | |
| 9–11 Jul | Quarter-finals | |
| 14–15 Jul | Semi-finals | |
| 18 Jul | Third-place match | Miami (Miami Gardens) |
| **19 Jul** | **Final** | **MetLife Stadium, NJ** |

---

## Known limitations

- **Tiebreaker fallback:** FIFA's step 5+ (disciplinary record, drawing of lots) is not implemented — the dashboard falls back to alphabetical order after mini-league.
- **Third-place slot assignment:** FIFA uses a combination table to assign specific R32 slots to the 8 best third-placed teams. This is not computed — the bracket shows the correct qualifiers but slot assignments remain as `3X/Y/Z` placeholders until all 12 groups complete.
- **Canvas emoji flags:** Flag emoji on `<canvas>` may render as empty boxes on systems without a full color-emoji font (Linux without `noto-fonts-emoji` or similar).
- **API key in localStorage:** Suitable for personal/local use only. For shared deploys, proxy the API call server-side.

---

## Changelog

### v3.1 — 2026-06-25
- **Fix:** Added `x-api-key` + `anthropic-dangerous-direct-browser-access` headers to the Anthropic API call — the web-search refresh path was silently 401-ing on every load.
- **Fix:** `mergeResults` now takes `currentMatches` as a parameter instead of closing over the stale outer `matches` variable.
- **Fix:** `setData` uses a functional updater `prev => …` to avoid overwriting concurrent state changes.
- **Fix:** `refresh` wrapped in `useCallback`; concurrent calls short-circuit on `status === "loading"`.
- **Fix:** Stale-data banner threshold lowered from `ageDays >= 2` to `ageDays >= 1`.
- **Fix:** `drawStandings` canvas card now calls `dFooter()` for consistent branding (was the only card without it).
- **Fix:** `drawThirds` qualification cut-line now renders mid-tournament even when fewer than 8 groups have played.
- **Fix:** Today strip no longer shows unresolved knockout placeholders (e.g. "W74 vs W77").
- **Fix:** `extractArray` regex made more precise to avoid capturing nested arrays inside the API response envelope.
- **Add:** 🔑 API-key toggle in the header — saves to `localStorage`; checks `window.ANTHROPIC_API_KEY` as fallback.
- **Update:** `DATA_AS_OF` bumped to `2026-06-25`.

---

## License

Match data: [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) — public domain.  
Dashboard code: MIT.
