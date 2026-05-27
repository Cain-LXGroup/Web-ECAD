import {
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
  type WheelEvent as ReactWheelEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import type { LibrarySymbol, Point, SchematicProject } from "../library/types";
import { LabelView } from "./LabelView";
import { DEFAULT_GRID_SIZE } from "./snapping";
import { SymbolInstanceView } from "./SymbolInstanceView";
import type { Tool, WireDraftState } from "./useEditorState";
import { getWireJunctionPoints } from "./wireRouting";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";
import { WireView } from "./WireView";

const CANVAS_WIDTH = 5000;
const CANVAS_HEIGHT = 3500;

type DragState = {
  pointerId: number;
  mode: "move-selection" | "pan";
  lastPoint: Point;
};

type SchematicCanvasProps = {
  project: SchematicProject;
  symbolIndex: Record<string, LibrarySymbol>;
  selectedIds: string[];
  activeTool: Tool;
  placingSymbolId?: string;
  wireDraft?: WireDraftState;
  wireRoutingMode: WireDraftState["routingMode"];
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
};

const clamp = (value: number, min: number, max: number): number => {
  console.info("[SchematicCanvas] Clamping numeric value", { value, min, max });

  return Math.min(Math.max(value, min), max);
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

export const SchematicCanvas = ({
  project,
  symbolIndex,
  selectedIds,
  activeTool,
  placingSymbolId,
  wireDraft,
  wireRoutingMode,
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
}: SchematicCanvasProps) => {
  console.info("[SchematicCanvas] Rendering interactive schematic canvas", {
    projectId: project.id,
    activeTool,
    selectedCount: selectedIds.length,
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const gridSize = project.gridSize ?? DEFAULT_GRID_SIZE;

  const viewBox = useMemo(() => {
    console.info("[SchematicCanvas] Calculating viewBox", { zoom, pan });

    const width = CANVAS_WIDTH / zoom;
    const height = CANVAS_HEIGHT / zoom;

    return {
      x: clamp(pan.x, 0, Math.max(CANVAS_WIDTH - width, 0)),
      y: clamp(pan.y, 0, Math.max(CANVAS_HEIGHT - height, 0)),
      width,
      height,
    };
  }, [pan.x, pan.y, zoom]);

  const getCanvasPointFromClient = (clientX: number, clientY: number): Point | null => {
    console.info("[SchematicCanvas] Translating client coordinates to SVG coordinates", {
      clientX,
      clientY,
    });

    const svg = svgRef.current;
    if (!svg) {
      return null;
    }

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;

    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return null;
    }

    const transformedPoint = point.matrixTransform(matrix.inverse());
    return {
      x: transformedPoint.x,
      y: transformedPoint.y,
    };
  };

  const getCanvasPoint = (event: ReactPointerEvent<SVGElement>): Point | null => {
    console.info("[SchematicCanvas] Translating pointer event to SVG coordinates");

    return getCanvasPointFromClient(event.clientX, event.clientY);
  };

  const beginSelectionDrag = (id: string, event: ReactPointerEvent<SVGElement>) => {
    console.info("[SchematicCanvas] Beginning selection drag", { id });

    if (activeTool !== "select" || placingSymbolId) {
      return;
    }

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) {
      return;
    }

    onSelectObject(id);
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      mode: "move-selection",
      lastPoint: canvasPoint,
    });
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    console.info("[SchematicCanvas] Handling canvas pointer down", { activeTool, placingSymbolId });

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) {
      return;
    }

    if (placingSymbolId) {
      onPlaceSymbol(placingSymbolId, canvasPoint);
      return;
    }

    if (activeTool === "wire") {
      if (wireDraft && wireDraft.points.length > 0) {
        onAddWirePoint(canvasPoint);
      } else {
        onStartWire(canvasPoint);
      }
      return;
    }

    if (activeTool === "label") {
      const labelText = promptForText("label");
      if (labelText) {
        onAddNetLabel(labelText, canvasPoint);
      }
      return;
    }

    if (activeTool === "text") {
      const noteText = promptForText("text");
      if (noteText) {
        onAddTextNote(noteText, canvasPoint);
      }
      return;
    }

    if (activeTool === "pan") {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragState({
        pointerId: event.pointerId,
        mode: "pan",
        lastPoint: canvasPoint,
      });
      return;
    }

    onClearSelection();
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    console.info("[SchematicCanvas] Handling pointer move drag", { mode: dragState.mode });

    const canvasPoint = getCanvasPoint(event);
    if (!canvasPoint) {
      return;
    }

    const dx = canvasPoint.x - dragState.lastPoint.x;
    const dy = canvasPoint.y - dragState.lastPoint.y;

    if (dragState.mode === "move-selection") {
      onMoveSelected(dx, dy);
    } else if (dragState.mode === "pan") {
      onSetPan((currentPan) => ({
        x: currentPan.x - dx,
        y: currentPan.y - dy,
      }));
    }

    setDragState((currentDragState) =>
      currentDragState
        ? {
            ...currentDragState,
            lastPoint: canvasPoint,
          }
        : currentDragState,
    );
  };

  const handleCanvasPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    console.info("[SchematicCanvas] Handling pointer up", { mode: dragState.mode });

    if (dragState.mode === "move-selection") {
      onSnapSelectedToGrid();
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDragState(null);
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    console.info("[SchematicCanvas] Handling wheel zoom", { deltaY: event.deltaY });

    event.preventDefault();

    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const pointerPoint = getCanvasPointFromClient(event.clientX, event.clientY);
    if (!pointerPoint) {
      return;
    }

    const bounds = svg.getBoundingClientRect();
    const relativeX = bounds.width > 0 ? (event.clientX - bounds.left) / bounds.width : 0.5;
    const relativeY = bounds.height > 0 ? (event.clientY - bounds.top) / bounds.height : 0.5;
    const nextZoom = clamp(zoom * (event.deltaY < 0 ? 1.1 : 0.9), 0.45, 2.8);
    const nextViewBoxWidth = CANVAS_WIDTH / nextZoom;
    const nextViewBoxHeight = CANVAS_HEIGHT / nextZoom;

    onSetPan({
      x: clamp(pointerPoint.x - relativeX * nextViewBoxWidth, 0, Math.max(CANVAS_WIDTH - nextViewBoxWidth, 0)),
      y: clamp(pointerPoint.y - relativeY * nextViewBoxHeight, 0, Math.max(CANVAS_HEIGHT - nextViewBoxHeight, 0)),
    });
    onSetZoom(nextZoom);
  };

  const draftWire =
    wireDraft && wireDraft.points.length > 1 ? { id: "wire-draft", points: wireDraft.points } : undefined;

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

  return (
    <section
      className="schematic-canvas relative min-h-[620px] overflow-hidden rounded-[2rem] border shadow-2xl shadow-slate-950/50"
      style={{
        borderColor: "rgba(192, 112, 112, 0.28)",
        backgroundColor: kicadSchematicTheme.background,
      }}
    >
      <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center gap-3 p-4">
        <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-200">
          Tool: {activeTool}
        </span>
        <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-300">
          Zoom {zoom.toFixed(2)}x
        </span>
        <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-300">
          Grid {gridSize}
        </span>
        <span className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-300">
          Wire Mode {wireDraft?.routingMode ?? wireRoutingMode}
        </span>
        {selectedSymbolName ? (
          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
            Tap canvas to place {selectedSymbolName}
          </span>
        ) : null}
        {wireDraft && wireDraft.points.length > 0 ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Wire draft: {wireDraft.points.length} points
          </span>
        ) : null}
      </div>

      <svg
        ref={svgRef}
        className="h-full min-h-[620px] w-full touch-none"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="schematic-grid-pattern" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <circle cx={gridSize / 2} cy={gridSize / 2} r="1.5" fill={kicadSchematicTheme.gridDot} />
          </pattern>
        </defs>

        <rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={kicadSchematicTheme.background} />
        <rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#schematic-grid-pattern)" />

        {project.wires.map((wire) => (
          <WireView
            key={wire.id}
            wire={wire}
            selected={selectedIds.includes(wire.id)}
            onPointerDown={(event) => beginSelectionDrag(wire.id, event)}
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

        {project.netLabels.map((label) => (
          <LabelView
            key={label.id}
            item={label}
            variant="net-label"
            selected={selectedIds.includes(label.id)}
            onPointerDown={(event) => beginSelectionDrag(label.id, event)}
          />
        ))}

        {project.textNotes.map((note) => (
          <LabelView
            key={note.id}
            item={note}
            variant="text-note"
            selected={selectedIds.includes(note.id)}
            onPointerDown={(event) => beginSelectionDrag(note.id, event)}
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
            />
          );
        })}
      </svg>

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
    </section>
  );
};

export default SchematicCanvas;
