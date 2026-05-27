import { getPinBodyPoint, getPinDirection } from "../library/symbolGeometry";
import type { Point, PinTextKind, SymbolFieldAnnotation, SymbolInstance, SymbolPin } from "../library/types";
import { normalizeRotation } from "./transforms";

const rotatePoint = (point: Point, rotation: SymbolInstance["rotation"]): Point => {
  console.info("[pinTextLayout] Rotating point for instance-local transform", { point, rotation });

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

export type PinTextLayout = {
  defaultX: number;
  defaultY: number;
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end";
  rotation: 0 | 90 | 180 | 270;
  hidden: boolean;
};

export const getDefaultPinTextPosition = (pin: SymbolPin, kind: PinTextKind): { x: number; y: number } => {
  console.info("[pinTextLayout] Calculating default pin text position", { pinNumber: pin.number, kind });

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
  console.info("[pinTextLayout] Resolving pin text anchor", { pinNumber: pin.number, kind });

  const direction = getPinDirection(pin.orientation);

  if (kind === "name") {
    return direction.x > 0 ? "start" : direction.x < 0 ? "end" : "middle";
  }

  return direction.x > 0 ? "end" : direction.x < 0 ? "start" : "middle";
};

export const getPinTextLayout = (
  pin: SymbolPin,
  kind: PinTextKind,
  annotation?: SymbolFieldAnnotation,
): PinTextLayout => {
  console.info("[pinTextLayout] Building pin text layout", { pinNumber: pin.number, kind });

  const defaultPosition = getDefaultPinTextPosition(pin, kind);
  const offset = annotation?.offset ?? { x: 0, y: 0 };

  return {
    defaultX: defaultPosition.x,
    defaultY: defaultPosition.y,
    x: defaultPosition.x + offset.x,
    y: defaultPosition.y + offset.y,
    textAnchor: getPinTextAnchor(pin, kind),
    rotation: annotation?.rotation ?? 0,
    hidden: annotation?.hidden ?? false,
  };
};

export const estimatePinTextHitSize = (text: string, fontSize: number): { width: number; height: number } => {
  console.info("[pinTextLayout] Estimating pin text hit target size", { textLength: text.length, fontSize });

  return {
    width: Math.max(fontSize * 0.65, text.length * fontSize * 0.55),
    height: fontSize * 1.15,
  };
};

export const canvasDeltaToInstanceLocal = (instance: SymbolInstance, worldDelta: Point): Point => {
  console.info("[pinTextLayout] Converting canvas delta to instance-local delta", {
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
