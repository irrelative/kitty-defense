import { Enemy } from './Enemy';
import { Tower } from './Tower';
import {
  CONTINUOUS_WAVE_DELAY_MS,
  DEFAULT_MAP_ID,
  MAPS_BY_ID,
  INTEREST_RATE,
  STARTING_GOLD,
  STARTING_LIVES,
  TILE_SIZE,
  TOWER_TYPES,
  GAME_MAPS,
  WAVE_CLEAR_BONUS_BASE,
  WAVE_CLEAR_BONUS_STEP,
} from './constants';
import { createPathKeySet, createPathPoints, createTiles, isInsideBoard, isPathTile } from './map';
import { WaveManager } from './WaveManager';
import type {
  GameEvent,
  GameMapConfig,
  GameSaveData,
  GameSnapshot,
  MapId,
  PlacementResult,
  ProjectileVisual,
  TowerTypeId,
} from '@/types/game';

const PROJECTILE_DURATION_MS = 180;
const SCORE_PER_KILL_BASE = 10;
const integerFormatter = new Intl.NumberFormat();

const getScorePerKill = (wave: number): number =>
  Math.round(SCORE_PER_KILL_BASE * (1 + Math.log2(Math.max(1, wave)) * 0.45));
const formatInteger = (value: number): string => integerFormatter.format(value);

export class GameEngine {
  private readonly waveManager = new WaveManager();

  private currentMap: GameMapConfig = MAPS_BY_ID[DEFAULT_MAP_ID];

  private tiles = createTiles(this.currentMap);

  private path = createPathPoints(this.currentMap.path);

  private pathKeySet = createPathKeySet(this.currentMap.path);

  private towers: Tower[] = [];

  private enemies: Enemy[] = [];

  private projectiles: Array<ProjectileVisual & { ageMs: number }> = [];

  private gold = STARTING_GOLD;

  private lives = STARTING_LIVES;

  private kills = 0;

  private score = 0;

  private wave = 0;

  private selectedTower: TowerTypeId = 'archer';

  private selectedPlacedTowerId: string | null = null;

  private currentWaveElapsedMs = 0;

  private currentBlueprintIndex = 0;

  private activeBlueprint = this.waveManager.createBlueprint(1);

  private isWaveActive = false;

  private isGameOver = false;

  private continuousMode = false;

  private autoStartCountdownMs: number | null = null;

  private pendingEvents: GameEvent[] = [];

  reset(): void {
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.gold = STARTING_GOLD;
    this.lives = STARTING_LIVES;
    this.kills = 0;
    this.score = 0;
    this.wave = 0;
    this.selectedTower = 'archer';
    this.selectedPlacedTowerId = null;
    this.currentWaveElapsedMs = 0;
    this.currentBlueprintIndex = 0;
    this.activeBlueprint = this.waveManager.createBlueprint(1);
    this.isWaveActive = false;
    this.isGameOver = false;
    this.continuousMode = false;
    this.autoStartCountdownMs = null;
    this.pendingEvents = [
      {
        type: 'game-reset',
        message: 'Game reset. The meadow is ready again.',
      },
    ];
  }

  selectMap(mapId: MapId): boolean {
    if (!this.canSelectMap()) {
      this.pendingEvents.push({
        type: 'invalid-placement',
        message: 'Reset before switching to a different path.',
      });
      return false;
    }

    this.currentMap = MAPS_BY_ID[mapId];
    this.tiles = createTiles(this.currentMap);
    this.path = createPathPoints(this.currentMap.path);
    this.pathKeySet = createPathKeySet(this.currentMap.path);
    this.pendingEvents.push({
      type: 'game-reset',
      message: `${this.currentMap.name} selected.`,
    });
    return true;
  }

  selectTower(typeId: TowerTypeId): void {
    this.selectedTower = typeId;
  }

  setContinuousMode(enabled: boolean): void {
    this.continuousMode = enabled;
    this.refreshContinuousStartCountdown();
  }

  selectPlacedTower(towerId: string): boolean {
    const tower = this.towers.find((candidate) => candidate.id === towerId);
    if (!tower) {
      return false;
    }

    this.selectedPlacedTowerId = towerId;
    this.pendingEvents.push({
      type: 'tower-selected',
      message: `${TOWER_TYPES[tower.typeId].name} selected.`,
    });
    return true;
  }

