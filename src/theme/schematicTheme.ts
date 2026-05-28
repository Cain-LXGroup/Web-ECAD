export type SchematicColorRole =
  | "background"
  | "gridDot"
  | "wire"
  | "wireSelected"
  | "netHighlight"
  | "ercMarker"
  | "junction"
  | "junctionStroke"
  | "bodyStroke"
  | "bodyFill"
  | "pinStroke"
  | "pinConnection"
  | "refText"
  | "valueText"
  | "pinName"
  | "pinNumber"
  | "netLabel"
  | "textNote"
  | "selection"
  | "labelBorder"
  | "labelBackground"
  | "labelSelectionBackground"
  | "netHighlightFill"
  | "wireNode"
  | "snapIndicator";

export type SchematicColors = Record<SchematicColorRole, string>;

export const SCHEMATIC_COLOR_ROLES: SchematicColorRole[] = [
  "background",
  "gridDot",
  "wire",
  "wireSelected",
  "netHighlight",
  "ercMarker",
  "junction",
  "junctionStroke",
  "bodyStroke",
  "bodyFill",
  "pinStroke",
  "pinConnection",
  "refText",
  "valueText",
  "pinName",
  "pinNumber",
  "netLabel",
  "textNote",
  "selection",
  "labelBorder",
  "labelBackground",
  "labelSelectionBackground",
  "netHighlightFill",
  "wireNode",
  "snapIndicator",
];

export const SCHEMATIC_COLOR_LABELS: Record<SchematicColorRole, string> = {
  background: "Canvas background",
  gridDot: "Grid dots",
  wire: "Wire stroke",
  wireSelected: "Wire (selected)",
  netHighlight: "Net highlight",
  ercMarker: "ERC marker",
  junction: "Junction fill",
  junctionStroke: "Junction outline",
  bodyStroke: "Symbol outline",
  bodyFill: "Symbol fill",
  pinStroke: "Pin outline",
  pinConnection: "Pin connection",
  refText: "Reference designator",
  valueText: "Value text",
  pinName: "Pin name",
  pinNumber: "Pin number",
  netLabel: "Net label text",
  textNote: "Text note",
  selection: "Selection highlight",
  labelBorder: "Label box border",
  labelBackground: "Label box fill",
  labelSelectionBackground: "Label box (selected)",
  netHighlightFill: "Label box (net highlight)",
  wireNode: "Wire node handle",
  snapIndicator: "Snap indicator",
};

