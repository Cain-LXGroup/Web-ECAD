import { getPinDirection } from "../library/symbolGeometry";
import type { LibrarySymbol, SchematicProject, SymbolPinOrientation, WireConnection } from "../library/types";
import { resolveWireConnectionPoint } from "./wireRouting";

export const defaultNetLabelRotationForPin = (
  orientation: SymbolPinOrientation,
): 0 | 90 | 180 | 270 => {
  console.info("[labelPlacement] Resolving default net label rotation for pin", { orientation });

  switch (orientation) {
    case "R":
      return 180;
    case "L":
      return 0;
    case "U":
      return 270;
    case "D":
      return 90;
    default:
      return 0;
  }
};

export const resolveNetLabelPlacement = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  pinConnection?: WireConnection,
): { rotation: 0 | 90 | 180 | 270; mirrored: boolean } => {
  console.info("[labelPlacement] Resolving net label placement metadata", { pinConnection });

  if (!pinConnection) {
    return { rotation: 0, mirrored: false };
  }

  const instance = project.symbols.find((symbol) => symbol.id === pinConnection.symbolInstanceId);
  const librarySymbol = instance ? symbolIndex[instance.symbolId] : undefined;
  const pin = librarySymbol?.pins.find((candidate) => candidate.number === pinConnection.pinNumber);

  if (!pin) {
    return { rotation: 0, mirrored: false };
  }

  const direction = getPinDirection(pin.orientation);
  const rotation = defaultNetLabelRotationForPin(pin.orientation);

  return {
    rotation,
    mirrored: direction.x < 0,
  };
};

export const offsetNetLabelFromAnchor = (
  anchor: { x: number; y: number },
  rotation: 0 | 90 | 180 | 270,
  mirrored: boolean,
  offset: number,
): { x: number; y: number } => {
  console.info("[labelPlacement] Offsetting net label from anchor", { anchor, rotation, mirrored, offset });

  const sign = mirrored ? -1 : 1;

  switch (rotation) {
    case 0:
      return { x: anchor.x, y: anchor.y + offset * sign };
    case 180:
      return { x: anchor.x, y: anchor.y - offset * sign };
    case 90:
      return { x: anchor.x - offset * sign, y: anchor.y };
    case 270:
      return { x: anchor.x + offset * sign, y: anchor.y };
    default:
      return anchor;
  }
};

export const resolvePinnedNetLabelPoint = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  pinConnection: WireConnection,
  rotation: 0 | 90 | 180 | 270,
  mirrored: boolean,
  gridSize: number,
): { x: number; y: number } | undefined => {
  console.info("[labelPlacement] Resolving pinned net label canvas point", { pinConnection, rotation });

  const pinPoint = resolveWireConnectionPoint(project, symbolIndex, pinConnection);
  if (!pinPoint) {
    return undefined;
  }

  const offset = Math.max(gridSize * 0.9, 36);
  return offsetNetLabelFromAnchor(pinPoint, rotation, mirrored, offset);
};
