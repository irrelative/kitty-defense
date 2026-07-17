import { Enemy } from './Enemy';

describe('Enemy', () => {
  it('faces the horizontal direction it is traveling', () => {
    const enemy = new Enemy('mouse', 1);
    const doublingBackPath = [
      { x: 0, y: 0 },
      { x: 72, y: 0 },
      { x: 0, y: 0 },
    ];

    expect(enemy.toSnapshot(doublingBackPath).facing).toBe('right');

    enemy.advance(1500, doublingBackPath);

    expect(enemy.toSnapshot(doublingBackPath).facing).toBe('left');
  });

  it('keeps its last horizontal facing while moving vertically', () => {
    const enemy = new Enemy('mouse', 1);
    const turningPath = [
      { x: 0, y: 0 },
      { x: 72, y: 0 },
      { x: 72, y: 72 },
    ];

    enemy.advance(1300, turningPath);

    expect(enemy.toSnapshot(turningPath).facing).toBe('right');
  });
});