const schematicColorCssVarName = (role: SchematicColorRole): string =>
  `--schematic-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

export const SCHEMATIC_COLOR_CSS_VARS = SCHEMATIC_COLOR_ROLES.reduce(
  (vars, role) => {
    vars[role] = schematicColorCssVarName(role);
    return vars;
  },
  {} as Record<SchematicColorRole, string>,
);

/** KiCad-style dark worksheet defaults. */
export const DEFAULT_SCHEMATIC_COLORS_DARK: SchematicColors = {
  background: "#202228",
  gridDot: "rgba(136, 192, 112, 0.22)",
  wire: "#88c070",
  wireSelected: "#9ad4ff",
  netHighlight: "#facc15",
  ercMarker: "#fb7185",
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
  labelBorder: "#4b5563",
  labelBackground: "rgba(32, 34, 40, 0.92)",
  labelSelectionBackground: "rgba(154, 212, 255, 0.16)",
  netHighlightFill: "rgba(250, 204, 21, 0.2)",
  wireNode: "#22d3ee",
  snapIndicator: "rgba(34, 211, 238, 0.85)",
};

/** Paper-like light worksheet defaults with readable contrast. */
export const DEFAULT_SCHEMATIC_COLORS_LIGHT: SchematicColors = {
  background: "#f1f5f9",
  gridDot: "rgba(22, 101, 52, 0.2)",
  wire: "#15803d",
  wireSelected: "#0369a1",
  netHighlight: "#ca8a04",
  ercMarker: "#e11d48",
  junction: "#15803d",
  junctionStroke: "#f1f5f9",
  bodyStroke: "#b91c1c",
  bodyFill: "#e2e8f0",
  pinStroke: "#b91c1c",
  pinConnection: "#b91c1c",
  refText: "#0f766e",
  valueText: "#0f766e",
  pinName: "#a16207",
  pinNumber: "#334155",
  netLabel: "#0f766e",
  textNote: "#334155",
  selection: "#0284c7",
  labelBorder: "#94a3b8",
  labelBackground: "rgba(255, 255, 255, 0.94)",
  labelSelectionBackground: "rgba(2, 132, 199, 0.14)",
  netHighlightFill: "rgba(202, 138, 4, 0.18)",
  wireNode: "#0891b2",
  snapIndicator: "rgba(8, 145, 178, 0.85)",
};

/** @deprecated Use scheme-specific defaults; kept as dark alias. */
export const DEFAULT_SCHEMATIC_COLORS: SchematicColors = DEFAULT_SCHEMATIC_COLORS_DARK;

export type ColorScheme = "dark" | "light";

export type SchematicColorsByScheme = Record<ColorScheme, SchematicColors>;

export const defaultSchematicColorsForScheme = (scheme: ColorScheme): SchematicColors =>
  scheme === "light" ? { ...DEFAULT_SCHEMATIC_COLORS_LIGHT } : { ...DEFAULT_SCHEMATIC_COLORS_DARK };

export const defaultSchematicColorsByScheme = (): SchematicColorsByScheme => ({
  dark: defaultSchematicColorsForScheme("dark"),
  light: defaultSchematicColorsForScheme("light"),
});

export const schematicColorVar = (role: SchematicColorRole): string =>
  `var(${SCHEMATIC_COLOR_CSS_VARS[role]})`;

export const mergeSchematicColors = (
  scheme: ColorScheme,
  partial?: Partial<SchematicColors>,
): SchematicColors => ({
  ...defaultSchematicColorsForScheme(scheme),
  ...partial,
});

const isSchematicColorRole = (value: string): value is SchematicColorRole =>
  SCHEMATIC_COLOR_ROLES.includes(value as SchematicColorRole);

const parseColorRecord = (
  scheme: ColorScheme,
  record: Record<string, unknown>,
): SchematicColors => {
  const next: Partial<SchematicColors> = {};

  for (const role of SCHEMATIC_COLOR_ROLES) {
    const value = record[role];
    if (typeof value === "string" && value.trim().length > 0) {
      next[role] = value;
    }
  }

  return mergeSchematicColors(scheme, next);
};

const isLegacyFlatSchematicColors = (parsed: Record<string, unknown>): boolean =>
  typeof parsed.background === "string";

/** Parse a single scheme's color overrides from a nested or legacy flat object. */
export const parseStoredSchematicColors = (
  raw: string | undefined,
  scheme: ColorScheme = "dark",
): SchematicColors => {
  console.info("[schematicTheme] Parsing stored schematic colors", { scheme });

  if (!raw) {
    return defaultSchematicColorsForScheme(scheme);
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return defaultSchematicColorsForScheme(scheme);
    }

    const record = parsed as Record<string, unknown>;

    if (isLegacyFlatSchematicColors(record)) {
      return scheme === "dark" ? parseColorRecord("dark", record) : defaultSchematicColorsForScheme("light");
    }

    const schemeRecord = record[scheme];
    if (schemeRecord && typeof schemeRecord === "object") {
      return parseColorRecord(scheme, schemeRecord as Record<string, unknown>);
    }

    return defaultSchematicColorsForScheme(scheme);
  } catch {
    return defaultSchematicColorsForScheme(scheme);
  }
};

export const parseStoredSchematicColorsByScheme = (
  raw: string | undefined,
): SchematicColorsByScheme => {
  console.info("[schematicTheme] Parsing stored schematic colors by scheme");

  const defaults = defaultSchematicColorsByScheme();

  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return defaults;
    }

    const record = parsed as Record<string, unknown>;

    if (isLegacyFlatSchematicColors(record)) {
      return {
        dark: parseColorRecord("dark", record),
        light: defaults.light,
      };
    }

    return {
      dark:
        record.dark && typeof record.dark === "object"
          ? parseColorRecord("dark", record.dark as Record<string, unknown>)
          : defaults.dark,
      light:
        record.light && typeof record.light === "object"
          ? parseColorRecord("light", record.light as Record<string, unknown>)
          : defaults.light,
    };
  } catch {
    return defaults;
  }
};

export const serializeSchematicColorsByScheme = (colors: SchematicColorsByScheme): string =>
  JSON.stringify(colors);

export const applySchematicColors = (
  colors: SchematicColors,
  target: HTMLElement = document.documentElement,
): void => {
  console.info("[schematicTheme] Applying schematic color CSS variables", {
    targetTag: target.tagName,
  });

  for (const role of SCHEMATIC_COLOR_ROLES) {
    target.style.setProperty(SCHEMATIC_COLOR_CSS_VARS[role], colors[role]);
  }
};

export const clearSchematicColors = (target: HTMLElement = document.documentElement): void => {
  console.info("[schematicTheme] Clearing schematic color CSS variables", {
    targetTag: target.tagName,
  });

  for (const role of SCHEMATIC_COLOR_ROLES) {
    target.style.removeProperty(SCHEMATIC_COLOR_CSS_VARS[role]);
  }
};

export const getResolvedSchematicColor = (
  role: SchematicColorRole,
  target: HTMLElement = document.documentElement,
): string => {
  const cssVar = SCHEMATIC_COLOR_CSS_VARS[role];
  const resolved = getComputedStyle(target).getPropertyValue(cssVar).trim();
  return resolved || DEFAULT_SCHEMATIC_COLORS[role];
};

/** Normalize `<input type="color">` values (#rrggbb) for storage. */
export const normalizeColorInputValue = (value: string): string => {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return trimmed;
};

export const colorInputValueFromStored = (stored: string): string => {
  const match = stored.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (match) {
    return `#${match[1].toLowerCase()}`;
  }

  const rgbMatch = stored.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const toHex = (channel: string) => Number(channel).toString(16).padStart(2, "0");
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }

  return DEFAULT_SCHEMATIC_COLORS.background;
};

export const serializeSchematicColors = (colors: SchematicColors): string =>
  JSON.stringify(colors);

export const isSchematicColorsEqual = (left: SchematicColors, right: SchematicColors): boolean =>
  SCHEMATIC_COLOR_ROLES.every((role) => left[role] === right[role]);

export const isSchematicColorsBySchemeEqual = (
  left: SchematicColorsByScheme,
  right: SchematicColorsByScheme,
): boolean =>
  isSchematicColorsEqual(left.dark, right.dark) && isSchematicColorsEqual(left.light, right.light);

export { isSchematicColorRole };

export default DEFAULT_SCHEMATIC_COLORS;
