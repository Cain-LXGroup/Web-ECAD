import {
  forwardRef,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from "react";

import type { LibrarySymbol, Point, SchematicProject, SymbolTextTarget, WireConnection } from "../library/types";
import { isNetHighlighted, type NetHighlightSet } from "./netHighlight";
import type { SelectionMode } from "./useEditorState";
import { LabelView } from "./LabelView";
import { DEFAULT_GRID_SIZE } from "./snapping";
import { SymbolInstanceView } from "./SymbolInstanceView";
import { DEFAULT_SCHEMATIC_TEXT_SIZE } from "./schematicTextSizing";
import type { SymbolTextSelection } from "../library/types";
import type { BusDraftState, ErcPinFocus, Tool, WireDraftState } from "./useEditorState";
import { BusView } from "./BusView";
import { SheetPinView } from "./SheetPinView";
import { getWireJunctionPoints } from "./wireRouting";
import { schematicColorVar } from "../theme/schematicTheme";
import { WireNodeHandles, type WireNodeSelection } from "./WireNodeHandles";
import { WireView } from "./WireView";
import {
  getPinchMetrics,
  getViewBox,
  getWorldPointFromViewport,
  getZoomAtClientPoint,
  getZoomOnlyViewportFromPinch,
} from "./canvasViewport";
import { CanvasHud } from "../components/CanvasHud";
import { vibrateSnap } from "../lib/feedback";
import { clientDeltaToWorldDelta, clientPointToWorld } from "./svgCoordinates";

const TAP_DRAG_THRESHOLD_PX = 12;
const isNetLabelTool = (tool: Tool): boolean =>
  tool === "label-global" || tool === "label-sheet" || tool === "label-hierarchical";

const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_DISTANCE_PX = 28;
const INERTIA_FRICTION = 0.9;
const INERTIA_MIN_VELOCITY = 0.35;

type CanvasTapAction =
  | { kind: "wire" }
  | { kind: "bus" }
  | { kind: "label" }
  | { kind: "bus-label" }
  | { kind: "hierarchical-label" }
  | { kind: "sheet-pin" }
  | { kind: "text" }
  | { kind: "clear-selection" };

type DragState = {
  pointerId: number;
  mode: "move-selection" | "move-wire-node" | "move-symbol-text" | "pan" | "canvas-gesture";
  lastClient: Point;
  lastWorld: Point;
  startClient: Point;
  originWorld: Point;
  isPanning: boolean;
  tapAction?: CanvasTapAction;
  wireNode?: WireNodeSelection;
  symbolText?: SymbolTextSelection;
};

type PinchGestureState = {
  pointerIds: [number, number];
  startDistance: number;
  startMidpoint: Point;
  startZoom: number;
  startPan: Point;
  anchorWorld: Point;
};

export type SchematicCanvasHandle = {
  getSvgElement: () => SVGSVGElement | null;
};

type SchematicCanvasProps = {
  project: SchematicProject;
  symbolIndex: Record<string, LibrarySymbol>;
  selectedIds: string[];
  netHighlight?: NetHighlightSet;
  selectedWireNode?: WireNodeSelection;
  ercPinFocus?: ErcPinFocus;
  symbolPinTextEditInstanceId?: string;
  selectedSymbolText?: SymbolTextSelection;
  activeTool: Tool;
  placingSymbolId?: string;
  wireDraft?: WireDraftState;
  busDraft?: BusDraftState;
  schematicTextSize?: number;
  getWirePreviewPoints?: (point: Point) => Point[] | undefined;
  zoom: number;
  pan: Point;
  onSelectObject: (id: string, mode?: SelectionMode) => void;
  onClearSelection: () => void;
  onSelectWireNode: (wireId: string, pointIndex: number) => void;
  onMoveWireNode: (point: Point) => void;
  onCommitWireNodeEdit: () => void;
  onRemoveWireNodeAt: (wireId: string, pointIndex: number) => void;
  onSelectSymbolText: (instanceId: string, target: SymbolTextTarget) => void;
  onClearSymbolTextSelection: () => void;
  onMoveSymbolText: (worldDelta: Point) => void;
  onCommitSymbolTextEdit: () => void;
  onMoveSelected: (dx: number, dy: number) => void;
  onSnapSelectedToGrid: () => void;
  onPlaceSymbol: (symbolId: string, point: Point) => void;
  onStartWire: (point: Point) => void;
  onAddWirePoint: (point: Point) => void;
  onStartBus: (point: Point) => void;
  onAddBusPoint: (point: Point) => void;
  onAddNetLabel: (text: string, point: Point) => void;
  onAddBusLabel: (text: string, point: Point) => void;
  onAddSheetPin: (name: string, point: Point) => void;
  onAddTextNote: (text: string, point: Point) => void;
  onSetPan: Dispatch<SetStateAction<Point>>;
  onSetZoom: Dispatch<SetStateAction<number>>;
  fingerPansOnly?: boolean;
  onDoubleTapFit?: () => void;
  onObjectLongPress?: (target: {
    objectId: string;
    objectType: "symbol" | "wire" | "bus" | "net-label" | "sheet-pin" | "text-note";
    clientX: number;
    clientY: number;
  }) => void;
  onPinPointerDown?: (connection: WireConnection) => void;
};

const getWorldFillRect = (center: Point, viewWidth: number, viewHeight: number) => {
  console.info("[SchematicCanvas] Calculating world fill rectangle", { center, viewWidth, viewHeight });

  return {
    x: center.x - viewWidth * 4,
    y: center.y - viewHeight * 4,
    width: viewWidth * 8,
    height: viewHeight * 8,
  };
};

const promptForText = (variant: "label" | "text"): string | null => {
  console.info("[SchematicCanvas] Prompting for canvas text", { variant });

  const promptLabel = variant === "label" ? "Enter net label" : "Enter note text";
  const value = window.prompt(promptLabel, variant === "label" ? "NET_LABEL" : "Text note");

  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const shouldCapturePointer = (event: ReactPointerEvent<SVGElement>): boolean => {
  return event.pointerType === "touch" || event.pointerType === "pen";
};

const getClientDistance = (from: Point, to: Point): number => {
  return Math.hypot(to.x - from.x, to.y - from.y);
};

export const SchematicCanvas = forwardRef<SchematicCanvasHandle, SchematicCanvasProps>(function SchematicCanvas(
  {
    project,
    symbolIndex,
    selectedIds,
    netHighlight,
    selectedWireNode,
    ercPinFocus,
    symbolPinTextEditInstanceId,
    selectedSymbolText,
    activeTool,
    placingSymbolId,
    wireDraft,
    busDraft,
    schematicTextSize = DEFAULT_SCHEMATIC_TEXT_SIZE,
    getWirePreviewPoints,
    zoom,
    pan,
    onSelectObject,
    onClearSelection,
    onSelectWireNode,
    onMoveWireNode,
    onCommitWireNodeEdit,
    onRemoveWireNodeAt,
    onSelectSymbolText,
    onClearSymbolTextSelection,
    onMoveSymbolText,
    onCommitSymbolTextEdit,
    onMoveSelected,
    onSnapSelectedToGrid,
    onPlaceSymbol,
    onStartWire,
    onAddWirePoint,
    onStartBus,
    onAddBusPoint,
    onAddNetLabel,
    onAddBusLabel,
    onAddSheetPin,
    onAddTextNote,
    onSetPan,
    onSetZoom,
    fingerPansOnly = false,
    onDoubleTapFit,
    onObjectLongPress,
    onPinPointerDown,
  },
  ref,
) {
  console.info("[SchematicCanvas] Rendering interactive schematic canvas", {
    projectId: project.id,
    activeTool,
    selectedCount: selectedIds.length,
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const activePointersRef = useRef<Map<number, Point>>(new Map());
  const pinchGestureRef = useRef<PinchGestureState | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [wireHoverPoint, setWireHoverPoint] = useState<Point | null>(null);
  const [snapIndicatorPoint, setSnapIndicatorPoint] = useState<Point | null>(null);
  const [measureLabel, setMeasureLabel] = useState<string | undefined>(undefined);
  const dragStateRef = useRef<DragState | null>(null);
  /** Sync client anchor for drags — avoids stale React state when pen coalesced events replay history. */
  const dragLastClientRef = useRef<Point | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | undefined>(undefined);
  const panVelocityRef = useRef<Point>({ x: 0, y: 0 });
  const inertiaFrameRef = useRef<number | undefined>(undefined);
  const lastSnapPulseRef = useRef(0);
  const gridSize = project.gridSize ?? DEFAULT_GRID_SIZE;

  const stopInertia = useCallback(() => {
    if (inertiaFrameRef.current !== undefined) {
      cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = undefined;
    }
  }, []);

  const startInertia = useCallback(() => {
    console.info("[SchematicCanvas] Starting inertial pan");

    stopInertia();

    let velocityX = panVelocityRef.current.x;
    let velocityY = panVelocityRef.current.y;

    const step = () => {
      if (Math.abs(velocityX) < INERTIA_MIN_VELOCITY && Math.abs(velocityY) < INERTIA_MIN_VELOCITY) {
        stopInertia();
        return;
      }

      onSetPan((currentPan) => ({
        x: currentPan.x - velocityX,
        y: currentPan.y - velocityY,
      }));

      velocityX *= INERTIA_FRICTION;
      velocityY *= INERTIA_FRICTION;
      inertiaFrameRef.current = requestAnimationFrame(step);
    };

    inertiaFrameRef.current = requestAnimationFrame(step);
  }, [onSetPan, stopInertia]);

  useEffect(() => () => stopInertia(), [stopInertia]);

  useImperativeHandle(ref, () => ({
    getSvgElement: () => svgRef.current,
  }));

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [pan, zoom]);

  const viewBox = useMemo(() => getViewBox(zoom, pan), [pan.x, pan.y, zoom]);

  const getCanvasPointFromClient = (clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }

    return clientPointToWorld(svg, clientX, clientY);
  };

  const getCanvasPoint = (event: ReactPointerEvent<SVGElement>): Point | null => {
    return getCanvasPointFromClient(event.clientX, event.clientY);
  };

  const setDragLastClient = (point: Point) => {
    dragLastClientRef.current = point;
  };

  const clearDragLastClient = () => {
    dragLastClientRef.current = null;
  };

  const applyClientDragStep = (
    svg: SVGSVGElement,
    clientX: number,
    clientY: number,
  ): Point | null => {
    const lastClient = dragLastClientRef.current;
    if (!lastClient) {
      return null;
    }

    const worldDelta = clientDeltaToWorldDelta(
      svg,
      lastClient.x,
      lastClient.y,
      clientX,
      clientY,
    );

    if (!worldDelta) {
      return null;
    }

    dragLastClientRef.current = { x: clientX, y: clientY };
    return worldDelta;
  };

  const capturePointerOnSvg = (event: ReactPointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    if (shouldCapturePointer(event)) {
      event.preventDefault();
    }

    try {
      svg.setPointerCapture(event.pointerId);
    } catch {
      // Pointer may already be released on some browsers.
    }
  };

  const getSvgRect = () => svgRef.current?.getBoundingClientRect() ?? null;

  const applyViewport = (nextPan: Point, nextZoom: number) => {
    onSetPan(nextPan);
    onSetZoom(nextZoom);
  };

  const beginPinchGesture = () => {
    console.info("[SchematicCanvas] Beginning pinch gesture");

    const pointers = [...activePointersRef.current.entries()].map(([pointerId, point]) => ({
      pointerId,
      point,
    }));

    if (pointers.length < 2) {
      return;
    }

    const metrics = getPinchMetrics(pointers.map((entry) => entry.point));
    if (!metrics || metrics.distance < 8) {
      return;
    }

    const svg = svgRef.current;
    const activeDrag = dragStateRef.current;
    if (svg && activeDrag && svg.hasPointerCapture(activeDrag.pointerId)) {
      try {
        svg.releasePointerCapture(activeDrag.pointerId);
      } catch {
        // Pointer may already be released on some browsers.
      }
    }

    setDragState(null);
    const svgRect = getSvgRect();
    if (!svgRect) {
      return;
    }

    const startPan = panRef.current;
    const startZoom = zoomRef.current;

    pinchGestureRef.current = {
      pointerIds: [pointers[0].pointerId, pointers[1].pointerId],
      startDistance: metrics.distance,
      startMidpoint: metrics.midpoint,
      startZoom,
      startPan,
      anchorWorld: getWorldPointFromViewport(
        metrics.midpoint.x,
        metrics.midpoint.y,
        startPan,
        startZoom,
        svgRect,
      ),
    };
  };

  const updatePinchGesture = () => {
    const gesture = pinchGestureRef.current;
    const svgRect = getSvgRect();
    if (!gesture || !svgRect) {
      return;
    }

    const pointerPoints = gesture.pointerIds
      .map((pointerId) => activePointersRef.current.get(pointerId))
      .filter((point): point is Point => Boolean(point));

    if (pointerPoints.length < 2) {
      return;
    }

    const metrics = getPinchMetrics(pointerPoints);
    if (!metrics) {
      return;
    }

    const nextViewport = getZoomOnlyViewportFromPinch({
      startZoom: gesture.startZoom,
      startDistance: gesture.startDistance,
      currentDistance: metrics.distance,
      startMidpoint: gesture.startMidpoint,
      anchorWorld: gesture.anchorWorld,
      svgRect,
    });

    applyViewport(nextViewport.pan, nextViewport.zoom);
  };

  const endPinchGesture = () => {
    if (pinchGestureRef.current) {
      console.info("[SchematicCanvas] Ending pinch gesture");
      pinchGestureRef.current = null;
    }
  };

  const trackPointer = (event: ReactPointerEvent<SVGElement>) => {
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
  };

  const untrackPointer = (event: ReactPointerEvent<SVGElement>) => {
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) {
      endPinchGesture();
    }
  };

  const handleObjectLongPress =
    (objectId: string, objectType: "symbol" | "wire" | "bus" | "net-label" | "sheet-pin" | "text-note") =>
    (event: ReactPointerEvent<SVGElement>) => {
      onObjectLongPress?.({
        objectId,
        objectType,
        clientX: event.clientX,
        clientY: event.clientY,
      });
    };

  const formatMeasureLabel = (start: Point, end: Point): string => {
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const gridUnitsX = (dx / gridSize).toFixed(1);
    const gridUnitsY = (dy / gridSize).toFixed(1);
    return `Δ ${gridUnitsX} × ${gridUnitsY} grid`;
  };

  const beginWireNodeDrag = (
    wireId: string,
    pointIndex: number,
    event: ReactPointerEvent<SVGCircleElement>,
  ) => {
    console.info("[SchematicCanvas] Beginning wire node drag", { wireId, pointIndex });

    if (activeTool !== "select" || placingSymbolId || pinchGestureRef.current || wireDraft) {
      return;
    }

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) {
      return;
    }

    onSelectWireNode(wireId, pointIndex);
    event.stopPropagation();
    capturePointerOnSvg(event);
    stopInertia();
    setDragLastClient({ x: event.clientX, y: event.clientY });
    setDragState({
      pointerId: event.pointerId,
      mode: "move-wire-node",
      lastClient: { x: event.clientX, y: event.clientY },
      lastWorld: canvasPoint,
      startClient: { x: event.clientX, y: event.clientY },
      originWorld: canvasPoint,
      isPanning: true,
      wireNode: { wireId, pointIndex },
    });
    setMeasureLabel(formatMeasureLabel(canvasPoint, canvasPoint));
  };

  const beginSymbolTextDrag = (
    instanceId: string,
    target: SymbolTextTarget,
    event: ReactPointerEvent<SVGRectElement>,
  ) => {
    console.info("[SchematicCanvas] Beginning symbol text drag", { instanceId, target });

    if (activeTool !== "select" || placingSymbolId || pinchGestureRef.current || wireDraft) {
      return;
    }

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) {
      return;
    }

    onSelectSymbolText(instanceId, target);
    event.stopPropagation();
    capturePointerOnSvg(event);
    stopInertia();
    setDragLastClient({ x: event.clientX, y: event.clientY });
    setDragState({
      pointerId: event.pointerId,
      mode: "move-symbol-text",
      lastClient: { x: event.clientX, y: event.clientY },
      lastWorld: canvasPoint,
      startClient: { x: event.clientX, y: event.clientY },
      originWorld: canvasPoint,
      isPanning: true,
      symbolText: { instanceId, target },
    });
    setMeasureLabel(formatMeasureLabel(canvasPoint, canvasPoint));
  };

  const resolveSelectionMode = (
    id: string,
    event: ReactPointerEvent<SVGElement>,
  ): SelectionMode => {
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      return "add";
    }

    if (selectedIds.includes(id) && selectedIds.length > 1) {
      return "toggle";
    }

    return "replace";
  };

  const beginSelectionDrag = (id: string, event: ReactPointerEvent<SVGElement>) => {
    console.info("[SchematicCanvas] Beginning selection drag", { id });

    if (activeTool !== "select" || placingSymbolId || pinchGestureRef.current) {
      return;
    }

    if (symbolPinTextEditInstanceId === id) {
      onClearSymbolTextSelection();
      onSelectObject(id, "replace");
      event.stopPropagation();
      return;
    }

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) {
      return;
    }

    const selectionMode = resolveSelectionMode(id, event);
    if (selectionMode === "toggle") {
      const wasSelected = selectedIds.includes(id);
      onSelectObject(id, "toggle");
      if (wasSelected) {
        return;
      }
    } else {
      onSelectObject(id, selectionMode);
    }
    event.stopPropagation();
    capturePointerOnSvg(event);
    stopInertia();
    setDragLastClient({ x: event.clientX, y: event.clientY });
    setDragState({
      pointerId: event.pointerId,
      mode: "move-selection",
      lastClient: { x: event.clientX, y: event.clientY },
      lastWorld: canvasPoint,
      startClient: { x: event.clientX, y: event.clientY },
      originWorld: canvasPoint,
      isPanning: true,
    });
    setMeasureLabel(formatMeasureLabel(canvasPoint, canvasPoint));
  };

  const executeCanvasTap = (action: CanvasTapAction, canvasPoint: Point) => {
    console.info("[SchematicCanvas] Executing deferred canvas tap", { kind: action.kind });

    if (action.kind === "wire") {
      if (wireDraft && wireDraft.points.length > 0) {
        onAddWirePoint(canvasPoint);
      } else {
        onStartWire(canvasPoint);
      }
      return;
    }

    if (action.kind === "bus") {
      if (busDraft && busDraft.points.length > 0) {
        onAddBusPoint(canvasPoint);
      } else {
        onStartBus(canvasPoint);
      }
      return;
    }

    if (action.kind === "label") {
      const labelText = promptForText("label");
      if (labelText) {
        onAddNetLabel(labelText, canvasPoint);
      }
      return;
    }

    if (action.kind === "bus-label") {
      const labelText = window.prompt("Enter bus notation (e.g. D[0..7])", "DATA[0..7]");
      if (labelText?.trim()) {
        onAddBusLabel(labelText.trim(), canvasPoint);
      }
      return;
    }

    if (action.kind === "hierarchical-label") {
      const labelText = window.prompt("Enter hierarchical net name", "USB_D+");
      if (labelText?.trim()) {
        onAddNetLabel(labelText.trim(), canvasPoint);
      }
      return;
    }

    if (action.kind === "sheet-pin") {
      const pinName = window.prompt("Enter sheet pin name", "USB_D+");
      if (pinName?.trim()) {
        onAddSheetPin(pinName.trim(), canvasPoint);
      }
      return;
    }

    if (action.kind === "text") {
      const noteText = promptForText("text");
      if (noteText) {
        onAddTextNote(noteText, canvasPoint);
      }
      return;
    }

    onClearSelection();
  };

  const beginCanvasGesture = (
    event: ReactPointerEvent<SVGSVGElement>,
    canvasPoint: Point,
    tapAction?: CanvasTapAction,
  ) => {
    stopInertia();
    capturePointerOnSvg(event);
    setDragLastClient({ x: event.clientX, y: event.clientY });
    setDragState({
      pointerId: event.pointerId,
      mode: "canvas-gesture",
      lastClient: { x: event.clientX, y: event.clientY },
      lastWorld: canvasPoint,
      startClient: { x: event.clientX, y: event.clientY },
      originWorld: canvasPoint,
      isPanning: false,
      tapAction,
    });
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    console.info("[SchematicCanvas] Handling canvas pointer down", {
      activeTool,
      placingSymbolId,
      pointerType: event.pointerType,
    });

    if (shouldCapturePointer(event)) {
      event.preventDefault();
    }

    trackPointer(event);

    if (activePointersRef.current.size >= 2) {
      beginPinchGesture();
      return;
    }

    if (pinchGestureRef.current) {
      return;
    }

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) {
      return;
    }

    if (placingSymbolId) {
      onPlaceSymbol(placingSymbolId, canvasPoint);
      return;
    }

    if (fingerPansOnly && event.pointerType === "touch") {
      beginCanvasGesture(event, canvasPoint);
      return;
    }

    if (activeTool === "wire") {
      beginCanvasGesture(event, canvasPoint, { kind: "wire" });
      return;
    }

    if (activeTool === "bus") {
      beginCanvasGesture(event, canvasPoint, { kind: "bus" });
      return;
    }

    if (activeTool === "label-bus") {
      beginCanvasGesture(event, canvasPoint, { kind: "bus-label" });
      return;
    }

    if (activeTool === "label-hierarchical") {
      beginCanvasGesture(event, canvasPoint, { kind: "hierarchical-label" });
      return;
    }

    if (activeTool === "sheet-pin") {
      beginCanvasGesture(event, canvasPoint, { kind: "sheet-pin" });
      return;
    }

    if (isNetLabelTool(activeTool)) {
      beginCanvasGesture(event, canvasPoint, { kind: "label" });
      return;
    }

    if (activeTool === "text") {
      beginCanvasGesture(event, canvasPoint, { kind: "text" });
      return;
    }

    beginCanvasGesture(event, canvasPoint, { kind: "clear-selection" });
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    trackPointer(event);

    if (activePointersRef.current.size >= 2) {
      if (!pinchGestureRef.current) {
        beginPinchGesture();
      }
      updatePinchGesture();
      return;
    }

    if (pinchGestureRef.current) {
      return;
    }

    if (activeTool === "wire" && wireDraft && wireDraft.points.length > 0 && getWirePreviewPoints) {
      const hoverPoint = getCanvasPoint(event);
      setWireHoverPoint(hoverPoint);

      if (hoverPoint) {
        const previewPoints = getWirePreviewPoints(hoverPoint);
        const snappedPoint = previewPoints?.[previewPoints.length - 1];
        if (
          snappedPoint &&
          Math.hypot(snappedPoint.x - hoverPoint.x, snappedPoint.y - hoverPoint.y) > gridSize * 0.2
        ) {
          setSnapIndicatorPoint(snappedPoint);
          const now = Date.now();
          if (now - lastSnapPulseRef.current > 120) {
            vibrateSnap();
            lastSnapPulseRef.current = now;
          }
          if (wireDraft.points.length > 0) {
            const origin = wireDraft.points[wireDraft.points.length - 1];
            setMeasureLabel(formatMeasureLabel(origin, snappedPoint));
          }
        } else {
          setSnapIndicatorPoint(null);
        }
      }
    } else {
      if (wireHoverPoint) {
        setWireHoverPoint(null);
      }
      if (snapIndicatorPoint) {
        setSnapIndicatorPoint(null);
      }
    }

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    if (dragState.mode === "move-selection") {
      const worldDelta = applyClientDragStep(svg, event.clientX, event.clientY);
      if (!worldDelta) {
        return;
      }

      onMoveSelected(worldDelta.x, worldDelta.y);

      const canvasPoint = getCanvasPoint(event);
      if (!canvasPoint) {
        return;
      }

      setMeasureLabel(formatMeasureLabel(dragState.originWorld, canvasPoint));
      setDragState((currentDragState) =>
        currentDragState
          ? {
              ...currentDragState,
              lastClient: { x: event.clientX, y: event.clientY },
              lastWorld: canvasPoint,
            }
          : currentDragState,
      );
      return;
    }

    if (dragState.mode === "move-wire-node") {
      const canvasPoint = getCanvasPoint(event);
      if (!canvasPoint) {
        return;
      }

      onMoveWireNode(canvasPoint);
      setMeasureLabel(formatMeasureLabel(dragState.originWorld, canvasPoint));
      setDragState((currentDragState) =>
        currentDragState
          ? {
              ...currentDragState,
              lastClient: { x: event.clientX, y: event.clientY },
              lastWorld: canvasPoint,
            }
          : currentDragState,
      );
      return;
    }

    if (dragState.mode === "move-symbol-text") {
      const worldDelta = applyClientDragStep(svg, event.clientX, event.clientY);
      if (!worldDelta) {
        return;
      }

      onMoveSymbolText(worldDelta);

      const canvasPoint = getCanvasPoint(event);
      if (!canvasPoint) {
        return;
      }

      setMeasureLabel(formatMeasureLabel(dragState.originWorld, canvasPoint));
      setDragState((currentDragState) =>
        currentDragState
          ? {
              ...currentDragState,
              lastClient: { x: event.clientX, y: event.clientY },
              lastWorld: canvasPoint,
            }
          : currentDragState,
      );
      return;
    }

    const shouldPanCanvas =
      dragState.mode === "canvas-gesture" &&
      (dragState.isPanning ||
        getClientDistance(dragState.startClient, { x: event.clientX, y: event.clientY }) >=
          TAP_DRAG_THRESHOLD_PX);

    if (!shouldPanCanvas) {
      return;
    }

    const worldDelta = applyClientDragStep(svg, event.clientX, event.clientY);
    if (!worldDelta) {
      return;
    }

    panVelocityRef.current = worldDelta;

    onSetPan((currentPan) => ({
      x: currentPan.x - worldDelta.x,
      y: currentPan.y - worldDelta.y,
    }));

    setDragState((currentDragState) =>
      currentDragState
        ? {
            ...currentDragState,
            lastClient: { x: event.clientX, y: event.clientY },
            isPanning: true,
          }
        : currentDragState,
    );
  };

  const handleCanvasPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    console.info("[SchematicCanvas] Handling pointer up", { pointerId: event.pointerId });

    untrackPointer(event);

    if (pinchGestureRef.current) {
      if (activePointersRef.current.size < 2) {
        endPinchGesture();
      }
      return;
    }

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const wasPanGesture =
      dragState.mode === "canvas-gesture" &&
      (dragState.isPanning ||
        getClientDistance(dragState.startClient, { x: event.clientX, y: event.clientY }) >=
          TAP_DRAG_THRESHOLD_PX);

    if (dragState.mode === "move-selection") {
      onSnapSelectedToGrid();
    } else if (dragState.mode === "move-wire-node") {
      onCommitWireNodeEdit();
    } else if (dragState.mode === "move-symbol-text") {
      onCommitSymbolTextEdit();
    } else if (wasPanGesture) {
      startInertia();
    } else if (dragState.mode === "canvas-gesture") {
      const lastTap = lastTapRef.current;
      const now = Date.now();
      const isDoubleTap =
        lastTap &&
        now - lastTap.time < DOUBLE_TAP_MS &&
        getClientDistance(lastTap, { x: event.clientX, y: event.clientY }) < DOUBLE_TAP_DISTANCE_PX;

      if (
        isDoubleTap &&
        onDoubleTapFit &&
        (dragState.tapAction?.kind === "clear-selection" || !dragState.tapAction)
      ) {
        onDoubleTapFit();
        lastTapRef.current = undefined;
      } else {
        if (dragState.tapAction) {
          executeCanvasTap(dragState.tapAction, dragState.lastWorld);
        }
        lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };
      }
    }

    const svg = svgRef.current;
    if (svg?.hasPointerCapture(event.pointerId)) {
      try {
        svg.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer may already be released on some browsers.
      }
    }

    clearDragLastClient();
    setDragState(null);
    setMeasureLabel(undefined);
    setSnapIndicatorPoint(null);
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    console.info("[SchematicCanvas] Handling wheel zoom", { deltaY: event.deltaY });

    event.preventDefault();

    const svg = svgRef.current;
    const svgRect = getSvgRect();
    if (!svg || !svgRect) {
      return;
    }

    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextViewport = getZoomAtClientPoint(
      svg,
      event.clientX,
      event.clientY,
      zoom,
      pan,
      zoomFactor,
      svgRect,
    );

    applyViewport(nextViewport.pan, nextViewport.zoom);
  };

  useEffect(() => {
    console.info("[SchematicCanvas] Attaching non-passive touch and wheel listeners");

    const svg = svgRef.current;
    if (!svg) {
      return undefined;
    }

    const preventTouchScroll = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    const handleWheelCapture = (event: WheelEvent) => {
      event.preventDefault();
    };

    svg.addEventListener("touchmove", preventTouchScroll, { passive: false });
    svg.addEventListener("wheel", handleWheelCapture, { passive: false });

    return () => {
      svg.removeEventListener("touchmove", preventTouchScroll);
      svg.removeEventListener("wheel", handleWheelCapture);
    };
  }, []);

  const draftWire =
    wireDraft && wireDraft.points.length > 1 ? { id: "wire-draft", points: wireDraft.points } : undefined;

  const wirePreviewWire = useMemo(() => {
    if (!wireDraft || wireDraft.points.length === 0 || !wireHoverPoint || !getWirePreviewPoints) {
      return undefined;
    }

    const previewPoints = getWirePreviewPoints(wireHoverPoint);
    if (!previewPoints || previewPoints.length < 2) {
      return undefined;
    }

    return { id: "wire-preview", points: previewPoints };
  }, [getWirePreviewPoints, wireDraft, wireHoverPoint]);

  const selectedSymbolName = placingSymbolId ? symbolIndex[placingSymbolId]?.name : undefined;
  const isCanvasEmpty =
    project.symbols.length === 0 &&
    project.wires.length === 0 &&
    project.netLabels.length === 0 &&
    project.textNotes.length === 0;
  const wireJunctionPoints = useMemo(
    () => getWireJunctionPoints(project.wires),
    [project.wires],
  );
  const showWireNodeHandles =
    !wireDraft &&
    (activeTool === "select" || activeTool === "wire") &&
    selectedIds.some((id) => project.wires.some((wire) => wire.id === id));
  const wiresWithNodeHandles = showWireNodeHandles
    ? project.wires.filter((wire) => selectedIds.includes(wire.id))
    : [];
  const worldFillRect = useMemo(
    () =>
      getWorldFillRect(
        {
          x: viewBox.x + viewBox.width / 2,
          y: viewBox.y + viewBox.height / 2,
        },
        viewBox.width,
        viewBox.height,
      ),
    [viewBox.height, viewBox.width, viewBox.x, viewBox.y],
  );

  return (
    <section
      className="schematic-canvas relative min-h-0 flex-1 overflow-hidden rounded-none border-0 shadow-none xl:rounded-[2rem] xl:border xl:shadow-2xl"
      style={{
        borderColor: "var(--chrome-canvas-frame-border)",
        backgroundColor: schematicColorVar("background"),
        boxShadow: "0 25px 50px -12px var(--chrome-canvas-frame-shadow)",
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <svg
        ref={svgRef}
        className="h-full min-h-0 w-full"
        style={{ touchAction: "none" }}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onPointerLeave={() => {
          setWireHoverPoint(null);
        }}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="schematic-grid-pattern" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <circle cx={gridSize / 2} cy={gridSize / 2} r="1.5" fill={schematicColorVar("gridDot")} />
          </pattern>
        </defs>

        <rect
          x={worldFillRect.x}
          y={worldFillRect.y}
          width={worldFillRect.width}
          height={worldFillRect.height}
          fill={schematicColorVar("background")}
        />
        <rect
          x={worldFillRect.x}
          y={worldFillRect.y}
          width={worldFillRect.width}
          height={worldFillRect.height}
          fill="url(#schematic-grid-pattern)"
        />

        {snapIndicatorPoint ? (
          <circle
            cx={snapIndicatorPoint.x}
            cy={snapIndicatorPoint.y}
            r={14}
            fill="none"
            stroke={schematicColorVar("snapIndicator")}
            strokeWidth={4}
            pointerEvents="none"
          />
        ) : null}

        {(project.buses ?? []).map((bus) => (
          <BusView
            key={bus.id}
            bus={bus}
            selected={selectedIds.includes(bus.id)}
            netHighlighted={netHighlight ? isNetHighlighted(netHighlight, "bus", bus.id) : false}
            onPointerDown={(event) => beginSelectionDrag(bus.id, event)}
            onLongPress={handleObjectLongPress(bus.id, "bus")}
          />
        ))}

        {project.wires.map((wire) => (
          <WireView
            key={wire.id}
            wire={wire}
            selected={selectedIds.includes(wire.id)}
            netHighlighted={netHighlight ? isNetHighlighted(netHighlight, "wire", wire.id) : false}
            onPointerDown={(event) => beginSelectionDrag(wire.id, event)}
            onLongPress={handleObjectLongPress(wire.id, "wire")}
          />
        ))}

        {wireJunctionPoints.map((junctionPoint) => (
          <circle
            key={`junction-${junctionPoint.x}-${junctionPoint.y}`}
            cx={junctionPoint.x}
            cy={junctionPoint.y}
            r={8}
            fill={schematicColorVar("junction")}
            stroke={schematicColorVar("junctionStroke")}
            strokeWidth={3}
          />
        ))}

        {draftWire ? <WireView wire={draftWire} dashed /> : null}
        {wirePreviewWire ? <WireView wire={wirePreviewWire} dashed /> : null}
        {busDraft && busDraft.points.length > 1 ? (
          <BusView bus={{ id: "bus-draft", text: "", points: busDraft.points }} />
        ) : null}

        {project.netLabels.map((label) => (
          <LabelView
            key={label.id}
            item={label}
            variant="net-label"
            schematicTextSize={schematicTextSize}
            selected={selectedIds.includes(label.id)}
            netHighlighted={netHighlight ? isNetHighlighted(netHighlight, "label", label.id) : false}
            onPointerDown={(event) => beginSelectionDrag(label.id, event)}
            onLongPress={handleObjectLongPress(label.id, "net-label")}
          />
        ))}

        {(project.sheetPins ?? []).map((pin) => (
          <SheetPinView
            key={pin.id}
            pin={pin}
            schematicTextSize={schematicTextSize}
            selected={selectedIds.includes(pin.id)}
            netHighlighted={netHighlight ? isNetHighlighted(netHighlight, "sheet-pin", pin.id) : false}
            onPointerDown={(event) => beginSelectionDrag(pin.id, event)}
          />
        ))}

        {project.textNotes.map((note) => (
          <LabelView
            key={note.id}
            item={note}
            variant="text-note"
            schematicTextSize={schematicTextSize}
            selected={selectedIds.includes(note.id)}
            onPointerDown={(event) => beginSelectionDrag(note.id, event)}
            onLongPress={handleObjectLongPress(note.id, "text-note")}
          />
        ))}

        {project.symbols.map((instance) => {
          const symbol = symbolIndex[instance.symbolId];
          if (!symbol) {
            return null;
          }

          return (
            <SymbolInstanceView
              key={instance.id}
              symbol={symbol}
              instance={instance}
              schematicTextSize={schematicTextSize}
              selected={selectedIds.includes(instance.id)}
              symbolTextEditMode={symbolPinTextEditInstanceId === instance.id}
              selectedSymbolText={
                selectedSymbolText?.instanceId === instance.id ? selectedSymbolText.target : undefined
              }
              netHighlighted={
                netHighlight ? isNetHighlighted(netHighlight, "symbol", instance.id) : false
              }
              highlightedPinNumber={
                ercPinFocus?.symbolInstanceId === instance.id ? ercPinFocus.pinNumber : undefined
              }
              onPointerDown={(event) => beginSelectionDrag(instance.id, event)}
              onLongPress={handleObjectLongPress(instance.id, "symbol")}
              onSymbolTextPointerDown={(target, event) => beginSymbolTextDrag(instance.id, target, event)}
              onPinPointerDown={
                onPinPointerDown
                  ? (connection, event) => {
                      if (shouldCapturePointer(event)) {
                        event.preventDefault();
                      }
                      onPinPointerDown(connection);
                    }
                  : undefined
              }
            />
          );
        })}

        {wiresWithNodeHandles.map((wire) => (
          <WireNodeHandles
            key={`${wire.id}-nodes`}
            wire={wire}
            selectedNode={selectedWireNode}
            onNodePointerDown={(pointIndex, event) => beginWireNodeDrag(wire.id, pointIndex, event)}
            onNodeDoubleClick={(pointIndex) => onRemoveWireNodeAt(wire.id, pointIndex)}
          />
        ))}
      </svg>

      <CanvasHud measureLabel={measureLabel} />

      {isCanvasEmpty ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto max-w-2xl rounded-[2rem] border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-6 text-center shadow-[var(--chrome-shadow)] backdrop-blur">
          <h2 className="text-3xl font-semibold text-[var(--chrome-heading)]">Welcome to Schematic Tablet.</h2>
          <ol className="mt-4 space-y-3 text-left text-lg leading-relaxed text-[var(--chrome-text)]">
            <li>1. Load the starter symbols or import a KiCad library.</li>
            <li>2. Search for a symbol and tap Place.</li>
            <li>3. Tap the canvas to place it, then drag to move it.</li>
            <li>4. Use Wire, Label, and Text to sketch the template.</li>
            <li>5. Save the project locally when the layout looks right.</li>
          </ol>
        </div>
      ) : null}
      {selectedSymbolName ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-base text-cyan-100">
          Tap to place {selectedSymbolName}
        </div>
      ) : null}
      {symbolPinTextEditInstanceId ? (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-100">
          Symbol text edit — tap ref, value, pin labels, or custom text; drag to move or rotate from the menu
        </div>
      ) : null}
    </section>
  );
});

export default SchematicCanvas;
