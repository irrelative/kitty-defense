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

    if (stats.splashRadius > 0) {
      const splashRadiusPx = stats.splashRadius * TILE_SIZE;

      for (const enemy of enemies.filter((enemy) => enemy.isAlive)) {
        const enemyPosition = enemy.getPosition(enemyPathPoints);
        const distance = Math.hypot(
          enemyPosition.x - target.position.x,
          enemyPosition.y - target.position.y,
        );

        if (distance <= splashRadiusPx) {
          this.applyDamage(enemy, stats.damage);
        }
      }
    } else {
      this.applyDamage(target.enemy, stats.damage);
    }

    this.cooldownMs = stats.fireRateMs;

    return {
      id: `projectile-${projectileCounter += 1}`,
      from: origin,
      to: target.position,
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

  getCurrentStats(): Pick<TowerConfig, 'range' | 'damage' | 'fireRateMs' | 'splashRadius'> {
    const config = TOWER_TYPES[this.typeId];
    const appliedSteps = this.getAppliedUpgrades();

    return appliedSteps.reduce(
      (stats, upgrade: TowerUpgradeNode) => ({
        range: stats.range + upgrade.range,
        damage: stats.damage + upgrade.damage,
        fireRateMs: Math.max(220, stats.fireRateMs + upgrade.fireRateMs),
        splashRadius: stats.splashRadius + upgrade.splashRadius,
      }),
      {
        range: config.range,
        damage: config.damage,
        fireRateMs: config.fireRateMs,
        splashRadius: config.splashRadius,
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
