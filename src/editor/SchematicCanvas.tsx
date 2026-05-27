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

import type { LibrarySymbol, Point, SchematicProject } from "../library/types";
import { LabelView } from "./LabelView";
import { DEFAULT_GRID_SIZE } from "./snapping";
import { SymbolInstanceView } from "./SymbolInstanceView";
import type { Tool, WireDraftState } from "./useEditorState";
import { getWireJunctionPoints } from "./wireRouting";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";
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
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_DISTANCE_PX = 28;
const INERTIA_FRICTION = 0.9;
const INERTIA_MIN_VELOCITY = 0.35;

type CanvasTapAction =
  | { kind: "wire" }
  | { kind: "label" }
  | { kind: "text" }
  | { kind: "clear-selection" };

type DragState = {
  pointerId: number;
  mode: "move-selection" | "pan" | "canvas-gesture";
  lastClient: Point;
  lastWorld: Point;
  startClient: Point;
  originWorld: Point;
  isPanning: boolean;
  tapAction?: CanvasTapAction;
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
  activeTool: Tool;
  placingSymbolId?: string;
  wireDraft?: WireDraftState;
  getWirePreviewPoints?: (point: Point) => Point[] | undefined;
  zoom: number;
  pan: Point;
  onSelectObject: (id: string) => void;
  onClearSelection: () => void;
  onMoveSelected: (dx: number, dy: number) => void;
  onSnapSelectedToGrid: () => void;
  onPlaceSymbol: (symbolId: string, point: Point) => void;
  onStartWire: (point: Point) => void;
  onAddWirePoint: (point: Point) => void;
  onAddNetLabel: (text: string, point: Point) => void;
  onAddTextNote: (text: string, point: Point) => void;
  onSetPan: Dispatch<SetStateAction<Point>>;
  onSetZoom: Dispatch<SetStateAction<number>>;
  fingerPansOnly?: boolean;
  onDoubleTapFit?: () => void;
  onObjectLongPress?: (target: {
    objectId: string;
    objectType: "symbol" | "wire" | "net-label" | "text-note";
    clientX: number;
    clientY: number;
  }) => void;
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
    activeTool,
    placingSymbolId,
    wireDraft,
    getWirePreviewPoints,
    zoom,
    pan,
    onSelectObject,
    onClearSelection,
    onMoveSelected,
    onSnapSelectedToGrid,
    onPlaceSymbol,
    onStartWire,
    onAddWirePoint,
    onAddNetLabel,
    onAddTextNote,
    onSetPan,
    onSetZoom,
    fingerPansOnly = false,
    onDoubleTapFit,
    onObjectLongPress,
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
    (objectId: string, objectType: "symbol" | "wire" | "net-label" | "text-note") =>
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

  const beginSelectionDrag = (id: string, event: ReactPointerEvent<SVGElement>) => {
    console.info("[SchematicCanvas] Beginning selection drag", { id });

    if (activeTool !== "select" || placingSymbolId || pinchGestureRef.current) {
      return;
    }

    if (fingerPansOnly && event.pointerType === "touch") {
      console.info("[SchematicCanvas] Ignoring object touch drag to allow finger pan", { id });
      return;
    }

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) {
      return;
    }

    onSelectObject(id);
    event.stopPropagation();

    if (shouldCapturePointer(event)) {
      event.preventDefault();
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    stopInertia();
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

    if (action.kind === "label") {
      const labelText = promptForText("label");
      if (labelText) {
        onAddNetLabel(labelText, canvasPoint);
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
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      mode: "canvas-gesture",
      lastClient: { x: event.clientX, y: event.clientY },
      lastWorld: canvasPoint,
      startClient: { x: event.clientX, y: event.clientY },
      originWorld: canvasPoint,
      isPanning: activeTool === "pan",
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

    if (activeTool === "label") {
      beginCanvasGesture(event, canvasPoint, { kind: "label" });
      return;
    }

    if (activeTool === "text") {
      beginCanvasGesture(event, canvasPoint, { kind: "text" });
      return;
    }

    if (activeTool === "pan") {
      beginCanvasGesture(event, canvasPoint);
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
      const canvasPoint = getCanvasPoint(event);
      if (!canvasPoint) {
        return;
      }

      const deltaX = canvasPoint.x - dragState.lastWorld.x;
      const deltaY = canvasPoint.y - dragState.lastWorld.y;
      onMoveSelected(deltaX, deltaY);
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

    const worldDelta = clientDeltaToWorldDelta(
      svg,
      dragState.lastClient.x,
      dragState.lastClient.y,
      event.clientX,
      event.clientY,
    );

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

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

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
      className="schematic-canvas relative min-h-0 flex-1 overflow-hidden rounded-none border-0 shadow-none xl:rounded-[2rem] xl:border xl:shadow-2xl xl:shadow-slate-950/50"
      style={{
        borderColor: "rgba(192, 112, 112, 0.28)",
        backgroundColor: kicadSchematicTheme.background,
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
            <circle cx={gridSize / 2} cy={gridSize / 2} r="1.5" fill={kicadSchematicTheme.gridDot} />
          </pattern>
        </defs>

        <rect
          x={worldFillRect.x}
          y={worldFillRect.y}
          width={worldFillRect.width}
          height={worldFillRect.height}
          fill={kicadSchematicTheme.background}
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
            stroke="rgba(34, 211, 238, 0.85)"
            strokeWidth={4}
            pointerEvents="none"
          />
        ) : null}

        {project.wires.map((wire) => (
          <WireView
            key={wire.id}
            wire={wire}
            selected={selectedIds.includes(wire.id)}
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
            fill={kicadSchematicTheme.junction}
            stroke={kicadSchematicTheme.junctionStroke}
            strokeWidth={3}
          />
        ))}

        {draftWire ? <WireView wire={draftWire} dashed /> : null}
        {wirePreviewWire ? <WireView wire={wirePreviewWire} dashed /> : null}

        {project.netLabels.map((label) => (
          <LabelView
            key={label.id}
            item={label}
            variant="net-label"
            selected={selectedIds.includes(label.id)}
            onPointerDown={(event) => beginSelectionDrag(label.id, event)}
            onLongPress={handleObjectLongPress(label.id, "net-label")}
          />
        ))}

        {project.textNotes.map((note) => (
          <LabelView
            key={note.id}
            item={note}
            variant="text-note"
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
              selected={selectedIds.includes(instance.id)}
              onPointerDown={(event) => beginSelectionDrag(instance.id, event)}
              onLongPress={handleObjectLongPress(instance.id, "symbol")}
            />
          );
        })}
      </svg>

      <CanvasHud measureLabel={measureLabel} />

      {isCanvasEmpty ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto max-w-2xl rounded-[2rem] border border-slate-800 bg-slate-950/85 p-6 text-center backdrop-blur">
          <h2 className="text-2xl font-semibold text-white">Welcome to Schematic Tablet.</h2>
          <ol className="mt-4 space-y-3 text-left text-base text-slate-300">
            <li>1. Load the starter symbols or import a KiCad library.</li>
            <li>2. Search for a symbol and tap Place.</li>
            <li>3. Tap the canvas to place it, then drag to move it.</li>
            <li>4. Use Wire, Label, and Text to sketch the template.</li>
            <li>5. Save the project locally when the layout looks right.</li>
          </ol>
        </div>
      ) : null}
      {selectedSymbolName ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
          Tap to place {selectedSymbolName}
        </div>
      ) : null}
    </section>
  );
});

export default SchematicCanvas;
