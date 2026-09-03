# System Design

## 1. Adding a new feature later

Take a concrete example: "show each robot's last 10 minutes of battery
history as a sparkline in the detail panel." Today, `fleet` (in `app.js`)
only ever stores the *latest* snapshot per robot — `applyEvent()` and
`createLiveEvent()` in `src/fleet.js` both overwrite, never append. That
feature needs a small but real change to the state shape, not a full
rework: either `applyEvent` starts returning `{ ...latest, history: [...] }`
with a capped array, or a parallel `Map<robot_id, battery[]>` is
maintained alongside `fleet`. Either way, it plugs into `renderDetail()`
in `app.js`, which already owns "how to draw one robot's detail card" —
it would just read the new field. The event ingestion path
(`tick()` → `applyEvent`/`createLiveEvent`) and every other view
(`renderMap`, `renderRoster`, `fleetSnapshot`) stay untouched, since they
only ever read the latest-state fields they already use.

## 2. Growing from 8 robots to 500

The first thing that breaks is the rendering approach, not the data
model. `renderMap()` clears and recreates every `.robot-dot` element from
scratch on every single tick (`map.querySelectorAll('.robot-dot').
forEach(e => e.remove())` then rebuilds all of them), and `renderRoster()`
replaces the entire roster list's `innerHTML` every tick too. At 8 robots
and a tick roughly every 125ms, that's cheap. At 500, that's 500 DOM
nodes destroyed and recreated ~8 times a second — the browser would start
dropping frames well before anything else (network, parsing, state
storage) became the bottleneck, because full destroy-and-rebuild is O(n)
DOM work per tick with a large constant factor. The fix would be to diff
(update existing nodes' `style`/text in place, only add/remove nodes when
the roster actually changes) rather than rebuild.

A second-order issue at that scale: `boot()` currently does
`fetch('./events.jsonl').then(t => t.trim().split('\n').map(JSON.parse))`
— reading the entire recorded log into memory as one array before replay
even starts. A proportionally larger log (500 robots × 15 minutes) would
make that initial parse noticeably slower, though it would show up well
after the rendering problem above.

## 3. Limited bandwidth between robots and backend

This assignment doesn't have a real robot-to-backend link (live events
are generated client-side by `createLiveEvent()`), but if it did, the
concrete things I'd change: stop sending every field every tick — send
deltas (only fields that changed) rather than the full
`{x, y, status, battery}` payload each time; reduce numeric precision
(the app already rounds to 1 decimal place, which is more than triage
needs); and separate update rates by field importance — status and
battery matter more for "who needs attention" than exact position, so
position could update less frequently than status while still looking
reasonably smooth on the map (the current live formula's 5-second step is
already a coarser cadence than the visual tick rate, which is
accidentally in the right direction for this).

## 4. A robot goes down mid-task and stops responding

Today there's no timeout concept anywhere in the app — a robot that
stops reporting just stays frozen on the map and in the roster with
whatever status it last had, indistinguishable from a robot that's
legitimately idle. The right fix: track `now - robot.t` (or, in replay,
`currentSimTime - robot.t`) and once it exceeds a threshold, render that
robot in a distinct "stale/unresponsive" visual state in `renderMap()`
and `renderRoster()`, separate from the *reported* `offline` status —
because silence and a reported `offline` status mean different things
operationally (one is "robot told us it's down," the other is "we simply
haven't heard from it," which could mean a crash, a network drop, or
something worse).

## 5. Slow/unreliable connection: late, out-of-order, or missing updates

`applyEvent()`'s guard — `if (!previous || event.t >= previous.t)` —
already protects the core state from going backwards: a late-arriving
event with an older timestamp than what's already stored gets silently
ignored rather than corrupting the display with stale data. That's the
mechanism a flaky feed actually needs at the state layer.

What the rest of the system currently sees during a gap: nothing
different from a robot that's simply idle — same gap as question 4, since
there's no last-seen timeout. Once the connection recovers, the next
event simply resumes updating that robot normally (as long as its
timestamp is newer than what's stored) — no special "catch-up" handling
is needed because the Map only ever holds one value per robot to begin
with. The missing piece is purely the *visual* distinction while the gap
is happening, not anything in the state-merging logic itself.
