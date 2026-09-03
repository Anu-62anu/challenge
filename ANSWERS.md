# Answers

## 1. What holds the fleet's state as data arrives, and why that shape?

A single `Map<robot_id, latestSnapshot>` — the `fleet` variable in
`app.js`, built once at boot in `resetReplay()` (seeded from
`robots.json`'s start positions) and then mutated on every tick by either
`applyEvent()` or `createLiveEvent()` (both in `src/fleet.js`).

Every view in the app — the map dots (`renderMap`), the roster list
(`renderRoster`), the detail panel (`renderDetail`), and the summary tiles
(`fleetSnapshot`) — only ever needs "what is each robot doing *right
now*," never a full history. A flat dictionary keyed by id is the minimum
shape that answers that, so that's what it is; there's no separate
history log kept in memory for rendering purposes.

The reason this shape lets replay and the live feed drive the same views
is that both produce events in the identical shape
(`{robot_id, t, x, y, status, battery}`), so `tick()` can hand either
source's output to the same `fleet` Map without any view code needing to
know or care which mode produced it — `renderMap`/`renderRoster`/
`renderDetail` just read `fleet.values()`/`fleet.get(id)` either way.

## 2. One real tradeoff, and the argument for it

**Reusing one shared `fleet` Map for both replay and live, instead of
keeping two separate state trees.**

The upside: switching from replay to live is seamless. Live literally
picks up wherever the robots currently are — no jarring teleport back to
the roster's start positions, no visible reset. Every render function
also only ever has to know about one state shape, which kept the app
small (no framework, no reducer library, just one Map and some functions
that write into it).

The cost is real, though: it's destructive. The moment you switch to
live, replay's forward progress through `events.jsonl` is gone — the only
way back is "Restart replay," which calls `resetReplay()` and starts the
recorded log over from t=0. There's no way to pause replay partway
through, peek at live, and then resume replay exactly where you left off.
It also has a knock-on effect on the trend chart: `tick()`'s live branch
never advances `replayIndex`, so `renderTrend()` (which slices `events`
using `replayIndex`) stays frozen at whatever point you switched away
from replay — a direct cost of sharing one state path without also
branching the trend history for live mode. I decided this was an
acceptable tradeoff for the timebox, but it's the first thing I'd
revisit with more time (see question 3).

## 3. What did you leave out, and what would you build next?

- **The trend chart doesn't extend during live mode** (explained above).
  I'd add a small live-only ring buffer that pushes a `fleetSnapshot()`
  reading on every live tick, and have `renderTrend()` read from that
  buffer while `live === true`.
- **Statuses `blocked`/`error`/`offline`/`maintenance` never resolve in
  live mode.** `createLiveEvent()`'s status rules only cover
  idle → active → on_mission and the charging cycle. A robot that enters
  live mode already in one of those four other statuses is stuck there
  indefinitely (position/battery keep drifting, but the status label
  never changes) unless its battery happens to drop under 15 and force it
  into charging. I'd add explicit recovery/escalation rules for those.
- **The id → seed-number trick is fragile.** `createLiveEvent()` uses
  `robot_id.charCodeAt(1)` to give each robot a distinct offset in the
  movement formula. That works for this roster (`r1`–`r8`, all single
  digit) but would silently collide for a two-digit id like `r10` (same
  character at index 1 as `r1`). I'd switch to
  `parseInt(id.slice(1), 10)` if the roster ever grew past 9 robots.
- **No stale/disconnected indicator.** There's currently no way to tell
  "this robot is idle" apart from "this robot stopped reporting a while
  ago" — both just look like a dot that isn't moving. I'd add a
  last-seen timeout that visually distinguishes the two.
- **Test coverage is limited to the pure functions in `fleet.js`**
  (`applyEvent`, `fleetSnapshot`, `trendPoints`, `createLiveEvent`).
  There's no coverage of the DOM rendering functions in `app.js` or the
  live-tick loop itself, since those needed a DOM test setup I didn't
  have time to add within the timebox.
- **Map markers and roster rows are mouse/click only** — no keyboard
  navigation for selecting a robot.
