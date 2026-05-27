import { getPinBodyPoint, getPinDirection } from "../library/symbolGeometry";

export const normalizeRotation = (rotation: number): 0 | 90 | 180 | 270 => {
  console.info("[transforms] Normalizing rotation", { rotation });

  const normalized = ((rotation % 360) + 360) % 360;

  if (normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }

  return 0;
};

export const toggleMirror = (mirrored: boolean): boolean => {
  console.info("[transforms] Toggling mirror flag", { mirrored });

  return !mirrored;
};

export { getPinBodyPoint, getPinDirection };
