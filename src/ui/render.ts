import { GameEngine } from '@/game/Game';
import { ENEMY_TYPES, TILE_SIZE, TOWER_TYPES } from '@/game/constants';
import type {
  GameEvent,
  GameMapConfig,
  GameSaveData,
  GameSnapshot,
  Tile,
  TowerTypeId,
} from '@/types/game';
import { AudioManager } from './audio';

const SAVE_KEY = 'kitty-defense-save-v1';
const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const spriteForTower = (typeId: TowerTypeId): string =>
  assetUrl(`art/${TOWER_TYPES[typeId].spriteName}.svg`);
const spriteForEnemy = (typeId: string): string => assetUrl(`art/${ENEMY_TYPES[typeId].spriteName}.svg`);

const tileLabel = (tile: Tile): string => {
  if (tile.type === 'path') {
    return 'Path tile';
  }

  if (tile.type === 'base') {
    return 'Village gate';
  }

  return `Grass tile ${tile.col + 1}, ${tile.row + 1}`;
};

const renderMapPreview = (map: GameMapConfig): string => {
  const pathKeys = new Set(map.path.map((tile) => `${tile.col},${tile.row}`));
  const endTile = map.path[map.path.length - 1];
  const cells: string[] = [];

  for (let row = 0; row < map.rows; row += 1) {
    for (let col = 0; col < map.cols; col += 1) {
      const key = `${col},${row}`;
      const cellClass =
        col === endTile.col && row === endTile.row
          ? 'mini-map__cell mini-map__cell--base'
          : pathKeys.has(key)
            ? 'mini-map__cell mini-map__cell--path'
            : 'mini-map__cell';

      cells.push(`<span class="${cellClass}"></span>`);
    }
  }

  return `<div class="mini-map" style="--mini-cols:${map.cols};">${cells.join('')}</div>`;
};

export class GameApp {
  private readonly engine = new GameEngine();

  private readonly audio = new AudioManager();

  private readonly root: HTMLElement;

  private lastFrameTime = 0;

  private rafId = 0;

  private lastMarkup = '';

  private currentSnapshot: GameSnapshot | null = null;

  private suppressNextClick = false;

  private placementPreview: { col: number; row: number } | null = null;

  private lastSavedState = '';

  private statusMessage = 'Select a kitten and defend the lane.';

  constructor(root: HTMLElement) {
    this.root = root;
  }

  mount(): void {
    this.audio.initialize();
    this.restoreSavedGame();
    this.syncView();
    this.root.addEventListener('pointerdown', this.handlePointerDown);
    this.root.addEventListener('click', this.handleClick);
    this.root.addEventListener('change', this.handleChange);
    this.root.addEventListener('mouseover', this.handlePreviewHover);
    this.root.addEventListener('mouseout', this.handlePreviewLeave);
    this.root.addEventListener('focusin', this.handlePreviewFocus);
    this.root.addEventListener('focusout', this.handlePreviewBlur);
    this.rafId = window.requestAnimationFrame(this.loop);
  }

  unmount(): void {
    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    this.root.removeEventListener('click', this.handleClick);
    this.root.removeEventListener('change', this.handleChange);
    this.root.removeEventListener('mouseover', this.handlePreviewHover);
    this.root.removeEventListener('mouseout', this.handlePreviewLeave);
    this.root.removeEventListener('focusin', this.handlePreviewFocus);
    this.root.removeEventListener('focusout', this.handlePreviewBlur);
    window.cancelAnimationFrame(this.rafId);
  }

  private readonly loop = (timestamp: number): void => {
    const deltaMs = this.lastFrameTime === 0 ? 16 : Math.min(64, timestamp - this.lastFrameTime);
    this.lastFrameTime = timestamp;

    this.engine.tick(deltaMs);
    this.syncView();
    this.rafId = window.requestAnimationFrame(this.loop);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const handled = this.handleAction(target, true);
    if (handled) {
      event.preventDefault();
      this.suppressNextClick = true;
    }
  };

  private readonly handleClick = (event: Event): void => {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    this.handleAction(target, false);
  };

