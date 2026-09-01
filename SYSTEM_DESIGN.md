# System design

1. A future task-assignment feature would add a `task` field to the shared event shape in `src/fleet.js`. `applyEvent` already centrally ingests every event, and `renderDetail` is a natural first consumer; a task queue and assignment controls can therefore be added without changing the map, roster, or replay/live switching logic.

2. At 500 robots, the current full-DOM redraw in `renderMap`/`renderRoster` will be the first bottleneck. I would retain the keyed `Map`, batch updates with `requestAnimationFrame`, virtualize the roster, and render the floor layer on canvas/WebGL. The trend should be pre-aggregated rather than recomputed from raw events on every render.

3. Under limited bandwidth I would send delta updates with a per-robot sequence number, coalesce frequent position reports, and make status changes immediate. The client could interpolate positions between sparse updates. `applyEvent` would compare sequence numbers (or source timestamps) rather than accepting every update.

4. An expiry monitor would mark a robot stale after a configurable missed-heartbeat window, surface it as attention, and retain the last known position and time. The operator then sees a clear distinction between a reported `offline` state and a telemetry timeout.

5. During an unreliable connection, the UI should retain the last accepted telemetry, show its age, and avoid moving a robot backwards. The timestamp guard already demonstrates that rule in `applyEvent`; a production transport would reconnect with exponential backoff and request a snapshot to reconcile after recovery.
