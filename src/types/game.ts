export type TileType = 'grass' | 'path' | 'base';
export type TowerTypeId = 'archer' | 'claw' | 'magic' | 'bombardier' | 'frost' | 'storm';
export type EnemyArchetype = 'mouse' | 'rat' | 'brute';
export type MapId = 'meadow-run' | 'creek-bend' | 'orchard-loop';
export type GameEventType =
  | 'enemy-defeated'
  | 'enemy-leaked'
  | 'tower-placed'
  | 'tower-removed'
  | 'tower-selected'
  | 'tower-upgraded'
  | 'tower-fired'
  | 'wave-started'
  | 'wave-cleared'
  | 'insufficient-gold'
  | 'invalid-placement'
  | 'game-over'
  | 'game-reset';

export interface GridPosition {
  col: number;
  row: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Tile {
  col: number;
  row: number;
  type: TileType;
}

export interface GameMapConfig {
  id: MapId;
  name: string;
  tagline: string;
  description: string;
  cols: number;
  rows: number;
  path: GridPosition[];
}

export interface TowerUpgradeStep {
  cost: number;
  range: number;
  damage: number;
  fireRateMs: number;
  splashRadius: number;
  slowStrength?: number;
  slowDurationMs?: number;
  chainCount?: number;
  chainRange?: number;
}

export interface TowerUpgradeNode extends TowerUpgradeStep {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
}

export interface TowerConfig {
  id: TowerTypeId;
  name: string;
  cost: number;
  range: number;
  damage: number;
  fireRateMs: number;
  splashRadius: number;
  accent: string;
  description: string;
  spriteName: string;
  projectileVariant: 'orb' | 'bolt' | 'bomb' | 'slash' | 'frost' | 'chain';
  slowStrength?: number;
  slowDurationMs?: number;
  chainCount?: number;
  chainRange?: number;
  upgradeTree: TowerUpgradeNode[];
}

export interface EnemyConfig {
  id: EnemyArchetype;
  name: string;
  baseHp: number;
  speed: number;
  reward: number;
  damage: number;
  tint: string;
  spriteName: string;
}

export interface SpawnInstruction {
  atMs: number;
  archetype: EnemyArchetype;
}

export interface WaveBlueprint {
  number: number;
  cadenceMs: number;
  spawns: SpawnInstruction[];
}

export interface ProjectileVisual {
  id: string;
  from: Point;
  to: Point;
  jumps?: Point[];
  progress: number;
  color: string;
  variant:
    | 'orb'
    | 'orb-tracer'
    | 'orb-feather'
    | 'bolt'
    | 'bolt-rune'
    | 'bomb'
    | 'bomb-shrapnel'
    | 'frost'
    | 'chain'
    | 'slash'
    | 'slash-guard';
}

export interface TowerSnapshot {
  id: string;
  typeId: TowerTypeId;
  col: number;
  row: number;
  level: number;
  range: number;
  damage: number;
  fireRateMs: number;
  splashRadius: number;
  slowStrength: number;
  slowDurationMs: number;
  chainCount: number;
  chainRange: number;
  totalKills: number;
  totalDamage: number;
  upgradeCost: number | null;
  canUpgrade: boolean;
  appliedUpgrades: TowerUpgradeNode[];
  availableUpgrades: TowerUpgradeNode[];
}

export interface EnemySnapshot {
  id: string;
  typeId: EnemyArchetype;
  hp: number;
  maxHp: number;
  position: Point;
  tint: string;
}

export interface GameEvent {
  type: GameEventType;
  message: string;
}

export interface GameSnapshot {
  boardCols: number;
  boardRows: number;
  tileSize: number;
  tiles: Tile[];
  path: GridPosition[];
  mapId: MapId;
  mapName: string;
  canSelectMap: boolean;
  availableMaps: GameMapConfig[];
  gold: number;
  interestRate: number;
  projectedInterest: number;
  lives: number;
  kills: number;
  score: number;
  wave: number;
  continuousMode: boolean;
  autoStartInMs: number | null;
  selectedTower: TowerTypeId;
  selectedPlacedTowerId: string | null;
  canUpgradeTowers: boolean;
  isWaveActive: boolean;
  isGameOver: boolean;
  towers: TowerSnapshot[];
  enemies: EnemySnapshot[];
  projectiles: ProjectileVisual[];
  towerConfigs: TowerConfig[];
  events: GameEvent[];
}

export interface PlacementResult {
  ok: boolean;
  reason?: string;
}

export interface SavedTowerState {
  typeId: TowerTypeId;
  col: number;
  row: number;
  level?: number;
  upgradeIds?: string[];
  totalKills?: number;
  totalDamage?: number;
}

export interface GameSaveData {
  version: 1;
  mapId: MapId;
  gold: number;
  lives: number;
  kills: number;
  score?: number;
  wave: number;
  selectedTower: TowerTypeId;
  isGameOver: boolean;
  continuousMode?: boolean;
  towers: SavedTowerState[];
}
