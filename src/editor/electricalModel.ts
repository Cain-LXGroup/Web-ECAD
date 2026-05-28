import type { LibrarySymbol, NetLabelScope, Point, SchematicProject, WireConnection } from "../library/types";
import { resolveWireConnectionPoint } from "./wireRouting";

const pinKey = (connection: WireConnection): string =>
  `pin:${connection.symbolInstanceId}:${connection.pinNumber}`;

const wireKey = (wireId: string): string => `wire:${wireId}`;
const labelKey = (labelId: string): string => `label:${labelId}`;
const netNameKey = (scope: NetLabelScope, text: string): string => `netname:${scope}:${text}`;

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
  electricalType: string;
  connected: boolean;
};

export type ElectricalModel = {
  rootsByWireId: Map<string, string>;
  rootsByLabelId: Map<string, string>;
  pins: ElectricalPinState[];
  connectedRoots: Set<string>;
  membersByRoot: Map<string, Set<string>>;
  getRootForWire: (wireId: string) => string | undefined;
  getRootForLabel: (labelId: string) => string | undefined;
  getRootForPin: (connection: WireConnection) => string;
};

export const buildElectricalModel = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
): ElectricalModel => {
  console.info("[electricalModel] Building canonical electrical model", {
    projectId: project.id,
    wireCount: project.wires.length,
    labelCount: project.netLabels.length,
    symbolCount: project.symbols.length,
  });

  const unionFind = new UnionFind();
  const gridSize = project.gridSize || 20;
  const rootsByWireId = new Map<string, string>();
  const rootsByLabelId = new Map<string, string>();
  const membersByRoot = new Map<string, Set<string>>();
  const pins: ElectricalPinState[] = [];

  for (const wire of project.wires) {
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

  for (const label of project.netLabels) {
    const scopedName = netNameKey(label.labelScope ?? "sheet", label.text);
    const labelNode = labelKey(label.id);

    unionFind.find(labelNode);
    unionFind.union(labelNode, scopedName);

    if (label.pinConnection) {
      unionFind.union(labelNode, pinKey(label.pinConnection));
    }

    if (label.wireId) {
      unionFind.union(labelNode, wireKey(label.wireId));
    }
  }

  for (const symbol of project.symbols) {
    const librarySymbol = symbolIndex[symbol.symbolId];
    if (!librarySymbol) {
      continue;
    }

    for (const pin of librarySymbol.pins) {
      const connection: WireConnection = {
        symbolInstanceId: symbol.id,
        pinNumber: pin.number,
      };
      const anchor = resolveWireConnectionPoint(project, symbolIndex, connection);
      const pKey = pinKey(connection);

      if (anchor) {
        unionFind.union(pKey, junctionKey(anchor, gridSize));
      }

      pins.push({
        key: pKey,
        root: unionFind.find(pKey),
        symbolInstanceId: symbol.id,
        pinNumber: pin.number,
        electricalType: pin.electricalType?.trim().toLowerCase() || "passive",
        connected: Boolean(anchor),
      });
    }
  }

  for (const wire of project.wires) {
    rootsByWireId.set(wire.id, unionFind.find(wireKey(wire.id)));
  }

  for (const label of project.netLabels) {
    rootsByLabelId.set(label.id, unionFind.find(labelKey(label.id)));
  }

  for (const wire of project.wires) {
    const root = rootsByWireId.get(wire.id);
    if (!root) {
      continue;
    }

    const currentMembers = membersByRoot.get(root) ?? new Set<string>();
    currentMembers.add(wireKey(wire.id));
    membersByRoot.set(root, currentMembers);
  }

  for (const label of project.netLabels) {
    const root = rootsByLabelId.get(label.id);
    if (!root) {
      continue;
    }

    const currentMembers = membersByRoot.get(root) ?? new Set<string>();
    currentMembers.add(labelKey(label.id));
    membersByRoot.set(root, currentMembers);
  }

  for (const pin of pins) {
    const currentMembers = membersByRoot.get(pin.root) ?? new Set<string>();
    currentMembers.add(pin.key);
    membersByRoot.set(pin.root, currentMembers);
  }

  const connectedRoots = new Set<string>([...rootsByWireId.values(), ...rootsByLabelId.values()]);

  return {
    rootsByWireId,
    rootsByLabelId,
    pins,
    connectedRoots,
    membersByRoot,
    getRootForWire: (wireId: string) => rootsByWireId.get(wireId),
    getRootForLabel: (labelId: string) => rootsByLabelId.get(labelId),
    getRootForPin: (connection: WireConnection) => unionFind.find(pinKey(connection)),
  };
};

