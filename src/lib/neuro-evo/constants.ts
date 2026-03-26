export const GRID_SIZE = 40;
export const TILE_SIZE = 20; // pixels

export enum TileType {
  EMPTY = 0,
  WALL = 1,
  GOAL = 2,
  SPAWN = 3,
}

export type Grid = TileType[][];

export const INITIAL_GRID: Grid = Array(GRID_SIZE).fill(null).map(() => 
  Array(GRID_SIZE).fill(TileType.EMPTY)
);