  removeSelectedTower(): PlacementResult {
    if (this.isGameOver) {
      return this.rejectPlacement('The game is over.');
    }

    const towerIndex = this.towers.findIndex((candidate) => candidate.id === this.selectedPlacedTowerId);
    if (towerIndex === -1) {
      return this.rejectPlacement('Select a cat to remove.');
    }

    const [tower] = this.towers.splice(towerIndex, 1);
    this.selectedPlacedTowerId = null;
    this.refreshContinuousStartCountdown();
    this.pendingEvents.push({
      type: 'tower-removed',
      message: `${TOWER_TYPES[tower.typeId].name} withdrawn.`,
    });
    return { ok: true };
  }

  upgradeSelectedTower(upgradeId?: string): PlacementResult {
    if (!this.canUpgradeTowers()) {
      return this.rejectPlacement('Start a wave before upgrading cats.');
    }

    const tower = this.towers.find((candidate) => candidate.id === this.selectedPlacedTowerId);
    if (!tower) {
      return this.rejectPlacement('Select a cat to upgrade.');
    }

    const towerSnapshot = tower.toSnapshot();
    const chosenUpgrade = upgradeId
      ? towerSnapshot.availableUpgrades.find((upgrade) => upgrade.id === upgradeId)
      : towerSnapshot.availableUpgrades.length === 1
        ? towerSnapshot.availableUpgrades[0]
        : null;

    if (!chosenUpgrade) {
      if (!towerSnapshot.canUpgrade) {
        return this.rejectPlacement('That cat is already fully upgraded.');
      }

      return this.rejectPlacement('Choose an upgrade path first.');
    }

    if (this.gold < chosenUpgrade.cost) {
      this.pendingEvents.push({
        type: 'insufficient-gold',
        message: 'Not enough gold for that upgrade.',
      });
      return { ok: false, reason: 'Not enough gold.' };
    }

    const upgraded = tower.upgrade(chosenUpgrade.id);
    if (!upgraded) {
      return this.rejectPlacement('That upgrade is no longer available.');
    }

    this.gold -= chosenUpgrade.cost;
    this.refreshContinuousStartCountdown();
    this.pendingEvents.push({
      type: 'tower-upgraded',
      message: `${TOWER_TYPES[tower.typeId].name} learned ${chosenUpgrade.name}.`,
    });
    return { ok: true };
  }

  startWave(): boolean {
    if (this.isWaveActive || this.isGameOver) {
      return false;
    }

    this.wave += 1;
    this.activeBlueprint = this.waveManager.createBlueprint(this.wave);
    this.currentWaveElapsedMs = 0;
    this.currentBlueprintIndex = 0;
    this.isWaveActive = true;
    this.autoStartCountdownMs = null;
    this.selectedPlacedTowerId = null;
    this.pendingEvents.push({
      type: 'wave-started',
      message: `Wave ${formatInteger(this.wave)} has started.`,
    });
    return true;
  }

  placeSelectedTower(col: number, row: number): PlacementResult {
    return this.placeTower(col, row, this.selectedTower);
  }

  placeTower(col: number, row: number, typeId: TowerTypeId): PlacementResult {
    if (this.isGameOver) {
      return { ok: false, reason: 'The game is over.' };
    }

    if (!isInsideBoard({ col, row }, this.currentMap)) {
      return this.rejectPlacement('That tile is outside the board.');
    }

    if (isPathTile({ col, row }, this.pathKeySet)) {
      return this.rejectPlacement('Kittens cannot block the rodent trail.');
    }

    if (this.towers.some((tower) => tower.col === col && tower.row === row)) {
      return this.rejectPlacement('A kitten already guards this tile.');
    }

    const config = TOWER_TYPES[typeId];
    if (this.gold < config.cost) {
      this.pendingEvents.push({
        type: 'insufficient-gold',
        message: 'Not enough gold for that kitten.',
      });
      return { ok: false, reason: 'Not enough gold.' };
    }

    this.gold -= config.cost;
    const tower = new Tower(typeId, col, row);
    this.towers.push(tower);
    this.selectedPlacedTowerId = tower.id;
    this.refreshContinuousStartCountdown();
    this.pendingEvents.push({
      type: 'tower-placed',
      message: `${config.name} deployed.`,
    });
    return { ok: true };
  }

