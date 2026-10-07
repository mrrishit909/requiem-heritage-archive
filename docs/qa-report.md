# QA report

Apple M3 Pro, Chrome stable, Playwright 1.63, WebGL through SwiftShader. Last full runs: 21 e2e passed three runs in a row (the last one added after the third); 25 unit and API tests passed.

| Matrix row (blueprint 18) | Covered by | Result |
|---|---|---|
| Intro first load, skip, refresh mid-sequence | demo walk, refresh test | pass |
| Input: click, keyboard, drag | demo walk, W/E keys in walk and fly, drag to orbit, scrubber with arrow keys | pass |
| Input: touch | the orbit drag uses pointer events; only the phone layout was tested with touch enabled | partial |
| Scroll | no scroll navigation in this product; deep links restore room, year and layer | pass |
| Responsive | phone 390 px: rooms strip above, panel below, archive card inline at the top, no sideways overflow | pass at one phone size |
| Motion: reduced | static keyframes; no iris; panel animation off | pass |
| Graphics: success, failure, context loss | all WebGL tests; `?gfx=off`; lost-context event | pass |
| Lifecycle: tab hidden | frame loop pauses on visibilitychange | manual only |
| Domain behaviour | build, crumble and damage rules; 2026 damage equals the contract; plan within budget never worsens risk; anchors inside boxes; walk stays inside the fence | pass |
| Visual regression | four rooms against the poster fallback | pass |
| Performance | budgets in tests/e2e/performance.spec.ts | pass |

Defects found and fixed during the build: the risk plan ranked interventions by the sign-flipped gain (it chose nothing) until a test that expects a large budget to buy several found it; the summary was fed only the completed interventions so it said no proposal fitted; an archive card existed twice in the DOM (one hidden), which broke the transcript assertion and would have confused a screen reader.
