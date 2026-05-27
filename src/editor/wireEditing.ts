import type { LibrarySymbol, Point, SchematicProject, Wire } from "../library/types";
import { resolveLabelAnchor } from "./labelAnchoring";
import { normalizeWirePoints } from "./wireRouting";
import { DEFAULT_GRID_SIZE, snapPoint } from "./snapping";

const pointsEqual = (left: Point, right: Point): boolean => left.x === right.x && left.y === right.y;

export const applyWireNodeMoveWithJunctions = (
  wires: Wire[],
  wireId: string,
  pointIndex: number,
  nextPoint: Point,
  gridSize: number,
): Wire[] => {
  console.info("[wireEditing] Applying wire node move with junction propagation", {
    wireId,
    pointIndex,
    wireCount: wires.length,
  });

  const movedWire = wires.find((candidate) => candidate.id === wireId);
  if (!movedWire || pointIndex < 0 || pointIndex >= movedWire.points.length) {
    return wires;
  }

  const previousPoint = movedWire.points[pointIndex];
  const snappedNext = snapPoint(nextPoint, gridSize);

  if (pointsEqual(previousPoint, snappedNext)) {
    return wires;
  }

  const withMovedNode = wires.map((wire) =>
    wire.id === wireId ? updateWirePointPosition(wire, pointIndex, snappedNext, gridSize) : wire,
  );

  return withMovedNode.map((wire) => {
    if (wire.id === wireId) {
      return wire;
    }

    let points = [...wire.points];
    let changed = false;

    for (let index = 0; index < points.length; index += 1) {
      if (pointsEqual(points[index], previousPoint)) {
        points[index] = snappedNext;
        changed = true;
      }
    }

    if (wire.startWireId === wireId && points.length > 0 && pointsEqual(points[0], previousPoint)) {
      points[0] = snappedNext;
      changed = true;
    }

    if (wire.endWireId === wireId && points.length > 0) {
      const lastIndex = points.length - 1;
      if (pointsEqual(points[lastIndex], previousPoint)) {
        points[lastIndex] = snappedNext;
        changed = true;
      }
    }

    if (!changed) {
      return wire;
    }

    return {
      ...wire,
      routingMode: "manual" as const,
      points: normalizeWirePoints(points),
    };
  });
};

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
