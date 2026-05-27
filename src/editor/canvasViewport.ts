import type { Point } from "../library/types";
import { clientPointToWorld } from "./svgCoordinates";

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

  const scale =
    viewBox.width > 0 && viewBox.height > 0
      ? Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
      : 1;
  const drawnWidth = viewBox.width * scale;
  const drawnHeight = viewBox.height * scale;
  const offsetX = (rect.width - drawnWidth) / 2;
  const offsetY = (rect.height - drawnHeight) / 2;

  return {
    x: viewBox.x + (clientX - rect.left - offsetX) / scale,
    y: viewBox.y + (clientY - rect.top - offsetY) / scale,
  };
};

export const getPanKeepingWorldUnderClient = (
  anchorWorld: Point,
  clientX: number,
  clientY: number,
  zoom: number,
  rect: DOMRect,
): Point => {
  console.info("[canvasViewport] Calculating pan to keep world anchor under client point", {
    clientX,
    clientY,
    zoom,
  });

  const viewBoxSize = getViewBox(zoom, { x: 0, y: 0 });
  const scale =
    viewBoxSize.width > 0 && viewBoxSize.height > 0
      ? Math.min(rect.width / viewBoxSize.width, rect.height / viewBoxSize.height)
      : 1;
  const drawnWidth = viewBoxSize.width * scale;
  const drawnHeight = viewBoxSize.height * scale;
  const offsetX = (rect.width - drawnWidth) / 2;
  const offsetY = (rect.height - drawnHeight) / 2;

  return {
    x: anchorWorld.x - (clientX - rect.left - offsetX) / scale,
    y: anchorWorld.y - (clientY - rect.top - offsetY) / scale,
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
  svg,
  startZoom,
  startPan,
  startMidpoint,
  startDistance,
  currentMidpoint,
  currentDistance,
  svgRect,
}: {
  svg: SVGSVGElement;
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

  const anchorWorld = clientPointToWorld(svg, startMidpoint.x, startMidpoint.y);
  if (!anchorWorld) {
    return { pan: startPan, zoom: startZoom };
  }

  const distanceRatio = startDistance > 0 ? currentDistance / startDistance : 1;
  const nextZoom = clampZoom(startZoom * distanceRatio);

  return {
    zoom: nextZoom,
    pan: getPanKeepingWorldUnderClient(anchorWorld, currentMidpoint.x, currentMidpoint.y, nextZoom, svgRect),
  };
};

export const getZoomAtClientPoint = (
  svg: SVGSVGElement,
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

  const anchorWorld = clientPointToWorld(svg, clientX, clientY);
  if (!anchorWorld) {
    return { pan: currentPan, zoom: currentZoom };
  }

  const nextZoom = clampZoom(currentZoom * zoomFactor);

  return {
    zoom: nextZoom,
    pan: getPanKeepingWorldUnderClient(anchorWorld, clientX, clientY, nextZoom, svgRect),
  };
};
