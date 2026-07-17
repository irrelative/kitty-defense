import type { TowerTypeId } from '@/types/game';

type SoundName = 'place' | 'wave' | 'leak' | 'gameover' | 'upgrade' | 'defeat' | 'deny';
type AttackSoundName = `attack-${TowerTypeId}`;
const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const AUDIO_FILES: Record<SoundName, string> = {
  place: assetUrl('audio/place.wav'),
  wave: assetUrl('audio/wave.wav'),
  leak: assetUrl('audio/leak.wav'),
  gameover: assetUrl('audio/gameover.wav'),
  upgrade: assetUrl('audio/upgrade.wav'),
  defeat: assetUrl('audio/defeat.wav'),
  deny: assetUrl('audio/deny.wav'),
};

const ATTACK_FILES: Record<AttackSoundName, string> = {
  'attack-archer': assetUrl('audio/attack-archer.wav'),
  'attack-claw': assetUrl('audio/attack-claw.wav'),
  'attack-magic': assetUrl('audio/attack-magic.wav'),
  'attack-bombardier': assetUrl('audio/attack-bombardier.wav'),
  'attack-frost': assetUrl('audio/attack-frost.wav'),
  'attack-storm': assetUrl('audio/attack-storm.wav'),
};

export class AudioManager {
  private muted = false;

  private unlocked = false;

  private readonly pools = new Map<SoundName | AttackSoundName, HTMLAudioElement>();

  private theme: HTMLAudioElement | null = null;

  initialize(): void {
    if (this.theme) {
      return;
    }

    this.theme = new Audio(assetUrl('audio/theme.wav'));
    this.theme.loop = true;
    this.theme.volume = 0.26;

    (Object.keys(AUDIO_FILES) as SoundName[]).forEach((name) => {
      this.pools.set(name, new Audio(AUDIO_FILES[name]));
    });
    (Object.keys(ATTACK_FILES) as AttackSoundName[]).forEach((name) => {
      this.pools.set(name, new Audio(ATTACK_FILES[name]));
    });
  }

  unlock(): void {
    this.unlocked = true;
    this.theme
      ?.play()
      .then(() => undefined)
      .catch(() => undefined);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.theme) {
      this.theme.muted = muted;
      if (!muted && this.unlocked) {
        this.theme.play().catch(() => undefined);
      }
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  play(name: SoundName): void {
    if (this.muted) {
      return;
    }

    const source = this.pools.get(name);
    if (!source) {
      return;
    }

    const instance = source.cloneNode(true) as HTMLAudioElement;
    instance.volume = name === 'defeat' ? 0.18 : 0.36;
    instance.play().catch(() => undefined);
  }

  playAttack(typeId: TowerTypeId): void {
    if (this.muted) {
      return;
    }

    const source = this.pools.get(`attack-${typeId}`);
    if (!source) {
      return;
    }

    const instance = source.cloneNode(true) as HTMLAudioElement;
    instance.volume = typeId === 'bombardier' ? 0.28 : 0.16;
    instance.play().catch(() => undefined);
  }
}
