# Feature Tickets

Product ideas and planned functionality for Puzzle Tracker.
Bugs, refactors and chores live in [TECH_BACKLOG.md](TECH_BACKLOG.md).

**Ticket format:** `FEAT-nnn` · Title · Description · Status

**Statuses:**

| Status | Meaning |
|---|---|
| `Refine` | Raised but not yet triaged. Not committed to — may be reworded, split, merged or dropped. |
| `Open` | Reviewed and kept. Ready to be picked up. |
| `In Progress` | Being worked on. |
| `Done` | Shipped. |

New tickets start at `Refine`. Nothing moves to `Open` without a deliberate decision to keep it.

**Convention:** Done tickets move to the [Done](#done) section at the bottom of this file, keeping their original number. Numbers are never reused.

Last reviewed: 2026-09-09 (initial backlog — all tickets awaiting refinement)

---

## Backlog

### FEAT-001 — Puzzle status: owned / in progress / completed
**Status:** Refine

Right now a puzzle either has sessions or it does not. Add an explicit lifecycle state so the collection can distinguish a puzzle sitting unopened in the cupboard from one currently on the table from one that has been finished.

Enables filtering the collection ("what should I do next?") and makes the dashboard counts meaningful — "Total Puzzles" currently counts boxes owned, not puzzles solved.

---

### FEAT-002 — Personal best detection and celebration
**Status:** Refine

When a saved session beats the previous best PPM for that puzzle — or the all-time best across the collection — say so. A badge on the session, a highlight in the history list, and a short celebration on save.

The app already computes `getBestTime` and `getBestPPM`; this is mostly presentation. The core appeal of a speedrun tracker is knowing when you got faster, and today you have to compare numbers yourself.

---

### FEAT-003 — Multi-sitting sessions
**Status:** Refine

A 2000-piece puzzle is rarely one sitting, but a `TimeEntry` is a single continuous block. Allow a session to be paused, saved as in-progress, and resumed on a later day, accumulating total assembly time across sittings while recording the calendar span.

Needs a decision on how PPM is reported for a multi-day session and how it interacts with the persisted-timer work in TECH-013.

---

### FEAT-004 — Filter and sort the collection
**Status:** Refine

The Puzzles tab has free-text search over title and brand only. Add sorting (by best PPM, piece count, brand, date added, last played) and filtering (by piece count range, difficulty, brand, status from FEAT-001).

---

### FEAT-005 — PPM trend chart over time
**Status:** Refine

The Insights tab shows aggregates but nothing showing whether you are actually getting faster. Add a line chart of PPM per session over time, optionally normalised by piece count, with a trend line.

`react-native-gifted-charts` is already a dependency and currently unused — this ticket is what would justify keeping it (see TECH-017).

---

### FEAT-006 — Notes per session
**Status:** Refine

A free-text notes field on a `TimeEntry`, separate from the short `name`. For recording conditions: who helped, whether the image was hard, lighting, interruptions, strategy tried. Context that explains an outlier time months later.

---

### FEAT-007 — Solver profiles and collaborative sessions
**Status:** Refine

Record who solved a puzzle, and support more than one person on a session. Changes what PPM means — pieces per minute per person versus wall-clock — so the metric needs a defined behaviour before building.

Also replaces the hardcoded "Welcome back, Solver" greeting on the dashboard with a real name.

---

### FEAT-008 — Missing and damaged piece tracking
**Status:** Refine

Flag a puzzle as having missing pieces, with a count and a note. Relevant for a physical collection: it affects whether a puzzle is worth re-doing, whether it can be lent or sold, and whether a slow time was the puzzle's fault.

Should exclude affected sessions from personal-best comparisons, or mark them.

---

### FEAT-009 — Puzzle rating and review
**Status:** Refine

Rate a puzzle on enjoyment plus the things that actually matter to solvers: cut quality, piece fit, image difficulty, finish/glare. Feeds a "which brands do I like" view, since brand is already a first-class field.

---

### FEAT-010 — Cloud sync and multi-device
**Status:** Refine

All data is local to one device with manual JSON export as the only backup. Add an account and sync so a phone and tablet share a collection and data survives losing the phone.

Significant scope: needs a backend, auth, conflict resolution, and stable IDs (TECH-022) before it can start. Listed for direction, not as next-up.

---

### FEAT-011 — Automatic backup reminders
**Status:** Refine

A far cheaper answer to the same risk as FEAT-010. Track when the user last exported, and prompt after N sessions or N days without a backup. Optionally write a timestamped export to the device's Documents folder automatically.

Worth doing regardless of FEAT-010, and directly mitigates TECH-002.

---

### FEAT-012 — Wishlist
**Status:** Refine

Track puzzles you want but do not own, separate from the active collection. Move an entry to the collection when bought. Pairs naturally with FEAT-001's status field.

---

### FEAT-013 — Add a puzzle by barcode scan
**Status:** Refine

Entering title, brand and piece count by hand for every box is the main friction in onboarding a collection. Scan the box barcode and prefill from a product database.

Depends on finding a data source with real jigsaw coverage — worth a spike before committing.

---

### FEAT-014 — CSV export
**Status:** Refine

JSON export exists for backup and restore. Add CSV of sessions for people who want to analyse their times in a spreadsheet. Should exclude image data (which is what makes the JSON export large today — see TECH-001).

---

### FEAT-015 — Manual theme toggle
**Status:** Refine

The app follows the system colour scheme via `useColorScheme` with no way to override. Add a light / dark / system setting in the existing settings modal, persisted with the rest of the app data.

---

### FEAT-016 — Streaks and goals
**Status:** Refine

The Insights tab already ends with a soft nudge ("try to hit X PPM next session"). Build that out: current streak of consecutive days or weeks with a session, a settable monthly pieces goal, and progress against it.

---

### FEAT-017 — Home screen widget / quick-start timer
**Status:** Refine

Starting a session takes four taps: open app, Add tab, select puzzle, Start. Add a widget or notification action that starts a timer for the most recently used puzzle in one tap.

Requires a development build with native config; not possible in Expo Go.

---

### FEAT-018 — Split times beyond flipping and edge
**Status:** Refine

The timer records two fixed splits. Let users define their own checkpoints (by colour section, by region, "all sky done") and record arbitrary named laps during a run.

Would change `TimeEntry` from two optional number fields to a splits array — schema migration required (TECH-012).

---

## Done

*Nothing yet. Completed tickets move here with their original number and a one-line note on what shipped.*
