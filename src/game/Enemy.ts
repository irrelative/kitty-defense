import { ENEMY_TYPES } from './constants';
import type { EnemyArchetype, EnemySnapshot, Point } from '@/types/game';

let enemyCounter = 0;

export class Enemy {
  readonly id: string;

  readonly typeId: EnemyArchetype;

  readonly maxHp: number;

  readonly reward: number;

  readonly damage: number;

  readonly speed: number;

  readonly tint: string;

  private hp: number;

  private segmentIndex = 0;

  private segmentProgress = 0;

  private slowStrength = 0;

  private slowMsRemaining = 0;

  constructor(typeId: EnemyArchetype, waveNumber: number) {
    const config = ENEMY_TYPES[typeId];
    const hpScale = 1 + (waveNumber - 1) * 0.15 + Math.max(0, waveNumber - 6) * 0.025;
    const speedScale = 1 + (waveNumber - 1) * 0.035 + Math.max(0, waveNumber - 8) * 0.01;

    this.id = `enemy-${enemyCounter += 1}`;
    this.typeId = typeId;
    this.maxHp = Math.round(config.baseHp * hpScale);
    this.hp = this.maxHp;
    this.reward = config.reward;
    this.damage = config.damage;
    this.speed = config.speed * speedScale;
    this.tint = config.tint;
  }

  get currentHp(): number {
    return this.hp;
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  takeDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp === 0;
  }

  applySlow(strength: number, durationMs: number): void {
    if (strength <= 0 || durationMs <= 0 || !this.isAlive) {
      return;
    }

    if (this.slowMsRemaining <= 0 || strength >= this.slowStrength) {
      this.slowStrength = strength;
    }

    this.slowMsRemaining = Math.max(this.slowMsRemaining, durationMs);
  }

  advance(deltaMs: number, path: Point[]): boolean {
    const speedMultiplier =
      this.slowMsRemaining > 0 ? Math.max(0, 1 - Math.min(this.slowStrength, 1)) : 1;
    let distanceRemaining = (this.speed * speedMultiplier * deltaMs) / 1000 * 72;

    while (distanceRemaining > 0 && this.segmentIndex < path.length - 1) {
      const start = path[this.segmentIndex];
      const end = path[this.segmentIndex + 1];
      const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
      const traversed = this.segmentProgress * segmentLength;
      const leftOnSegment = segmentLength - traversed;

      if (distanceRemaining >= leftOnSegment) {
        distanceRemaining -= leftOnSegment;
        this.segmentIndex += 1;
        this.segmentProgress = 0;
      } else {
        this.segmentProgress += distanceRemaining / segmentLength;
        distanceRemaining = 0;
      }
    }

    if (this.slowMsRemaining > 0) {
      this.slowMsRemaining = Math.max(0, this.slowMsRemaining - deltaMs);
      if (this.slowMsRemaining === 0) {
        this.slowStrength = 0;
      }
    }

    return this.segmentIndex >= path.length - 1;
  }

  getPosition(path: Point[]): Point {
    if (this.segmentIndex >= path.length - 1) {
      return path[path.length - 1];
    }

    const start = path[this.segmentIndex];
    const end = path[this.segmentIndex + 1];

    return {
      x: start.x + (end.x - start.x) * this.segmentProgress,
      y: start.y + (end.y - start.y) * this.segmentProgress,
    };
  }

  toSnapshot(path: Point[]): EnemySnapshot {
    return {
      id: this.id,
      typeId: this.typeId,
      hp: this.hp,
      maxHp: this.maxHp,
      position: this.getPosition(path),
      tint: this.tint,
    };
  }
}
