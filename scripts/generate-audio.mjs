import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const SAMPLE_RATE = 22050;
const OUTPUT_DIR = join(process.cwd(), 'public', 'audio');

mkdirSync(OUTPUT_DIR, { recursive: true });

const clamp = (value) => Math.max(-1, Math.min(1, value));

const writeWave = (fileName, durationSeconds, sampleFactory, channels = 1) => {
  const frameCount = Math.floor(SAMPLE_RATE * durationSeconds);
  const bytesPerFrame = channels * 2;
  const data = Buffer.alloc(frameCount * bytesPerFrame);

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / SAMPLE_RATE;
    const generated = sampleFactory(time, index / frameCount);
    const samples = Array.isArray(generated) ? generated : [generated];

    for (let channel = 0; channel < channels; channel += 1) {
      const sample = clamp(samples[channel] ?? samples[0]);
      data.writeInt16LE(Math.round(sample * 32767), index * bytesPerFrame + channel * 2);
    }
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * bytesPerFrame, 28);
  header.writeUInt16LE(bytesPerFrame, 32);
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
const softSquare = (phase) => Math.tanh(Math.sin(phase) * 2.2);
const TEMPO = 126;
const BEAT_SECONDS = 60 / TEMPO;
const BAR_SECONDS = BEAT_SECONDS * 4;
const EIGHTH_SECONDS = BEAT_SECONDS / 2;
const SIXTEENTH_SECONDS = BEAT_SECONDS / 4;
const THEME_BARS = 24;
const THEME_DURATION = BAR_SECONDS * THEME_BARS;

const chordProgression = [
  [60, 64, 67],
  [57, 60, 64],
  [65, 69, 72],
  [67, 71, 74],
  [60, 64, 67],
  [64, 67, 71],
  [65, 69, 72],
  [67, 71, 74],
  [57, 60, 64],
  [65, 69, 72],
  [60, 64, 67],
  [67, 71, 74],
  [57, 60, 64],
  [65, 69, 72],
  [60, 64, 67],
  [67, 71, 74],
  [65, 69, 72],
  [60, 64, 67],
  [62, 65, 69],
  [67, 71, 74],
  [57, 60, 64],
  [65, 69, 72],
  [60, 64, 67],
  [67, 71, 74],
];

const leadBars = [
  [72, null, 76, null, 79, null, 76, null],
  [72, null, 76, null, 81, null, 79, null],
  [77, null, 81, null, 84, null, 81, null],
  [79, null, 83, null, 86, 83, 81, 79],
  [72, 76, 79, 76, 74, 72, 69, null],
  [71, 74, 79, 83, 81, 79, 76, null],
  [77, 81, 84, 81, 79, 77, 76, 74],
  [71, 74, 79, 77, 76, 74, 72, null],
  [81, 84, 88, 84, 83, 81, 79, 76],
  [77, 81, 84, 86, 84, 81, 79, null],
  [79, 83, 86, 83, 81, 79, 76, 74],
  [74, 77, 79, 83, 81, 79, 77, null],
  [81, 84, 88, 86, 84, 83, 81, 79],
  [84, 81, 79, 77, 81, 79, 76, 74],
  [79, 83, 86, 88, 86, 83, 81, 79],
  [74, 79, 83, 81, 79, 77, 76, null],
  [77, 81, 84, 81, 79, 77, 76, 74],
  [76, 79, 84, 83, 81, 79, 76, null],
  [74, 77, 81, 84, 81, 77, 74, 72],
  [71, 74, 79, 83, 81, 79, 76, null],
  [72, 76, 81, 79, 76, 74, 72, null],
  [77, 81, 84, 81, 79, 77, 76, null],
  [79, 76, 72, 74, 76, 79, 81, 83],
  [79, 77, 74, 71, 74, 72, 71, null],
];
const leadNotes = leadBars.flat();

const counterBars = [
  [69, null, 72, null, 76, null, 72, null],
  [69, null, 72, null, 77, null, 76, null],
  [72, null, 77, null, 81, null, 77, null],
  [74, null, 79, null, 83, 79, 77, null],
];
const counterNotes = counterBars.flat();

const pan = (value, position) => [
  value * (1 - Math.max(0, position) * 0.5),
  value * (1 - Math.max(0, -position) * 0.5),
];

const addStereo = (...voices) =>
  voices.reduce((mix, voice) => [mix[0] + voice[0], mix[1] + voice[1]], [0, 0]);

const renderPluck = (time, notes, volume, octaveOffset = 0) => {
  if (time < 0) {
    return 0;
  }

  const noteIndex = Math.floor(time / EIGHTH_SECONDS) % notes.length;
  const note = notes[noteIndex];
  if (note === null) {
    return 0;
  }

  const noteTime = time % EIGHTH_SECONDS;
  const frequency = midiFrequency(note + octaveOffset);
  const phase = noteTime * 2 * Math.PI * frequency;
  const attack = Math.min(1, noteTime / 0.008);
  const decay = Math.exp(-noteTime * 6.8);
  const tone = Math.sin(phase) * 0.72 + triangle(phase) * 0.2 + Math.sin(phase * 2) * 0.08;
  return tone * attack * decay * volume;
};

