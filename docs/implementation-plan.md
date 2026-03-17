# Implementation Plan

## Phase 1
- Scaffold a Vite + TypeScript project with Vitest, ESLint, and Prettier
- Define the core game domain: board, path, towers, enemies, waves, and economy
- Add a playable single-map loop with a HUD and basic controls

## Phase 2
- Add stronger visual identity with custom SVG art and layered CSS treatment
- Add audio feedback for placement, shooting, wave start, and failures
- Add automated coverage around combat, waves, placement, and UI wiring

## Phase 3
- Expand into tower upgrades, multiple maps, and persistent progression
- Add richer enemy modifiers and late-wave difficulty tuning
- Add true browser E2E coverage once the gameplay contract stabilizes
