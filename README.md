# Kitty Defense

Browser tower defense with kittens as towers and rodents as enemies.

## Current State

- Playable single-map defense loop with three tower types
- Wave spawning with scaling enemy health and mixed enemy tiers
- Gold, lives, kills, wave progression, and placement validation
- Custom SVG visual assets for towers, enemies, and UI accents
- Generated WAV audio cues for placement, attacks, wave starts, leaks, and game over
- Responsive layout verified in desktop and mobile browser emulation

## How To Play

1. Select a kitten tower from the right-side panel.
2. Click grass tiles to place towers.
3. Avoid path tiles because rodents need a clear route.
4. Start a wave and earn gold by defeating enemies.
5. Keep rodents from reaching the village gate.

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

- Tower upgrades and sell mechanics
- Multiple maps and route variants
- More enemy traits and late-wave balancing
- Persistent save data and score tracking
