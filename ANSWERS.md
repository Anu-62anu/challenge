# Frontend decisions

## 1. Fleet state
`app.js` keeps current robot telemetry in a `Map<robot_id, event>`. `applyEvent` in `src/fleet.js` is the one ingestion path for replay events and refuses an older timestamp, while `createLiveEvent` produces the same event shape for the browser-generated live feed. Every view derives from that map, so map markers, the roster, metrics, and robot detail cannot drift between feed modes.

## 2. Tradeoff
I chose a dependency-free static application instead of a component framework or chart package. It makes the submission immediately hostable and the small state model easy to inspect, but costs component isolation and polished chart interactions. The hand-built SVG chart is intentionally limited to the fleet utilisation trend the brief asks for.

## 3. Next
With more time I would add per-robot history, accessible keyboard navigation across map markers, persistent filters, alert acknowledgement, and server-backed live telemetry. I would also make the generated live simulator understand floor obstacles rather than bounding movement to the layout dimensions.
