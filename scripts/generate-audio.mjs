import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const SAMPLE_RATE = 22050;
const OUTPUT_DIR = join(process.cwd(), 'public', 'audio');

mkdirSync(OUTPUT_DIR, { recursive: true });

const clamp = (value) => Math.max(-1, Math.min(1, value));

const writeWave = (fileName, durationSeconds, sampleFactory) => {
  const frameCount = Math.floor(SAMPLE_RATE * durationSeconds);
  const data = Buffer.alloc(frameCount * 2);

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / SAMPLE_RATE;
    const sample = clamp(sampleFactory(time, index / frameCount));
    data.writeInt16LE(Math.round(sample * 32767), index * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  writeFileSync(join(OUTPUT_DIR, fileName), Buffer.concat([header, data]));
};

const envelope = (time, attack, release, total) => {
  if (time < attack) {
    return time / attack;
  }

  if (time > total - release) {
    return Math.max(0, (total - time) / release);
  }

  return 1;
};

const noise = (index) => {
  const value = Math.sin(index * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
};

writeWave('place.wav', 0.3, (time) => {
  const env = envelope(time, 0.02, 0.12, 0.3);
  return (
    env * (Math.sin(time * 2 * Math.PI * 660) * 0.35 + Math.sin(time * 2 * Math.PI * 990) * 0.14)
  );
});

writeWave('shoot.wav', 0.18, (time) => {
  const env = envelope(time, 0.005, 0.08, 0.18);
  const glide = 920 - time * 1800;
  return env * Math.sin(time * 2 * Math.PI * glide) * 0.45;
});

writeWave('attack-archer.wav', 0.2, (time, progress) => {
  const env = envelope(time, 0.003, 0.14, 0.2);
  const twang = Math.sin(time * 2 * Math.PI * (980 - progress * 420));
  return env * (twang * 0.3 + noise(Math.floor(time * SAMPLE_RATE)) * 0.08);
});

writeWave('attack-claw.wav', 0.24, (time, progress) => {
  const env = envelope(time, 0.004, 0.18, 0.24);
  return env * noise(Math.floor(time * SAMPLE_RATE)) * (0.38 - progress * 0.18);
});

writeWave('attack-magic.wav', 0.32, (time, progress) => {
  const env = envelope(time, 0.01, 0.18, 0.32);
  const tone = Math.sin(time * 2 * Math.PI * (520 + progress * 880));
  const shimmer = Math.sin(time * 2 * Math.PI * 1040) * 0.35;
  return env * (tone + shimmer) * 0.24;
});

writeWave('attack-frost.wav', 0.38, (time) => {
  const env = envelope(time, 0.01, 0.24, 0.38);
  const chime = Math.sin(time * 2 * Math.PI * 1320) + Math.sin(time * 2 * Math.PI * 1760);
  return env * chime * 0.15;
});

writeWave('attack-storm.wav', 0.28, (time, progress) => {
  const env = envelope(time, 0.002, 0.18, 0.28);
  const crackle = noise(Math.floor(time * SAMPLE_RATE)) * 0.28;
  const bolt = Math.sin(time * 2 * Math.PI * (1300 - progress * 900)) * 0.3;
  return env * (crackle + bolt);
});

writeWave('attack-bombardier.wav', 0.44, (time, progress) => {
  const env = envelope(time, 0.005, 0.3, 0.44);
  const thump = Math.sin(time * 2 * Math.PI * (150 - progress * 90));
  return env * (thump * 0.42 + noise(Math.floor(time * SAMPLE_RATE)) * 0.12);
});

writeWave('defeat.wav', 0.22, (time, progress) => {
  const env = envelope(time, 0.002, 0.16, 0.22);
  return env * Math.sin(time * 2 * Math.PI * (620 + progress * 260)) * 0.24;
});

writeWave('upgrade.wav', 0.75, (time) => {
  const env = envelope(time, 0.01, 0.2, 0.75);
  const step = Math.floor(time / 0.15);
  const frequencies = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  return env * Math.sin(time * 2 * Math.PI * frequencies[Math.min(step, 4)]) * 0.3;
});

writeWave('deny.wav', 0.24, (time) => {
  const env = envelope(time, 0.005, 0.12, 0.24);
  return env * (Math.sin(time * 2 * Math.PI * 175) + Math.sin(time * 2 * Math.PI * 147)) * 0.2;
});

writeWave('wave.wav', 0.8, (time) => {
  const env = envelope(time, 0.03, 0.2, 0.8);
  const melody = Math.sin(time * 2 * Math.PI * 392) + Math.sin(time * 2 * Math.PI * 523.25);
  return env * melody * 0.18;
});

writeWave('leak.wav', 0.7, (time) => {
  const env = envelope(time, 0.02, 0.24, 0.7);
  const wobble = Math.sin(time * 2 * Math.PI * (220 - time * 110));
  return env * wobble * 0.34;
});

writeWave('gameover.wav', 1.2, (time) => {
  const env = envelope(time, 0.02, 0.32, 1.2);
  const chord =
    Math.sin(time * 2 * Math.PI * 196) +
    Math.sin(time * 2 * Math.PI * 164.81) +
    Math.sin(time * 2 * Math.PI * 130.81);
  return env * chord * 0.16;
});

const themeNotes = [
  [440, 0.25],
  [493.88, 0.25],
  [587.33, 0.25],
  [493.88, 0.25],
  [440, 0.25],
  [369.99, 0.25],
  [329.63, 0.25],
  [369.99, 0.25],
  [392, 0.25],
  [440, 0.25],
  [493.88, 0.25],
  [587.33, 0.25],
  [440, 0.25],
  [392, 0.25],
  [329.63, 0.25],
  [392, 0.25],
];

writeWave('theme.wav', 16, (time) => {
  const phraseTime = time % 4;
  let cursor = 0;
  let noteFrequency = 293.66;
  let noteDuration = 0.5;

  for (const [frequency, duration] of themeNotes) {
    if (phraseTime >= cursor && phraseTime < cursor + duration) {
      noteFrequency = frequency;
      noteDuration = duration;
      break;
    }
    cursor += duration;
  }

  const localTime = phraseTime - cursor;
  const env = envelope(localTime, 0.02, Math.min(0.16, noteDuration / 2), noteDuration);
  const lead = Math.sin(localTime * 2 * Math.PI * noteFrequency);
  const pad = Math.sin(localTime * 2 * Math.PI * noteFrequency * 0.5);
  const bassFrequency = [110, 92.5, 98, 82.41][Math.floor(time / 4)];
  const bass = Math.sin(time * 2 * Math.PI * bassFrequency) * 0.055;
  const pulse = time % 0.5 < 0.04 ? noise(Math.floor(time * SAMPLE_RATE)) * 0.025 : 0;
  return env * (lead * 0.13 + pad * 0.075) + bass + pulse;
});