  private handleAction(target: HTMLElement, allowDirectToggle: boolean): boolean {
    this.audio.unlock();

    const towerButton = target.closest<HTMLElement>('[data-tower]');
    if (towerButton) {
      const typeId = towerButton.dataset.tower as TowerTypeId;
      this.engine.selectTower(typeId);
      this.statusMessage = `${TOWER_TYPES[typeId].name} selected.`;
      this.syncView();
      return true;
    }

    const startButton = target.closest<HTMLElement>('[data-action="start-wave"]');
    if (startButton) {
      const started = this.engine.startWave();
      if (!started) {
        this.statusMessage = 'Finish the current wave first.';
      }
      this.syncView();
      return true;
    }

    const muteButton = target.closest<HTMLElement>('[data-action="toggle-audio"]');
    if (muteButton) {
      this.audio.setMuted(!this.audio.isMuted);
      this.statusMessage = this.audio.isMuted ? 'Audio muted.' : 'Audio restored.';
      this.syncView();
      return true;
    }

    const continuousToggle = target.closest<HTMLElement>('[data-toggle="continuous-mode"], .toggle-row');
    if (continuousToggle && allowDirectToggle) {
      const enabled = !this.currentSnapshot?.continuousMode;
      this.engine.setContinuousMode(Boolean(enabled));
      this.statusMessage = enabled
        ? 'Continuous mode enabled. Waves will auto-start after clears.'
        : 'Continuous mode disabled. Waves now wait for manual starts.';
      this.syncView();
      return true;
    }

    const mapButton = target.closest<HTMLElement>('[data-map]');
    if (mapButton) {
      const mapId = mapButton.dataset.map as GameSnapshot['mapId'];
      const selected = this.engine.selectMap(mapId);
      if (!selected) {
        this.statusMessage = 'Reset before switching to a different path.';
      }
      this.lastFrameTime = 0;
      this.syncView();
      return true;
    }

    const resetButton = target.closest<HTMLElement>('[data-action="reset-game"]');
    if (resetButton) {
      this.engine.reset();
      this.lastFrameTime = 0;
      this.clearPlacementPreview();
      this.syncView();
      return true;
    }

    const upgradeButton = target.closest<HTMLElement>('[data-action="upgrade-tower"]');
    if (upgradeButton) {
      const result = this.engine.upgradeSelectedTower(upgradeButton.dataset.upgradeId);
      if (!result.ok && result.reason) {
        this.statusMessage = result.reason;
      }
      this.syncView();
      return true;
    }

    const removeButton = target.closest<HTMLElement>('[data-action="remove-tower"]');
    if (removeButton) {
      const result = this.engine.removeSelectedTower();
      if (!result.ok && result.reason) {
        this.statusMessage = result.reason;
      }
      this.clearPlacementPreview();
      this.syncView();
      return true;
    }

    const tileButton = target.closest<HTMLElement>('[data-col][data-row]');
    if (tileButton) {
      const col = Number(tileButton.dataset.col);
      const row = Number(tileButton.dataset.row);
      const existingTower = this.currentSnapshot?.towers.find(
        (tower) => tower.col === col && tower.row === row,
      );

      if (existingTower) {
        this.engine.selectPlacedTower(existingTower.id);
        this.clearPlacementPreview();
        this.syncView();
        return true;
      }

      const result = this.engine.placeSelectedTower(col, row);
      if (!result.ok && result.reason) {
        this.statusMessage = result.reason;
      }
      if (result.ok) {
        this.clearPlacementPreview();
      }
      this.syncView();
      return true;
    }

    return false;
  };

