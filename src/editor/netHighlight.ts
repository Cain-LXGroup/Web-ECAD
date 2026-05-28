import type { LibrarySymbol, SchematicProject } from "../library/types";
import { buildElectricalModel, buildProjectElectricalModel } from "./electricalModel";

export type NetHighlightSet = {
  wireIds: Set<string>;
  busIds: Set<string>;
  labelIds: Set<string>;
  sheetPinIds: Set<string>;
  symbolInstanceIds: Set<string>;
};

const EMPTY_HIGHLIGHT: NetHighlightSet = {
  wireIds: new Set(),
  busIds: new Set(),
  labelIds: new Set(),
  sheetPinIds: new Set(),
  symbolInstanceIds: new Set(),
};

const collectMembersForRoots = (
  electricalModel: ReturnType<typeof buildElectricalModel>,
  roots: Set<string>,
): NetHighlightSet => {
  const wireIds = new Set<string>();
  const busIds = new Set<string>();
  const labelIds = new Set<string>();
  const sheetPinIds = new Set<string>();
  const symbolInstanceIds = new Set<string>();

  for (const [wireId, root] of electricalModel.rootsByWireId.entries()) {
    if (root && roots.has(root)) {
      wireIds.add(wireId);
    }
  }

  for (const [busId, root] of electricalModel.rootsByBusId.entries()) {
    if (root && roots.has(root)) {
      busIds.add(busId);
    }
  }

  for (const [labelId, root] of electricalModel.rootsByLabelId.entries()) {
    if (root && roots.has(root)) {
      labelIds.add(labelId);
    }
  }

  for (const [pinId, root] of electricalModel.rootsBySheetPinId.entries()) {
    if (root && roots.has(root)) {
      sheetPinIds.add(pinId);
    }
  }

  for (const pin of electricalModel.pins) {
    if (roots.has(pin.root)) {
      symbolInstanceIds.add(pin.symbolInstanceId);
    }
  }

  return { wireIds, busIds, labelIds, sheetPinIds, symbolInstanceIds };
};

export const computeNetHighlight = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  selectedIds: string[],
  fullProject?: SchematicProject,
): NetHighlightSet => {
  console.info("[netHighlight] Computing net highlight for selection", { selectedCount: selectedIds.length });

  if (selectedIds.length === 0) {
    return EMPTY_HIGHLIGHT;
  }

  const electricalModel = fullProject
    ? buildProjectElectricalModel(fullProject, symbolIndex)
    : buildElectricalModel(project, symbolIndex);

  const roots = new Set<string>();

  for (const selectedId of selectedIds) {
    const wireRoot = electricalModel.getRootForWire(selectedId);
    if (wireRoot) {
      roots.add(wireRoot);
      continue;
    }

    const busRoot = electricalModel.getRootForBus(selectedId);
    if (busRoot) {
      roots.add(busRoot);
      continue;
    }

    const labelRoot = electricalModel.getRootForLabel(selectedId);
    if (labelRoot) {
      roots.add(labelRoot);
      continue;
    }

    const sheetPinRoot = electricalModel.getRootForSheetPin(selectedId);
    if (sheetPinRoot) {
      roots.add(sheetPinRoot);
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

  return collectMembersForRoots(electricalModel, roots);
};

export const isNetHighlighted = (
  highlight: NetHighlightSet,
  kind: "wire" | "bus" | "label" | "sheet-pin" | "symbol",
  id: string,
): boolean => {
  if (kind === "wire") {
    return highlight.wireIds.has(id);
  }

  if (kind === "bus") {
    return highlight.busIds.has(id);
  }

  if (kind === "label") {
    return highlight.labelIds.has(id);
  }

  if (kind === "sheet-pin") {
    return highlight.sheetPinIds.has(id);
  }

  return highlight.symbolInstanceIds.has(id);
};
