# CLAUDE.md

> **Keep this file up to date.** If you change the architecture, the data model, the folder layout, the tooling, or any of the conventions below, update this file in the same change. It is the first thing a new person or a future Claude session reads, and a stale version is worse than none.

## What this is

**Puzzle Tracker** — a personal app for timing jigsaw puzzle assembly and tracking speed over time. Offline-only, single user, no backend.

The unit of measurement is **PPM (pieces per minute)** = `puzzle.pieces / (timeInSeconds / 60)`. The app also records two speedrun splits within a session: **flipping time** (turning all pieces face-up) and **edge time** (completing the border).

Built with Expo SDK 54 / React Native 0.81 / React 19, new architecture enabled. Targets Android primarily; iOS and web build but are not the focus (see TECH-007).

## Layout

```
app/                      expo-router file-based routes
  _layout.tsx             root stack, wraps everything in PuzzleProvider
  modal.tsx               leftover Expo template, unused (TECH-017)
  (tabs)/
    _layout.tsx           4-tab bar
    index.tsx             Dashboard — summary cards, recent sessions, settings/backup modal
    puzzles.tsx           Collection — grid, search, add/edit puzzle, per-puzzle history
    stats.tsx             Insights — aggregates and hand-rolled bar charts
    add.tsx               Track — live timer + manual entry
constants/
  store-types.ts          Puzzle, TimeEntry, AppData
  theme.ts                Colors.light / Colors.dark, Fonts
context/PuzzleContext.tsx thin context wrapper over the data hook
hooks/use-puzzle-data.ts  ALL state, mutations and derived queries
components/               themed-text, themed-view, ui/icon-symbol + unused template components
```

## Architecture

Deliberately simple. One state container, no state library, no data layer:

```
usePuzzleData  →  PuzzleProvider  →  usePuzzles()  →  screens
```

- **All app state is one `useState<AppData>`** in `hooks/use-puzzle-data.ts`. Every mutation and every derived query (`getBestTime`, `getBestPPM`, `getPuzzleEntries`) lives there.
- **Persistence** is a single AsyncStorage key, `puzzle_tracker_data`, holding the whole `AppData` as JSON. An effect rewrites the entire blob whenever `data` changes.
- **Screens own their own UI state** (forms, modals, editing flags). Nothing form-related goes in the context.
- **Theming** is manual: every screen does `const theme = Colors[useColorScheme() ?? 'light']` and passes `theme` down as a prop. There is no styled-components / NativeWind / theme context.
- **Icons** go through `components/ui/icon-symbol.tsx`, which maps SF Symbol names to Material Icons on Android and web. `icon-symbol.ios.tsx` uses native SF Symbols. **Adding an icon requires adding it to `MAPPING`** or it silently renders nothing.

## Data model

`constants/store-types.ts` is the single source of truth. Two entities, related by `TimeEntry.puzzleId`:

- `Puzzle` — title, brand, pieces, optional difficulty, optional `imageUri`
- `TimeEntry` — puzzleId, timeInSeconds, ISO date string, optional flipping/edge splits, optional name

There is **no schema version field and no migration mechanism** (TECH-012). Any change to these types has to account for data already on users' devices.

`imageUri` currently holds a full `data:image/jpeg;base64,...` string, not a file path. This is a known critical problem — see TECH-001 before touching image handling.

## Conventions

- **Path alias:** `@/*` maps to the repo root. Import as `@/components/themed-text`, never relative paths across directories.
- **File names:** kebab-case for components and hooks (`themed-text.tsx`, `use-puzzle-data.ts`). PascalCase only for `context/PuzzleContext.tsx`.
- **Styles:** one `StyleSheet.create` block at the bottom of each file; theme-dependent colours applied inline as a second style-array element.
- **Cross-platform dialogs:** `Alert.alert` does not work on web. Destructive confirmations branch on `Platform.OS === 'web'` to `window.confirm`. Follow that pattern for any new dialog.
- **TypeScript:** `strict: true`. Most component props are currently `any` (TECH-011) — do not add more; type new components properly.

## Working on this project

Before starting, read:

- **[TECH_BACKLOG.md](TECH_BACKLOG.md)** — known bugs, refactors and chores as `TECH-nnn` tickets
- **[FEATURES.md](FEATURES.md)** — planned functionality as `FEAT-nnn` tickets

Both files use numbered tickets with a status. Done tickets move to a `## Done` section at the bottom of their own file, keeping their original number. Numbers are never reused. **When you finish work that closes a ticket, move it and note how it was resolved.**

Statuses differ slightly between the two files:

- `TECH_BACKLOG.md` — `Open` / `In Progress` / `Done`, plus a priority.
- `FEATURES.md` — adds a **`Refine`** status ahead of `Open`. New feature ideas start at `Refine`, meaning raised but not yet triaged; they move to `Open` only after a deliberate decision to keep them. **Do not start work on a `Refine` ticket** — it is not committed to and may be reworded, split, merged or dropped.

### Commands

```bash
npm install          # install dependencies
npx expo start       # dev server
npx tsc --noEmit     # typecheck — currently clean, keep it that way
npx expo lint        # currently 5 warnings, 0 errors (TECH-020)
```

There is **no test suite** (TECH-015). Typecheck and lint are the only automated checks.

### Traps worth knowing before you edit

- Adding an `IconSymbol` name without adding it to `MAPPING` fails silently on Android and web. Five icons are already broken this way (TECH-003).
- Date handling mixes `toISOString()` with `toLocaleDateString()` and shifts dates by a day west of UTC (TECH-005).
- `formatTime` exists in four files with three different behaviours (TECH-009). Check which one you are looking at.
- Writes to AsyncStorage that fail are swallowed into `console.error` and the UI still shows success (TECH-002).

## Status

Working, usable, unreleased. Not published to any store; installed via EAS-built APK. See [README.md](README.md) for how to get it onto a phone.

Almost the entire app is uncommitted working-tree changes on `master` (TECH-019), and there is no git remote.
