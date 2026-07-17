# Kitty Defense

Browser tower defense with kittens as towers and rodents as enemies.

## Current State

- Three selectable maps with distinct routes and environmental themes
- Six kitten classes with distinct roles, targeting priorities, and branching upgrades
- Wave spawning with composition previews, progress tracking, and scaling enemy tiers
- Gold, lives, kills, wave progression, and placement validation
- Custom silhouette-led SVG visual assets for towers, enemies, and UI accents
- Class-specific generated audio cues plus a layered theme and combat feedback
- Pause, 1×/2× speed controls, continuous mode, and automatic local saves
- Responsive layout verified in desktop and mobile browser emulation

## How To Play

1. Choose a route and select a kitten tower from the deployment panel.
2. Click grass tiles to place towers.
3. Avoid path tiles because rodents need a clear route.
4. Start a wave and earn gold by defeating enemies.
5. Keep rodents from reaching the village gate.
6. Select a placed cat to upgrade it or change its targeting priority.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm test
npm run test:run
npm run test:unit
npm run test:e2e
npm run lint
npm run format
npm run generate:audio
npm run ci
```

## Make Targets

```bash
make help
make install
make dev
make build
make preview
make test-run
make test-unit
make test-e2e
make lint
make format
make ci
make audio
```

## Project Structure

```text
src/
├── assets/styles/main.css
├── game/
│   ├── Enemy.ts
│   ├── Game.ts
│   ├── Game.test.ts
│   ├── Tower.ts
│   ├── WaveManager.ts
│   ├── WaveManager.test.ts
│   ├── constants.ts
│   └── map.ts
├── types/game.ts
├── ui/
│   ├── audio.ts
│   └── render.ts
└── main.ts

public/
├── art/
└── audio/
```

## Testing

The current test suite covers:

- Wave blueprint generation
- Placement rules and resource spending
- Combat resolution and wave completion
- Loss conditions from leaked enemies
- UI mount and tower-selection behavior

## Deployment

GitHub Pages deployment is handled by [deploy-pages.yml](/Users/justin/code/kitty-defense/.github/workflows/deploy-pages.yml). Pushing to `main` builds the Vite app and publishes `dist/` to Pages.

For the repository to serve successfully:

1. Open the repository `Settings` → `Pages`.
2. Set `Source` to `GitHub Actions`.
3. After the workflow runs, the site will publish at `https://irrelative.github.io/kitty-defense/`.

## Next Improvements

- Additional enemy traits and late-wave balancing
- Optional sell refunds and placement undo
- More map-specific ambient effects
- Expanded accessibility and mobile-device playtesting
