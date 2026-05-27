export const DEFAULT_SCHEMATIC_TEXT_SIZE = 50;
export const MIN_SCHEMATIC_TEXT_SIZE = 28;
export const MAX_SCHEMATIC_TEXT_SIZE = 80;

const TEXT_NOTE_SIZE_RATIO = 42 / DEFAULT_SCHEMATIC_TEXT_SIZE;

export const clampSchematicTextSize = (size: number): number => {
  console.info("[schematicTextSizing] Clamping schematic text size", { size });

  return Math.min(MAX_SCHEMATIC_TEXT_SIZE, Math.max(MIN_SCHEMATIC_TEXT_SIZE, Math.round(size)));
};

export const getSchematicTextScale = (baseSize: number = DEFAULT_SCHEMATIC_TEXT_SIZE): number => {
  return baseSize / DEFAULT_SCHEMATIC_TEXT_SIZE;
};

export const getNetLabelFontSize = (baseSize: number = DEFAULT_SCHEMATIC_TEXT_SIZE): number => {
  return baseSize;
};

export const getTextNoteFontSize = (baseSize: number = DEFAULT_SCHEMATIC_TEXT_SIZE): number => {
  return Math.round(baseSize * TEXT_NOTE_SIZE_RATIO);
};

export const scaleThemeFontSize = (
  themeFontSize: number,
  baseSize: number = DEFAULT_SCHEMATIC_TEXT_SIZE,
): number => {
  return Math.round(themeFontSize * getSchematicTextScale(baseSize));
};
