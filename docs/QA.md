# Verification

The final requested surface is a 3D neighborhood with selectable cars and no driving HUD. The generated concept is explicitly **not** actual gameplay and is not a photorealism commitment.

## Checks

- Eight automated tests pass: acceleration/braking, building collision, fixed-step consistency, road projection, geographic round trips, road parsing, spatial-grid boundary collision, and included Vienna data/spawn integrity.
- Strict TypeScript checking and Vite production build pass. The Three.js-based bundle emits a non-fatal large-chunk advisory.
- Chrome was used for real browser checks: choose Rally, Drive, accelerate, brake, exit car, open Escape menu, reset, select Coupe, resume. The pause-menu status showed 42 km/h and 0.01 km after a sustained drive. The gameplay DOM showed only the canvas and data-attribution link.
- Fresh final Chrome session had no application console errors or warnings. An earlier WebGL lifecycle error was fixed by avoiding forced context loss when rebuilding the scene; the removed soft-shadow constant was replaced by the supported constant.
- Desktop Chrome and a 390 × 844 responsive viewport were checked. Gameplay fills the viewport without horizontal overflow. Mobile touch gestures require further real-device testing.
- Official Google photorealistic tiles are **not live-verified** without a restricted billable key. Location-data services beyond the included Vienna extract are subject to availability; the extract was downloaded from the actual OSM API and parsed/tested locally.

## Visual comparison ledger

Generated concept: `docs/design-concept.png`. Actual Chrome screenshot: `docs/screenshot.png`; mobile capture: `docs/mobile.png`. Both concept and actual renders were opened with `view_image`. Desktop capture uses the current Chrome viewport; mobile uses 390 × 844. The earlier top-down concept was superseded by the user's 3D request.

| Point inspected | Actual result / intentional difference |
| --- | --- |
| Camera and canvas | Perspective chase camera and full-screen 3D; no top-down renderer. |
| Driving chrome | HUD, speedometer, missions and header removed; only data attribution remains. |
| Entry copy | Pick a place. Pick a ride.; location field; Coupe, Sedan, Rally; Drive. Extra instructions/setup appear only in menu because controls and optional provider setup must be usable. |
| Palette and typography | Charcoal/lime entry menu, DM Sans with system fallback; sky, stone-colored buildings and asphalt in scene. |
| Car selection | Three explicit options update actual 3D geometry and handling. Generic code-native geometry intentionally replaces branded photoreal vehicles. |
| Real-world source | Actual Vienna street/building footprints, estimated heights; no claim of satellite detail in reconstructed mode. |
| Assets and fidelity | Building windows/trees are instanced, district geometry batched. Models are simple meshes. They do not match the concept's photorealism; that substantial limitation is disclosed in README and chat. |
| Responsive behavior | Canvas fits narrow viewport; entry menu scrolls when needed. |

The layout and requested 3D/no-HUD interaction were checked against the revised direction. **The implementation is not a photorealistically faithful reproduction of the AI concept.** It is a simpler playable prototype. No claim of AAA visuals, real-time real-world people, or zero latency is made.
