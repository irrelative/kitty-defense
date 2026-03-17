import { WaveManager } from './WaveManager';

describe('WaveManager', () => {
  it('increases spawn count with later waves', () => {
    const manager = new WaveManager();
    const waveOne = manager.createBlueprint(1);
    const waveFour = manager.createBlueprint(4);

    expect(waveFour.spawns.length).toBeGreaterThan(waveOne.spawns.length);
  });

  it('introduces stronger rodents on higher waves', () => {
    const manager = new WaveManager();
    const waveFive = manager.createBlueprint(5);

    expect(waveFive.spawns.some((spawn) => spawn.archetype === 'brute')).toBe(true);
    expect(waveFive.spawns.some((spawn) => spawn.archetype === 'rat')).toBe(true);
  });

  it('can include multiple brute rats on later waves', () => {
    const manager = new WaveManager(() => 0);
    const waveTen = manager.createBlueprint(10);
    const bruteCount = waveTen.spawns.filter((spawn) => spawn.archetype === 'brute').length;

    expect(bruteCount).toBeGreaterThan(1);
  });

  it('still allows only one brute rat when extra rolls miss', () => {
    const manager = new WaveManager(() => 0.99);
    const waveTen = manager.createBlueprint(10);
    const bruteCount = waveTen.spawns.filter((spawn) => spawn.archetype === 'brute').length;

    expect(bruteCount).toBe(1);
  });
});
