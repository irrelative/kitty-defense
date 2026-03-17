import { GameApp } from '@/ui/render';

class MockAudio {
  currentTime = 0;

  loop = false;

  muted = false;

  volume = 1;

  cloneNode(): MockAudio {
    return new MockAudio();
  }

  play(): Promise<void> {
    return Promise.resolve();
  }
}

const pointerDown = (element: HTMLElement | null): void => {
  element?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
};

describe('GameApp', () => {
  beforeEach(() => {
    vi.stubGlobal('Audio', MockAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the board and allows selecting towers', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    const title = root.querySelector('h1');
    expect(title?.textContent).toMatch(/rodents out/i);
    expect(root.querySelector('.wave-banner strong')?.textContent).toBe('Setup');
    expect(root.querySelector('.hud')?.textContent).toContain('Score0');

    const towerButtons = Array.from(root.querySelectorAll<HTMLElement>('[data-tower]'));
    expect(towerButtons).toHaveLength(6);

    towerButtons[2].click();

    expect(root.textContent).toMatch(/Magic Cat selected/i);

    app.unmount();
  });

  it('allows selecting a map before the game begins', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    root.querySelector<HTMLElement>('[data-map="creek-bend"]')?.click();

    expect(root.textContent).toMatch(/Creek Bend selected\./i);
    expect(root.textContent).toMatch(/Current map\s*Creek Bend/i);

    app.unmount();
  });

  it('hides route selection after setup moves past the start state', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]')?.click();

    expect(root.textContent).not.toMatch(/Choose route/i);

    app.unmount();
  });

  it('resets the game from the sidebar control', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]')?.click();
    root.querySelector<HTMLElement>('[data-action="start-wave"]')?.click();

    expect(root.textContent).toMatch(/wave 1 has started/i);
    expect(root.querySelector('.hud')?.textContent).toContain('Gold100');

    root.querySelector<HTMLElement>('[data-action="reset-game"]')?.click();

    expect(root.textContent).toMatch(/game reset\. the meadow is ready again\./i);
    expect(root.querySelector('.hud')?.textContent).toContain('Gold150');
    expect(root.querySelector('.hud')?.textContent).toContain('Lives12');
    expect(root.textContent).toMatch(/start wave 1/i);

    app.unmount();
  });

  it('renders frost, storm, and bombardier cats in the deployment list', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    const frostButton = root.querySelector<HTMLElement>('[data-tower="frost"]');
    const stormButton = root.querySelector<HTMLElement>('[data-tower="storm"]');
    const bombardierButton = root.querySelector<HTMLElement>('[data-tower="bombardier"]');

    expect(frostButton?.textContent).toMatch(/Frost Cat/i);
    expect(frostButton?.textContent).toMatch(/95g/i);
    expect(stormButton?.textContent).toMatch(/Storm Cat/i);
    expect(stormButton?.textContent).toMatch(/130g/i);
    expect(bombardierButton?.textContent).toMatch(/Bombardier Cat/i);
    expect(bombardierButton?.textContent).toMatch(/120g/i);

    app.unmount();
  });

  it('shows the selected tower range before placement on a build tile', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    root.querySelector<HTMLElement>('[data-tower="magic"]')?.click();
    const tile = root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]');
    tile?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    const preview = root.querySelector<HTMLElement>('.range-preview');

    expect(preview).not.toBeNull();
    expect(preview?.getAttribute('style')).toMatch(/width:324px/);

    app.unmount();
  });

  it('shows upgrade controls when a placed cat is selected', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]')?.click();
    root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]')?.click();

    expect(root.textContent).toMatch(/Upgrade cats/i);
    expect(root.textContent).toMatch(/Level 1/i);
    expect(root.textContent).toMatch(/Kills 0/i);
    expect(root.textContent).toMatch(/Total damage 0/i);
    expect(root.textContent).toMatch(/Marksman/i);
    expect(root.textContent).toMatch(/Volley/i);

    app.unmount();
  });

  it('lets players upgrade a placed cat during a wave', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    pointerDown(root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]'));
    pointerDown(root.querySelector<HTMLElement>('[data-action="start-wave"]'));
    pointerDown(root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]'));
    pointerDown(root.querySelector<HTMLElement>('[data-upgrade-id="archer-marksman"]'));

    expect(root.textContent).toMatch(/Archer Cat learned Marksman\./i);
    expect(root.querySelector('.hud')?.textContent).toContain('Gold60');
    expect(root.textContent).toMatch(/Level 2/i);
    expect(root.textContent).toMatch(/Path: Marksman/i);
    expect(root.textContent).toMatch(/Kills 0/i);
    expect(root.textContent).toMatch(/Total damage 0/i);

    app.unmount();
  });

  it('lets players deploy new towers while a wave is running', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    pointerDown(root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]'));
    pointerDown(root.querySelector<HTMLElement>('[data-action="start-wave"]'));
    pointerDown(root.querySelector<HTMLElement>('[data-tower="claw"]'));
    pointerDown(root.querySelector<HTMLElement>('[data-col="6"][data-row="4"]'));

    expect(root.textContent).toMatch(/Claw Cat deployed\./i);
    expect(root.querySelector('.hud')?.textContent).toContain('Gold25');
    expect(root.querySelectorAll('.tower')).toHaveLength(2);

    app.unmount();
  });

  it('lets players remove a selected tower from the sidebar', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]')?.click();
    root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]')?.click();
    pointerDown(root.querySelector<HTMLElement>('[data-action="remove-tower"]'));

    expect(root.textContent).toMatch(/Archer Cat withdrawn\./i);
    expect(root.querySelectorAll('.tower')).toHaveLength(0);
    expect(root.textContent).toMatch(/Click a placed cat on the board to inspect it and upgrade it during the run\./i);

    app.unmount();
  });

  it('lets players toggle continuous mode from the sidebar', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    pointerDown(root.querySelector<HTMLElement>('[data-toggle="continuous-mode"]'));

    expect(root.textContent).toMatch(/Continuous mode enabled/i);
    expect(root.querySelector<HTMLInputElement>('[data-toggle="continuous-mode"]')?.checked).toBe(true);

    app.unmount();
  });

  it('keeps the continuous mode toggle usable during and between waves', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    pointerDown(root.querySelector<HTMLElement>('[data-action="start-wave"]'));
    pointerDown(root.querySelector<HTMLElement>('[data-toggle="continuous-mode"]'));

    expect(root.textContent).toMatch(/Continuous mode enabled/i);
    expect(root.querySelector<HTMLInputElement>('[data-toggle="continuous-mode"]')?.checked).toBe(true);

    pointerDown(root.querySelector<HTMLElement>('[data-toggle="continuous-mode"]'));

    expect(root.textContent).toMatch(/Continuous mode disabled/i);
    expect(root.querySelector<HTMLInputElement>('[data-toggle="continuous-mode"]')?.checked).toBe(false);

    app.unmount();
  });

  it('loads a saved game from localStorage on startup', () => {
    window.localStorage.setItem(
      'kitty-defense-save-v1',
      JSON.stringify({
        version: 1,
        mapId: 'orchard-loop',
        gold: 92,
        lives: 11,
        kills: 17,
        score: 214,
        wave: 2,
        selectedTower: 'magic',
        isGameOver: false,
        continuousMode: true,
        towers: [
          {
            typeId: 'archer',
            col: 0,
            row: 0,
            upgradeIds: ['archer-volley'],
          },
        ],
      }),
    );

    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    expect(root.textContent).toMatch(/Saved game restored at wave 2\./i);
    expect(root.textContent).toMatch(/Current map\s*Orchard Loop/i);
    expect(root.querySelector('.hud')?.textContent).toContain('Score214');
    expect(root.querySelector('.hud')?.textContent).toContain('Gold92');
    expect(root.querySelector('.hud')?.textContent).toContain('Lives11');
    expect(root.querySelector<HTMLInputElement>('[data-toggle="continuous-mode"]')?.checked).toBe(true);
    pointerDown(root.querySelector<HTMLElement>('[data-col="0"][data-row="0"]'));
    expect(root.textContent).toMatch(/Path: Volley/i);
    expect(root.textContent).not.toMatch(/Choose route/i);

    app.unmount();
  });

  it('shows a game over summary with score and best tower stats', () => {
    window.localStorage.setItem(
      'kitty-defense-save-v1',
      JSON.stringify({
        version: 1,
        mapId: 'meadow-run',
        gold: 41,
        lives: 0,
        kills: 16,
        score: 212,
        wave: 7,
        selectedTower: 'archer',
        isGameOver: true,
        towers: [
          {
            typeId: 'archer',
            col: 0,
            row: 0,
            upgradeIds: ['archer-marksman'],
            totalKills: 12,
            totalDamage: 320,
          },
          {
            typeId: 'claw',
            col: 6,
            row: 4,
            upgradeIds: [],
            totalKills: 4,
            totalDamage: 90,
          },
        ],
      }),
    );

    const root = document.createElement('div');
    document.body.append(root);

    const app = new GameApp(root);
    app.mount();

    expect(root.textContent).toMatch(/Game over/i);
    expect(root.textContent).toMatch(/Score\s*212/i);
    expect(root.textContent).toMatch(/Wave reached\s*7/i);
    expect(root.textContent).toMatch(/Best tower\s*Archer Cat/i);
    expect(root.textContent).toMatch(/75% of kills and 78% of damage/i);

    app.unmount();
  });
});
