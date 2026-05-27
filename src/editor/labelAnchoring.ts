import type { LibrarySymbol, NetLabel, Point, SchematicProject, TextNote, WireConnection } from "../library/types";
import {
  findNearestWireConnection,
  findNearestWireSegmentPoint,
  resolveWireConnectionPoint,
} from "./wireRouting";

export type LabelAnchor = {
  point: Point;
  pinConnection?: WireConnection;
  wireId?: string;
};

export const resolveLabelAnchor = (
  point: Point,
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  gridSize: number,
): LabelAnchor => {
  console.info("[labelAnchoring] Resolving label anchor", { point });

  const tolerance = Math.max(gridSize * 0.75, 36);
  const nearestPin = findNearestWireConnection(point, project, symbolIndex, tolerance);

  if (nearestPin) {
    return {
      point: nearestPin.point,
      pinConnection: nearestPin.connection,
    };
  }

  const nearestWire = findNearestWireSegmentPoint(point, project, tolerance);
  if (nearestWire) {
    return {
      point: nearestWire.point,
      wireId: nearestWire.wireId,
    };
  }

  return { point };
};

export const resolveNetLabelPosition = (
  label: NetLabel,
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
): Point => {
  if (label.pinConnection) {
    const pinPoint = resolveWireConnectionPoint(project, symbolIndex, label.pinConnection);
    if (pinPoint) {
      return pinPoint;
    }
  }

  if (label.wireId) {
    const wire = project.wires.find((candidate) => candidate.id === label.wireId);
    if (wire) {
      const nearestPoint = findNearestWireSegmentPoint(
        { x: label.x, y: label.y },
        project,
        Math.max(project.gridSize ?? 50, 36),
        [],
      );
      if (nearestPoint) {
        return nearestPoint.point;
      }
    }
  }

  return { x: label.x, y: label.y };
};

export const resolveTextNotePosition = (
  note: TextNote,
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
): Point => {
  if (note.pinConnection) {
    const pinPoint = resolveWireConnectionPoint(project, symbolIndex, note.pinConnection);
    if (pinPoint) {
      return pinPoint;
    }
  }

  if (note.wireId) {
    const wire = project.wires.find((candidate) => candidate.id === note.wireId);
    if (wire) {
      const nearestPoint = findNearestWireSegmentPoint(
        { x: note.x, y: note.y },
        project,
        Math.max(project.gridSize ?? 50, 36),
        [],
      );
      if (nearestPoint) {
        return nearestPoint.point;
      }
    }
  }

  return { x: note.x, y: note.y };
};

export const syncAnchoredLabels = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
): SchematicProject => {
  console.info("[labelAnchoring] Syncing anchored label positions", {
    netLabelCount: project.netLabels.length,
    textNoteCount: project.textNotes.length,
  });

  return {
    ...project,
    netLabels: project.netLabels.map((label) => {
      const position = resolveNetLabelPosition(label, project, symbolIndex);
      return {
        ...label,
        x: position.x,
        y: position.y,
      };
    }),
    textNotes: project.textNotes.map((note) => {
      const position = resolveTextNotePosition(note, project, symbolIndex);
      return {
        ...note,
        x: position.x,
        y: position.y,
      };
    }),
  };
};
