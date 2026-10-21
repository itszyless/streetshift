# Contributing

Use Node.js 22.18+ or 24+, run `npm ci`, then `npm run dev`. Keep changes focused and describe behavior changes and verification in your pull request.

Run `npm test` and `npm run build`. Check driving, reverse, braking, collisions, pause/resume, reset, walking, all three selectable cars, and the clear driving view. Verify desktop Chrome and responsive menu layout. For provider integration changes, use your own restricted key and explicitly report untested provider paths.

Keep frame-level state outside React. Dispose Three.js resources on scene teardown. Keep map attribution visible even when the gameplay UI is hidden. Do not commit credentials, scraped imagery or proprietary assets. Preserve the separate ODbL license on included data. Disclose substantial AI assistance.

Useful improvements: connected road-graph traffic, road-width-aware collision shapes, terrain-aware movement, better generic vehicle/character assets, accessible controls and expanded device/performance tests.
