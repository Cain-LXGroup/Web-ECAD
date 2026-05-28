import type { LibrarySymbol, SchematicProject } from "../library/types";
import { buildElectricalModel } from "./electricalModel";

export type NetHighlightSet = {
  wireIds: Set<string>;
  labelIds: Set<string>;
  symbolInstanceIds: Set<string>;
};

const EMPTY_HIGHLIGHT: NetHighlightSet = {
  wireIds: new Set(),
  labelIds: new Set(),
  symbolInstanceIds: new Set(),
};

export const computeNetHighlight = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  selectedIds: string[],
): NetHighlightSet => {
  console.info("[netHighlight] Computing net highlight for selection", { selectedCount: selectedIds.length });

  if (selectedIds.length === 0) {
    return EMPTY_HIGHLIGHT;
  }

  const electricalModel = buildElectricalModel(project, symbolIndex);
  const roots = new Set<string>();

  for (const selectedId of selectedIds) {
    const wire = project.wires.find((candidate) => candidate.id === selectedId);
    if (wire) {
      const root = electricalModel.getRootForWire(wire.id);
      if (root) {
        roots.add(root);
      }
      continue;
    }

    const label = project.netLabels.find((candidate) => candidate.id === selectedId);
    if (label) {
      const root = electricalModel.getRootForLabel(label.id);
      if (root) {
        roots.add(root);
      }
      continue;
    }

    const symbol = project.symbols.find((candidate) => candidate.id === selectedId);
    if (symbol) {
      const librarySymbol = symbolIndex[symbol.symbolId];
      librarySymbol?.pins.forEach((pin) => {
        roots.add(
          electricalModel.getRootForPin({
            symbolInstanceId: symbol.id,
            pinNumber: pin.number,
          }),
        );
      });
    }
  }

  if (roots.size === 0) {
    return EMPTY_HIGHLIGHT;
  }

  const wireIds = new Set<string>();
  const labelIds = new Set<string>();
  const symbolInstanceIds = new Set<string>();

  for (const wire of project.wires) {
    const root = electricalModel.getRootForWire(wire.id);
    if (root && roots.has(root)) {
      wireIds.add(wire.id);
    }
  }

  for (const label of project.netLabels) {
    const root = electricalModel.getRootForLabel(label.id);
    if (root && roots.has(root)) {
      labelIds.add(label.id);
    }
  }

  for (const symbol of project.symbols) {
    const librarySymbol = symbolIndex[symbol.symbolId];
    if (!librarySymbol) {
      continue;
    }

    const onNet = librarySymbol.pins.some((pin) =>
      roots.has(
        electricalModel.getRootForPin({
          symbolInstanceId: symbol.id,
          pinNumber: pin.number,
        }),
      ),
    );

    if (onNet) {
      symbolInstanceIds.add(symbol.id);
    }
  }

  return { wireIds, labelIds, symbolInstanceIds };
};

export const isNetHighlighted = (
  highlight: NetHighlightSet,
  kind: "wire" | "label" | "symbol",
  id: string,
): boolean => {
  if (kind === "wire") {
    return highlight.wireIds.has(id);
  }

  if (kind === "label") {
    return highlight.labelIds.has(id);
  }

  return highlight.symbolInstanceIds.has(id);
};
