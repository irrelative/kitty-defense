import { TILE_SIZE, TOWER_TYPES } from './constants';
import { gridToPoint } from './map';
import type { Enemy } from './Enemy';
import type {
  Point,
  ProjectileVisual,
  TowerConfig,
  TowerSnapshot,
  TowerTypeId,
  TowerUpgradeNode,
} from '@/types/game';

let towerCounter = 0;
let projectileCounter = 0;

const getProjectileVariantForPath = (
  rootUpgradeId: string | undefined,
  fallbackVariant: TowerConfig['projectileVariant'],
): ProjectileVisual['variant'] => {
  switch (rootUpgradeId) {
    case 'archer-marksman':
      return 'orb-tracer';
    case 'archer-volley':
      return 'orb-feather';
    case 'magic-hexweaver':
      return 'bolt-rune';
    case 'bombardier-shrapnelpack':
      return 'bomb-shrapnel';
    case 'claw-guardian':
      return 'slash-guard';
    default:
      return fallbackVariant;
  }
};

export class Tower {
  readonly id: string;

  readonly typeId: TowerTypeId;

  readonly col: number;

  readonly row: number;

  private cooldownMs = 0;

  private upgradeIds: string[] = [];

  private totalKills = 0;

  private totalDamage = 0;

  constructor(typeId: TowerTypeId, col: number, row: number) {
    this.id = `tower-${towerCounter += 1}`;
    this.typeId = typeId;
    this.col = col;
    this.row = row;
  }

  toSnapshot(): TowerSnapshot {
    const stats = this.getCurrentStats();
    return {
      id: this.id,
      typeId: this.typeId,
      col: this.col,
      row: this.row,
      level: this.level,
      range: stats.range,
      damage: stats.damage,
      fireRateMs: stats.fireRateMs,
      splashRadius: stats.splashRadius,
      slowStrength: stats.slowStrength,
      slowDurationMs: stats.slowDurationMs,
      chainCount: stats.chainCount,
      chainRange: stats.chainRange,
      totalKills: this.totalKills,
      totalDamage: this.totalDamage,
      upgradeCost: this.getNextUpgradeCost(),
      canUpgrade: this.canUpgrade(),
      appliedUpgrades: this.getAppliedUpgrades(),
      availableUpgrades: this.getAvailableUpgrades(),
    };
  }

  attack(deltaMs: number, enemies: Enemy[], enemyPathPoints: Point[]): ProjectileVisual | null {
    const config = TOWER_TYPES[this.typeId];
    const stats = this.getCurrentStats();
    this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);

    if (this.cooldownMs > 0) {
      return null;
    }

    const origin = gridToPoint({ col: this.col, row: this.row });
    const rangePx = stats.range * TILE_SIZE;
    const target = enemies
      .filter((enemy) => enemy.isAlive)
      .map((enemy) => ({ enemy, position: enemy.getPosition(enemyPathPoints) }))
      .find(({ position }) => Math.hypot(position.x - origin.x, position.y - origin.y) <= rangePx);

    if (!target) {
      return null;
    }

    const jumpTargets =
      stats.chainCount > 0
        ? this.findChainTargets(target.enemy, target.position, enemies, enemyPathPoints, stats.chainCount, stats.chainRange)
        : [];

    if (stats.chainCount > 0) {
      this.applyEffects(target.enemy, stats.damage, stats.slowStrength, stats.slowDurationMs);
      for (const jumpTarget of jumpTargets) {
        this.applyEffects(
          jumpTarget.enemy,
          stats.damage,
          stats.slowStrength,
          stats.slowDurationMs,
        );
      }
    } else if (stats.splashRadius > 0) {
      const splashRadiusPx = stats.splashRadius * TILE_SIZE;

      for (const enemy of enemies.filter((enemy) => enemy.isAlive)) {
        const enemyPosition = enemy.getPosition(enemyPathPoints);
        const distance = Math.hypot(
          enemyPosition.x - target.position.x,
          enemyPosition.y - target.position.y,
        );

        if (distance <= splashRadiusPx) {
          this.applyEffects(enemy, stats.damage, stats.slowStrength, stats.slowDurationMs);
        }
      }
    } else {
      this.applyEffects(target.enemy, stats.damage, stats.slowStrength, stats.slowDurationMs);
    }

    this.cooldownMs = stats.fireRateMs;

