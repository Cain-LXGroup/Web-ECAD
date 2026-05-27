import type { LibrarySymbol, Point, SchematicProject } from "../library/types";

export type ProjectBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const includePoint = (bounds: ProjectBounds, point: Point, padding: number): ProjectBounds => ({
  minX: Math.min(bounds.minX, point.x - padding),
  minY: Math.min(bounds.minY, point.y - padding),
  maxX: Math.max(bounds.maxX, point.x + padding),
  maxY: Math.max(bounds.maxY, point.y + padding),
});

const getSymbolBounds = (instance: { x: number; y: number; symbolId: string }, symbol?: LibrarySymbol) => {
  if (!symbol) {
    return {
      minX: instance.x - 120,
      minY: instance.y - 120,
      maxX: instance.x + 120,
      maxY: instance.y + 120,
    };
  }

  return {
    minX: instance.x + symbol.bounds.minX,
    minY: instance.y - symbol.bounds.maxY,
    maxX: instance.x + symbol.bounds.maxX,
    maxY: instance.y - symbol.bounds.minY,
  };
};

export const getProjectBounds = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  padding = 160,
): ProjectBounds | null => {
  console.info("[projectBounds] Calculating project bounds", { projectId: project.id, padding });

  let bounds: ProjectBounds | null = null;

  const merge = (next: ProjectBounds) => {
    if (!bounds) {
      bounds = { ...next };
      return;
    }

    bounds = {
      minX: Math.min(bounds.minX, next.minX),
      minY: Math.min(bounds.minY, next.minY),
      maxX: Math.max(bounds.maxX, next.maxX),
      maxY: Math.max(bounds.maxY, next.maxY),
    };
  };

  project.symbols.forEach((instance) => {
    merge(getSymbolBounds(instance, symbolIndex[instance.symbolId]));
  });

  project.wires.forEach((wire) => {
    wire.points.forEach((point) => {
      if (!bounds) {
        bounds = {
          minX: point.x - padding,
          minY: point.y - padding,
          maxX: point.x + padding,
          maxY: point.y + padding,
        };
      } else {
        bounds = includePoint(bounds, point, padding);
      }
    });
  });

  project.netLabels.forEach((label) => {
    const width = label.text.length * 28;
    merge({
      minX: label.x - 40,
      minY: label.y - 40,
      maxX: label.x + width + 40,
      maxY: label.y + 40,
    });
  });

  project.textNotes.forEach((note) => {
    const width = note.text.length * 24;
    merge({
      minX: note.x - 40,
      minY: note.y - 40,
      maxX: note.x + width + 40,
      maxY: note.y + 40,
    });
  });

  return bounds;
};

export const getSelectionBounds = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  selectedIds: string[],
  padding = 120,
): ProjectBounds | null => {
  console.info("[projectBounds] Calculating selection bounds", { selectedCount: selectedIds.length });

  if (selectedIds.length === 0) {
    return null;
  }

  const selectedProject: SchematicProject = {
    ...project,
    symbols: project.symbols.filter((symbol) => selectedIds.includes(symbol.id)),
    wires: project.wires.filter((wire) => selectedIds.includes(wire.id)),
    netLabels: project.netLabels.filter((label) => selectedIds.includes(label.id)),
    textNotes: project.textNotes.filter((note) => selectedIds.includes(note.id)),
  };

  return getProjectBounds(selectedProject, symbolIndex, padding);
};
