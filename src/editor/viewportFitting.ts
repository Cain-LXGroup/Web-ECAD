import type { Point } from "../library/types";
import { clampZoom, VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./canvasViewport";
import type { ProjectBounds } from "./projectBounds";

export const getViewportForBounds = (
  bounds: ProjectBounds,
  paddingFactor = 1.2,
): { pan: Point; zoom: number } => {
  console.info("[viewportFitting] Calculating viewport for bounds", { paddingFactor });

  const contentWidth = Math.max(bounds.maxX - bounds.minX, 200);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 200);
  const paddedWidth = contentWidth * paddingFactor;
  const paddedHeight = contentHeight * paddingFactor;

  const zoom = clampZoom(Math.min(VIEWPORT_WIDTH / paddedWidth, VIEWPORT_HEIGHT / paddedHeight));
  const viewWidth = VIEWPORT_WIDTH / zoom;
  const viewHeight = VIEWPORT_HEIGHT / zoom;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    zoom,
    pan: {
      x: centerX - viewWidth / 2,
      y: centerY - viewHeight / 2,
    },
  };
};
