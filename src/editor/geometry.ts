import type { Point } from "../library/types";

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export const getBoundsFromPoints = (points: Point[]): Bounds => {
  console.info("[geometry] Calculating bounds from points", { pointCount: points.length });

  if (points.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
  }

  return points.reduce<Bounds>(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: points[0].x,
      minY: points[0].y,
      maxX: points[0].x,
      maxY: points[0].y,
    },
  );
};
