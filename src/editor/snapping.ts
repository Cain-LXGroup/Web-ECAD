import type { Point } from "../library/types";

export const DEFAULT_GRID_SIZE = 50;

export const snapPoint = (point: Point, gridSize: number): Point => {
  console.info("[snapping] Snapping point to grid", { point, gridSize });

  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
};