    return {
      id: `projectile-${projectileCounter += 1}`,
      from: origin,
      to: target.position,
      jumps: jumpTargets.map((jumpTarget) => jumpTarget.position),
      progress: 0,
      color: config.accent,
      variant: this.getProjectileVariant(config),
    };
  }

  canUpgrade(): boolean {
    return this.getAvailableUpgrades().length > 0;
  }

  getNextUpgradeCost(): number | null {
    const availableUpgrades = this.getAvailableUpgrades();
    if (availableUpgrades.length === 0) {
      return null;
    }

    return Math.min(...availableUpgrades.map((upgrade) => upgrade.cost));
  }

  upgrade(upgradeId: string): boolean {
    const upgrade = this.getAvailableUpgrades().find((candidate) => candidate.id === upgradeId);
    if (!upgrade) {
      return false;
    }

    this.upgradeIds.push(upgrade.id);
    return true;
  }

  restoreUpgradePath(upgradeIds: string[]): void {
    this.upgradeIds = [];

    for (const upgradeId of upgradeIds) {
      const applied = this.upgrade(upgradeId);
      if (!applied) {
        break;
      }
    }
  }

  restoreLegacyLevel(level: number): void {
    this.upgradeIds = [];
    let currentParentId: string | null = null;

    for (let index = 0; index < level - 1; index += 1) {
      const nextUpgrade = this.getUpgradeTree().find((upgrade) => upgrade.parentId === currentParentId);
      if (!nextUpgrade) {
        break;
      }

      this.upgradeIds.push(nextUpgrade.id);
      currentParentId = nextUpgrade.id;
    }
  }

  getAppliedUpgradeIds(): string[] {
    return [...this.upgradeIds];
  }

  restoreCombatStats(totalKills: number, totalDamage: number): void {
    this.totalKills = totalKills;
    this.totalDamage = totalDamage;
  }

  getCurrentStats(): {
    range: number;
    damage: number;
    fireRateMs: number;
    splashRadius: number;
    slowStrength: number;
    slowDurationMs: number;
    chainCount: number;
    chainRange: number;
  } {
    const config = TOWER_TYPES[this.typeId];
    const appliedSteps = this.getAppliedUpgrades();

    return appliedSteps.reduce(
      (stats, upgrade: TowerUpgradeNode) => ({
        range: stats.range + upgrade.range,
        damage: stats.damage + upgrade.damage,
        fireRateMs: Math.max(220, stats.fireRateMs + upgrade.fireRateMs),
        splashRadius: stats.splashRadius + upgrade.splashRadius,
        slowStrength: stats.slowStrength + (upgrade.slowStrength ?? 0),
        slowDurationMs: stats.slowDurationMs + (upgrade.slowDurationMs ?? 0),
        chainCount: stats.chainCount + (upgrade.chainCount ?? 0),
        chainRange: stats.chainRange + (upgrade.chainRange ?? 0),
      }),
      {
        range: config.range,
        damage: config.damage,
        fireRateMs: config.fireRateMs,
        splashRadius: config.splashRadius,
        slowStrength: config.slowStrength ?? 0,
        slowDurationMs: config.slowDurationMs ?? 0,
        chainCount: config.chainCount ?? 0,
        chainRange: config.chainRange ?? 0,
      },
    );
  }

  private get level(): number {
    return 1 + this.upgradeIds.length;
  }

  private getAppliedUpgrades(): TowerUpgradeNode[] {
    return this.upgradeIds
      .map((upgradeId) => this.getUpgradeNodeById(upgradeId))
      .filter((upgrade): upgrade is TowerUpgradeNode => Boolean(upgrade));
  }

  private getAvailableUpgrades(): TowerUpgradeNode[] {
    const purchasedUpgradeIds = new Set(this.upgradeIds);
    const parentId = this.upgradeIds.at(-1) ?? null;

    return this.getUpgradeTree().filter(
      (upgrade) => !purchasedUpgradeIds.has(upgrade.id) && upgrade.parentId === parentId,
    );
  }

  private getUpgradeTree(): TowerUpgradeNode[] {
    return TOWER_TYPES[this.typeId].upgradeTree;
  }

  private getUpgradeNodeById(upgradeId: string): TowerUpgradeNode | undefined {
    return this.getUpgradeTree().find((upgrade) => upgrade.id === upgradeId);
  }

  private getProjectileVariant(config: TowerConfig): ProjectileVisual['variant'] {
    return getProjectileVariantForPath(this.upgradeIds[0], config.projectileVariant);
  }

  private findChainTargets(
    initialEnemy: Enemy,
    initialPosition: Point,
    enemies: Enemy[],
    enemyPathPoints: Point[],
    chainCount: number,
    chainRange: number,
  ): Array<{ enemy: Enemy; position: Point }> {
    const chainedTargets: Array<{ enemy: Enemy; position: Point }> = [];
    const chainedIds = new Set([initialEnemy.id]);
    let anchor = initialPosition;
    const chainRangePx = chainRange * TILE_SIZE;

    for (let index = 0; index < chainCount; index += 1) {
      const nextTarget = enemies
        .filter((enemy) => enemy.isAlive && !chainedIds.has(enemy.id))
        .map((enemy) => ({ enemy, position: enemy.getPosition(enemyPathPoints) }))
        .filter(
          ({ position }) =>
            Math.hypot(position.x - anchor.x, position.y - anchor.y) <= chainRangePx,
        )
        .sort(
          (left, right) =>
            Math.hypot(left.position.x - anchor.x, left.position.y - anchor.y) -
            Math.hypot(right.position.x - anchor.x, right.position.y - anchor.y),
        )[0];

      if (!nextTarget) {
        break;
      }

      chainedTargets.push(nextTarget);
      chainedIds.add(nextTarget.enemy.id);
      anchor = nextTarget.position;
    }

    return chainedTargets;
  }

  private applyEffects(
    enemy: Enemy,
    damage: number,
    slowStrength: number,
    slowDurationMs: number,
  ): void {
    if (slowStrength > 0 && slowDurationMs > 0) {
      enemy.applySlow(slowStrength, slowDurationMs);
    }

    this.applyDamage(enemy, damage);
  }

  private applyDamage(enemy: Enemy, amount: number): void {
    const dealt = Math.min(enemy.currentHp, amount);
    if (dealt <= 0) {
      return;
    }

    const defeated = enemy.takeDamage(amount);
    this.totalDamage += dealt;
    if (defeated) {
      this.totalKills += 1;
    }
  }
}
