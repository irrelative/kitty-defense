import { DEFAULT_MAP_ID, MAPS_BY_ID } from './constants';
import { Enemy } from './Enemy';
import { Tower } from './Tower';
import { createPathPoints } from './map';

describe('Tower', () => {
  it('offers branching upgrades and improves bombardier stats on the chosen path', () => {
    const tower = new Tower('bombardier', 1, 2);
    const baseSnapshot = tower.toSnapshot();
    const baseStats = tower.getCurrentStats();
    expect(baseSnapshot.availableUpgrades.map((upgrade) => upgrade.name)).toEqual([
      'Siege Fuse',
      'Shrapnel Pack',
    ]);

    expect(tower.upgrade('bombardier-shrapnelpack')).toBe(true);

    const upgradedStats = tower.getCurrentStats();
    const upgradedSnapshot = tower.toSnapshot();

    expect(upgradedStats.range).toBeGreaterThan(baseStats.range);
    expect(upgradedStats.damage).toBeGreaterThan(baseStats.damage);
    expect(upgradedStats.splashRadius).toBeGreaterThan(baseStats.splashRadius);
    expect(upgradedStats.fireRateMs).toBeLessThan(baseStats.fireRateMs);
    expect(upgradedSnapshot.appliedUpgrades.map((upgrade) => upgrade.id)).toEqual([
      'bombardier-shrapnelpack',
    ]);
    expect(upgradedSnapshot.availableUpgrades.map((upgrade) => upgrade.id)).toEqual([
      'bombardier-emberburst',
    ]);
  });

  it('renders claw cat attacks as slashes instead of projectiles', () => {
    const path = createPathPoints(MAPS_BY_ID[DEFAULT_MAP_ID].path);
    const tower = new Tower('claw', 1, 2);
    const enemies = [new Enemy('mouse', 1)];

    const projectile = tower.attack(1500, enemies, path);

    expect(projectile?.variant).toBe('slash');
  });

  it('applies splash damage to clustered enemies for bombardier shots', () => {
    const path = createPathPoints(MAPS_BY_ID[DEFAULT_MAP_ID].path);
    const tower = new Tower('bombardier', 1, 2);
    const enemies = [new Enemy('mouse', 1), new Enemy('mouse', 1), new Enemy('mouse', 1)];

    const projectile = tower.attack(1500, enemies, path);

    expect(projectile?.variant).toBe('bomb');
    expect(enemies.every((enemy) => enemy.currentHp === 26)).toBe(true);
  });

  it('changes projectile animation by chosen upgrade path', () => {
    const path = createPathPoints(MAPS_BY_ID[DEFAULT_MAP_ID].path);

    const shrapnelTower = new Tower('bombardier', 1, 2);
    expect(shrapnelTower.upgrade('bombardier-shrapnelpack')).toBe(true);
    const shrapnelProjectile = shrapnelTower.attack(1500, [new Enemy('mouse', 1)], path);

    const hexTower = new Tower('magic', 1, 2);
    expect(hexTower.upgrade('magic-hexweaver')).toBe(true);
    const hexProjectile = hexTower.attack(1000, [new Enemy('mouse', 1)], path);

    expect(shrapnelProjectile?.variant).toBe('bomb-shrapnel');
    expect(hexProjectile?.variant).toBe('bolt-rune');
  });

  it('tracks total damage and kills dealt by a tower', () => {
    const path = createPathPoints(MAPS_BY_ID[DEFAULT_MAP_ID].path);
    const tower = new Tower('magic', 1, 2);
    const enemies = [new Enemy('mouse', 1)];

    tower.attack(1000, enemies, path);
    tower.attack(1000, enemies, path);

    const snapshot = tower.toSnapshot();

    expect(snapshot.totalDamage).toBe(50);
    expect(snapshot.totalKills).toBe(1);
  });
});
