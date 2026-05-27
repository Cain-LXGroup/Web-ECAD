import { type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import type {
  LibrarySymbol,
  Point,
  SchematicProject,
  WireConnection,
  WireRoutingMode,
} from "../library/types";
import {
  applyWireConnections,
  buildAutoRoute,
  findNearestWireConnection,
  findNearestWireSegmentPoint,
  normalizeWirePoints,
  routeOrthogonalSegment,
} from "./wireRouting";
import { DEFAULT_GRID_SIZE, snapPoint } from "./snapping";
import { normalizeRotation, toggleMirror } from "./transforms";

export type Tool = "select" | "wire" | "label" | "text" | "pan";

export type WireDraftState = {
  points: Point[];
  routingMode: WireRoutingMode;
  startConnection?: WireConnection;
  endConnection?: WireConnection;
  startWireId?: string;
  endWireId?: string;
};

export type EditorState = {
  project: SchematicProject;
  selectedIds: string[];
  activeTool: Tool;
  zoom: number;
  pan: Point;
  placingSymbolId?: string;
  wireDraft?: WireDraftState;
  wireRoutingMode: WireRoutingMode;
};

const PIN_CONNECTION_TOLERANCE = 36;

const getNextReference = (project: SchematicProject, referencePrefix: string): string => {
  console.info("[useEditorState] Calculating next reference designator", {
    projectId: project.id,
    referencePrefix,
  });

  const usedNumbers = project.symbols
    .filter((symbol) => symbol.ref.startsWith(referencePrefix))
    .map((symbol) => Number(symbol.ref.slice(referencePrefix.length)))
    .filter((value) => Number.isFinite(value));

  return `${referencePrefix}${(usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0) + 1}`;
};

const movePoints = (points: Point[], dx: number, dy: number): Point[] => {
  console.info("[useEditorState] Moving point list", { pointCount: points.length, dx, dy });

  return points.map((point) => ({
    x: point.x + dx,
    y: point.y + dy,
  }));
};

const snapPoints = (points: Point[], gridSize: number): Point[] => {
  console.info("[useEditorState] Snapping point list", { pointCount: points.length, gridSize });

  return points.map((point) => snapPoint(point, gridSize));
};

export const useEditorState = (
  initialProject: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
) => {
  const [project, setProject] = useState<SchematicProject>(initialProject);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>("pan");
  const [zoom, setZoomState] = useState(1);
  const [pan, setPanState] = useState<Point>({ x: 0, y: 0 });
  const [placingSymbolId, setPlacingSymbolIdState] = useState<string | undefined>(undefined);
  const [wireDraft, setWireDraft] = useState<WireDraftState | undefined>(undefined);
  const [wireRoutingMode, setWireRoutingModeState] = useState<WireRoutingMode>("manual");

  const normalizeProjectWires = useCallback(
    (nextProject: SchematicProject): SchematicProject => {
      console.info("[useEditorState] Normalizing project wires after mutation", {
        projectId: nextProject.id,
        wireCount: nextProject.wires.length,
      });

      return {
        ...nextProject,
        wires: nextProject.wires.map((wire) => applyWireConnections(wire, nextProject, symbolIndex)),
      };
    },
    [symbolIndex],
  );

  const resolveWireAnchor = useCallback(
    (
      point: Point,
      currentProject: SchematicProject,
      excludedWireIds: string[] = [],
    ): { point: Point; connection?: WireConnection; wireId?: string } => {
      console.info("[useEditorState] Resolving wire anchor candidate", { point });

      const snappedPoint = snapPoint(point, currentProject.gridSize || DEFAULT_GRID_SIZE);
      const nearestConnection = findNearestWireConnection(
        snappedPoint,
        currentProject,
        symbolIndex,
        Math.max(currentProject.gridSize * 0.75, PIN_CONNECTION_TOLERANCE),
      );

      if (!nearestConnection) {
        const nearestWireJoin = findNearestWireSegmentPoint(
          snappedPoint,
          currentProject,
          Math.max(currentProject.gridSize * 0.75, PIN_CONNECTION_TOLERANCE),
          excludedWireIds,
        );

        if (!nearestWireJoin) {
          return { point: snappedPoint };
        }

        return {
          point: nearestWireJoin.point,
          wireId: nearestWireJoin.wireId,
        };
      }

      return {
        point: nearestConnection.point,
        connection: nearestConnection.connection,
      };
    },
    [symbolIndex],
  );

  useEffect(() => {
    console.info("[useEditorState] Syncing external project into editor", { projectId: initialProject.id });

    setProject(normalizeProjectWires(initialProject));
    setSelectedIds([]);
    setWireDraft(undefined);
    setPlacingSymbolIdState(undefined);
    setActiveTool("pan");
    setWireRoutingModeState("manual");
  }, [initialProject.id]);

  const state = useMemo<EditorState>(
    () => ({
      project,
      selectedIds,
      activeTool,
      zoom,
      pan,
      placingSymbolId,
      wireDraft,
      wireRoutingMode,
    }),
    [activeTool, pan, placingSymbolId, project, selectedIds, wireDraft, wireRoutingMode, zoom],
  );

  const applyProjectUpdate = useCallback(
    (label: string, updater: (currentProject: SchematicProject) => SchematicProject) => {
      console.info("[useEditorState] Applying project mutation", { label });

      setProject((currentProject) => ({
        ...normalizeProjectWires(updater(currentProject)),
        updatedAt: Date.now(),
      }));
    },
    [normalizeProjectWires],
  );

  const buildUpdatedWireDraft = useCallback(
    (currentDraft: WireDraftState, point: Point, currentProject: SchematicProject): WireDraftState => {
      console.info("[useEditorState] Building updated wire draft", {
        point,
        routingMode: currentDraft.routingMode,
      });

      const nextAnchor = resolveWireAnchor(point, currentProject);

      if (currentDraft.routingMode === "auto") {
        return {
          ...currentDraft,
          points: buildAutoRoute(currentDraft.points[0], nextAnchor.point),
          endConnection: nextAnchor.connection,
          endWireId: nextAnchor.wireId,
        };
      }

      return {
        ...currentDraft,
        points: routeOrthogonalSegment(currentDraft.points, nextAnchor.point),
        endConnection: nextAnchor.connection,
        endWireId: nextAnchor.wireId,
      };
    },
    [resolveWireAnchor],
  );

  return {
    state,
    setTool: (tool: Tool) => {
      console.info("[useEditorState] Setting active tool", { tool });
      setActiveTool(tool);
    },
    setProjectName: (name: string) => {
      console.info("[useEditorState] Setting project name", { name });

      setProject((currentProject) => ({
        ...currentProject,
        name,
      }));
    },
    loadProject: (nextProject: SchematicProject) => {
      console.info("[useEditorState] Loading project explicitly", { projectId: nextProject.id });

      setProject(normalizeProjectWires(nextProject));
      setSelectedIds([]);
      setWireDraft(undefined);
      setPlacingSymbolIdState(undefined);
      setActiveTool("pan");
    },
    setPlacingSymbolId: (symbolId?: string) => {
      console.info("[useEditorState] Setting placing symbol id", { symbolId });

      setPlacingSymbolIdState(symbolId);
    },
    setWireRoutingMode: (nextWireRoutingMode: WireRoutingMode) => {
      console.info("[useEditorState] Setting wire routing mode", { nextWireRoutingMode, selectedIds });

      setWireRoutingModeState(nextWireRoutingMode);

      if (wireDraft) {
        setWireDraft((currentDraft) => {
          if (!currentDraft) {
            return currentDraft;
          }

          const startPoint = currentDraft.points[0];
          const endPoint = currentDraft.points[currentDraft.points.length - 1];

          return {
            ...currentDraft,
            routingMode: nextWireRoutingMode,
            points:
              nextWireRoutingMode === "auto"
                ? buildAutoRoute(startPoint, endPoint)
                : normalizeWirePoints(currentDraft.points),
          };
        });
      }

      if (selectedIds.length > 0) {
        applyProjectUpdate("setWireRoutingMode", (currentProject) => ({
          ...currentProject,
          wires: currentProject.wires.map((wire) =>
            selectedIds.includes(wire.id) ? { ...wire, routingMode: nextWireRoutingMode } : wire,
          ),
        }));
      }
    },
    placeSymbol: (symbolId: string, point: Point) => {
      console.info("[useEditorState] Placing symbol instance", { symbolId, point });

      const symbol = symbolIndex[symbolId];
      const snappedPoint = snapPoint(point, project.gridSize || DEFAULT_GRID_SIZE);
      const symbolInstanceId = `symbol-${uuidv4()}`;

      applyProjectUpdate("placeSymbol", (currentProject) => ({
        ...currentProject,
        symbols: [
          ...currentProject.symbols,
          {
            id: symbolInstanceId,
            symbolId,
            ref: getNextReference(currentProject, symbol?.referencePrefix ?? "U"),
            value: symbol?.name,
            x: snappedPoint.x,
            y: snappedPoint.y,
            rotation: 0,
            mirrored: false,
          },
        ],
      }));

      setSelectedIds([symbolInstanceId]);
      setPlacingSymbolIdState(undefined);
    },
    selectObject: (id: string) => {
      console.info("[useEditorState] Selecting object", { id });
      setSelectedIds([id]);
    },
    clearSelection: () => {
      console.info("[useEditorState] Clearing selection");
      setSelectedIds([]);
    },
    moveSelected: (dx: number, dy: number) => {
      console.info("[useEditorState] Moving selected objects", { dx, dy, selectedIds });

      if (selectedIds.length === 0) {
        return;
      }

      applyProjectUpdate("moveSelected", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) =>
          selectedIds.includes(symbol.id) ? { ...symbol, x: symbol.x + dx, y: symbol.y + dy } : symbol,
        ),
        wires: currentProject.wires.map((wire) =>
          selectedIds.includes(wire.id) ? { ...wire, points: movePoints(wire.points, dx, dy) } : wire,
        ),
        netLabels: currentProject.netLabels.map((label) =>
          selectedIds.includes(label.id) ? { ...label, x: label.x + dx, y: label.y + dy } : label,
        ),
        textNotes: currentProject.textNotes.map((note) =>
          selectedIds.includes(note.id) ? { ...note, x: note.x + dx, y: note.y + dy } : note,
        ),
      }));
    },
    snapSelectedToGrid: () => {
      console.info("[useEditorState] Snapping selected objects to grid", { selectedIds });

      applyProjectUpdate("snapSelectedToGrid", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) =>
          selectedIds.includes(symbol.id)
            ? { ...symbol, ...snapPoint({ x: symbol.x, y: symbol.y }, currentProject.gridSize) }
            : symbol,
        ),
        wires: currentProject.wires.map((wire) =>
          selectedIds.includes(wire.id)
            ? { ...wire, points: snapPoints(wire.points, currentProject.gridSize) }
            : wire,
        ),
        netLabels: currentProject.netLabels.map((label) =>
          selectedIds.includes(label.id)
            ? { ...label, ...snapPoint({ x: label.x, y: label.y }, currentProject.gridSize) }
            : label,
        ),
        textNotes: currentProject.textNotes.map((note) =>
          selectedIds.includes(note.id)
            ? { ...note, ...snapPoint({ x: note.x, y: note.y }, currentProject.gridSize) }
            : note,
        ),
      }));
    },
    rotateSelected: () => {
      console.info("[useEditorState] Rotating selected symbols", { selectedIds });

      applyProjectUpdate("rotateSelected", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) =>
          selectedIds.includes(symbol.id)
            ? { ...symbol, rotation: normalizeRotation(symbol.rotation + 90) }
            : symbol,
        ),
      }));
    },
    mirrorSelected: () => {
      console.info("[useEditorState] Mirroring selected symbols", { selectedIds });

      applyProjectUpdate("mirrorSelected", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) =>
          selectedIds.includes(symbol.id) ? { ...symbol, mirrored: toggleMirror(symbol.mirrored) } : symbol,
        ),
      }));
    },
    deleteSelected: () => {
      console.info("[useEditorState] Deleting selected objects", { selectedIds });

      applyProjectUpdate("deleteSelected", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.filter((symbol) => !selectedIds.includes(symbol.id)),
        wires: currentProject.wires.filter((wire) => !selectedIds.includes(wire.id)),
        netLabels: currentProject.netLabels.filter((label) => !selectedIds.includes(label.id)),
        textNotes: currentProject.textNotes.filter((note) => !selectedIds.includes(note.id)),
      }));

      setSelectedIds([]);
    },
    startWire: (point: Point) => {
      console.info("[useEditorState] Starting wire draft", { point, wireRoutingMode });

      const nextAnchor = resolveWireAnchor(point, project);
      setWireDraft({
        points: [nextAnchor.point],
        routingMode: wireRoutingMode,
        startConnection: nextAnchor.connection,
        startWireId: nextAnchor.wireId,
      });
      setSelectedIds([]);
    },
    addWirePoint: (point: Point) => {
      console.info("[useEditorState] Adding wire draft point", { point });

      setWireDraft((currentDraft) =>
        currentDraft ? buildUpdatedWireDraft(currentDraft, point, project) : currentDraft,
      );
    },
    finishWire: (point?: Point) => {
      console.info("[useEditorState] Finishing wire draft", { point });

      const completedDraft =
        wireDraft && point ? buildUpdatedWireDraft(wireDraft, point, project) : wireDraft;

      if (!completedDraft || completedDraft.points.length < 2) {
        setWireDraft(undefined);
        return;
      }

      const wireId = `wire-${uuidv4()}`;

      applyProjectUpdate("finishWire", (currentProject) => ({
        ...currentProject,
        wires: [
          ...currentProject.wires,
          {
            id: wireId,
            points: normalizeWirePoints(completedDraft.points),
            routingMode: completedDraft.routingMode,
            startConnection: completedDraft.startConnection,
            endConnection: completedDraft.endConnection,
            startWireId: completedDraft.startWireId,
            endWireId: completedDraft.endWireId,
          },
        ],
      }));

      setSelectedIds([wireId]);
      setWireDraft(undefined);
    },
    cancelWire: () => {
      console.info("[useEditorState] Cancelling wire draft");
      setWireDraft(undefined);
    },
    getWirePreviewPoints: (point: Point): Point[] | undefined => {
      console.info("[useEditorState] Building wire preview points", { point });

      if (!wireDraft || wireDraft.points.length === 0) {
        return undefined;
      }

      const nextAnchor = resolveWireAnchor(point, project);

      if (wireDraft.routingMode === "auto") {
        return buildAutoRoute(wireDraft.points[0], nextAnchor.point);
      }

      return routeOrthogonalSegment(wireDraft.points, nextAnchor.point);
    },
    addNetLabel: (text: string, point: Point) => {
      console.info("[useEditorState] Adding net label", { text, point });

      const labelId = `label-${uuidv4()}`;

      applyProjectUpdate("addNetLabel", (currentProject) => ({
        ...currentProject,
        netLabels: [
          ...currentProject.netLabels,
          {
            id: labelId,
            text,
            rotation: 0,
            ...snapPoint(point, currentProject.gridSize || DEFAULT_GRID_SIZE),
          },
        ],
      }));

      setSelectedIds([labelId]);
    },
    addTextNote: (text: string, point: Point) => {
      console.info("[useEditorState] Adding text note", { text, point });

      const noteId = `note-${uuidv4()}`;

      applyProjectUpdate("addTextNote", (currentProject) => ({
        ...currentProject,
        textNotes: [
          ...currentProject.textNotes,
          {
            id: noteId,
            text,
            ...snapPoint(point, currentProject.gridSize || DEFAULT_GRID_SIZE),
          },
        ],
      }));

      setSelectedIds([noteId]);
    },
    saveProject: () => {
      console.info("[useEditorState] Marking project as saved");
      setProject((currentProject) => ({ ...currentProject, updatedAt: Date.now() }));
    },
    setZoom: (nextZoom: SetStateAction<number>) => {
      console.info("[useEditorState] Setting zoom state");
      setZoomState(nextZoom);
    },
    setPan: (nextPan: SetStateAction<Point>) => {
      console.info("[useEditorState] Setting pan state");
      setPanState(nextPan);
    },
  };
};

export default useEditorState;
