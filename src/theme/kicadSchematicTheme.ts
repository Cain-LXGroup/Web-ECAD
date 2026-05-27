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

export const kicadSchematicTheme: KiCadSchematicTheme = {
  background: "#202228",
  gridDot: "rgba(136, 192, 112, 0.22)",
  wire: "#88c070",
  wireSelected: "#9ad4ff",
  junction: "#88c070",
  junctionStroke: "#202228",
  bodyStroke: "#c07070",
  bodyFill: "#3a3f4b",
  pinStroke: "#c07070",
  pinConnection: "#c07070",
  refText: "#70c0c0",
  valueText: "#70c0c0",
  pinName: "#c0c070",
  pinNumber: "#d8dee9",
  netLabel: "#70c0c0",
  textNote: "#d8dee9",
  selection: "#9ad4ff",
  fontFamily: '"Courier New", Courier, monospace',
  refFontSize: 50,
  valueFontSize: 50,
  pinNameFontSize: 38,
  pinNumberFontSize: 34,
};

export default kicadSchematicTheme;
