import type { Point } from "../library/types";

export const VIEWPORT_WIDTH = 5000;
export const VIEWPORT_HEIGHT = 3500;
export const MIN_ZOOM = 0.45;
export const MAX_ZOOM = 2.8;

export const clampZoom = (value: number): number => {
  console.info("[canvasViewport] Clamping zoom", { value });

  return Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM);
};

export type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const getViewBox = (zoom: number, pan: Point): ViewBox => {
  console.info("[canvasViewport] Calculating view box", { zoom, pan });

  return {
    x: pan.x,
    y: pan.y,
    width: VIEWPORT_WIDTH / zoom,
    height: VIEWPORT_HEIGHT / zoom,
  };
};

export const getClientToWorldScale = (viewBox: ViewBox, svgPixelWidth: number, svgPixelHeight: number) => {
  console.info("[canvasViewport] Calculating client-to-world scale", {
    viewBoxWidth: viewBox.width,
    svgPixelWidth,
    svgPixelHeight,
  });

  return {
    x: svgPixelWidth > 0 ? viewBox.width / svgPixelWidth : 1,
    y: svgPixelHeight > 0 ? viewBox.height / svgPixelHeight : 1,
  };
};

export const clientToWorld = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewBox: ViewBox,
): Point => {
  console.info("[canvasViewport] Converting client coordinates to world space", { clientX, clientY });

  const relativeX = rect.width > 0 ? (clientX - rect.left) / rect.width : 0.5;
  const relativeY = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;

  return {
    x: viewBox.x + relativeX * viewBox.width,
    y: viewBox.y + relativeY * viewBox.height,
  };
};

export const getPinchMetrics = (points: Point[]) => {
  console.info("[canvasViewport] Calculating pinch metrics", { pointerCount: points.length });

  if (points.length < 2) {
    return null;
  }

  const [first, second] = points;
  const midpoint = {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
  const distance = Math.hypot(second.x - first.x, second.y - first.y);

  return { midpoint, distance };
};

export const getViewportFromPinch = ({
  startZoom,
  startPan,
  startMidpoint,
  startDistance,
  currentMidpoint,
  currentDistance,
  svgRect,
}: {
  startZoom: number;
  startPan: Point;
  startMidpoint: Point;
  startDistance: number;
  currentMidpoint: Point;
  currentDistance: number;
  svgRect: DOMRect;
}): { pan: Point; zoom: number } => {
  console.info("[canvasViewport] Calculating viewport from pinch gesture", {
    startZoom,
    startDistance,
    currentDistance,
  });

  const startViewBox = getViewBox(startZoom, startPan);
  const anchorWorld = clientToWorld(startMidpoint.x, startMidpoint.y, svgRect, startViewBox);
  const distanceRatio = startDistance > 0 ? currentDistance / startDistance : 1;
  const nextZoom = clampZoom(startZoom * distanceRatio);
  const nextViewBox = getViewBox(nextZoom, startPan);

  return {
    zoom: nextZoom,
    pan: {
      x: anchorWorld.x - ((currentMidpoint.x - svgRect.left) / Math.max(svgRect.width, 1)) * nextViewBox.width,
      y: anchorWorld.y - ((currentMidpoint.y - svgRect.top) / Math.max(svgRect.height, 1)) * nextViewBox.height,
    },
  };
};

export const getZoomAtClientPoint = (
  clientX: number,
  clientY: number,
  currentZoom: number,
  currentPan: Point,
  zoomFactor: number,
  svgRect: DOMRect,
): { pan: Point; zoom: number } => {
  console.info("[canvasViewport] Calculating zoom anchored at client point", {
    clientX,
    clientY,
    currentZoom,
    zoomFactor,
  });

  const currentViewBox = getViewBox(currentZoom, currentPan);
  const anchorWorld = clientToWorld(clientX, clientY, svgRect, currentViewBox);
  const nextZoom = clampZoom(currentZoom * zoomFactor);
  const nextViewBox = getViewBox(nextZoom, currentPan);

  return {
    zoom: nextZoom,
    pan: {
      x: anchorWorld.x - ((clientX - svgRect.left) / Math.max(svgRect.width, 1)) * nextViewBox.width,
      y: anchorWorld.y - ((clientY - svgRect.top) / Math.max(svgRect.height, 1)) * nextViewBox.height,
    },
  };
};
