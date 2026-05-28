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

export type SymbolTextTarget =
  | { type: "pin"; pinNumber: string; kind: PinTextKind }
  | { type: "ref" }
  | { type: "value" }
  | { type: "custom"; id: string };

export type SymbolTextSelection = {
  instanceId: string;
  target: SymbolTextTarget;
};

/** User-added text label on a placed symbol instance. */
export type SymbolCustomTextLabel = {
  id: string;
  text: string;
  /** Base position in symbol-local coordinates. */
  x: number;
  y: number;
} & SymbolFieldAnnotation;

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
  customTextLabels?: SymbolCustomTextLabel[];
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

/** KiCad-style label taxonomy for connectivity and rendering. */
export type LabelKind = "local" | "global" | "sheet" | "bus" | "bus-member" | "hierarchical";

export type NetLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  mirrored?: boolean;
  labelScope?: NetLabelScope;
  labelKind?: LabelKind;
  /** Bus member labels reference the parent bus label id. */
  busLabelId?: string;
  /** Zero-based index within the bus range (e.g. D[0..7] → 0..7). */
  busMemberIndex?: number;
  pinConnection?: WireConnection;
  wireId?: string;
};

/** Thick bus polyline (KiCad bus wire). */
export type Bus = {
  id: string;
  /** Bus notation, e.g. `D[0..7]` or `DATA[0..15]`. */
  text: string;
  points: Point[];
  wireId?: string;
  pinConnection?: WireConnection;
};

export type SheetPinDirection = "input" | "output" | "bidirectional";

/** Sheet port for hierarchical designs (connects across sheets by name). */
export type SheetPin = {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  direction: SheetPinDirection;
  pinConnection?: WireConnection;
  wireId?: string;
};

export type ErcSeverity = "error" | "warning";

export type ErcRuleId =
  | "unconnected-power-input-pin"
  | "unconnected-output-pin"
  | "unconnected-input-pin"
  | "unconnected-bidirectional-pin"
  | "unconnected-unspecified-pin"
  | "unconnected-non-passive-pin"
  | "conflicting-output-pins"
  | "missing-value-field";

export type ErcConflictingPinRef = {
  symbolInstanceId: string;
  symbolRef: string;
  pinNumber: string;
  pinName: string;
  electricalTypeLabel: string;
};

export type ErcViolation = {
  id: string;
  ruleId: ErcRuleId;
  severity: ErcSeverity;
  message: string;
  /** Short title for list rows, e.g. "MOD1 · pin 32". */
  title: string;
  /** Actionable detail shown under the title. */
  detail: string;
  symbolInstanceId?: string;
  symbolRef?: string;
  symbolValue?: string;
  libraryName?: string;
  pinNumber?: string;
  pinName?: string;
  electricalType?: string;
  electricalTypeLabel?: string;
  guidance?: string;
  netRoot?: string;
  conflictingPins?: ErcConflictingPinRef[];
};

export type ErcSuppression = {
  id: string;
  ruleId: ErcRuleId;
  symbolInstanceId?: string;
  pinNumber?: string;
  netRoot?: string;
};

export type SchematicSheet = {
  id: string;
  name: string;
  symbols: SymbolInstance[];
  wires: Wire[];
  buses: Bus[];
  netLabels: NetLabel[];
  sheetPins: SheetPin[];
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
  buses: Bus[];
  netLabels: NetLabel[];
  sheetPins: SheetPin[];
  textNotes: TextNote[];
  ercSuppressions?: ErcSuppression[];
  gridSize: number;
  sheets: SchematicSheet[];
  activeSheetId?: string;
};
