import { GameEngine } from './Game';

describe('GameEngine', () => {
  const runWave = (engine: GameEngine, ticks = 600) => {
    expect(engine.startWave()).toBe(true);

    for (let index = 0; index < ticks; index += 1) {
      engine.tick(100);
      const snapshot = engine.getSnapshot();
      if (!snapshot.isWaveActive && snapshot.enemies.length === 0) {
        return snapshot;
      }
    }

    throw new Error('Wave did not settle in time');
  };

  it('blocks tower placement on path tiles', () => {
    const engine = new GameEngine();
    const result = engine.placeTower(0, 3, 'archer');

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/cannot block/i);
  });

  it('spends gold and adds a tower on valid placement', () => {
    const engine = new GameEngine();

    const result = engine.placeTower(0, 0, 'archer');
    const snapshot = engine.getSnapshot();

    expect(result.ok).toBe(true);
    expect(snapshot.gold).toBe(100);
    expect(snapshot.towers).toHaveLength(1);
  });

  it('offers the bombardier cat as a premium splash option', () => {
    const engine = new GameEngine();

    const snapshot = engine.getSnapshot();
    const bombardier = snapshot.towerConfigs.find((tower) => tower.id === 'bombardier');

    expect(bombardier).toMatchObject({
      name: 'Bombardier Cat',
      cost: 120,
      damage: 24,
      splashRadius: 1.05,
    });
  });

  it('switches maps before the run starts', () => {
    const engine = new GameEngine();

    expect(engine.selectMap('creek-bend')).toBe(true);

    const snapshot = engine.getSnapshot();

    expect(snapshot.mapId).toBe('creek-bend');
    expect(snapshot.mapName).toBe('Creek Bend');
    expect(snapshot.tiles.some((tile) => tile.col === 0 && tile.row === 1 && tile.type === 'path')).toBe(
      true,
    );
  });

  it('locks map switching after setup has started', () => {
    const engine = new GameEngine();

    engine.placeTower(0, 0, 'archer');

    expect(engine.selectMap('orchard-loop')).toBe(false);

    const snapshot = engine.getSnapshot();

    expect(snapshot.mapId).toBe('meadow-run');
  });

  it('upgrades a selected tower after the run has started', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    const placedTowerId = engine.getSnapshot().towers[0].id;

    runWave(engine);
    expect(engine.selectPlacedTower(placedTowerId)).toBe(true);
    expect(engine.upgradeSelectedTower('archer-marksman').ok).toBe(true);

    const snapshot = engine.getSnapshot();
    const upgradedTower = snapshot.towers.find((tower) => tower.id === placedTowerId);

    expect(snapshot.canUpgradeTowers).toBe(true);
    expect(snapshot.selectedPlacedTowerId).toBe(placedTowerId);
    expect(upgradedTower).toMatchObject({
      level: 2,
      damage: 25,
      range: 3,
    });
    expect(upgradedTower?.appliedUpgrades.map((upgrade) => upgrade.id)).toEqual(['archer-marksman']);
  });

  it('blocks upgrades before wave 1 starts', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    const placedTowerId = engine.getSnapshot().towers[0].id;
    expect(engine.selectPlacedTower(placedTowerId)).toBe(true);

    const result = engine.upgradeSelectedTower('archer-marksman');

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/start a wave/i);
  });

  it('requires picking an upgrade path when multiple branch options exist', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    const placedTowerId = engine.getSnapshot().towers[0].id;
    runWave(engine);
    expect(engine.selectPlacedTower(placedTowerId)).toBe(true);

    const result = engine.upgradeSelectedTower();

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/choose an upgrade path/i);
  });

  it('allows upgrades during active waves', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    const placedTowerId = engine.getSnapshot().towers[0].id;
    expect(engine.startWave()).toBe(true);
    expect(engine.selectPlacedTower(placedTowerId)).toBe(true);

    const result = engine.upgradeSelectedTower('archer-volley');
    const snapshot = engine.getSnapshot();
    const upgradedTower = snapshot.towers.find((tower) => tower.id === placedTowerId);

    expect(result.ok).toBe(true);
    expect(snapshot.isWaveActive).toBe(true);
    expect(snapshot.canUpgradeTowers).toBe(true);
    expect(snapshot.gold).toBe(60);
    expect(upgradedTower?.level).toBe(2);
    expect(upgradedTower?.damage).toBe(23);
    expect(upgradedTower?.range).toBeCloseTo(2.8, 6);
    expect(upgradedTower?.appliedUpgrades.map((upgrade) => upgrade.id)).toEqual(['archer-volley']);
  });

  it('exports and restores a saved game state', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    const towerId = engine.getSnapshot().towers[0].id;
    runWave(engine);
    expect(engine.selectPlacedTower(towerId)).toBe(true);
    expect(engine.upgradeSelectedTower('archer-marksman').ok).toBe(true);
    engine.setContinuousMode(true);

    const saveData = engine.exportSaveData();
    const restored = new GameEngine();

    expect(restored.restoreFromSaveData(saveData)).toBe(true);

    const snapshot = restored.getSnapshot();

    expect(snapshot.wave).toBe(saveData.wave);
    expect(snapshot.gold).toBe(saveData.gold);
    expect(snapshot.lives).toBe(saveData.lives);
    expect(snapshot.selectedTower).toBe(saveData.selectedTower);
    expect(snapshot.continuousMode).toBe(true);
    expect(snapshot.towers).toHaveLength(1);
    expect(snapshot.towers[0]).toMatchObject({
      typeId: 'archer',
      level: 2,
      damage: 25,
    });
    expect(snapshot.towers[0].appliedUpgrades.map((upgrade) => upgrade.id)).toEqual(['archer-marksman']);
    expect(snapshot.towers[0].totalKills).toBe(saveData.towers[0].totalKills);
    expect(snapshot.towers[0].totalDamage).toBe(saveData.towers[0].totalDamage);
  });

  it('restores legacy level-based saves onto the default branch path', () => {
    const restored = new GameEngine();

    expect(
      restored.restoreFromSaveData({
        version: 1,
        mapId: 'meadow-run',
        gold: 88,
        lives: 10,
        kills: 9,
        wave: 2,
        selectedTower: 'archer',
        isGameOver: false,
        towers: [
          {
            typeId: 'archer',
            col: 1,
            row: 2,
            level: 3,
          },
        ],
      }),
    ).toBe(true);

    const snapshot = restored.getSnapshot();

    expect(snapshot.towers[0].level).toBe(3);
    expect(snapshot.towers[0].appliedUpgrades.map((upgrade) => upgrade.id)).toEqual([
      'archer-marksman',
      'archer-deadeye',
    ]);
  });

  it('spawns enemies and awards gold when a wave is defeated', () => {
    const engine = new GameEngine();

    engine.placeTower(1, 2, 'magic');
    engine.placeTower(4, 2, 'archer');
    engine.placeTower(6, 4, 'claw');

    const snapshot = runWave(engine, 400);

    expect(snapshot.wave).toBe(1);
    expect(snapshot.kills).toBeGreaterThan(0);
    expect(snapshot.isWaveActive).toBe(false);
    expect(snapshot.enemies).toHaveLength(0);
    expect(snapshot.towers.some((tower) => tower.totalDamage > 0)).toBe(true);
  });

  it('allows placing new towers during an active wave', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    expect(engine.startWave()).toBe(true);

    engine.tick(300);
    const result = engine.placeTower(6, 4, 'claw');
    const snapshot = engine.getSnapshot();

    expect(result.ok).toBe(true);
    expect(snapshot.isWaveActive).toBe(true);
    expect(snapshot.towers).toHaveLength(2);
    expect(snapshot.gold).toBe(25);
  });

  it('removes the selected tower from the board', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    const placedTowerId = engine.getSnapshot().towers[0].id;
    expect(engine.selectPlacedTower(placedTowerId)).toBe(true);

    const result = engine.removeSelectedTower();
    const snapshot = engine.getSnapshot();

    expect(result.ok).toBe(true);
    expect(snapshot.towers).toHaveLength(0);
    expect(snapshot.selectedPlacedTowerId).toBeNull();
    expect(snapshot.events.at(-1)?.type).toBe('tower-removed');
  });

  it('awards interest on saved gold after clearing a wave', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    expect(engine.placeTower(6, 4, 'claw').ok).toBe(true);

    const snapshot = runWave(engine);

    expect(snapshot.gold).toBe(78);
    expect(snapshot.projectedInterest).toBe(3);
    expect(snapshot.events.at(-1)?.message).toContain('+2g interest');
  });

  it('auto-starts the next wave when continuous mode is enabled', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    expect(engine.placeTower(6, 4, 'claw').ok).toBe(true);
    engine.setContinuousMode(true);

    const waveOne = runWave(engine);

    expect(waveOne.wave).toBe(1);
    expect(waveOne.autoStartInMs).toBeGreaterThan(0);

    let resumedSnapshot = waveOne;
    for (let index = 0; index < 20; index += 1) {
      engine.tick(100);
      resumedSnapshot = engine.getSnapshot();
      if (resumedSnapshot.isWaveActive) {
        break;
      }
    }

    expect(resumedSnapshot.isWaveActive).toBe(true);
    expect(resumedSnapshot.wave).toBe(2);
  });

  it('can toggle continuous mode on during an active wave and keep it for the clear', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    expect(engine.placeTower(6, 4, 'claw').ok).toBe(true);
    expect(engine.startWave()).toBe(true);

    engine.setContinuousMode(true);

    let snapshot = engine.getSnapshot();
    expect(snapshot.continuousMode).toBe(true);
    expect(snapshot.autoStartInMs).toBeNull();

    for (let index = 0; index < 600; index += 1) {
      engine.tick(100);
      snapshot = engine.getSnapshot();
      if (!snapshot.isWaveActive && snapshot.enemies.length === 0) {
        break;
      }
    }

    expect(snapshot.isWaveActive).toBe(false);
    expect(snapshot.continuousMode).toBe(true);
    expect(snapshot.autoStartInMs).toBeGreaterThan(0);
  });

  it('can toggle continuous mode off between waves and cancel auto-start', () => {
    const engine = new GameEngine();

    expect(engine.placeTower(1, 2, 'archer').ok).toBe(true);
    expect(engine.placeTower(6, 4, 'claw').ok).toBe(true);
    engine.setContinuousMode(true);

    const waveOne = runWave(engine);
    expect(waveOne.autoStartInMs).toBeGreaterThan(0);

    engine.setContinuousMode(false);

    const snapshot = engine.getSnapshot();
    expect(snapshot.continuousMode).toBe(false);
    expect(snapshot.autoStartInMs).toBeNull();
  });

  it('ends the game when too many rodents leak through', () => {
    const engine = new GameEngine();

    for (let wave = 0; wave < 3; wave += 1) {
      engine.startWave();
      for (let index = 0; index < 500; index += 1) {
        engine.tick(120);
      }
    }

    const snapshot = engine.getSnapshot();

    expect(snapshot.isGameOver).toBe(true);
    expect(snapshot.lives).toBeLessThanOrEqual(0);
  });

  it('resets back to the initial state', () => {
    const engine = new GameEngine();

    engine.placeTower(0, 0, 'archer');
    engine.startWave();

    for (let index = 0; index < 50; index += 1) {
      engine.tick(120);
    }

    engine.reset();

    const snapshot = engine.getSnapshot();

    expect(snapshot.gold).toBe(150);
    expect(snapshot.lives).toBe(12);
    expect(snapshot.kills).toBe(0);
    expect(snapshot.wave).toBe(0);
    expect(snapshot.isWaveActive).toBe(false);
    expect(snapshot.isGameOver).toBe(false);
    expect(snapshot.towers).toHaveLength(0);
    expect(snapshot.enemies).toHaveLength(0);
    expect(snapshot.projectiles).toHaveLength(0);
    expect(snapshot.events.at(-1)?.type).toBe('game-reset');
  });
});
