import type { LibrarySymbol, Point, SchematicProject, Wire } from "../library/types";
import { resolveLabelAnchor } from "./labelAnchoring";
import { normalizeWirePoints } from "./wireRouting";
import { DEFAULT_GRID_SIZE, snapPoint } from "./snapping";

export const updateWirePointPosition = (
  wire: Wire,
  pointIndex: number,
  nextPoint: Point,
  gridSize: number,
): Wire => {
  console.info("[wireEditing] Updating wire point position", {
    wireId: wire.id,
    pointIndex,
    pointCount: wire.points.length,
  });

  if (pointIndex < 0 || pointIndex >= wire.points.length) {
    return wire;
  }

  const points = [...wire.points];
  points[pointIndex] = snapPoint(nextPoint, gridSize);

  const updated: Wire = {
    ...wire,
    routingMode: "manual",
    points: normalizeWirePoints(points),
  };

  if (pointIndex === 0) {
    updated.startConnection = undefined;
    updated.startWireId = undefined;
  }

  if (pointIndex === points.length - 1) {
    updated.endConnection = undefined;
    updated.endWireId = undefined;
  }

  return updated;
};

export const removeWirePointAtIndex = (wire: Wire, pointIndex: number): Wire | null => {
  console.info("[wireEditing] Removing wire point", { wireId: wire.id, pointIndex });

  if (wire.points.length <= 2) {
    return null;
  }

  if (pointIndex < 0 || pointIndex >= wire.points.length) {
    return wire;
  }

  const points = wire.points.filter((_, index) => index !== pointIndex);
  const updated: Wire = {
    ...wire,
    routingMode: "manual",
    points: normalizeWirePoints(points),
  };

  if (pointIndex === 0) {
    updated.startConnection = undefined;
    updated.startWireId = undefined;
  }

  if (pointIndex === wire.points.length - 1) {
    updated.endConnection = undefined;
    updated.endWireId = undefined;
  }

  return updated;
};

export const finalizeWireEndpointAnchors = (
  wire: Wire,
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
): Wire => {
  console.info("[wireEditing] Finalizing wire endpoint anchors", { wireId: wire.id });

  if (wire.points.length === 0) {
    return wire;
  }

  const gridSize = project.gridSize ?? DEFAULT_GRID_SIZE;
  const points = [...wire.points];
  const startAnchor = resolveLabelAnchor(points[0], project, symbolIndex, gridSize);
  const endAnchor = resolveLabelAnchor(points[points.length - 1], project, symbolIndex, gridSize);

  points[0] = startAnchor.point;
  points[points.length - 1] = endAnchor.point;

  return {
    ...wire,
    routingMode: "manual",
    points: normalizeWirePoints(points),
    startConnection: startAnchor.pinConnection,
    startWireId: startAnchor.wireId,
    endConnection: endAnchor.pinConnection,
    endWireId: endAnchor.wireId,
  };
};
