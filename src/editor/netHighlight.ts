import type { LibrarySymbol, Point, SchematicProject, WireConnection } from "../library/types";
import { resolveWireConnectionPoint } from "./wireRouting";

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

const junctionKey = (point: Point, gridSize: number): string => {
  const snap = gridSize || 20;
  const x = Math.round(point.x / snap) * snap;
  const y = Math.round(point.y / snap) * snap;
  return `junction:${x},${y}`;
};

const pinKey = (connection: WireConnection): string =>
  `pin:${connection.symbolInstanceId}:${connection.pinNumber}`;

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

const buildConnectivity = (project: SchematicProject, symbolIndex: Record<string, LibrarySymbol>): UnionFind => {
  console.info("[netHighlight] Building connectivity graph", {
    projectId: project.id,
    wireCount: project.wires.length,
  });

  const unionFind = new UnionFind();
  const gridSize = project.gridSize || 20;

  for (const wire of project.wires) {
    unionFind.find(`wire:${wire.id}`);

    for (let index = 1; index < wire.points.length; index += 1) {
      unionFind.union(`wire:${wire.id}`, junctionKey(wire.points[index], gridSize));
      unionFind.union(junctionKey(wire.points[index - 1], gridSize), junctionKey(wire.points[index], gridSize));
    }

    if (wire.startConnection) {
      unionFind.union(`wire:${wire.id}`, pinKey(wire.startConnection));
    }

    if (wire.endConnection) {
      unionFind.union(`wire:${wire.id}`, pinKey(wire.endConnection));
    }

    for (const point of wire.points) {
      unionFind.union(`wire:${wire.id}`, junctionKey(point, gridSize));
    }
  }

  for (const label of project.netLabels) {
    const labelNode = `label:${label.id}`;
    unionFind.find(labelNode);

    const scope = label.labelScope ?? "sheet";
    unionFind.union(labelNode, `netname:${scope}:${label.text}`);

    if (label.pinConnection) {
      unionFind.union(labelNode, pinKey(label.pinConnection));
    }

    if (label.wireId) {
      unionFind.union(labelNode, `wire:${label.wireId}`);
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
      if (anchor) {
        unionFind.union(pinKey(connection), junctionKey(anchor, gridSize));
      }
    }
  }

  return unionFind;
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

  const unionFind = buildConnectivity(project, symbolIndex);
  const roots = new Set<string>();

  for (const selectedId of selectedIds) {
    const wire = project.wires.find((candidate) => candidate.id === selectedId);
    if (wire) {
      roots.add(unionFind.find(`wire:${wire.id}`));
      continue;
    }

    const label = project.netLabels.find((candidate) => candidate.id === selectedId);
    if (label) {
      roots.add(unionFind.find(`label:${label.id}`));
      continue;
    }

    const symbol = project.symbols.find((candidate) => candidate.id === selectedId);
    if (symbol) {
      const librarySymbol = symbolIndex[symbol.symbolId];
      librarySymbol?.pins.forEach((pin) => {
        roots.add(
          unionFind.find(
            pinKey({
              symbolInstanceId: symbol.id,
              pinNumber: pin.number,
            }),
          ),
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
    if (roots.has(unionFind.find(`wire:${wire.id}`))) {
      wireIds.add(wire.id);
    }
  }

  for (const label of project.netLabels) {
    if (roots.has(unionFind.find(`label:${label.id}`))) {
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
        unionFind.find(
          pinKey({
            symbolInstanceId: symbol.id,
            pinNumber: pin.number,
          }),
        ),
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