writeWave(
  'theme.wav',
  THEME_DURATION,
  (time) => {
    const barIndex = Math.min(THEME_BARS - 1, Math.floor(time / BAR_SECONDS));
    const barTime = time % BAR_SECONDS;
    const beatIndex = Math.floor(barTime / BEAT_SECONDS);
    const beatTime = barTime % BEAT_SECONDS;
    const eighthIndex = Math.floor(time / EIGHTH_SECONDS);
    const eighthTime = time % EIGHTH_SECONDS;
    const sixteenthIndex = Math.floor(barTime / SIXTEENTH_SECONDS);
    const sixteenthTime = barTime % SIXTEENTH_SECONDS;
    const chord = chordProgression[barIndex];
    const isIntro = barIndex < 4;
    const isLift = barIndex >= 12 && barIndex < 20;
    const isReprise = barIndex >= 20;

    const lead = renderPluck(time, leadNotes, isIntro ? 0.105 : 0.135);
    const leadEcho = renderPluck(time - EIGHTH_SECONDS * 1.5, leadNotes, 0.033);
    const counterTime = time - 12 * BAR_SECONDS;
    const counter = isLift ? renderPluck(counterTime, counterNotes, 0.046, -12) : 0;

    const padEnvelope = envelope(barTime, 0.16, 0.28, BAR_SECONDS);
    const padVoices = chord.map((note, index) => {
      const frequency = midiFrequency(note - 12);
      const drift = 1 + Math.sin(time * 0.62 + index * 1.8) * 0.0022;
      const phase = time * 2 * Math.PI * frequency * drift;
      return (Math.sin(phase) * 0.8 + softSquare(phase) * 0.2) * padEnvelope * 0.019;
    });

    const arpPattern = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, 2];
    const arpNote = chord[arpPattern[sixteenthIndex]] + 12 + (sixteenthIndex >= 8 ? 12 : 0);
    const arpFrequency = midiFrequency(arpNote);
    const arpEnvelope = envelope(sixteenthTime, 0.005, SIXTEENTH_SECONDS * 0.7, SIXTEENTH_SECONDS);
    const arp =
      (triangle(sixteenthTime * 2 * Math.PI * arpFrequency) * 0.78 +
        Math.sin(sixteenthTime * 4 * Math.PI * arpFrequency) * 0.22) *
      arpEnvelope *
      (isIntro ? 0.011 : isLift ? 0.035 : 0.026);

    const bassNote = beatIndex === 2 ? chord[2] - 24 : chord[0] - 24;
    const bassFrequency = midiFrequency(bassNote);
    const bassEnvelope = envelope(beatTime, 0.008, BEAT_SECONDS * 0.52, BEAT_SECONDS);
    const bassPhase = beatTime * 2 * Math.PI * bassFrequency;
    const bass =
      (Math.sin(bassPhase) * 0.067 + triangle(bassPhase) * 0.018) *
      bassEnvelope *
      (isIntro ? 0.72 : 1);

    const kick =
      Math.sin(beatTime * 2 * Math.PI * (105 - beatTime * 110)) *
      Math.exp(-beatTime * 18) *
      (isIntro ? 0.025 : 0.078);
    const snare =
      (beatIndex === 1 || beatIndex === 3) && beatTime < 0.14
        ? (noise(Math.floor(time * SAMPLE_RATE)) * 0.7 +
            Math.sin(beatTime * 2 * Math.PI * 180) * 0.3) *
          Math.exp(-beatTime * 28) *
          (isIntro ? 0.018 : 0.052)
        : 0;
    const hat =
      eighthTime < 0.045
        ? noise(Math.floor(time * SAMPLE_RATE * 1.7)) *
          Math.exp(-eighthTime * 78) *
          (isIntro ? 0.01 : 0.019)
        : 0;
    const tambourine =
      isLift && eighthIndex % 2 === 1 && eighthTime < 0.055
        ? noise(Math.floor(time * SAMPLE_RATE * 2.3)) * Math.exp(-eighthTime * 58) * 0.014
        : 0;
    const fill =
      [7, 11, 19, 23].includes(barIndex) && sixteenthIndex >= 12
        ? Math.sin(sixteenthTime * 2 * Math.PI * (150 + sixteenthIndex * 12)) *
          Math.exp(-sixteenthTime * 22) *
          0.042
        : 0;

    const sparkle =
      (isLift || isReprise) && sixteenthIndex % 4 === 3
        ? Math.sin(sixteenthTime * 2 * Math.PI * midiFrequency(chord[2] + 24)) *
          Math.exp(-sixteenthTime * 24) *
          0.022
        : 0;

    const padMix = addStereo(
      pan(padVoices[0], -0.65),
      pan(padVoices[1], 0),
      pan(padVoices[2], 0.65),
    );
    const melodicMix = addStereo(
      pan(lead, -0.12),
      pan(leadEcho, 0.58),
      pan(counter, -0.58),
      pan(arp, sixteenthIndex % 2 === 0 ? -0.38 : 0.38),
      pan(sparkle, 0.5),
    );
    const rhythmMix = addStereo(
      pan(bass, 0),
      pan(kick, 0),
      pan(snare, 0.12),
      pan(hat, eighthIndex % 2 === 0 ? -0.46 : 0.46),
      pan(tambourine, -0.34),
      pan(fill, 0),
    );
    const sectionGain = isLift ? 1.04 : isIntro ? 0.9 : 1;

    return [
      (padMix[0] + melodicMix[0] + rhythmMix[0]) * sectionGain * 0.82,
      (padMix[1] + melodicMix[1] + rhythmMix[1]) * sectionGain * 0.82,
    ];
  },
  2,
);
