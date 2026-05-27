export type Point = {
  x: number;
  y: number;
};

export type SymbolPinOrientation = "L" | "R" | "U" | "D";

export type SymbolGraphic =
  | {
      type: "line";
      start: Point;
      end: Point;
      strokeWidth?: number;
    }
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      strokeWidth?: number;
      fill?: "none" | "white";
    }
  | {
      type: "circle";
      cx: number;
      cy: number;
      r: number;
      strokeWidth?: number;
      fill?: "none" | "white";
    }
  | {
      type: "polyline";
      points: Point[];
      strokeWidth?: number;
      fill?: "none" | "white";
      closed?: boolean;
    }
  | {
      type: "arc";
      cx: number;
      cy: number;
      r: number;
      start: Point;
      end: Point;
      strokeWidth?: number;
    }
  | {
      type: "text";
      x: number;
      y: number;
      text: string;
      size?: number;
      rotation?: number;
    };

export type SymbolPin = {
  number: string;
  name: string;
  x: number;
  y: number;
  length: number;
  orientation: SymbolPinOrientation;
  electricalType?: string;
  hidden?: boolean;
};

export type LibrarySymbol = {
  id: string;
  source: "kicad-lib" | "kicad-sym" | "easyeda" | "manual";
  libraryName: string;
  name: string;
  description?: string;
  keywords?: string[];
  referencePrefix?: string;
  footprint?: string;
  datasheet?: string;
  properties?: Record<string, string>;
  graphics: SymbolGraphic[];
  pins: SymbolPin[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  importedAt: number;
};

export type SymbolFieldAnnotation = {
  /** Offset from default label position in symbol-local coordinates. */
  offset?: Point;
  rotation?: 0 | 90 | 180 | 270;
  hidden?: boolean;
};

export type PinTextKind = "name" | "number";

export type PinTextAnnotations = {
  name?: SymbolFieldAnnotation;
  number?: SymbolFieldAnnotation;
};

export type SymbolInstance = {
  id: string;
  symbolId: string;
  ref: string;
  value?: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  mirrored: boolean;
  refAnnotation?: SymbolFieldAnnotation;
  valueAnnotation?: SymbolFieldAnnotation;
  /** Per-pin text overrides keyed by pin number. */
  pinTextAnnotations?: Record<string, PinTextAnnotations>;
};

export type WireConnection = {
  symbolInstanceId: string;
  pinNumber: string;
};

export type WireRoutingMode = "manual" | "auto";

export type Wire = {
  id: string;
  points: Point[];
  routingMode?: WireRoutingMode;
  startConnection?: WireConnection;
  endConnection?: WireConnection;
  startWireId?: string;
  endWireId?: string;
};

export type NetLabelScope = "global" | "sheet";

export type NetLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  mirrored?: boolean;
  labelScope?: NetLabelScope;
  pinConnection?: WireConnection;
  wireId?: string;
};

export type SchematicSheet = {
  id: string;
  name: string;
  symbols: SymbolInstance[];
  wires: Wire[];
  netLabels: NetLabel[];
  textNotes: TextNote[];
};

export type TextNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  pinConnection?: WireConnection;
  wireId?: string;
};

export type SchematicProject = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  symbols: SymbolInstance[];
  wires: Wire[];
  netLabels: NetLabel[];
  textNotes: TextNote[];
  gridSize: number;
  sheets: SchematicSheet[];
  activeSheetId?: string;
};
