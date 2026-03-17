import { TILE_SIZE } from './constants';
import type { GameMapConfig, GridPosition, Point, Tile } from '@/types/game';

export const createPathKeySet = (path: GridPosition[]): Set<string> =>
  new Set(path.map((tile) => `${tile.col},${tile.row}`));

export const createTiles = (map: GameMapConfig): Tile[] => {
  const tiles: Tile[] = [];
  const pathKeySet = createPathKeySet(map.path);
  const pathTerminal = map.path[map.path.length - 1];

  for (let row = 0; row < map.rows; row += 1) {
    for (let col = 0; col < map.cols; col += 1) {
      const key = `${col},${row}`;
      const isTerminal = col === pathTerminal.col && row === pathTerminal.row;

      tiles.push({
        col,
        row,
        type: isTerminal ? 'base' : pathKeySet.has(key) ? 'path' : 'grass',
      });
    }
  }

  return tiles;
};

export const isPathTile = (position: GridPosition, pathKeySet: Set<string>): boolean =>
  pathKeySet.has(`${position.col},${position.row}`);

export const isInsideBoard = (position: GridPosition, map: GameMapConfig): boolean =>
  position.col >= 0 &&
  position.col < map.cols &&
  position.row >= 0 &&
  position.row < map.rows;

export const gridToPoint = ({ col, row }: GridPosition): Point => ({
  x: col * TILE_SIZE + TILE_SIZE / 2,
  y: row * TILE_SIZE + TILE_SIZE / 2,
});

export const createPathPoints = (path: GridPosition[]): Point[] => path.map(gridToPoint);
