import { normalizeBusText } from "../library/busNotation";
import { normalizeProject } from "./projectSheets";
import type { LibrarySymbol, NetLabel, NetLabelScope, Point, SchematicProject, WireConnection } from "../library/types";
import { normalizePinElectricalType } from "../library/pinElectricalType";
import { isPinElectricallyConnected } from "./pinConnectivity";
import { resolveWireConnectionPoint } from "./wireRouting";

const pinKey = (connection: WireConnection): string =>
  `pin:${connection.symbolInstanceId}:${connection.pinNumber}`;

const wireKey = (wireId: string): string => `wire:${wireId}`;
const busKey = (busId: string): string => `bus:${busId}`;
const labelKey = (labelId: string): string => `label:${labelId}`;
const sheetPinKey = (pinId: string): string => `sheetpin:${pinId}`;

const netNameKey = (scope: NetLabelScope, text: string, sheetId?: string): string => {
  if (scope === "global") {
    return `netname:global:${text}`;
  }

  return `netname:sheet:${sheetId ?? "default"}:${text}`;
};

const hierNetKey = (text: string): string => `netname:hierarchical:${text.trim()}`;

const busNetKey = (text: string, sheetId?: string): string =>
  `busnet:${sheetId ?? "default"}:${normalizeBusText(text)}`;

const busMemberNetKey = (busText: string, memberIndex: number, sheetId?: string): string =>
  `busmember:${sheetId ?? "default"}:${normalizeBusText(busText)}:${memberIndex}`;

const junctionKey = (point: Point, gridSize: number): string => {
  const snap = gridSize || 20;
  const x = Math.round(point.x / snap) * snap;
  const y = Math.round(point.y / snap) * snap;
  return `junction:${x},${y}`;
};

class UnionFind {
  private parent = new Map<string, string>();

  find(key: string): string {
    const existing = this.parent.get(key);
    if (!existing) {
      this.parent.set(key, key);
      return key;
    }

    if (existing !== key) {
      const root = this.find(existing);
      this.parent.set(key, root);
      return root;
    }

    return key;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }
}

export type ElectricalPinState = {
  key: string;
  root: string;
  symbolInstanceId: string;
  pinNumber: string;
  pinName: string;
  electricalType: string;
  connected: boolean;
};

export type ElectricalModel = {
  rootsByWireId: Map<string, string>;
  rootsByBusId: Map<string, string>;
  rootsByLabelId: Map<string, string>;
  rootsBySheetPinId: Map<string, string>;
  pins: ElectricalPinState[];
  connectedRoots: Set<string>;
  membersByRoot: Map<string, Set<string>>;
  hierarchicalNets: Map<string, string[]>;
  getRootForWire: (wireId: string) => string | undefined;
  getRootForBus: (busId: string) => string | undefined;
  getRootForLabel: (labelId: string) => string | undefined;
  getRootForSheetPin: (pinId: string) => string | undefined;
  getRootForPin: (connection: WireConnection) => string;
};

const resolveLabelNetKey = (
  label: NetLabel,
  sheetId: string,
): string => {
  const kind = label.labelKind ?? (label.labelScope === "global" ? "global" : "sheet");

  if (kind === "hierarchical") {
    return hierNetKey(label.text);
  }

  if (kind === "bus") {
    return busNetKey(label.text, sheetId);
  }

  if (kind === "bus-member" && label.busMemberIndex !== undefined) {
    return busMemberNetKey(label.text.replace(/\d+$/, "") || label.text, label.busMemberIndex, sheetId);
  }

  return netNameKey(label.labelScope ?? "sheet", label.text, sheetId);
};

type SheetConnectivityInput = Pick<
  SchematicProject,
  "symbols" | "wires" | "buses" | "netLabels" | "sheetPins" | "gridSize"
>;

