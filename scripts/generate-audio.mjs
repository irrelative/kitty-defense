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

const midiFrequency = (note) => 440 * 2 ** ((note - 69) / 12);
const triangle = (phase) => (2 / Math.PI) * Math.asin(Math.sin(phase));
const TEMPO = 128;
const BEAT_SECONDS = 60 / TEMPO;
const BAR_SECONDS = BEAT_SECONDS * 4;
const THEME_BARS = 16;
const THEME_DURATION = BAR_SECONDS * THEME_BARS;

const chordProgression = [
  [60, 64, 67],
  [57, 60, 64],
  [65, 69, 72],
  [67, 71, 74],
  [60, 64, 67],
  [57, 60, 64],
  [65, 69, 72],
  [67, 71, 74],
  [57, 60, 64],
  [65, 69, 72],
  [60, 64, 67],
  [67, 71, 74],
  [65, 69, 72],
  [60, 64, 67],
  [67, 71, 74],
  [67, 71, 74],
];

const leadNotes = [
  72,
  76,
  79,
  76,
  74,
  72,
  69,
  null,
  72,
  74,
  76,
  79,
  81,
  79,
  76,
  null,
  77,
  76,
  74,
  72,
  69,
  72,
  74,
  null,
  71,
  74,
  79,
  77,
  76,
  74,
  72,
  null,
  72,
  76,
  79,
  83,
  81,
  79,
  76,
  74,
  72,
  74,
  76,
  79,
  84,
  83,
  79,
  null,
  77,
  81,
  84,
  81,
  79,
  77,
  76,
  74,
  71,
  74,
  77,
  79,
  83,
  81,
  79,
  null,
  81,
  84,
  88,
  84,
  83,
  81,
  79,
  76,
  77,
  81,
  84,
  86,
  84,
  81,
  79,
  null,
  79,
  83,
  86,
  83,
  81,
  79,
  76,
  74,
  74,
  77,
  79,
  83,
  81,
  79,
  77,
  null,
  77,
  76,
  74,
  72,
  69,
  72,
  74,
  76,
  79,
  76,
  72,
  74,
  76,
  79,
  81,
  null,
  83,
  81,
  79,
  77,
  76,
  74,
  72,
  71,
  74,
  77,
  79,
  76,
  74,
  71,
  67,
  null,
];

writeWave('theme.wav', THEME_DURATION, (time) => {
  const barIndex = Math.min(THEME_BARS - 1, Math.floor(time / BAR_SECONDS));
  const barTime = time % BAR_SECONDS;
  const beatIndex = Math.floor(barTime / BEAT_SECONDS);
  const beatTime = barTime % BEAT_SECONDS;
  const eighthSeconds = BEAT_SECONDS / 2;
  const eighthIndex = Math.floor(time / eighthSeconds);
  const eighthTime = time % eighthSeconds;
  const sixteenthSeconds = BEAT_SECONDS / 4;
  const sixteenthIndex = Math.floor(barTime / sixteenthSeconds);
  const sixteenthTime = barTime % sixteenthSeconds;
  const chord = chordProgression[barIndex];

  const leadNote = leadNotes[eighthIndex];
  const leadFrequency = leadNote === null ? 0 : midiFrequency(leadNote);
  const leadEnvelope =
    leadNote === null ? 0 : envelope(eighthTime, 0.012, eighthSeconds * 0.42, eighthSeconds);
  const leadPhase = eighthTime * 2 * Math.PI * leadFrequency;
  const lead =
    leadEnvelope *
    (triangle(leadPhase) * 0.105 + Math.sin(leadPhase * 2) * 0.025) *
    (barIndex >= 8 ? 1.08 : 0.92);

  const padEnvelope = envelope(barTime, 0.16, 0.28, BAR_SECONDS);
  const pad =
    chord.reduce((sum, note, index) => {
      const frequency = midiFrequency(note - 12);
      const drift = 1 + Math.sin(time * 0.7 + index * 1.8) * 0.0025;
      return sum + Math.sin(time * 2 * Math.PI * frequency * drift);
    }, 0) *
    padEnvelope *
    0.028;

  const arpNote = chord[sixteenthIndex % chord.length] + 12 + (sixteenthIndex % 6 >= 3 ? 12 : 0);
  const arpFrequency = midiFrequency(arpNote);
  const arpEnvelope = envelope(sixteenthTime, 0.006, sixteenthSeconds * 0.66, sixteenthSeconds);
  const arp =
    triangle(sixteenthTime * 2 * Math.PI * arpFrequency) *
    arpEnvelope *
    (barIndex < 4 ? 0.018 : 0.035);

  const bassNote = beatIndex === 2 ? chord[2] - 24 : chord[0] - 24;
  const bassFrequency = midiFrequency(bassNote);
  const bassEnvelope = envelope(beatTime, 0.008, BEAT_SECONDS * 0.52, BEAT_SECONDS);
  const bassPhase = beatTime * 2 * Math.PI * bassFrequency;
  const bass = (Math.sin(bassPhase) * 0.072 + triangle(bassPhase) * 0.025) * bassEnvelope;

  const kickTime = beatTime;
  const kick =
    Math.sin(kickTime * 2 * Math.PI * (118 - kickTime * 145)) *
    Math.exp(-kickTime * 17) *
    (barIndex < 4 ? 0.04 : 0.105);
  const snare =
    (beatIndex === 1 || beatIndex === 3) && beatTime < 0.14
      ? noise(Math.floor(time * SAMPLE_RATE)) * Math.exp(-beatTime * 30) * 0.075
      : 0;
  const hat =
    eighthTime < 0.045
      ? noise(Math.floor(time * SAMPLE_RATE * 1.7)) * Math.exp(-eighthTime * 75) * 0.025
      : 0;
  const fill =
    (barIndex === 7 || barIndex === 15) && sixteenthIndex >= 12
      ? Math.sin(sixteenthTime * 2 * Math.PI * (150 + sixteenthIndex * 12)) *
        Math.exp(-sixteenthTime * 22) *
        0.055
      : 0;

  const sectionLift = barIndex >= 8 && barIndex < 12 ? 1.06 : 1;
  return (lead + pad + arp + bass + kick + snare + hat + fill) * sectionLift;
});
