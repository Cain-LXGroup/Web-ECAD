import { getPinBodyPoint, getPinDirection } from "../library/symbolGeometry";
import type {
  LibrarySymbol,
  PinTextKind,
  Point,
  SymbolCustomTextLabel,
  SymbolFieldAnnotation,
  SymbolInstance,
  SymbolPin,
  SymbolTextTarget,
} from "../library/types";
import { normalizeRotation } from "./transforms";

const rotatePoint = (point: Point, rotation: SymbolInstance["rotation"]): Point => {
  console.info("[symbolTextLayout] Rotating point for instance-local transform", { point, rotation });

  switch (rotation) {
    case 90:
      return { x: -point.y, y: point.x };
    case 180:
      return { x: -point.x, y: -point.y };
    case 270:
      return { x: point.y, y: -point.x };
    default:
      return point;
  }
};

export type SymbolTextLayout = {
  x: number;
  y: number;
  text: string;
  textAnchor: "start" | "middle" | "end";
  rotation: 0 | 90 | 180 | 270;
  hidden: boolean;
  placeholder?: boolean;
};

export const getRefFieldDefaultPosition = (symbol: LibrarySymbol): Point => ({
  x: symbol.bounds.minX,
  y: -(symbol.bounds.maxY + 56),
});

export const getValueFieldDefaultPosition = (symbol: LibrarySymbol): Point => ({
  x: symbol.bounds.minX,
  y: -(symbol.bounds.maxY + 8),
});

export const getDefaultPinTextPosition = (pin: SymbolPin, kind: PinTextKind): Point => {
  console.info("[symbolTextLayout] Calculating default pin text position", { pinNumber: pin.number, kind });

  const bodyPoint = getPinBodyPoint(pin);
  const direction = getPinDirection(pin.orientation);

  if (kind === "name") {
    return {
      x: bodyPoint.x + direction.x * 16,
      y: -(bodyPoint.y + direction.y * 16),
    };
  }

  return {
    x: pin.x - direction.x * 14,
    y: -(pin.y - direction.y * 14),
  };
};

export const getPinTextAnchor = (pin: SymbolPin, kind: PinTextKind): "start" | "middle" | "end" => {
  const direction = getPinDirection(pin.orientation);

  if (kind === "name") {
    return direction.x > 0 ? "start" : direction.x < 0 ? "end" : "middle";
  }

  return direction.x > 0 ? "end" : direction.x < 0 ? "start" : "middle";
};

const layoutFromAnnotation = (
  defaultPosition: Point,
  text: string,
  textAnchor: SymbolTextLayout["textAnchor"],
  annotation?: SymbolFieldAnnotation,
  placeholder = false,
): SymbolTextLayout => {
  const offset = annotation?.offset ?? { x: 0, y: 0 };

  return {
    x: defaultPosition.x + offset.x,
    y: defaultPosition.y + offset.y,
    text,
    textAnchor,
    rotation: annotation?.rotation ?? 0,
    hidden: annotation?.hidden ?? false,
    placeholder,
  };
};

export const getPinTextLayout = (
  pin: SymbolPin,
  kind: PinTextKind,
  annotation?: SymbolFieldAnnotation,
): SymbolTextLayout => {
  console.info("[symbolTextLayout] Building pin text layout", { pinNumber: pin.number, kind });

  return layoutFromAnnotation(
    getDefaultPinTextPosition(pin, kind),
    kind === "name" ? pin.name : pin.number,
    getPinTextAnchor(pin, kind),
    annotation,
  );
};

export const getRefTextLayout = (
  instance: SymbolInstance,
  symbol: LibrarySymbol,
): SymbolTextLayout => {
  console.info("[symbolTextLayout] Building ref field layout", { instanceId: instance.id });

  return layoutFromAnnotation(
    getRefFieldDefaultPosition(symbol),
    instance.ref || `${symbol.referencePrefix ?? "U"}?`,
    "start",
    instance.refAnnotation,
  );
};

export const getValueTextLayout = (
  instance: SymbolInstance,
  symbol: LibrarySymbol,
  options?: { showPlaceholder?: boolean },
): SymbolTextLayout | null => {
  console.info("[symbolTextLayout] Building value field layout", { instanceId: instance.id });

  const valueText = instance.value?.trim();
  if (!valueText && !options?.showPlaceholder) {
    return null;
  }

  return layoutFromAnnotation(
    getValueFieldDefaultPosition(symbol),
    valueText || "Value",
    "start",
    instance.valueAnnotation,
    !valueText,
  );
};

export const getCustomTextLayout = (label: SymbolCustomTextLabel): SymbolTextLayout => {
  console.info("[symbolTextLayout] Building custom text layout", { labelId: label.id });

  return layoutFromAnnotation(
    { x: label.x, y: label.y },
    label.text,
    "start",
    label,
  );
};

export const estimateSymbolTextHitSize = (text: string, fontSize: number): { width: number; height: number } => {
  console.info("[symbolTextLayout] Estimating symbol text hit target size", { textLength: text.length, fontSize });

  return {
    width: Math.max(fontSize * 0.65, text.length * fontSize * 0.55),
    height: fontSize * 1.15,
  };
};

export const getSymbolTextHitRect = (
  layout: SymbolTextLayout,
  fontSize: number,
): { x: number; y: number; width: number; height: number } => {
  const hitSize = estimateSymbolTextHitSize(layout.text, fontSize);
  const hitX =
    layout.textAnchor === "end"
      ? layout.x - hitSize.width
      : layout.textAnchor === "middle"
        ? layout.x - hitSize.width / 2
        : layout.x;

  return {
    x: hitX,
    y: layout.y - hitSize.height / 2,
    width: hitSize.width,
    height: hitSize.height,
  };
};

export const canvasDeltaToInstanceLocal = (instance: SymbolInstance, worldDelta: Point): Point => {
  console.info("[symbolTextLayout] Converting canvas delta to instance-local delta", {
    instanceId: instance.id,
    worldDelta,
  });

  const inverseRotation = normalizeRotation(360 - instance.rotation);
  const rotated = rotatePoint(worldDelta, inverseRotation);

  return {
    x: instance.mirrored ? -rotated.x : rotated.x,
    y: rotated.y,
  };
};

export const symbolTextTargetsMatch = (left: SymbolTextTarget, right: SymbolTextTarget): boolean => {
  if (left.type !== right.type) {
    return false;
  }

  switch (left.type) {
    case "pin":
      return right.type === "pin" && left.pinNumber === right.pinNumber && left.kind === right.kind;
    case "ref":
      return right.type === "ref";
    case "value":
      return right.type === "value";
    case "custom":
      return right.type === "custom" && left.id === right.id;
    default:
      return false;
  }
};