  tick(deltaMs: number): void {
    if (this.isGameOver) {
      return;
    }

    if (!this.isWaveActive && this.autoStartCountdownMs !== null) {
      this.autoStartCountdownMs = Math.max(0, this.autoStartCountdownMs - deltaMs);
      if (this.autoStartCountdownMs === 0) {
        this.startWave();
      }
    }

    if (this.isWaveActive) {
      this.currentWaveElapsedMs += deltaMs;
      this.spawnScheduledEnemies();
    }

    for (const enemy of this.enemies) {
      const reachedBase = enemy.advance(deltaMs, this.path);
      if (reachedBase) {
        this.lives -= enemy.damage;
        enemy.takeDamage(enemy.currentHp);
        this.pendingEvents.push({
          type: 'enemy-leaked',
          message: 'A rodent slipped past the kittens.',
        });
      }
    }

    this.enemies = this.enemies.filter((enemy) => enemy.isAlive);

    for (const tower of this.towers) {
      const projectile = tower.attack(deltaMs, this.enemies, this.path);
      if (projectile) {
        this.projectiles.push({ ...projectile, ageMs: 0 });
        this.pendingEvents.push({
          type: 'tower-fired',
          message: 'A kitten launched an attack.',
        });
      }
    }

    const defeated: Enemy[] = [];
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.isAlive) {
        return true;
      }

