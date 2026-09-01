# Orbit Fleet Operations

A static frontend submission for the Peppermint Robotics fleet dashboard challenge. It replays the supplied telemetry and includes a deterministic browser-side live simulator, so both modes work in any static deployment.

## Run

```bash
npm start
# open http://localhost:8080
```

No dependency installation is required. Do not open `index.html` directly: the application fetches the supplied data files and needs a local HTTP server.

## Features

- Fast replay with pause/play and 1×, 4×, and 12× speed options.
- Switchable live feed that advances robot positions, batteries, and state transitions independently of the recording.
- Floor-plan markers for all eight robots, fleet metrics, a working-fleet time trend, search/triage roster, and robot detail inspection.
- Stale-event protection in the shared fleet state reducer.

## Tests

```bash
npm test
```

The unit tests cover the most consequential data behaviour: rejecting out-of-order telemetry and consistently calculating fleet working/attention metrics and trend values.

## Deployment

This is ready for GitHub Pages, Netlify, Vercel, or any static host. Deploy the repository root and use the supplied static files unchanged. The live feed is generated in the browser by `createLiveEvent` in `src/fleet.js`, so it does not rely on a hosted service.

## AI delegation notes

AI assistance was used to accelerate implementation and documentation. The final architecture, event-state model, classifications, UX choices, and verification were reviewed and selected for this submission.

## What I would do next

See `ANSWERS.md` and `SYSTEM_DESIGN.md` for implementation-specific tradeoffs and next steps.