const accumulateSheetConnectivity = (
  unionFind: UnionFind,
  sheet: SheetConnectivityInput,
  symbolIndex: Record<string, LibrarySymbol>,
  sheetId: string,
  sheetName: string,
  hierarchicalNets: Map<string, string[]>,
): ElectricalPinState[] => {
  console.info("[electricalModel] Accumulating sheet connectivity", { sheetId, sheetName });

  const gridSize = sheet.gridSize || 20;
  const pins: ElectricalPinState[] = [];
  const buses = sheet.buses ?? [];
  const sheetPins = sheet.sheetPins ?? [];

  for (const wire of sheet.wires) {
    unionFind.find(wireKey(wire.id));

    for (let index = 1; index < wire.points.length; index += 1) {
      const a = junctionKey(wire.points[index - 1], gridSize);
      const b = junctionKey(wire.points[index], gridSize);
      unionFind.union(wireKey(wire.id), b);
      unionFind.union(a, b);
    }

    if (wire.startConnection) {
      unionFind.union(wireKey(wire.id), pinKey(wire.startConnection));
    }

    if (wire.endConnection) {
      unionFind.union(wireKey(wire.id), pinKey(wire.endConnection));
    }

    for (const point of wire.points) {
      unionFind.union(wireKey(wire.id), junctionKey(point, gridSize));
    }
  }

  for (const bus of buses) {
    const bKey = busKey(bus.id);
    const netKey = busNetKey(bus.text, sheetId);
    unionFind.find(bKey);
    unionFind.union(bKey, netKey);

    for (let index = 1; index < bus.points.length; index += 1) {
      const a = junctionKey(bus.points[index - 1], gridSize);
      const b = junctionKey(bus.points[index], gridSize);
      unionFind.union(bKey, b);
      unionFind.union(a, b);
    }

    if (bus.pinConnection) {
      unionFind.union(bKey, pinKey(bus.pinConnection));
    }

    if (bus.wireId) {
      unionFind.union(bKey, wireKey(bus.wireId));
    }

    for (const point of bus.points) {
      unionFind.union(bKey, junctionKey(point, gridSize));
    }
  }

  const labelsById = new Map(sheet.netLabels.map((label) => [label.id, label]));

  for (const label of sheet.netLabels) {
    const scopedName = resolveLabelNetKey(label, sheetId);
    const labelNode = labelKey(label.id);
    unionFind.find(labelNode);
    unionFind.union(labelNode, scopedName);

    if (label.labelKind === "bus-member" && label.busLabelId) {
      const parent = labelsById.get(label.busLabelId);
      if (parent) {
        const parentBusText = normalizeBusText(parent.text);
        unionFind.union(labelNode, busNetKey(parentBusText, sheetId));
        if (label.busMemberIndex !== undefined) {
          unionFind.union(labelNode, busMemberNetKey(parentBusText, label.busMemberIndex, sheetId));
        }
      }
    }

    if (label.pinConnection) {
      unionFind.union(labelNode, pinKey(label.pinConnection));
    }

    if (label.wireId) {
      unionFind.union(labelNode, wireKey(label.wireId));
    }

    if (label.labelKind === "hierarchical") {
      const entries = hierarchicalNets.get(label.text.trim()) ?? [];
      entries.push(`${sheetName}:${label.text}`);
      hierarchicalNets.set(label.text.trim(), entries);
    }
  }

  for (const sheetPin of sheetPins) {
    const pinNode = sheetPinKey(sheetPin.id);
    const hierKey = hierNetKey(sheetPin.name);
    unionFind.find(pinNode);
    unionFind.union(pinNode, hierKey);

    if (sheetPin.pinConnection) {
      unionFind.union(pinNode, pinKey(sheetPin.pinConnection));
    }

    if (sheetPin.wireId) {
      unionFind.union(pinNode, wireKey(sheetPin.wireId));
    }

    const entries = hierarchicalNets.get(sheetPin.name.trim()) ?? [];
    entries.push(`${sheetName}:pin ${sheetPin.name}`);
    hierarchicalNets.set(sheetPin.name.trim(), entries);
  }

  const sheetProject: SchematicProject = {
    id: sheetId,
    name: sheetName,
    createdAt: 0,
    updatedAt: 0,
    symbols: sheet.symbols,
    wires: sheet.wires,
    buses,
    netLabels: sheet.netLabels,
    sheetPins,
    textNotes: [],
    gridSize,
    sheets: [],
  };

  for (const symbol of sheet.symbols) {
    const librarySymbol = symbolIndex[symbol.symbolId];
    if (!librarySymbol) {
      continue;
    }

    for (const pin of librarySymbol.pins) {
      const connection: WireConnection = {
        symbolInstanceId: symbol.id,
        pinNumber: pin.number,
      };
      const anchor = resolveWireConnectionPoint(sheetProject, symbolIndex, connection);
      const wired = isPinElectricallyConnected(sheetProject, symbolIndex, connection);
      const pKey = pinKey(connection);

      if (wired && anchor) {
        unionFind.union(pKey, junctionKey(anchor, gridSize));
      }

      pins.push({
        key: pKey,
        root: unionFind.find(pKey),
        symbolInstanceId: symbol.id,
        pinNumber: pin.number,
        pinName: pin.name?.trim() || pin.number,
        electricalType: normalizePinElectricalType(pin.electricalType),
        connected: wired,
      });
    }
  }

  return pins;
};

