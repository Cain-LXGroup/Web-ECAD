import { type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import type {
  ErcViolation,
  LibrarySymbol,
  NetLabel,
  NetLabelScope,
  Point,
  SchematicProject,
  SymbolInstance,
  TextNote,
  Wire,
  WireConnection,
  WireRoutingMode,
} from "../library/types";
import {
  addSheetToProject,
  commitSheetContent,
  getActiveSheetId,
  getProjectView,
  normalizeProject,
  renameSheet,
} from "./projectSheets";
import {
  applyWireConnections,
  buildAutoRoute,
  findNearestWireConnection,
  findNearestWireSegmentPoint,
  normalizeWirePoints,
  resolveWireConnectionPoint,
  routeOrthogonalSegment,
  type AutoRouteContext,
} from "./wireRouting";
import {
  cloneEditorHistorySnapshot,
  pushHistorySnapshot,
  type EditorHistorySnapshot,
} from "./editorHistory";
import { resolveLabelAnchor, syncAnchoredLabels } from "./labelAnchoring";
import { getPinFocusBounds, getProjectBounds, getSelectionBounds } from "./projectBounds";
import { DEFAULT_GRID_SIZE, snapPoint } from "./snapping";
import { normalizeRotation, toggleMirror } from "./transforms";
import { getViewportForBounds } from "./viewportFitting";
import { offsetNetLabelFromAnchor, resolveNetLabelPlacement, resolvePinnedNetLabelPoint } from "./labelPlacement";
import {
  applyWireNodeMoveWithJunctions,
  finalizeWireEndpointAnchors,
  removeWirePointAtIndex,
} from "./wireEditing";
import type { WireNodeSelection } from "./WireNodeHandles";
import { getDefaultSymbolInstanceValue } from "./symbolDisplay";
import { canvasDeltaToInstanceLocal } from "./symbolTextLayout";
import {
  applySymbolTextContent,
  applySymbolTextOffset,
  applySymbolTextRotation,
} from "./symbolTextMutation";
import type { SymbolTextSelection, SymbolTextTarget } from "../library/types";

export type Tool = "select" | "wire" | "label-global" | "label-sheet" | "text";

export type WireDraftState = {
  points: Point[];
  routingMode: WireRoutingMode;
  startConnection?: WireConnection;
  endConnection?: WireConnection;
  startWireId?: string;
  endWireId?: string;
};

export type SelectionMode = "replace" | "add" | "toggle";

export type ErcPinFocus = {
  symbolInstanceId: string;
  pinNumber: string;
};

export type EditorState = {
  project: SchematicProject;
  selectedIds: string[];
  selectedWireNode?: WireNodeSelection;
  ercPinFocus?: ErcPinFocus;
  symbolPinTextEditInstanceId?: string;
  selectedSymbolText?: SymbolTextSelection;
  activeTool: Tool;
  zoom: number;
  pan: Point;
  placingSymbolId?: string;
  wireDraft?: WireDraftState;
  wireRoutingMode: WireRoutingMode;
  activeSheetId: string;
  labelPlacementScope: NetLabelScope;
};

type ClipboardPayload = {
  symbols: SymbolInstance[];
  wires: Wire[];
  netLabels: NetLabel[];
  textNotes: TextNote[];
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

type UseEditorStateOptions = {
  wireRouteClearance?: number;
};

export const useEditorState = (
  initialProject: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  { wireRouteClearance = 120 }: UseEditorStateOptions = {},
) => {
  const normalizedInitial = useMemo(() => normalizeProject(initialProject), [initialProject]);
  const [project, setProject] = useState<SchematicProject>(normalizedInitial);
  const [activeSheetId, setActiveSheetId] = useState<string>(() => getActiveSheetId(normalizedInitial));
  const [labelPlacementScope, setLabelPlacementScope] = useState<NetLabelScope>("sheet");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const clipboardRef = useRef<ClipboardPayload | null>(null);
  const [selectedWireNode, setSelectedWireNode] = useState<WireNodeSelection | undefined>(undefined);
  const [ercPinFocus, setErcPinFocus] = useState<ErcPinFocus | undefined>(undefined);
  const [symbolPinTextEditInstanceId, setSymbolPinTextEditInstanceId] = useState<string | undefined>(
    undefined,
  );
  const [selectedSymbolText, setSelectedSymbolText] = useState<SymbolTextSelection | undefined>(undefined);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [zoom, setZoomState] = useState(1);
  const [pan, setPanState] = useState<Point>({ x: 0, y: 0 });
  const [placingSymbolId, setPlacingSymbolIdState] = useState<string | undefined>(undefined);
  const [wireDraft, setWireDraft] = useState<WireDraftState | undefined>(undefined);
  const [wireRoutingMode, setWireRoutingModeState] = useState<WireRoutingMode>("auto");
  const [historyPast, setHistoryPast] = useState<EditorHistorySnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<EditorHistorySnapshot[]>([]);
  const moveHistoryRecordedRef = useRef(false);

  const normalizeProjectWires = useCallback(
    (nextProject: SchematicProject): SchematicProject => {
      console.info("[useEditorState] Normalizing project wires after mutation", {
        projectId: nextProject.id,
        wireCount: nextProject.wires.length,
      });

      const wiredProject = {
        ...nextProject,
        wires: nextProject.wires.map((wire) => applyWireConnections(wire, nextProject, symbolIndex)),
      };

      return syncAnchoredLabels(wiredProject, symbolIndex);
    },
    [symbolIndex],
  );

  const getAutoRouteContext = useCallback(
    (
      currentProject: SchematicProject,
      startConnection?: WireConnection,
      endConnection?: WireConnection,
    ): AutoRouteContext => ({
      project: currentProject,
      symbolIndex,
      gridSize: currentProject.gridSize ?? DEFAULT_GRID_SIZE,
      routeClearancePx: wireRouteClearance,
      startConnection,
      endConnection,
    }),
    [symbolIndex, wireRouteClearance],
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

  const captureSnapshot = useCallback((): EditorHistorySnapshot => {
    return {
      project: structuredClone(project),
      activeSheetId,
      selectedIds: [...selectedIds],
      selectedWireNode: selectedWireNode ? { ...selectedWireNode } : undefined,
      wireDraft: wireDraft ? structuredClone(wireDraft) : undefined,
      placingSymbolId,
    };
  }, [activeSheetId, placingSymbolId, project, selectedIds, selectedWireNode, wireDraft]);

  const restoreSnapshot = useCallback(
    (snapshot: EditorHistorySnapshot) => {
      console.info("[useEditorState] Restoring editor snapshot", { projectId: snapshot.project.id });

      setProject(normalizeProjectWires(snapshot.project));
      setActiveSheetId(snapshot.activeSheetId ?? getActiveSheetId(snapshot.project));
      setSelectedIds([...snapshot.selectedIds]);
      setSelectedWireNode(snapshot.selectedWireNode ? { ...snapshot.selectedWireNode } : undefined);
      setWireDraft(snapshot.wireDraft ? structuredClone(snapshot.wireDraft) : undefined);
      setPlacingSymbolIdState(snapshot.placingSymbolId);
      moveHistoryRecordedRef.current = false;
    },
    [normalizeProjectWires],
  );

  const recordHistory = useCallback(() => {
    console.info("[useEditorState] Recording editor history snapshot");

    setHistoryPast((currentPast) => pushHistorySnapshot(currentPast, captureSnapshot()));
    setHistoryFuture([]);
  }, [captureSnapshot]);

  const clearHistory = useCallback(() => {
    console.info("[useEditorState] Clearing editor history");

    setHistoryPast([]);
    setHistoryFuture([]);
    moveHistoryRecordedRef.current = false;
  }, []);

  useEffect(() => {
    console.info("[useEditorState] Syncing external project into editor", { projectId: initialProject.id });

    const nextProject = normalizeProject(initialProject);
    setProject(normalizeProjectWires(nextProject));
    setActiveSheetId(getActiveSheetId(nextProject));
    setSelectedIds([]);
    setSelectedWireNode(undefined);
    setErcPinFocus(undefined);
    setSymbolPinTextEditInstanceId(undefined);
    setSelectedSymbolText(undefined);
    setWireDraft(undefined);
    setPlacingSymbolIdState(undefined);
    setActiveTool("select");
    setWireRoutingModeState("auto");
    clearHistory();
  }, [clearHistory, initialProject.id, normalizeProjectWires]);

  const sheetView = useMemo(
    () => getProjectView(project, activeSheetId),
    [activeSheetId, project],
  );

  const state = useMemo<EditorState>(
    () => ({
      project: sheetView,
      selectedIds,
      selectedWireNode,
      ercPinFocus,
      symbolPinTextEditInstanceId,
      selectedSymbolText,
      activeTool,
      zoom,
      pan,
      placingSymbolId,
      wireDraft,
      wireRoutingMode,
      activeSheetId,
      labelPlacementScope,
    }),
    [
      activeSheetId,
      activeTool,
      labelPlacementScope,
      pan,
      placingSymbolId,
      selectedIds,
      selectedSymbolText,
      selectedWireNode,
      ercPinFocus,
      sheetView,
      symbolPinTextEditInstanceId,
      wireDraft,
      wireRoutingMode,
      zoom,
    ],
  );

  const applyProjectUpdate = useCallback(
    (
      label: string,
      updater: (currentProject: SchematicProject) => SchematicProject,
      options?: { record?: boolean },
    ) => {
      console.info("[useEditorState] Applying project mutation", { label, record: options?.record });

      if (options?.record !== false) {
        recordHistory();
      }

      setProject((currentProject) => {
        const sheetContent = getProjectView(currentProject, activeSheetId);
        const updatedSheet = normalizeProjectWires(updater(sheetContent));

        return commitSheetContent(currentProject, activeSheetId, {
          symbols: updatedSheet.symbols,
          wires: updatedSheet.wires,
          netLabels: updatedSheet.netLabels,
          textNotes: updatedSheet.textNotes,
        });
      });
    },
    [activeSheetId, normalizeProjectWires, recordHistory],
  );

  const resolveAutoRoutedWirePoints = useCallback(
    (draft: WireDraftState, currentProject: SchematicProject): Point[] => {
      if (draft.routingMode !== "auto" || draft.points.length < 2) {
        return normalizeWirePoints(draft.points);
      }

      const startPoint = draft.points[0];
      const endPoint = draft.points[draft.points.length - 1];

      return buildAutoRoute(
        startPoint,
        endPoint,
        getAutoRouteContext(
          currentProject,
          draft.startConnection,
          draft.endConnection,
        ),
      );
    },
    [getAutoRouteContext],
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
          points: buildAutoRoute(
            currentDraft.points[0],
            nextAnchor.point,
            getAutoRouteContext(
              currentProject,
              currentDraft.startConnection,
              nextAnchor.connection,
            ),
          ),
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
    [getAutoRouteContext, resolveWireAnchor],
  );

  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  return {
    state,
    canUndo,
    canRedo,
    undo: () => {
      console.info("[useEditorState] Undoing last editor action");

      if (historyPast.length === 0) {
        return;
      }

      const previousSnapshot = historyPast[historyPast.length - 1];
      const currentSnapshot = captureSnapshot();

      setHistoryPast((current) => current.slice(0, -1));
      setHistoryFuture((current) => [cloneEditorHistorySnapshot(currentSnapshot), ...current]);
      restoreSnapshot(previousSnapshot);
    },
    redo: () => {
      console.info("[useEditorState] Redoing editor action");

      if (historyFuture.length === 0) {
        return;
      }

      const [nextSnapshot, ...remainingFuture] = historyFuture;
      const currentSnapshot = captureSnapshot();

      setHistoryFuture(remainingFuture);
      setHistoryPast((current) => pushHistorySnapshot(current, currentSnapshot));
      restoreSnapshot(nextSnapshot);
    },
    fitToContent: (contentSymbolIndex: Record<string, LibrarySymbol>) => {
      console.info("[useEditorState] Fitting viewport to project content");

      const bounds = getProjectBounds(getProjectView(project, activeSheetId), contentSymbolIndex);
      if (!bounds) {
        setPanState({ x: 0, y: 0 });
        setZoomState(1);
        return;
      }

      const viewport = getViewportForBounds(bounds);
      setPanState(viewport.pan);
      setZoomState(viewport.zoom);
    },
    fitToSelection: (contentSymbolIndex: Record<string, LibrarySymbol>) => {
      console.info("[useEditorState] Fitting viewport to current selection");

      const bounds = getSelectionBounds(
        getProjectView(project, activeSheetId),
        contentSymbolIndex,
        selectedIds,
      );
      if (!bounds) {
        return;
      }

      const viewport = getViewportForBounds(bounds);
      setPanState(viewport.pan);
      setZoomState(viewport.zoom);
    },
    duplicateSelected: () => {
      console.info("[useEditorState] Duplicating selected objects", { selectedIds });

      if (selectedIds.length === 0) {
        return;
      }

      const offset = getProjectView(project, activeSheetId).gridSize || DEFAULT_GRID_SIZE;
      const newIds: string[] = [];

      recordHistory();
      applyProjectUpdate(
        "duplicateSelected",
        (currentProject) => {
          const nextSymbols = [...currentProject.symbols];
          const nextWires = [...currentProject.wires];
          const nextLabels = [...currentProject.netLabels];
          const nextNotes = [...currentProject.textNotes];

          for (const selectedId of selectedIds) {
            const selectedSymbol = currentProject.symbols.find((symbol) => symbol.id === selectedId);
            if (selectedSymbol) {
              const symbol = symbolIndex[selectedSymbol.symbolId];
              const duplicateId = `symbol-${uuidv4()}`;
              newIds.push(duplicateId);
              nextSymbols.push({
                ...selectedSymbol,
                id: duplicateId,
                ref: getNextReference(currentProject, symbol?.referencePrefix ?? "U"),
                x: selectedSymbol.x + offset,
                y: selectedSymbol.y + offset,
              });
              continue;
            }

            const selectedWire = currentProject.wires.find((wire) => wire.id === selectedId);
            if (selectedWire) {
              const duplicateId = `wire-${uuidv4()}`;
              newIds.push(duplicateId);
              nextWires.push({
                ...selectedWire,
                id: duplicateId,
                points: movePoints(selectedWire.points, offset, offset),
                startConnection: undefined,
                endConnection: undefined,
                startWireId: undefined,
                endWireId: undefined,
              });
              continue;
            }

            const selectedLabel = currentProject.netLabels.find((label) => label.id === selectedId);
            if (selectedLabel) {
              const duplicateId = `label-${uuidv4()}`;
              newIds.push(duplicateId);
              nextLabels.push({
                ...selectedLabel,
                id: duplicateId,
                x: selectedLabel.x + offset,
                y: selectedLabel.y + offset,
                pinConnection: undefined,
                wireId: undefined,
              });
              continue;
            }

            const selectedNote = currentProject.textNotes.find((note) => note.id === selectedId);
            if (selectedNote) {
              const duplicateId = `note-${uuidv4()}`;
              newIds.push(duplicateId);
              nextNotes.push({
                ...selectedNote,
                id: duplicateId,
                x: selectedNote.x + offset,
                y: selectedNote.y + offset,
                pinConnection: undefined,
                wireId: undefined,
              });
            }
          }

          return {
            ...currentProject,
            symbols: nextSymbols,
            wires: nextWires,
            netLabels: nextLabels,
            textNotes: nextNotes,
          };
        },
        { record: false },
      );

      if (newIds.length > 0) {
        setSelectedIds(newIds);
      }
    },
    setTool: (tool: Tool) => {
      console.info("[useEditorState] Setting active tool", { tool });
      setActiveTool(tool);
      if (tool === "label-global") {
        setLabelPlacementScope("global");
      } else if (tool === "label-sheet") {
        setLabelPlacementScope("sheet");
      }
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

      const normalized = normalizeProject(nextProject);
      setProject(normalizeProjectWires(normalized));
      setActiveSheetId(getActiveSheetId(normalized));
      setSelectedIds([]);
      setSelectedWireNode(undefined);
      setWireDraft(undefined);
      setPlacingSymbolIdState(undefined);
      setActiveTool("select");
      clearHistory();
    },
    setActiveSheet: (sheetId: string) => {
      console.info("[useEditorState] Switching active sheet", { sheetId });

      setProject((currentProject) => {
        const view = getProjectView(currentProject, sheetId);
        return {
          ...currentProject,
          activeSheetId: sheetId,
          symbols: view.symbols,
          wires: view.wires,
          netLabels: view.netLabels,
          textNotes: view.textNotes,
        };
      });
      setActiveSheetId(sheetId);
      setSelectedIds([]);
      setSelectedWireNode(undefined);
      setWireDraft(undefined);
    },
    addSheet: () => {
      console.info("[useEditorState] Adding schematic sheet");

      recordHistory();
      const nextProject = addSheetToProject(project);
      setProject(nextProject);
      setActiveSheetId(getActiveSheetId(nextProject));
      setSelectedIds([]);
      setSelectedWireNode(undefined);
      setWireDraft(undefined);
    },
    renameActiveSheet: (name: string) => {
      console.info("[useEditorState] Renaming active sheet", { name });

      recordHistory();
      setProject((currentProject) => renameSheet(currentProject, activeSheetId, name));
    },
    setLabelPlacementScope: (scope: NetLabelScope) => {
      console.info("[useEditorState] Setting label placement scope", { scope });
      setLabelPlacementScope(scope);
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
                ? buildAutoRoute(
                    startPoint,
                    endPoint,
                    getAutoRouteContext(
                      project,
                      currentDraft.startConnection,
                      currentDraft.endConnection,
                    ),
                  )
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
            value: symbol ? getDefaultSymbolInstanceValue(symbol) : undefined,
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
    selectObject: (id: string, mode: SelectionMode = "replace") => {
      console.info("[useEditorState] Selecting object", { id, mode });

      setSelectedWireNode(undefined);
      setErcPinFocus(undefined);
      setSelectedSymbolText(undefined);

      if (mode === "replace") {
        setSelectedIds([id]);
        setSymbolPinTextEditInstanceId((currentEditId) =>
          currentEditId && currentEditId !== id ? undefined : currentEditId,
        );
        return;
      }

      if (mode === "add") {
        setSelectedIds((current) => (current.includes(id) ? current : [...current, id]));
        setSymbolPinTextEditInstanceId(undefined);
        return;
      }

      setSelectedIds((current) =>
        current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id],
      );
      setSymbolPinTextEditInstanceId(undefined);
    },
    clearSelection: () => {
      console.info("[useEditorState] Clearing selection");
      setSelectedIds([]);
      setSelectedWireNode(undefined);
      setErcPinFocus(undefined);
      setSymbolPinTextEditInstanceId(undefined);
      setSelectedSymbolText(undefined);
    },
    selectWireNode: (wireId: string, pointIndex: number) => {
      console.info("[useEditorState] Selecting wire node", { wireId, pointIndex });

      setSelectedIds([wireId]);
      setSelectedWireNode({ wireId, pointIndex });
      setSymbolPinTextEditInstanceId(undefined);
      setSelectedSymbolText(undefined);
    },
    moveWireNode: (point: Point) => {
      console.info("[useEditorState] Moving selected wire node", { point, selectedWireNode });

      if (!selectedWireNode) {
        return;
      }

      const { wireId, pointIndex } = selectedWireNode;
      const gridSize = project.gridSize || DEFAULT_GRID_SIZE;

      if (!moveHistoryRecordedRef.current) {
        recordHistory();
        moveHistoryRecordedRef.current = true;
      }

      applyProjectUpdate(
        "moveWireNode",
        (currentProject) => ({
          ...currentProject,
          wires: applyWireNodeMoveWithJunctions(
            currentProject.wires,
            wireId,
            pointIndex,
            point,
            gridSize,
          ),
        }),
        { record: false },
      );
    },
    commitWireNodeEdit: () => {
      console.info("[useEditorState] Committing wire node edit", { selectedWireNode });

      if (!selectedWireNode) {
        return;
      }

      const { wireId } = selectedWireNode;
      moveHistoryRecordedRef.current = false;

      applyProjectUpdate(
        "commitWireNode",
        (currentProject) => ({
          ...currentProject,
          wires: currentProject.wires.map((wire) =>
            wire.id === wireId ? finalizeWireEndpointAnchors(wire, currentProject, symbolIndex) : wire,
          ),
        }),
        { record: false },
      );
    },
    removeWireNodeAt: (wireId: string, pointIndex: number) => {
      console.info("[useEditorState] Removing wire node", { wireId, pointIndex });

      const wire = project.wires.find((candidate) => candidate.id === wireId);
      if (!wire) {
        return;
      }

      const updatedWire = removeWirePointAtIndex(wire, pointIndex);
      if (!updatedWire) {
        return;
      }

      applyProjectUpdate("removeWireNode", (currentProject) => ({
        ...currentProject,
        wires: currentProject.wires.map((candidate) =>
          candidate.id === wireId
            ? finalizeWireEndpointAnchors(updatedWire, currentProject, symbolIndex)
            : candidate,
        ),
      }));

      setSelectedWireNode(undefined);
    },
    moveSelected: (dx: number, dy: number) => {
      console.info("[useEditorState] Moving selected objects", { dx, dy, selectedIds });

      if (selectedIds.length === 0) {
        return;
      }

      if (!moveHistoryRecordedRef.current) {
        recordHistory();
        moveHistoryRecordedRef.current = true;
      }

      applyProjectUpdate(
        "moveSelected",
        (currentProject) => ({
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
      }),
        { record: false },
      );
    },
    snapSelectedToGrid: () => {
      console.info("[useEditorState] Snapping selected objects to grid", { selectedIds });

      moveHistoryRecordedRef.current = false;

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
      }),
        { record: false },
      );
    },
    rotateSelected: () => {
      console.info("[useEditorState] Rotating selected objects", { selectedIds });

      applyProjectUpdate("rotateSelected", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) =>
          selectedIds.includes(symbol.id)
            ? { ...symbol, rotation: normalizeRotation(symbol.rotation + 90) }
            : symbol,
        ),
        netLabels: currentProject.netLabels.map((label) =>
          selectedIds.includes(label.id)
            ? { ...label, rotation: normalizeRotation(label.rotation + 90) }
            : label,
        ),
      }));
    },
    mirrorSelected: () => {
      console.info("[useEditorState] Mirroring selected objects", { selectedIds });

      applyProjectUpdate("mirrorSelected", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) =>
          selectedIds.includes(symbol.id) ? { ...symbol, mirrored: toggleMirror(symbol.mirrored) } : symbol,
        ),
        netLabels: currentProject.netLabels.map((label) =>
          selectedIds.includes(label.id) ? { ...label, mirrored: !label.mirrored } : label,
        ),
      }));
    },
    nudgeSymbolAnnotation: (
      instanceId: string,
      field: "ref" | "value",
      direction: "up" | "right" | "down" | "left",
    ) => {
      console.info("[useEditorState] Nudging symbol field annotation", { instanceId, field, direction });

      const deltaByDirection: Record<typeof direction, Point> = {
        up: { x: 0, y: 40 },
        right: { x: 40, y: 0 },
        down: { x: 0, y: -40 },
        left: { x: -40, y: 0 },
      };
      const delta = deltaByDirection[direction];
      const annotationKey = field === "ref" ? "refAnnotation" : "valueAnnotation";

      applyProjectUpdate("nudgeSymbolAnnotation", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) => {
          if (symbol.id !== instanceId) {
            return symbol;
          }

          const current = symbol[annotationKey] ?? {};
          const currentOffset = current.offset ?? { x: 0, y: 0 };

          return {
            ...symbol,
            [annotationKey]: {
              ...current,
              offset: {
                x: currentOffset.x + delta.x,
                y: currentOffset.y + delta.y,
              },
            },
          };
        }),
      }));
    },
    rotateSymbolAnnotation: (instanceId: string, field: "ref" | "value") => {
      console.info("[useEditorState] Rotating symbol field annotation", { instanceId, field });

      const annotationKey = field === "ref" ? "refAnnotation" : "valueAnnotation";

      applyProjectUpdate("rotateSymbolAnnotation", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) => {
          if (symbol.id !== instanceId) {
            return symbol;
          }

          const current = symbol[annotationKey] ?? {};
          return {
            ...symbol,
            [annotationKey]: {
              ...current,
              rotation: normalizeRotation((current.rotation ?? 0) + 90),
            },
          };
        }),
      }));
    },
    toggleSymbolAnnotationHidden: (instanceId: string, field: "ref" | "value") => {
      console.info("[useEditorState] Toggling symbol field annotation visibility", { instanceId, field });

      const annotationKey = field === "ref" ? "refAnnotation" : "valueAnnotation";

      applyProjectUpdate("toggleSymbolAnnotationHidden", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) => {
          if (symbol.id !== instanceId) {
            return symbol;
          }

          const current = symbol[annotationKey] ?? {};
          return {
            ...symbol,
            [annotationKey]: {
              ...current,
              hidden: !current.hidden,
            },
          };
        }),
      }));
    },
    enterSymbolPinTextEdit: (instanceId: string) => {
      console.info("[useEditorState] Entering symbol text edit mode", { instanceId });

      setSelectedIds([instanceId]);
      setSelectedWireNode(undefined);
      setSymbolPinTextEditInstanceId(instanceId);
      setSelectedSymbolText(undefined);
    },
    exitSymbolPinTextEdit: () => {
      console.info("[useEditorState] Exiting symbol text edit mode");

      setSymbolPinTextEditInstanceId(undefined);
      setSelectedSymbolText(undefined);
    },
    selectSymbolText: (instanceId: string, target: SymbolTextTarget) => {
      console.info("[useEditorState] Selecting symbol text", { instanceId, target });

      setSelectedIds([instanceId]);
      setSymbolPinTextEditInstanceId(instanceId);
      setSelectedSymbolText({ instanceId, target });
    },
    clearSymbolTextSelection: () => {
      console.info("[useEditorState] Clearing symbol text selection");

      setSelectedSymbolText(undefined);
    },
    moveSymbolTextByDelta: (worldDelta: Point) => {
      console.info("[useEditorState] Moving selected symbol text", { worldDelta, selectedSymbolText });

      if (!selectedSymbolText) {
        return;
      }

      const { instanceId, target } = selectedSymbolText;
      const instance = project.symbols.find((symbol) => symbol.id === instanceId);
      if (!instance) {
        return;
      }

      const localDelta = canvasDeltaToInstanceLocal(instance, worldDelta);

      if (!moveHistoryRecordedRef.current) {
        recordHistory();
        moveHistoryRecordedRef.current = true;
      }

      applyProjectUpdate(
        "moveSymbolText",
        (currentProject) => ({
          ...currentProject,
          symbols: currentProject.symbols.map((symbol) =>
            symbol.id === instanceId ? applySymbolTextOffset(symbol, target, localDelta) : symbol,
          ),
        }),
        { record: false },
      );
    },
    commitSymbolTextEdit: () => {
      console.info("[useEditorState] Committing symbol text edit");

      moveHistoryRecordedRef.current = false;
    },
    rotateSelectedSymbolText: () => {
      console.info("[useEditorState] Rotating selected symbol text", { selectedSymbolText });

      if (!selectedSymbolText) {
        return;
      }

      const { instanceId, target } = selectedSymbolText;

      applyProjectUpdate("rotateSymbolText", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) =>
          symbol.id === instanceId ? applySymbolTextRotation(symbol, target) : symbol,
        ),
      }));
    },
    setSelectedSymbolTextContent: (text: string) => {
      console.info("[useEditorState] Setting selected symbol text content", { selectedSymbolText, text });

      if (!selectedSymbolText) {
        return;
      }

      const { instanceId, target } = selectedSymbolText;
      if (target.type === "pin") {
        return;
      }

      applyProjectUpdate("setSymbolTextContent", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((symbol) =>
          symbol.id === instanceId ? applySymbolTextContent(symbol, target, text) : symbol,
        ),
      }));
    },
    ensureSymbolValueField: (instanceId: string) => {
      console.info("[useEditorState] Ensuring symbol has a value field", { instanceId });

      const instance = project.symbols.find((symbol) => symbol.id === instanceId);
      const symbol = instance ? symbolIndex[instance.symbolId] : undefined;
      if (!instance || !symbol || instance.value?.trim()) {
        return;
      }

      const defaultValue = getDefaultSymbolInstanceValue(symbol) ?? "";
      applyProjectUpdate("ensureSymbolValueField", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((candidate) =>
          candidate.id === instanceId ? { ...candidate, value: defaultValue } : candidate,
        ),
      }));
    },
    addSymbolCustomText: (instanceId: string, text: string) => {
      console.info("[useEditorState] Adding custom symbol text label", { instanceId, text });

      const instance = project.symbols.find((symbol) => symbol.id === instanceId);
      const symbol = instance ? symbolIndex[instance.symbolId] : undefined;
      if (!instance || !symbol) {
        return undefined;
      }

      const labelId = `sym-text-${uuidv4()}`;
      const baseY = -(symbol.bounds.minY - 48);

      applyProjectUpdate("addSymbolCustomText", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.map((candidate) =>
          candidate.id === instanceId
            ? {
                ...candidate,
                customTextLabels: [
                  ...(candidate.customTextLabels ?? []),
                  {
                    id: labelId,
                    text: text.trim() || "Text",
                    x: symbol.bounds.minX,
                    y: baseY,
                  },
                ],
              }
            : candidate,
        ),
      }));

      const target: SymbolTextTarget = { type: "custom", id: labelId };
      setSelectedSymbolText({ instanceId, target });
      return target;
    },
    suppressErcViolation: (violation: ErcViolation) => {
      console.info("[useEditorState] Suppressing ERC violation", { violationId: violation.id, ruleId: violation.ruleId });

      const suppressionId = `erc-suppress-${uuidv4()}`;
      applyProjectUpdate("suppressErcViolation", (currentProject) => ({
        ...currentProject,
        ercSuppressions: [
          ...(currentProject.ercSuppressions ?? []),
          {
            id: suppressionId,
            ruleId: violation.ruleId,
            symbolInstanceId: violation.symbolInstanceId,
            pinNumber: violation.pinNumber,
            netRoot: violation.netRoot,
          },
        ],
      }));
    },
    clearErcSuppressions: () => {
      console.info("[useEditorState] Clearing ERC suppressions");

      applyProjectUpdate("clearErcSuppressions", (currentProject) => ({
        ...currentProject,
        ercSuppressions: [],
      }));
    },
    focusErcViolation: (
      violation: ErcViolation,
      contentSymbolIndex: Record<string, LibrarySymbol>,
    ) => {
      console.info("[useEditorState] Focusing ERC violation", {
        violationId: violation.id,
        ruleId: violation.ruleId,
      });

      const sheetProject = getProjectView(project, activeSheetId);
      const targetPin =
        violation.symbolInstanceId && violation.pinNumber
          ? {
              symbolInstanceId: violation.symbolInstanceId,
              pinNumber: violation.pinNumber,
            }
          : violation.conflictingPins?.[0]
            ? {
                symbolInstanceId: violation.conflictingPins[0].symbolInstanceId,
                pinNumber: violation.conflictingPins[0].pinNumber,
              }
            : undefined;

      const targetSymbolId =
        violation.symbolInstanceId ?? violation.conflictingPins?.[0]?.symbolInstanceId;

      if (targetSymbolId) {
        setSelectedIds([targetSymbolId]);
        setSelectedWireNode(undefined);
        setSelectedSymbolText(undefined);
        setSymbolPinTextEditInstanceId(undefined);
      }

      if (targetPin) {
        setErcPinFocus({
          symbolInstanceId: targetPin.symbolInstanceId,
          pinNumber: targetPin.pinNumber,
        });

        const bounds = getPinFocusBounds(sheetProject, contentSymbolIndex, targetPin);
        if (bounds) {
          const viewport = getViewportForBounds(bounds, 1.35);
          setPanState(viewport.pan);
          setZoomState(viewport.zoom);
        }
        return;
      }

      setErcPinFocus(undefined);
      if (targetSymbolId) {
        const bounds = getSelectionBounds(sheetProject, contentSymbolIndex, [targetSymbolId]);
        if (bounds) {
          const viewport = getViewportForBounds(bounds);
          setPanState(viewport.pan);
          setZoomState(viewport.zoom);
        }
      }
    },
    deleteSelected: () => {
      console.info("[useEditorState] Deleting selected objects", { selectedIds, selectedWireNode });

      if (selectedWireNode) {
        const { wireId, pointIndex } = selectedWireNode;
        const wire = project.wires.find((candidate) => candidate.id === wireId);
        if (!wire) {
          setSelectedWireNode(undefined);
          return;
        }

        const updatedWire = removeWirePointAtIndex(wire, pointIndex);
        if (!updatedWire) {
          return;
        }

        applyProjectUpdate("deleteWireNode", (currentProject) => ({
          ...currentProject,
          wires: currentProject.wires.map((candidate) =>
            candidate.id === wireId
              ? finalizeWireEndpointAnchors(updatedWire, currentProject, symbolIndex)
              : candidate,
          ),
        }));

        setSelectedWireNode(undefined);
        return;
      }

      applyProjectUpdate("deleteSelected", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.filter((symbol) => !selectedIds.includes(symbol.id)),
        wires: currentProject.wires.filter((wire) => !selectedIds.includes(wire.id)),
        netLabels: currentProject.netLabels.filter((label) => !selectedIds.includes(label.id)),
        textNotes: currentProject.textNotes.filter((note) => !selectedIds.includes(note.id)),
      }));

      setSelectedIds([]);
      setSelectedWireNode(undefined);
      setSymbolPinTextEditInstanceId(undefined);
      setSelectedSymbolText(undefined);
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
      setSelectedWireNode(undefined);
    },
    startWireAtConnection: (connection: WireConnection) => {
      console.info("[useEditorState] Starting wire draft at pin connection", { connection });

      const anchorPoint = resolveWireConnectionPoint(project, symbolIndex, connection);
      if (!anchorPoint) {
        return;
      }

      setActiveTool("wire");
      setWireDraft({
        points: [anchorPoint],
        routingMode: wireRoutingMode,
        startConnection: connection,
      });
      setSelectedIds([]);
      setSelectedWireNode(undefined);
    },
    addWirePoint: (point: Point) => {
      console.info("[useEditorState] Adding wire draft point", { point });

      if (wireDraft) {
        const nextAnchor = resolveWireAnchor(point, project);
        const isSameStartPin =
          nextAnchor.connection &&
          wireDraft.startConnection &&
          nextAnchor.connection.symbolInstanceId === wireDraft.startConnection.symbolInstanceId &&
          nextAnchor.connection.pinNumber === wireDraft.startConnection.pinNumber;
        const isTermination = Boolean((nextAnchor.connection || nextAnchor.wireId) && !isSameStartPin);
        if (isTermination && wireDraft.points.length >= 1) {
          const completedDraft = buildUpdatedWireDraft(wireDraft, nextAnchor.point, project);
          if (completedDraft.points.length >= 2) {
            const wireId = `wire-${uuidv4()}`;
            const routedPoints = resolveAutoRoutedWirePoints(completedDraft, project);

            applyProjectUpdate("finishWire", (currentProject) => ({
              ...currentProject,
              wires: [
                ...currentProject.wires,
                {
                  id: wireId,
                  points: routedPoints,
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
            setActiveTool("select");
            return;
          }
        }
      }

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
      const routedPoints = resolveAutoRoutedWirePoints(completedDraft, project);

      applyProjectUpdate("finishWire", (currentProject) => ({
        ...currentProject,
        wires: [
          ...currentProject.wires,
          {
            id: wireId,
            points: routedPoints,
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
      setActiveTool("select");
    },
    cancelWire: () => {
      console.info("[useEditorState] Cancelling wire draft");
      setWireDraft(undefined);
      setActiveTool("select");
    },
    handlePinTap: (connection: WireConnection) => {
      console.info("[useEditorState] Handling pin tap for wiring", { connection, activeTool, hasWireDraft: Boolean(wireDraft) });

      const anchorPoint = resolveWireConnectionPoint(project, symbolIndex, connection);
      if (!anchorPoint) {
        return;
      }

      if (!wireDraft) {
        setActiveTool("wire");
        setWireDraft({
          points: [anchorPoint],
          routingMode: wireRoutingMode,
          startConnection: connection,
        });
        setSelectedIds([]);
        setSelectedWireNode(undefined);
        return;
      }

      const nextAnchor = resolveWireAnchor(anchorPoint, project);
      const isSameStartPin =
        nextAnchor.connection &&
        wireDraft.startConnection &&
        nextAnchor.connection.symbolInstanceId === wireDraft.startConnection.symbolInstanceId &&
        nextAnchor.connection.pinNumber === wireDraft.startConnection.pinNumber;

      if (isSameStartPin) {
        return;
      }

      const completedDraft = buildUpdatedWireDraft(wireDraft, nextAnchor.point, project);

      if (completedDraft.points.length < 2) {
        return;
      }

      const wireId = `wire-${uuidv4()}`;
      const routedPoints = resolveAutoRoutedWirePoints(completedDraft, project);

      applyProjectUpdate("finishWire", (currentProject) => ({
        ...currentProject,
        wires: [
          ...currentProject.wires,
          {
            id: wireId,
            points: routedPoints,
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
      setActiveTool("select");
    },
    getWirePreviewPoints: (point: Point): Point[] | undefined => {
      console.info("[useEditorState] Building wire preview points", { point });

      if (!wireDraft || wireDraft.points.length === 0) {
        return undefined;
      }

      const nextAnchor = resolveWireAnchor(point, project);

      if (wireDraft.routingMode === "auto") {
        return buildAutoRoute(
          wireDraft.points[0],
          nextAnchor.point,
          getAutoRouteContext(project, wireDraft.startConnection, nextAnchor.connection),
        );
      }

      return routeOrthogonalSegment(wireDraft.points, nextAnchor.point);
    },
    addNetLabel: (text: string, point: Point) => {
      console.info("[useEditorState] Adding net label", { text, point, labelPlacementScope });

      const labelId = `label-${uuidv4()}`;
      const sheetContent = getProjectView(project, activeSheetId);
      const gridSize = sheetContent.gridSize || DEFAULT_GRID_SIZE;
      const anchor = resolveLabelAnchor(point, sheetContent, symbolIndex, gridSize);
      const placement = resolveNetLabelPlacement(sheetContent, symbolIndex, anchor.pinConnection);
      const labelOffset = Math.max(gridSize * 0.9, 36);
      const positioned = anchor.pinConnection
        ? resolvePinnedNetLabelPoint(
            sheetContent,
            symbolIndex,
            anchor.pinConnection,
            placement.rotation,
            placement.mirrored,
            gridSize,
          ) ?? anchor.point
        : offsetNetLabelFromAnchor(anchor.point, placement.rotation, placement.mirrored, labelOffset);
      const snapped = snapPoint(positioned, gridSize);

      applyProjectUpdate("addNetLabel", (currentProject) => ({
        ...currentProject,
        netLabels: [
          ...currentProject.netLabels,
          {
            id: labelId,
            text,
            rotation: placement.rotation,
            mirrored: placement.mirrored,
            labelScope: labelPlacementScope,
            x: snapped.x,
            y: snapped.y,
            pinConnection: anchor.pinConnection,
            wireId: anchor.wireId,
          },
        ],
      }));

      setSelectedIds([labelId]);
    },
    copySelection: () => {
      console.info("[useEditorState] Copying selection to clipboard", { selectedIds });

      if (selectedIds.length === 0) {
        return false;
      }

      const sheetContent = getProjectView(project, activeSheetId);
      clipboardRef.current = {
        symbols: sheetContent.symbols.filter((symbol) => selectedIds.includes(symbol.id)),
        wires: sheetContent.wires.filter((wire) => selectedIds.includes(wire.id)),
        netLabels: sheetContent.netLabels.filter((label) => selectedIds.includes(label.id)),
        textNotes: sheetContent.textNotes.filter((note) => selectedIds.includes(note.id)),
      };

      return clipboardRef.current.symbols.length > 0 ||
        clipboardRef.current.wires.length > 0 ||
        clipboardRef.current.netLabels.length > 0 ||
        clipboardRef.current.textNotes.length > 0;
    },
    cutSelection: () => {
      console.info("[useEditorState] Cutting selection", { selectedIds });

      if (selectedIds.length === 0) {
        return false;
      }

      const sheetContent = getProjectView(project, activeSheetId);
      clipboardRef.current = {
        symbols: sheetContent.symbols.filter((symbol) => selectedIds.includes(symbol.id)),
        wires: sheetContent.wires.filter((wire) => selectedIds.includes(wire.id)),
        netLabels: sheetContent.netLabels.filter((label) => selectedIds.includes(label.id)),
        textNotes: sheetContent.textNotes.filter((note) => selectedIds.includes(note.id)),
      };

      applyProjectUpdate("cutSelection", (currentProject) => ({
        ...currentProject,
        symbols: currentProject.symbols.filter((symbol) => !selectedIds.includes(symbol.id)),
        wires: currentProject.wires.filter((wire) => !selectedIds.includes(wire.id)),
        netLabels: currentProject.netLabels.filter((label) => !selectedIds.includes(label.id)),
        textNotes: currentProject.textNotes.filter((note) => !selectedIds.includes(note.id)),
      }));

      setSelectedIds([]);
      setSelectedWireNode(undefined);
      return true;
    },
    pasteSelection: () => {
      console.info("[useEditorState] Pasting clipboard selection");

      const payload = clipboardRef.current;
      if (!payload) {
        return false;
      }

      const sheetContent = getProjectView(project, activeSheetId);
      const offset = sheetContent.gridSize || DEFAULT_GRID_SIZE;
      const newIds: string[] = [];

      applyProjectUpdate("pasteSelection", (currentProject) => {
        const nextSymbols = [...currentProject.symbols];
        const nextWires = [...currentProject.wires];
        const nextLabels = [...currentProject.netLabels];
        const nextNotes = [...currentProject.textNotes];

        for (const symbol of payload.symbols) {
          const librarySymbol = symbolIndex[symbol.symbolId];
          const duplicateId = `symbol-${uuidv4()}`;
          newIds.push(duplicateId);
          nextSymbols.push({
            ...symbol,
            id: duplicateId,
            ref: getNextReference(currentProject, librarySymbol?.referencePrefix ?? "U"),
            x: symbol.x + offset,
            y: symbol.y + offset,
          });
        }

        for (const wire of payload.wires) {
          const duplicateId = `wire-${uuidv4()}`;
          newIds.push(duplicateId);
          nextWires.push({
            ...wire,
            id: duplicateId,
            points: movePoints(wire.points, offset, offset),
            startConnection: undefined,
            endConnection: undefined,
            startWireId: undefined,
            endWireId: undefined,
          });
        }

        for (const label of payload.netLabels) {
          const duplicateId = `label-${uuidv4()}`;
          newIds.push(duplicateId);
          nextLabels.push({
            ...label,
            id: duplicateId,
            x: label.x + offset,
            y: label.y + offset,
            pinConnection: undefined,
            wireId: undefined,
          });
        }

        for (const note of payload.textNotes) {
          const duplicateId = `note-${uuidv4()}`;
          newIds.push(duplicateId);
          nextNotes.push({
            ...note,
            id: duplicateId,
            x: note.x + offset,
            y: note.y + offset,
            pinConnection: undefined,
            wireId: undefined,
          });
        }

        return {
          ...currentProject,
          symbols: nextSymbols,
          wires: nextWires,
          netLabels: nextLabels,
          textNotes: nextNotes,
        };
      });

      if (newIds.length > 0) {
        setSelectedIds(newIds);
      }

      return newIds.length > 0;
    },
    hasClipboard: () => Boolean(clipboardRef.current),
    addTextNote: (text: string, point: Point) => {
      console.info("[useEditorState] Adding text note", { text, point });

      const noteId = `note-${uuidv4()}`;
      const gridSize = project.gridSize || DEFAULT_GRID_SIZE;
      const anchor = resolveLabelAnchor(point, project, symbolIndex, gridSize);
      const snapped = snapPoint(anchor.point, gridSize);

      applyProjectUpdate("addTextNote", (currentProject) => ({
        ...currentProject,
        textNotes: [
          ...currentProject.textNotes,
          {
            id: noteId,
            text,
            x: snapped.x,
            y: snapped.y,
            pinConnection: anchor.pinConnection,
            wireId: anchor.wireId,
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
