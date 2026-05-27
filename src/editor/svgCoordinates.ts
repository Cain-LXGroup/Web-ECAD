import type { Point } from "../library/types";

/**
 * Map a screen/client point to SVG world coordinates using the element's CTM.
 * Accounts for viewBox letterboxing (preserveAspectRatio) — required for accurate touch on iPad.
 */
export const clientPointToWorld = (
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): Point | null => {
  const svgPoint = svg.createSVGPoint();
  svgPoint.x = clientX;
  svgPoint.y = clientY;

  const screenMatrix = svg.getScreenCTM();
  if (!screenMatrix) {
    return null;
  }

  const worldPoint = svgPoint.matrixTransform(screenMatrix.inverse());
  return {
    x: worldPoint.x,
    y: worldPoint.y,
  };
};

export const clientDeltaToWorldDelta = (
  svg: SVGSVGElement,
  fromClientX: number,
  fromClientY: number,
  toClientX: number,
  toClientY: number,
): Point | null => {
  const fromWorld = clientPointToWorld(svg, fromClientX, fromClientY);
  const toWorld = clientPointToWorld(svg, toClientX, toClientY);

  if (!fromWorld || !toWorld) {
    return null;
  }

  return {
    x: toWorld.x - fromWorld.x,
    y: toWorld.y - fromWorld.y,
  };
};