      defeated.push(enemy);
      return false;
    });

    for (const enemy of defeated) {
      this.gold += enemy.reward;
      this.kills += 1;
      this.score += getScorePerKill(this.wave);
      this.pendingEvents.push({
        type: 'enemy-defeated',
        message: 'Rodent defeated.',
      });
    }

    this.projectiles = this.projectiles
      .map((projectile) => ({
        ...projectile,
        ageMs: projectile.ageMs + deltaMs,
        progress: Math.min(1, (projectile.ageMs + deltaMs) / PROJECTILE_DURATION_MS),
      }))
      .filter((projectile) => projectile.ageMs < PROJECTILE_DURATION_MS);

    if (this.lives <= 0) {
      this.isGameOver = true;
      this.isWaveActive = false;
      this.pendingEvents.push({
        type: 'game-over',
        message: 'The rodents overwhelmed the village.',
      });
      return;
    }

    if (
      this.isWaveActive &&
      this.currentBlueprintIndex >= this.activeBlueprint.spawns.length &&
      this.enemies.length === 0
    ) {
      const interest = Math.floor(this.gold * INTEREST_RATE);
      const clearBonus = WAVE_CLEAR_BONUS_BASE + this.wave * WAVE_CLEAR_BONUS_STEP;
      this.gold += interest + clearBonus;
      this.isWaveActive = false;
      this.refreshContinuousStartCountdown();
      this.pendingEvents.push({
        type: 'wave-cleared',
        message: `Wave ${formatInteger(this.wave)} cleared. +${formatInteger(clearBonus)}g bonus, +${formatInteger(interest)}g interest.`,
      });
    }
  }

  getSnapshot(): GameSnapshot {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];

    return {
      boardCols: this.currentMap.cols,
      boardRows: this.currentMap.rows,
      tileSize: TILE_SIZE,
      tiles: this.tiles,
      path: this.currentMap.path,
      mapId: this.currentMap.id,
      mapName: this.currentMap.name,
      canSelectMap: this.canSelectMap(),
      availableMaps: GAME_MAPS,
      gold: this.gold,
      interestRate: INTEREST_RATE,
      projectedInterest: Math.floor(this.gold * INTEREST_RATE),
      lives: this.lives,
      kills: this.kills,
      score: this.score,
      wave: this.wave,
      continuousMode: this.continuousMode,
      autoStartInMs: this.autoStartCountdownMs,
      selectedTower: this.selectedTower,
      selectedPlacedTowerId: this.selectedPlacedTowerId,
      canUpgradeTowers: this.canUpgradeTowers(),
      isWaveActive: this.isWaveActive,
      isGameOver: this.isGameOver,
      towers: this.towers.map((tower) => tower.toSnapshot()),
      enemies: this.enemies.map((enemy) => enemy.toSnapshot(this.path)),
      projectiles: this.projectiles.map((projectile) => ({
        id: projectile.id,
        from: projectile.from,
        to: projectile.to,
        progress: projectile.progress,
        color: projectile.color,
        variant: projectile.variant,
      })),
      towerConfigs: Object.values(TOWER_TYPES),
      events,
    };
  }

  exportSaveData(): GameSaveData {
    return {
      version: 1,
      mapId: this.currentMap.id,
      gold: this.gold,
      lives: this.lives,
      kills: this.kills,
      score: this.score,
      wave: this.wave,
      selectedTower: this.selectedTower,
      isGameOver: this.isGameOver,
      continuousMode: this.continuousMode,
      towers: this.towers.map((tower) => {
        const snapshot = tower.toSnapshot();
        return {
          typeId: snapshot.typeId,
          col: snapshot.col,
          row: snapshot.row,
          level: snapshot.level,
          upgradeIds: tower.getAppliedUpgradeIds(),
          totalKills: snapshot.totalKills,
          totalDamage: snapshot.totalDamage,
        };
      }),
    };
  }

  restoreFromSaveData(save: GameSaveData): boolean {
    const map = MAPS_BY_ID[save.mapId];
    if (!map) {
      return false;
    }

    this.currentMap = map;
    this.tiles = createTiles(this.currentMap);
    this.path = createPathPoints(this.currentMap.path);
    this.pathKeySet = createPathKeySet(this.currentMap.path);
    this.towers = save.towers.map((savedTower) => {
      const tower = new Tower(savedTower.typeId, savedTower.col, savedTower.row);
      if (Array.isArray(savedTower.upgradeIds) && savedTower.upgradeIds.length > 0) {
        tower.restoreUpgradePath(savedTower.upgradeIds);
      } else if (typeof savedTower.level === 'number') {
        tower.restoreLegacyLevel(savedTower.level);
      }
      tower.restoreCombatStats(savedTower.totalKills ?? 0, savedTower.totalDamage ?? 0);
      return tower;
    });
    this.enemies = [];
    this.projectiles = [];
    this.gold = save.gold;
    this.lives = save.lives;
    this.kills = save.kills;
    this.score = save.score ?? save.kills * SCORE_PER_KILL_BASE;
    this.wave = save.wave;
    this.selectedTower = save.selectedTower;
    this.selectedPlacedTowerId = null;
    this.currentWaveElapsedMs = 0;
    this.currentBlueprintIndex = 0;
    this.activeBlueprint = this.waveManager.createBlueprint(Math.max(1, this.wave + 1));
    this.isWaveActive = false;
    this.isGameOver = save.isGameOver;
    this.continuousMode = save.continuousMode ?? false;
    this.autoStartCountdownMs = null;
    this.refreshContinuousStartCountdown();
    this.pendingEvents = [
      {
        type: 'game-reset',
        message: save.isGameOver
          ? 'Saved game restored at the final stand.'
          : `Saved game restored at wave ${formatInteger(Math.max(1, save.wave))}.`,
      },
    ];
    return true;
  }

  private rejectPlacement(reason: string): PlacementResult {
    this.pendingEvents.push({
      type: 'invalid-placement',
      message: reason,
    });
    return { ok: false, reason };
  }

  private spawnScheduledEnemies(): void {
    while (
      this.currentBlueprintIndex < this.activeBlueprint.spawns.length &&
      this.activeBlueprint.spawns[this.currentBlueprintIndex].atMs <= this.currentWaveElapsedMs
    ) {
      const instruction = this.activeBlueprint.spawns[this.currentBlueprintIndex];
      this.enemies.push(new Enemy(instruction.archetype, this.wave));
      this.currentBlueprintIndex += 1;
    }
  }

  private canSelectMap(): boolean {
    return this.wave === 0 && !this.isWaveActive && this.towers.length === 0 && this.enemies.length === 0;
  }

  private canUpgradeTowers(): boolean {
    return this.wave > 0 && !this.isGameOver;
  }

  private refreshContinuousStartCountdown(): void {
    if (!this.continuousMode || !this.canAutoStartNextWave()) {
      this.autoStartCountdownMs = null;
      return;
    }

    this.autoStartCountdownMs = CONTINUOUS_WAVE_DELAY_MS;
  }

  private canAutoStartNextWave(): boolean {
    return this.wave > 0 && !this.isWaveActive && !this.isGameOver;
  }
}
