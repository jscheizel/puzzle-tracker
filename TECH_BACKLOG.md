# Technical Backlog

Open technical topics for Puzzle Tracker: bugs, refactors, and chores.
Feature requests live in [FEATURES.md](FEATURES.md).

**Ticket format:** `TECH-nnn` · Title · Description · Status (`Open` / `In Progress` / `Done`)

**Convention:** Done tickets move to the [Done](#done) section at the bottom of this file, keeping their original number. Numbers are never reused.

Last reviewed: 2026-09-09 (initial audit)

---

## Open

### TECH-001 — Puzzle photos are base64-encoded into AsyncStorage
**Status:** Open · **Priority:** Critical

`pickImage` stores the picked image as a `data:image/jpeg;base64,...` string directly on the puzzle record ([app/(tabs)/puzzles.tsx:116](<app/(tabs)/puzzles.tsx#L116>)), so every photo ends up inside the single JSON blob under the `puzzle_tracker_data` key. Android's AsyncStorage defaults to a **6 MB** database and the project has no `expo-build-properties` override to raise it. At roughly 80–150 KB per image, the store fills up after somewhere around 40–70 puzzles and all further writes fail.

Fix: write images to app storage via `expo-file-system` and persist only the file URI. Needs a migration for existing base64 entries, plus a decision on what export/import does with image files (see TECH-012).

---

### TECH-002 — Failed writes to AsyncStorage are silently swallowed
**Status:** Open · **Priority:** Critical

The persist effect catches write errors and only calls `console.error` ([hooks/use-puzzle-data.ts:18](hooks/use-puzzle-data.ts#L18)). In-memory state still shows the new data, so the user sees their session saved, keeps adding more, and loses everything on next app launch with no warning at any point.

Fix: surface persist failures in the UI (banner or alert) and consider retaining a last-known-good copy. Pairs with TECH-001 — that ticket removes the most likely cause, this one makes any remaining failure visible.

---

### TECH-003 — Five icons render blank on Android and web
**Status:** Open · **Priority:** High

`gearshape.fill`, `bolt.fill`, `star.fill`, `square.and.arrow.up` and `square.and.arrow.down` are used in the screens but missing from `MAPPING` in [components/ui/icon-symbol.tsx:16](components/ui/icon-symbol.tsx#L16). `MaterialIcons` receives `name={undefined}` and renders nothing.

This includes the dashboard settings gear, which is the only entry point to export/import. Since `eas.json` builds an Android APK, this affects the build that actually gets installed.

Fix: add the five Material Icons mappings.

---

### TECH-004 — `IconSymbol` accepts any string as an icon name
**Status:** Open · **Priority:** Medium

The `name` prop is typed `string` ([components/ui/icon-symbol.tsx:41](components/ui/icon-symbol.tsx#L41)), which is why TECH-003 compiled cleanly. The unused `IconSymbolName` type alias right above it is already the correct type.

Fix: type `name` as `keyof typeof MAPPING` so a missing mapping is a compile error. Will require the `icon` props on `StatCard` / `SummaryCard` / `Section` to be typed too (see TECH-011).

---

### TECH-005 — Session dates shift by one day in negative UTC offsets
**Status:** Open · **Priority:** High

`formatDateForInput` renders the editor value with `toISOString()` ([app/(tabs)/index.tsx:40](<app/(tabs)/index.tsx#L40>), [app/(tabs)/puzzles.tsx:38](<app/(tabs)/puzzles.tsx#L38>)) while the read-only display uses `toLocaleDateString()`. Saving parses `YYYY-MM-DD` with `new Date()`, which treats it as UTC midnight.

Result: for users west of UTC, opening a session's editor and pressing Save without changing anything moves the date back one day, and it moves again on every subsequent edit. Also mis-buckets entries near month boundaries in the Insights screen.

Fix: store and compare dates in local time, or store a plain `YYYY-MM-DD` day string alongside the timestamp.

---

### TECH-006 — Zero-piece months draw a full-width bar
**Status:** Open · **Priority:** Low

[app/(tabs)/stats.tsx:204](<app/(tabs)/stats.tsx#L204>) reads `(item.pieces / maxPieces || 1)`, which parses as `(item.pieces / maxPieces) || 1`. A month with 0 pieces evaluates to `0 || 1` = `1` and renders at 100% width instead of empty.

Fix: `item.pieces / (maxPieces || 1)`. While in there, hoist `maxPieces` out of the `.map()` callback — it is recomputed for every row.

---

### TECH-007 — `Alert.alert` does nothing on web
**Status:** Open · **Priority:** Medium

Destructive confirmations correctly branch to `window.confirm` on web, but validation and success alerts do not. React Native Web does not implement `Alert`, so on web:

- "Please select a puzzle first" and "Time cannot be zero" never appear
- In `handleSave`, `router.replace('/')` sits inside the Alert callback ([app/(tabs)/add.tsx:124](<app/(tabs)/add.tsx#L124>)), so saving a session appears to do nothing at all

Fix: a small cross-platform `alert()` / `confirm()` helper used everywhere — or drop the web target and remove `web.output` from `app.json`. Decide which before spending effort here.

---

### TECH-008 — `isLoading` is exposed but never consumed
**Status:** Open · **Priority:** Low

`usePuzzleData` computes and returns `isLoading`, and `PuzzleContext` types it, but no screen reads it. The first frame after launch renders the empty states ("No sessions yet. Start puzzling!", "No statistics available yet.") before data pops in.

Fix: gate the screens on it, or render a skeleton.

---

### TECH-009 — Four different `formatTime` implementations
**Status:** Open · **Priority:** Medium

Time formatting is copy-pasted with divergent behaviour across four files:

| File | Name | Behaviour |
|---|---|---|
| `app/(tabs)/index.tsx` | `formatTime` | `h:MM:SS`, hours hidden when 0 |
| `app/(tabs)/puzzles.tsx` | `formatS` | identical to the above |
| `app/(tabs)/add.tsx` | `formatTime` | `HH:MM:SS`, hours always shown |
| `app/(tabs)/stats.tsx` | `formatTime` | `Xh Ym`, no seconds |

`parseFormattedTime` and `formatDateForInput` are duplicated verbatim between `index.tsx` and `puzzles.tsx`.

Fix: extract `lib/format.ts` with one implementation of each (a display-variant flag where genuinely needed) and delete the copies. This is also the natural home for the TECH-005 date fix and the first place tests should land (TECH-015).

---

### TECH-010 — `RecentItem` and `HistoryItem` are near-identical
**Status:** Open · **Priority:** Medium

Both are roughly 120-line inline session editors with the same five fields (name, date, time, flipping time, edge time), the same validation, and the same save handler — one in `app/(tabs)/index.tsx`, one in `app/(tabs)/puzzles.tsx`. Any change to the editing UX currently has to be made twice.

Fix: extract a shared `components/session-editor.tsx`. Blocked on nothing, but cleaner after TECH-009.

---

### TECH-011 — `any` at every component boundary
**Status:** Open · **Priority:** Medium

`StatCard`, `RecentItem`, `HistoryItem`, `PuzzleCard`, `TimeInput`, `SummaryCard` and `Section` all take `({ ... }: any)`. `tsconfig.json` sets `strict: true`, and this defeats it exactly where props flow between files.

Fix: real prop interfaces. Also introduces a shared `Theme` type for the `Colors.light` / `Colors.dark` shape, currently passed around untyped.

---

### TECH-012 — Import accepts malformed data; no schema version
**Status:** Open · **Priority:** Medium

`importData` only checks that the two top-level keys are truthy ([hooks/use-puzzle-data.ts:107](hooks/use-puzzle-data.ts#L107)). `{"puzzles": "x", "timeEntries": 1}` passes validation and then crashes on the first `.filter`. There is also no version field in the persisted or exported shape, so there is no migration path when the schema changes — which TECH-001 and TECH-005 both require.

Fix: validate element shapes on import, add a `schemaVersion` to `AppData`, and write a migration runner in `loadData`.

---

### TECH-013 — Timer state is lost if the app is killed
**Status:** Open · **Priority:** High

`startTimeRef` and `accumulatedTimeRef` live only in component state ([app/(tabs)/add.tsx:39](<app/(tabs)/add.tsx#L39>)). The wall-clock approach correctly survives backgrounding, but a process kill loses the run entirely. For a multi-hour 2000-piece session that is a real loss, and the OS is most likely to kill a backgrounded app during exactly those long runs.

Fix: persist the running timer (start timestamp, accumulated seconds, paused flag, selected puzzle) to AsyncStorage and offer to restore on launch.

---

### TECH-014 — Context value is rebuilt on every render
**Status:** Open · **Priority:** Low

`usePuzzleData` returns a fresh object with fresh function identities each render and `PuzzleProvider` passes it straight through, so every consumer re-renders on any change. Separately, several derived-stat paths do `puzzles.find()` inside `timeEntries.map()`, which is O(n·m).

Not a practical problem at a few dozen puzzles. Worth `useMemo` / `useCallback` and a `Map` lookup if the collection ever grows or the screens get heavier.

---

### TECH-015 — No tests, no CI
**Status:** Open · **Priority:** High

There is no test setup and no CI workflow. The pure functions are trivially testable and are precisely where the bugs found in the initial audit live: `parseFormattedTime`, `formatTime`, the PPM calculation, the `bySize` / `byMonth` aggregation in `stats.tsx`, and the import validator.

Fix: add Jest with `jest-expo`, cover `lib/format.ts` (TECH-009) and the stats aggregation first, then a GitHub Actions workflow running `tsc --noEmit`, `expo lint` and the tests.

---

### TECH-016 — Icon-only buttons have no accessibility labels
**Status:** Open · **Priority:** Medium

No `accessibilityLabel` or `accessibilityRole` anywhere in the app. The settings gear, edit pencil, and delete X are icon-only with no text, so they are unusable with a screen reader. The delete button is a `plus.circle.fill` rotated 45° — announced as nothing at all.

Fix: labels and roles on every `TouchableOpacity`, starting with the icon-only ones.

---

### TECH-017 — Leftover Expo template code and unused dependencies
**Status:** Open · **Priority:** Low

Still shipping from `create-expo-app`:

- `app/modal.tsx` renders "This is a modal" and is wired into the root stack
- Unused components: `hello-wave`, `parallax-scroll-view`, `collapsible`, `external-link`
- Unused assets: `react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png`, `partial-react-logo.png`
- `scripts/reset-project.js` and its `reset-project` npm script
- `react-native-gifted-charts` is installed and never imported — the bar charts are hand-rolled. `react-native-svg` is likely only there as its peer dependency. Keep both if FEAT-007 is going ahead, otherwise remove.

---

### TECH-018 — App icon is a JPEG
**Status:** Open · **Priority:** Low

`app.json` points `icon` and the Android adaptive-icon `foregroundImage` at `./assets/images/icon.jpg`. JPEG has no alpha channel, so the adaptive icon foreground renders as a full-bleed square inside the mask instead of a shaped logo.

Fix: export a transparent PNG (1024×1024) and a separate foreground layer with the safe-zone padding Android expects.

---

### TECH-019 — Entire app is uncommitted
**Status:** Open · **Priority:** High

`git log` shows a single "Initial commit" containing the Expo template. Every screen, the context, the data hook, the theme, and all EAS config are unstaged working-tree changes. One bad `git checkout` loses the whole project. There is also no remote configured, so there is no off-machine copy.

Fix: commit in reviewable chunks, add a remote, push.

---

### TECH-020 — Five outstanding lint warnings
**Status:** Open · **Priority:** Low

`npx expo lint` reports 5 warnings, 0 errors:

- `add.tsx:339` — `React.useEffect` missing `displayValue` dependency
- `index.tsx:41`, `index.tsx:97`, `puzzles.tsx:39` — caught errors bound but never used
- `icon-symbol.tsx:9` — `IconSymbolName` declared but unused (resolved by TECH-004)

Fix: clear them, then consider failing CI on warnings so the count stays at zero.

---

### TECH-021 — Layout width is captured once at module load
**Status:** Open · **Priority:** Low

`index.tsx` and `stats.tsx` both call `Dimensions.get('window')` at module scope and use it to size cards. The value never updates, so the two-column grid does not respond to rotation, split-screen, or foldable state changes. `app.json` locks orientation to portrait but also sets `ios.supportsTablet: true`.

Fix: `useWindowDimensions()`.

---

### TECH-022 — IDs can collide
**Status:** Open · **Priority:** Low

Both `addPuzzle` and `addTimeEntry` use `Date.now().toString()` as the primary key ([hooks/use-puzzle-data.ts:38](hooks/use-puzzle-data.ts#L38)). Two records created in the same millisecond share an ID; imported data can also collide with locally generated IDs.

Unlikely through the UI today, but it becomes a real problem for any bulk import or sync feature (FEAT-010).

Fix: `crypto.randomUUID()` or `expo-crypto`.

---

## Done

*Nothing yet. Completed tickets move here with their original number and a one-line note on how they were resolved.*
