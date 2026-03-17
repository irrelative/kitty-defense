import type { EnemyArchetype, SpawnInstruction, WaveBlueprint } from '@/types/game';

const getBruteCount = (waveNumber: number, random: () => number): number => {
  if (waveNumber < 5) {
    return 0;
  }

  let bruteCount = 1;

  if (waveNumber >= 7 && random() < Math.min(0.3 + (waveNumber - 7) * 0.08, 0.8)) {
    bruteCount += 1;
  }

  if (waveNumber >= 10 && random() < Math.min(0.18 + (waveNumber - 10) * 0.05, 0.5)) {
    bruteCount += 1;
  }

  return bruteCount;
};

const buildSpawnSequence = (waveNumber: number, random: () => number): SpawnInstruction[] => {
  const total =
    6 + waveNumber * 2 + Math.floor(waveNumber / 2) + Math.floor((waveNumber * waveNumber) / 20);
  const instructions: SpawnInstruction[] = [];
  const cadenceMs = Math.max(250, 780 - waveNumber * 30 - Math.floor(waveNumber / 3) * 20);
  const bruteCount = getBruteCount(waveNumber, random);
  const bruteStartIndex = total - bruteCount;
  let atMs = 0;

  for (let index = 0; index < total; index += 1) {
    let archetype: EnemyArchetype = 'mouse';

    if (waveNumber >= 2 && index === total - 1 && waveNumber % 2 === 0) {
      archetype = 'rat';
    }

    if (waveNumber >= 3 && index % 3 === 2) {
      archetype = 'rat';
    }

    if (waveNumber >= 6 && index % 2 === 1) {
      archetype = 'rat';
    }

    if (waveNumber >= 5 && index >= bruteStartIndex) {
      archetype = 'brute';
    }

    instructions.push({
      atMs,
      archetype,
    });

    let nextGap = cadenceMs;

    if (waveNumber >= 4 && index % 4 === 2) {
      nextGap = Math.max(160, cadenceMs - 180);
    }

    if (waveNumber >= 6 && index % 5 === 4) {
      nextGap = Math.max(130, cadenceMs - 220);
    }

    if (waveNumber >= 8 && index % 6 === 5) {
      nextGap = Math.max(110, cadenceMs - 260);
    }

    if (waveNumber >= 10 && index % 4 === 1) {
      nextGap = Math.max(95, cadenceMs - 300);
    }

    atMs += nextGap;
  }

  return instructions;
};

export class WaveManager {
  constructor(private readonly random: () => number = Math.random) {}

  createBlueprint(waveNumber: number): WaveBlueprint {
    const cadenceMs = Math.max(250, 780 - waveNumber * 30 - Math.floor(waveNumber / 3) * 20);

    return {
      number: waveNumber,
      cadenceMs,
      spawns: buildSpawnSequence(waveNumber, this.random),
    };
  }
}
