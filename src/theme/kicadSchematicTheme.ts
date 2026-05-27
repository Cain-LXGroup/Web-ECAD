import { DEFAULT_SCHEMATIC_COLORS } from "./schematicTheme";

export type KiCadSchematicTheme = {
  background: string;
  gridDot: string;
  wire: string;
  wireSelected: string;
  junction: string;
  junctionStroke: string;
  bodyStroke: string;
  bodyFill: string;
  pinStroke: string;
  pinConnection: string;
  refText: string;
  valueText: string;
  pinName: string;
  pinNumber: string;
  netLabel: string;
  textNote: string;
  selection: string;
  fontFamily: string;
  refFontSize: number;
  valueFontSize: number;
  pinNameFontSize: number;
  pinNumberFontSize: number;
};

/** Static KiCad-like defaults; live canvas colors come from CSS variables via schematicTheme. */
export const kicadSchematicTheme: KiCadSchematicTheme = {
  background: DEFAULT_SCHEMATIC_COLORS.background,
  gridDot: DEFAULT_SCHEMATIC_COLORS.gridDot,
  wire: DEFAULT_SCHEMATIC_COLORS.wire,
  wireSelected: DEFAULT_SCHEMATIC_COLORS.wireSelected,
  junction: DEFAULT_SCHEMATIC_COLORS.junction,
  junctionStroke: DEFAULT_SCHEMATIC_COLORS.junctionStroke,
  bodyStroke: DEFAULT_SCHEMATIC_COLORS.bodyStroke,
  bodyFill: DEFAULT_SCHEMATIC_COLORS.bodyFill,
  pinStroke: DEFAULT_SCHEMATIC_COLORS.pinStroke,
  pinConnection: DEFAULT_SCHEMATIC_COLORS.pinConnection,
  refText: DEFAULT_SCHEMATIC_COLORS.refText,
  valueText: DEFAULT_SCHEMATIC_COLORS.valueText,
  pinName: DEFAULT_SCHEMATIC_COLORS.pinName,
  pinNumber: DEFAULT_SCHEMATIC_COLORS.pinNumber,
  netLabel: DEFAULT_SCHEMATIC_COLORS.netLabel,
  textNote: DEFAULT_SCHEMATIC_COLORS.textNote,
  selection: DEFAULT_SCHEMATIC_COLORS.selection,
  fontFamily: '"Courier New", Courier, monospace',
  refFontSize: 50,
  valueFontSize: 50,
  pinNameFontSize: 38,
  pinNumberFontSize: 34,
};

export default kicadSchematicTheme;