const finalizeElectricalModel = (
  unionFind: UnionFind,
  sheet: SheetConnectivityInput,
  pins: ElectricalPinState[],
  hierarchicalNets: Map<string, string[]>,
): ElectricalModel => {
  const rootsByWireId = new Map<string, string>();
  const rootsByBusId = new Map<string, string>();
  const rootsByLabelId = new Map<string, string>();
  const rootsBySheetPinId = new Map<string, string>();
  const membersByRoot = new Map<string, Set<string>>();

  for (const wire of sheet.wires) {
    rootsByWireId.set(wire.id, unionFind.find(wireKey(wire.id)));
  }

  for (const bus of sheet.buses ?? []) {
    rootsByBusId.set(bus.id, unionFind.find(busKey(bus.id)));
  }

  for (const label of sheet.netLabels) {
    rootsByLabelId.set(label.id, unionFind.find(labelKey(label.id)));
  }

  for (const sheetPin of sheet.sheetPins ?? []) {
    rootsBySheetPinId.set(sheetPin.id, unionFind.find(sheetPinKey(sheetPin.id)));
  }

  const addMember = (root: string | undefined, member: string) => {
    if (!root) {
      return;
    }

    const currentMembers = membersByRoot.get(root) ?? new Set<string>();
    currentMembers.add(member);
    membersByRoot.set(root, currentMembers);
  };

  for (const wire of sheet.wires) {
    addMember(rootsByWireId.get(wire.id), wireKey(wire.id));
  }

  for (const bus of sheet.buses ?? []) {
    addMember(rootsByBusId.get(bus.id), busKey(bus.id));
  }

  for (const label of sheet.netLabels) {
    addMember(rootsByLabelId.get(label.id), labelKey(label.id));
  }

  for (const sheetPin of sheet.sheetPins ?? []) {
    addMember(rootsBySheetPinId.get(sheetPin.id), sheetPinKey(sheetPin.id));
  }

  for (const pin of pins) {
    addMember(pin.root, pin.key);
  }

  const connectedRoots = new Set<string>([
    ...rootsByWireId.values(),
    ...rootsByBusId.values(),
    ...rootsByLabelId.values(),
    ...rootsBySheetPinId.values(),
  ]);

  return {
    rootsByWireId,
    rootsByBusId,
    rootsByLabelId,
    rootsBySheetPinId,
    pins,
    connectedRoots,
    membersByRoot,
    hierarchicalNets,
    getRootForWire: (wireId: string) => rootsByWireId.get(wireId),
    getRootForBus: (busId: string) => rootsByBusId.get(busId),
    getRootForLabel: (labelId: string) => rootsByLabelId.get(labelId),
    getRootForSheetPin: (pinId: string) => rootsBySheetPinId.get(pinId),
    getRootForPin: (connection: WireConnection) => unionFind.find(pinKey(connection)),
  };
};

export const buildElectricalModel = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  sheetId = "active",
  sheetName = "Sheet",
): ElectricalModel => {
  console.info("[electricalModel] Building canonical electrical model", {
    projectId: project.id,
    wireCount: project.wires.length,
    busCount: project.buses?.length ?? 0,
    labelCount: project.netLabels.length,
    sheetPinCount: project.sheetPins?.length ?? 0,
  });

  const unionFind = new UnionFind();
  const hierarchicalNets = new Map<string, string[]>();
  const pins = accumulateSheetConnectivity(
    unionFind,
    {
      symbols: project.symbols,
      wires: project.wires,
      buses: project.buses ?? [],
      netLabels: project.netLabels,
      sheetPins: project.sheetPins ?? [],
      gridSize: project.gridSize,
    },
    symbolIndex,
    sheetId,
    sheetName,
    hierarchicalNets,
  );

  return finalizeElectricalModel(
    unionFind,
    {
      symbols: project.symbols,
      wires: project.wires,
      buses: project.buses ?? [],
      netLabels: project.netLabels,
      sheetPins: project.sheetPins ?? [],
      gridSize: project.gridSize,
    },
    pins,
    hierarchicalNets,
  );
};

export const buildProjectElectricalModel = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
): ElectricalModel => {
  console.info("[electricalModel] Building full-project electrical model", { projectId: project.id });

  const normalized = normalizeProject(project);
  const unionFind = new UnionFind();
  const hierarchicalNets = new Map<string, string[]>();
  let pins: ElectricalPinState[] = [];

  const activeSheet =
    normalized.sheets.find((sheet) => sheet.id === normalized.activeSheetId) ?? normalized.sheets[0];

  for (const sheet of normalized.sheets) {
    const sheetPins = accumulateSheetConnectivity(
      unionFind,
      {
        symbols: sheet.symbols,
        wires: sheet.wires,
        buses: sheet.buses ?? [],
        netLabels: sheet.netLabels,
        sheetPins: sheet.sheetPins ?? [],
        gridSize: normalized.gridSize,
      },
      symbolIndex,
      sheet.id,
      sheet.name,
      hierarchicalNets,
    );

    if (sheet.id === activeSheet.id) {
      pins = sheetPins;
    }
  }

  return finalizeElectricalModel(
    unionFind,
    {
      symbols: activeSheet.symbols,
      wires: activeSheet.wires,
      buses: activeSheet.buses ?? [],
      netLabels: activeSheet.netLabels,
      sheetPins: activeSheet.sheetPins ?? [],
      gridSize: normalized.gridSize,
    },
    pins,
    hierarchicalNets,
  );
};

export const listCrossSheetHierarchicalNets = (
  project: SchematicProject,
): Array<{ name: string; occurrences: string[] }> => {
  console.info("[electricalModel] Listing cross-sheet hierarchical nets");

  const model = buildProjectElectricalModel(project, {});
  return [...model.hierarchicalNets.entries()]
    .map(([name, occurrences]) => ({ name, occurrences }))
    .sort((left, right) => left.name.localeCompare(right.name));
};
