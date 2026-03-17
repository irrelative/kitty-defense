import { GameEngine } from './Game';

const runWave = (engine: GameEngine) => {
  expect(engine.startWave()).toBe(true);

  for (let index = 0; index < 1200; index += 1) {
    engine.tick(100);
    const snapshot = engine.getSnapshot();

    if (snapshot.isGameOver || (!snapshot.isWaveActive && snapshot.enemies.length === 0)) {
      return snapshot;
    }
  }

  throw new Error('Wave simulation did not settle in time');
};

describe('game balance', () => {
  it('lets a sensible opening clear early waves and fund a third tower', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    expect(engine.placeTower(6, 4, 'claw').ok).toBe(true);

    const waveOne = runWave(engine);

    expect(waveOne.isGameOver).toBe(false);
    expect(waveOne.lives).toBeGreaterThanOrEqual(10);
    expect(waveOne.gold).toBeGreaterThanOrEqual(75);
    expect(engine.placeTower(4, 2, 'archer').ok).toBe(true);
  });

  it('forces reinvestment instead of letting an early setup cruise forever', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    expect(engine.placeTower(6, 4, 'claw').ok).toBe(true);

    let finalSnapshot = engine.getSnapshot();

    for (let wave = 0; wave < 6; wave += 1) {
      finalSnapshot = runWave(engine);
      if (finalSnapshot.isGameOver) {
        break;
      }
    }

    expect(finalSnapshot.wave).toBeLessThanOrEqual(5);
    expect(finalSnapshot.isGameOver || finalSnapshot.lives <= 4).toBe(true);
  });

  it('keeps a reasonable growth plan under pressure without runaway gold', () => {
    const engine = new GameEngine();
    const placements: Array<[number, number, 'archer' | 'claw' | 'magic' | 'bombardier']> = [
      [1, 2, 'archer'],
      [6, 4, 'claw'],
      [4, 2, 'archer'],
      [5, 0, 'magic'],
      [8, 4, 'archer'],
      [3, 4, 'bombardier'],
      [6, 1, 'magic'],
    ];

    for (const [col, row, towerType] of placements.slice(0, 2)) {
      expect(engine.placeTower(col, row, towerType).ok).toBe(true);
    }

    let placementIndex = 2;
    let snapshot = engine.getSnapshot();

    for (let wave = 0; wave < 6; wave += 1) {
      snapshot = runWave(engine);

      while (placementIndex < placements.length) {
        const [col, row, towerType] = placements[placementIndex];
        const result = engine.placeTower(col, row, towerType);
        if (!result.ok) {
          break;
        }
        placementIndex += 1;
      }

      if (snapshot.isGameOver) {
        break;
      }
    }

    expect(snapshot.wave).toBeGreaterThanOrEqual(6);
    expect(snapshot.isGameOver).toBe(false);
    expect(snapshot.gold).toBeLessThanOrEqual(260);
    expect(snapshot.lives).toBeGreaterThanOrEqual(4);
  });
});
