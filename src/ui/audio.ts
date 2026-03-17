type SoundName = 'place' | 'shoot' | 'wave' | 'leak' | 'gameover';
const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const AUDIO_FILES: Record<SoundName, string> = {
  place: assetUrl('audio/place.wav'),
  shoot: assetUrl('audio/shoot.wav'),
  wave: assetUrl('audio/wave.wav'),
  leak: assetUrl('audio/leak.wav'),
  gameover: assetUrl('audio/gameover.wav'),
};

export class AudioManager {
  private muted = false;

  private unlocked = false;

  private readonly pools = new Map<SoundName, HTMLAudioElement>();

  private theme: HTMLAudioElement | null = null;

  initialize(): void {
    if (this.theme) {
      return;
    }

    this.theme = new Audio(assetUrl('audio/theme.wav'));
    this.theme.loop = true;
    this.theme.volume = 0.22;

    (Object.keys(AUDIO_FILES) as SoundName[]).forEach((name) => {
      this.pools.set(name, new Audio(AUDIO_FILES[name]));
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
    instance.volume = name === 'shoot' ? 0.18 : 0.36;
    instance.play().catch(() => undefined);
  }
}