  private readonly handleChange = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.matches('[data-toggle="continuous-mode"]')) {
      this.engine.setContinuousMode(target.checked);
      this.statusMessage = target.checked
        ? 'Continuous mode enabled. Waves will auto-start after clears.'
        : 'Continuous mode disabled. Waves now wait for manual starts.';
      this.syncView();
    }
  };

  private readonly handlePreviewHover = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    this.updatePlacementPreviewFromElement(target.closest<HTMLElement>('[data-col][data-row]'));
  };

  private readonly handlePreviewLeave = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest('[data-col][data-row]')) {
      return;
    }

    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof HTMLElement && nextTarget.closest('.board')) {
      return;
    }

    this.clearPlacementPreview();
    this.renderCurrentSnapshot();
  };

  private readonly handlePreviewFocus = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    this.updatePlacementPreviewFromElement(target.closest<HTMLElement>('[data-col][data-row]'));
  };

  private readonly handlePreviewBlur = (event: FocusEvent): void => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof HTMLElement && nextTarget.closest('[data-col][data-row]')) {
      return;
    }

    this.clearPlacementPreview();
    this.renderCurrentSnapshot();
  };

  private syncView(): void {
    const snapshot = this.engine.getSnapshot();
    this.currentSnapshot = snapshot;
    this.persistGameIfNeeded(snapshot);
    this.consumeEvents(snapshot.events);
    this.render(snapshot);
  }

  private renderCurrentSnapshot(): void {
    if (this.currentSnapshot) {
      this.render(this.currentSnapshot);
    }
  }

  private updatePlacementPreviewFromElement(tileButton: HTMLElement | null): void {
    if (!tileButton || !this.currentSnapshot) {
      this.clearPlacementPreview();
      this.renderCurrentSnapshot();
      return;
    }

    const col = Number(tileButton.dataset.col);
    const row = Number(tileButton.dataset.row);
    const tile = this.currentSnapshot.tiles.find((candidate) => candidate.col === col && candidate.row === row);
    const occupied = this.currentSnapshot.towers.some((tower) => tower.col === col && tower.row === row);

    if (!tile || tile.type !== 'grass' || occupied || this.currentSnapshot.isGameOver) {
      this.clearPlacementPreview();
      this.renderCurrentSnapshot();
      return;
    }

    if (this.placementPreview?.col === col && this.placementPreview?.row === row) {
      return;
    }

    this.placementPreview = { col, row };
    this.renderCurrentSnapshot();
  }

  private clearPlacementPreview(): void {
    this.placementPreview = null;
  }

  private persistGameIfNeeded(snapshot: GameSnapshot): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    if (snapshot.isWaveActive) {
      return;
    }

    const saveData = this.engine.exportSaveData();
    const serialized = JSON.stringify(saveData);

    if (serialized === this.lastSavedState) {
      return;
    }

    window.localStorage.setItem(SAVE_KEY, serialized);
    this.lastSavedState = serialized;
  }

  private restoreSavedGame(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const rawSave = window.localStorage.getItem(SAVE_KEY);
    if (!rawSave) {
      return;
    }

    try {
      const parsed = JSON.parse(rawSave) as Partial<GameSaveData>;
      if (!this.isValidSaveData(parsed)) {
        return;
      }

      const restored = this.engine.restoreFromSaveData(parsed);
      if (restored) {
        this.lastSavedState = rawSave;
      }
    } catch {
      window.localStorage.removeItem(SAVE_KEY);
    }
  }

  private isValidSaveData(save: Partial<GameSaveData>): save is GameSaveData {
    return (
      save.version === 1 &&
      typeof save.mapId === 'string' &&
      typeof save.gold === 'number' &&
      typeof save.lives === 'number' &&
      typeof save.kills === 'number' &&
      typeof save.wave === 'number' &&
      typeof save.selectedTower === 'string' &&
      typeof save.isGameOver === 'boolean' &&
      (typeof save.continuousMode === 'boolean' || typeof save.continuousMode === 'undefined') &&
      Array.isArray(save.towers) &&
      save.towers.every(
        (tower) =>
          tower &&
          typeof tower.typeId === 'string' &&
          typeof tower.col === 'number' &&
          typeof tower.row === 'number' &&
          ((typeof tower.level === 'number' && tower.level >= 1) ||
            (Array.isArray(tower.upgradeIds) && tower.upgradeIds.every((upgradeId) => typeof upgradeId === 'string'))),
      )
    );
  }

  private consumeEvents(events: GameEvent[]): void {
    if (events.length === 0) {
      return;
    }

    const latest = events[events.length - 1];
    this.statusMessage = latest.message;

    for (const event of events) {
      switch (event.type) {
        case 'tower-placed':
          this.audio.play('place');
          break;
        case 'tower-fired':
          this.audio.play('shoot');
          break;
        case 'wave-started':
          this.audio.play('wave');
          break;
        case 'enemy-leaked':
          this.audio.play('leak');
          break;
        case 'game-over':
          this.audio.play('gameover');
          break;
        default:
          break;
      }
    }
  }

  private render(snapshot: GameSnapshot): void {
    const boardWidth = snapshot.boardCols * TILE_SIZE;
    const boardHeight = snapshot.boardRows * TILE_SIZE;
    const selectedTowerConfig = TOWER_TYPES[snapshot.selectedTower];
    const selectedPlacedTower =
      snapshot.towers.find((tower) => tower.id === snapshot.selectedPlacedTowerId) ?? null;
    const selectedPlacedTowerConfig = selectedPlacedTower
      ? TOWER_TYPES[selectedPlacedTower.typeId]
      : null;
    const currentWaveLabel = snapshot.wave === 0 ? 'Setup' : `${snapshot.wave}`;
    const nextWaveLabel = snapshot.wave + 1;
    const autoStartSeconds =
      snapshot.autoStartInMs === null ? null : Math.max(0.1, snapshot.autoStartInMs / 1000).toFixed(1);
    const markup = `
      <main class="shell">
        <section class="hero">
          <div>
            <p class="eyebrow">Kitty Defense</p>
            <h1>Keep the rodents out.</h1>
            <p class="hero-copy">
              Choose a route, place kittens, and hold the lane.
            </p>
          </div>
          <div class="hero-card">
            <span>Current map</span>
            <strong>${snapshot.mapName}</strong>
            <p>${snapshot.isWaveActive ? 'Rodents on the move.' : snapshot.wave === 0 ? 'Choose your route, then place towers.' : 'The path is quiet for now.'}</p>
          </div>
        </section>

        <section class="layout">
          <div class="board-panel">
            <div class="wave-banner">
              <div>
                <span>Wave</span>
                <strong>${currentWaveLabel}</strong>
              </div>
              <p>
                ${
                  snapshot.isGameOver
                    ? 'The village has fallen.'
                    : snapshot.isWaveActive
                      ? `Wave ${snapshot.wave} is active.`
                      : snapshot.wave === 0
                        ? 'Place kittens before the first wave.'
                        : snapshot.continuousMode && snapshot.autoStartInMs !== null
                          ? `Wave ${nextWaveLabel} auto-starts in ${autoStartSeconds}s.`
                          : `Wave ${nextWaveLabel} is ready when you are.`
                }
              </p>
            </div>

            <div class="hud">
              <div class="stat stat--wave">
                <span>Next wave</span>
                <strong>${snapshot.isGameOver ? '-' : nextWaveLabel}</strong>
              </div>
              <div class="stat"><span>Gold</span><strong>${snapshot.gold}</strong></div>
              <div class="stat"><span>Interest</span><strong>+${snapshot.projectedInterest}g</strong></div>
              <div class="stat"><span>Lives</span><strong>${snapshot.lives}</strong></div>
              <div class="stat"><span>Kills</span><strong>${snapshot.kills}</strong></div>
              <div class="stat"><span>Status</span><strong>${snapshot.isGameOver ? 'Lost' : snapshot.isWaveActive ? 'Battle' : 'Planning'}</strong></div>
            </div>

            <div class="board-frame">
              <div
                class="board"
                style="width:${boardWidth}px;height:${boardHeight}px;"
              >
                ${
                  this.placementPreview
                    ? `
                      <div
                        class="range-preview"
                        style="
                          left:${this.placementPreview.col * TILE_SIZE + TILE_SIZE / 2}px;
                          top:${this.placementPreview.row * TILE_SIZE + TILE_SIZE / 2}px;
                          width:${selectedTowerConfig.range * TILE_SIZE * 2}px;
                          height:${selectedTowerConfig.range * TILE_SIZE * 2}px;
                          --range-accent:${selectedTowerConfig.accent};
                        "
                        aria-hidden="true"
                      ></div>
                    `
                    : ''
                }

                ${snapshot.tiles
                  .map(
                    (tile) => `
                      <button
                        class="tile tile--${tile.type}"
                        style="left:${tile.col * TILE_SIZE}px;top:${tile.row * TILE_SIZE}px;"
                        data-col="${tile.col}"
                        data-row="${tile.row}"
                        aria-label="${tileLabel(tile)}"
                      ></button>
                    `,
                  )
                  .join('')}

                ${snapshot.towers
                  .map((tower) => {
                    const config = TOWER_TYPES[tower.typeId];
                    return `
                      <div
                        class="tower"
                        style="left:${tower.col * TILE_SIZE}px;top:${tower.row * TILE_SIZE}px;--tower-accent:${config.accent};"
                      >
                        <img src="${spriteForTower(tower.typeId)}" alt="${config.name}" />
                      </div>
                    `;
                  })
                  .join('')}

                ${snapshot.enemies
                  .map(
                    (enemy) => `
                      <div
                        class="enemy"
                        style="left:${enemy.position.x - TILE_SIZE / 2}px;top:${enemy.position.y - TILE_SIZE / 2}px;--enemy-tint:${enemy.tint};"
                      >
                        <img src="${spriteForEnemy(enemy.typeId)}" alt="${enemy.typeId}" />
                        <div class="enemy-health">
                          <div style="width:${(enemy.hp / enemy.maxHp) * 100}%"></div>
                        </div>
                      </div>
                    `,
                  )
                  .join('')}

                ${snapshot.projectiles
                  .map((projectile) => {
                    const isSlash = ['slash', 'slash-guard'].includes(projectile.variant);
                    const isBomb = ['bomb', 'bomb-shrapnel'].includes(projectile.variant);
                    const arcLift = isBomb
                      ? Math.sin(projectile.progress * Math.PI) *
                        (projectile.variant === 'bomb-shrapnel' ? 18 : 26)
                      : 0;
                    const x = isSlash
                      ? projectile.to.x
                      : projectile.from.x + (projectile.to.x - projectile.from.x) * projectile.progress;
                    const y = isSlash
                      ? projectile.to.y
                      : projectile.from.y +
                        (projectile.to.y - projectile.from.y) * projectile.progress -
                        arcLift;
                    const angle = Math.atan2(projectile.to.y - projectile.from.y, projectile.to.x - projectile.from.x);
                    return `
                      <div
                        class="projectile projectile--${projectile.variant}"
                        style="left:${x}px;top:${y}px;--projectile-color:${projectile.color};--projectile-angle:${angle}rad;--projectile-progress:${projectile.progress};"
                      >${isSlash ? '<i aria-hidden="true"></i>' : ''}</div>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          </div>

          <aside class="sidebar">
            ${
              snapshot.canSelectMap
                ? `
                  <section class="panel">
                    <div class="panel-header">
                      <h2>Choose route</h2>
                      <span class="selection-note">Startup only</span>
                    </div>
                    <div class="map-list">
                      ${snapshot.availableMaps
                        .map(
                          (map) => `
                            <button
                              class="map-card ${snapshot.mapId === map.id ? 'is-selected' : ''}"
                              data-map="${map.id}"
                              aria-pressed="${snapshot.mapId === map.id}"
                            >
                              <div>
                                <div class="map-card__header">
                                  <strong>${map.name}</strong>
                                  <span>${map.tagline}</span>
                                </div>
                                <p>${map.description}</p>
                              </div>
                              ${renderMapPreview(map)}
                            </button>
                          `,
                        )
                        .join('')}
                    </div>
                  </section>
                `
                : ''
            }

            <section class="panel">
              <div class="panel-header">
                <h2>Deploy kittens</h2>
                <button class="ghost-button" data-action="toggle-audio">
                  ${this.audio.isMuted ? 'Unmute audio' : 'Mute audio'}
                </button>
              </div>
              <div class="tower-list">
                ${snapshot.towerConfigs
                  .map(
                    (tower) => `
                      <button
                        class="tower-card ${snapshot.selectedTower === tower.id ? 'is-selected' : ''}"
                        data-tower="${tower.id}"
                        aria-pressed="${snapshot.selectedTower === tower.id}"
                      >
                        <img src="${spriteForTower(tower.id)}" alt="${tower.name}" />
                        <div>
                          <strong>${tower.name}</strong>
                          <span>${tower.cost}g</span>
                          <p>${tower.description}</p>
                        </div>
                      </button>
                    `,
                  )
                  .join('')}
              </div>
            </section>

            <section class="panel">
              <div class="panel-header">
                <h2>Upgrade cats</h2>
                <span class="selection-note">${
                  snapshot.isGameOver
                    ? 'Run ended'
                    : snapshot.wave === 0
                      ? 'Start wave 1 first'
                      : 'Any time'
                }</span>
              </div>
              ${
                selectedPlacedTower && selectedPlacedTowerConfig
                  ? `
                    <div class="upgrade-card">
                      <div class="upgrade-card__header">
                        <img src="${spriteForTower(selectedPlacedTower.typeId)}" alt="${selectedPlacedTowerConfig.name}" />
                        <div>
                          <strong>${selectedPlacedTowerConfig.name}</strong>
                          <span>Level ${selectedPlacedTower.level}</span>
                          ${
                            selectedPlacedTower.appliedUpgrades[0]
                              ? `<p class="upgrade-branch">Path: ${selectedPlacedTower.appliedUpgrades[0].name}</p>`
                              : '<p class="upgrade-branch">Path: undecided</p>'
                          }
                        </div>
                      </div>
                      <div class="upgrade-stats">
                        <span>Range ${selectedPlacedTower.range.toFixed(2)}</span>
                        <span>Damage ${selectedPlacedTower.damage}</span>
                        <span>Rate ${(selectedPlacedTower.fireRateMs / 1000).toFixed(2)}s</span>
                        <span>Kills ${selectedPlacedTower.totalKills}</span>
                        <span>Total damage ${selectedPlacedTower.totalDamage}</span>
                        ${
                          selectedPlacedTower.splashRadius > 0
                            ? `<span>Splash ${selectedPlacedTower.splashRadius.toFixed(2)}</span>`
                            : ''
                        }
                      </div>
                      ${
                        selectedPlacedTower.appliedUpgrades.length > 0
                          ? `
                            <div class="upgrade-path">
                              ${selectedPlacedTower.appliedUpgrades
                                .map((upgrade) => `<span>${upgrade.name}</span>`)
                                .join('')}
                            </div>
                          `
                          : ''
                      }
                      <p class="upgrade-copy">
                        ${
                          selectedPlacedTower.availableUpgrades.length > 0
                            ? selectedPlacedTower.appliedUpgrades.length === 0
                              ? 'Choose a specialization to define this cat’s upgrade path.'
                              : `Next unlock: ${selectedPlacedTower.availableUpgrades[0].name}.`
                            : 'This cat has reached its final form.'
                        }
                      </p>
                      ${
                        selectedPlacedTower.availableUpgrades.length > 0
                          ? `
                            <div class="upgrade-options">
                              ${selectedPlacedTower.availableUpgrades
                                .map(
                                  (upgrade) => `
                                    <button
                                      class="upgrade-option"
                                      data-action="upgrade-tower"
                                      data-upgrade-id="${upgrade.id}"
                                      ${!snapshot.canUpgradeTowers ? 'disabled' : ''}
                                    >
                                      <strong>${upgrade.name}</strong>
                                      <span>${upgrade.cost}g</span>
                                      <p>${upgrade.description}</p>
                                    </button>
                                  `,
                                )
                                .join('')}
                            </div>
                          `
                          : `
                            <button class="primary-button" disabled>
                              Max level reached
                            </button>
                          `
                      }
                      <button
                        class="ghost-button ghost-button--wide"
                        data-action="remove-tower"
                        ${snapshot.isGameOver ? 'disabled' : ''}
                      >
                        Remove cat
                      </button>
                    </div>
                  `
                  : `
                    <p class="upgrade-empty">
                      Click a placed cat on the board to inspect it and upgrade it during the run.
                    </p>
                  `
              }
            </section>

            <section class="panel panel--action" style="--panel-print-image:url('${assetUrl('art/paw-print.svg')}');">
              <div class="panel-header">
                <h2>Run control</h2>
                <span class="selection-note">${Math.round(snapshot.interestRate * 100)}% interest</span>
              </div>
              <label class="toggle-row" for="continuous-mode-toggle">
                <div>
                  <strong>Continuous mode</strong>
                  <p>${snapshot.isWaveActive ? 'Can be changed mid-wave.' : 'Can be changed any time.'}</p>
                </div>
                <input
                  id="continuous-mode-toggle"
                  class="toggle-input"
                  type="checkbox"
                  data-toggle="continuous-mode"
                  ${snapshot.continuousMode ? 'checked' : ''}
                />
                <span class="toggle-switch" aria-hidden="true"></span>
              </label>
              <div class="action-buttons">
                <button
                  class="primary-button"
                  data-action="start-wave"
                  ${snapshot.isWaveActive || snapshot.isGameOver ? 'disabled' : ''}
                >
                  ${
                    snapshot.isGameOver
                      ? 'Village lost'
                      : snapshot.wave === 0
                        ? 'Start wave 1'
                        : snapshot.continuousMode && snapshot.autoStartInMs !== null
                          ? `Start wave ${nextWaveLabel} now`
                          : `Start wave ${nextWaveLabel}`
                  }
                </button>
                <button class="ghost-button ghost-button--wide" data-action="reset-game">
                  Reset game
                </button>
              </div>
              <p class="status-copy">${this.statusMessage}</p>
            </section>
          </aside>
        </section>
      </main>
    `;

    if (markup !== this.lastMarkup) {
      this.root.innerHTML = markup;
      this.lastMarkup = markup;
    }
  }
}
