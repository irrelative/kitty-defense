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

writeWave('place.wav', 0.3, (time) => {
  const env = envelope(time, 0.02, 0.12, 0.3);
  return env * (Math.sin(time * 2 * Math.PI * 660) * 0.35 + Math.sin(time * 2 * Math.PI * 990) * 0.14);
});

writeWave('shoot.wav', 0.18, (time) => {
  const env = envelope(time, 0.005, 0.08, 0.18);
  const glide = 920 - time * 1800;
  return env * Math.sin(time * 2 * Math.PI * glide) * 0.45;
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
  [392, 0.5],
  [523.25, 0.5],
  [587.33, 0.5],
  [659.25, 0.5],
  [523.25, 0.5],
  [392, 0.5],
  [329.63, 0.5],
  [293.66, 0.5],
];

writeWave('theme.wav', 4, (time) => {
  let cursor = 0;
  let noteFrequency = 293.66;
  let noteDuration = 0.5;

  for (const [frequency, duration] of themeNotes) {
    if (time >= cursor && time < cursor + duration) {
      noteFrequency = frequency;
      noteDuration = duration;
      break;
    }
    cursor += duration;
  }

  const localTime = time - cursor;
  const env = envelope(localTime, 0.02, Math.min(0.16, noteDuration / 2), noteDuration);
  const lead = Math.sin(localTime * 2 * Math.PI * noteFrequency);
  const pad = Math.sin(localTime * 2 * Math.PI * noteFrequency * 0.5);
  return env * (lead * 0.16 + pad * 0.08);
});
