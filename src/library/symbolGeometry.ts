import type { Point, SymbolPin, SymbolPinOrientation } from "./types";

export const getPinDirection = (orientation: SymbolPinOrientation): Point => {
  console.info("[symbolGeometry] Resolving pin direction", { orientation });

  const directionByOrientation: Record<SymbolPinOrientation, Point> = {
    R: { x: 1, y: 0 },
    L: { x: -1, y: 0 },
    U: { x: 0, y: 1 },
    D: { x: 0, y: -1 },
  };

  return directionByOrientation[orientation];
};

export const getPinBodyPoint = (pin: SymbolPin): Point => {
  console.info("[symbolGeometry] Calculating pin body point", { pinName: pin.name, orientation: pin.orientation });

  const direction = getPinDirection(pin.orientation);

  return {
    x: pin.x + direction.x * pin.length,
    y: pin.y + direction.y * pin.length,
  };
};
