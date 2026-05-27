import { getPinBodyPoint } from "./symbolGeometry";
import { buildSymbolId } from "./normalizeSymbol";
import type {
  LibrarySymbol,
  Point,
  SymbolGraphic,
  SymbolPin,
  SymbolPinOrientation,
} from "./types";

export type LegacyLibParseResult = {
  symbols: LibrarySymbol[];
  skipped: number;
  errors: string[];
};

const PIN_DIR: Record<SymbolPinOrientation, Point> = {
  R: { x: 1, y: 0 },
  L: { x: -1, y: 0 },
  U: { x: 0, y: 1 },
  D: { x: 0, y: -1 },
};

export const tokenizeLegacyLine = (line: string): string[] => {
  console.info("[parseKiCadLegacyLib] Tokenizing legacy library line");

  return line.match(/"[^"]*"|\S+/g) ?? [];
};

const unquote = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/~/g, " ");
  }

  return trimmed.replace(/~/g, " ");
};

const parseNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseOrientation = (value: string): SymbolPinOrientation => {
  const orientation = value.toUpperCase();
  if (orientation === "L" || orientation === "R" || orientation === "U" || orientation === "D") {
    return orientation;
  }

  return "R";
};

const parseFill = (fillCode: string): { fill: "none" | "white"; closed: boolean } => {
  const code = fillCode.toUpperCase();
  const filled = code === "F" || code === "B";

  return {
    fill: filled ? "white" : "none",
    closed: filled,
  };
};

export const parsePolyline = (args: string[]): SymbolGraphic | null => {
  console.info("[parseKiCadLegacyLib] Parsing legacy polyline primitive");

  const pointCount = Number(args[0]);
  if (!Number.isFinite(pointCount) || pointCount < 2) {
    return null;
  }

  const thickness = Number(args[3] ?? "10");
  const coordStart = 4;
  const coordEnd = coordStart + pointCount * 2;
  const coords = args.slice(coordStart, coordEnd);
  const fillCode = args[coordEnd] ?? "N";

  const points: Point[] = [];

  for (let index = 0; index < coords.length - 1; index += 2) {
    points.push({
      x: Number(coords[index]),
      y: Number(coords[index + 1]),
    });
  }

  const { fill, closed } = parseFill(fillCode);

  return {
    type: "polyline",
    points,
    strokeWidth: Math.max(thickness / 10, 1),
    fill,
    closed,
  };
};

const parseRectangle = (args: string[]): SymbolGraphic | null => {
  console.info("[parseKiCadLegacyLib] Parsing legacy rectangle primitive");

  if (args.length < 7) {
    return null;
  }

  const x1 = parseNumber(args[0]);
  const y1 = parseNumber(args[1]);
  const x2 = parseNumber(args[2]);
  const y2 = parseNumber(args[3]);
  const thickness = parseNumber(args[5]);
  const { fill } = parseFill(args[6] ?? "N");

  return {
    type: "rect",
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
    strokeWidth: Math.max(thickness / 10, 1),
    fill,
  };
};

const parseCircle = (args: string[]): SymbolGraphic | null => {
  console.info("[parseKiCadLegacyLib] Parsing legacy circle primitive");

  if (args.length < 6) {
    return null;
  }

  const cx = parseNumber(args[0]);
  const cy = parseNumber(args[1]);
  const radius = parseNumber(args[2]);
  const thickness = parseNumber(args[4]);
  const { fill } = parseFill(args[5] ?? "N");

  return {
    type: "circle",
    cx,
    cy,
    r: radius,
    strokeWidth: Math.max(thickness / 10, 1),
    fill,
  };
};

const parseArc = (args: string[]): SymbolGraphic | null => {
  console.info("[parseKiCadLegacyLib] Parsing legacy arc primitive");

  if (args.length < 13) {
    return null;
  }

  const cx = parseNumber(args[0]);
  const cy = parseNumber(args[1]);
  const radius = parseNumber(args[2]);
  const thickness = parseNumber(args[7]);
  const startX = parseNumber(args[9]);
  const startY = parseNumber(args[10]);
  const endX = parseNumber(args[11]);
  const endY = parseNumber(args[12]);

  return {
    type: "arc",
    cx,
    cy,
    r: radius,
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    strokeWidth: Math.max(thickness / 10, 1),
  };
};

const parseText = (args: string[]): SymbolGraphic | null => {
  console.info("[parseKiCadLegacyLib] Parsing legacy text primitive");

  if (args.length < 5) {
    return null;
  }

  const rotation = parseNumber(args[0]);
  const x = parseNumber(args[1]);
  const y = parseNumber(args[2]);
  const size = parseNumber(args[3]);
  const text = unquote(args.slice(4).join(" "));

  return {
    type: "text",
    x,
    y,
    text,
    size: Math.max(size / 10, 12),
    rotation,
  };
};

const parsePin = (args: string[]): SymbolPin | null => {
  console.info("[parseKiCadLegacyLib] Parsing legacy pin primitive");

  if (args.length < 10) {
    return null;
  }

  const name = unquote(args[0]);
  const number = unquote(args[1]);
  const x = parseNumber(args[2]);
  const y = parseNumber(args[3]);
  const length = parseNumber(args[4]);
  const orientation = parseOrientation(args[5]);
  const electricalType = args[9];
  const shape = args[10] ?? "";

  return {
    number,
    name,
    x,
    y,
    length,
    orientation,
    electricalType,
    hidden: shape.toUpperCase().includes("N"),
  };
};

const collectGraphicPoints = (graphic: SymbolGraphic): Point[] => {
  switch (graphic.type) {
    case "line":
      return [graphic.start, graphic.end];
    case "rect":
      return [
        { x: graphic.x, y: graphic.y },
        { x: graphic.x + graphic.width, y: graphic.y + graphic.height },
      ];
    case "circle":
      return [
        { x: graphic.cx - graphic.r, y: graphic.cy - graphic.r },
        { x: graphic.cx + graphic.r, y: graphic.cy + graphic.r },
      ];
    case "polyline":
      return graphic.points;
    case "arc":
      return [graphic.start, graphic.end, { x: graphic.cx, y: graphic.cy }];
    case "text": {
      const halfSize = (graphic.size ?? 32) / 2;
      return [
        { x: graphic.x - halfSize, y: graphic.y - halfSize },
        { x: graphic.x + halfSize, y: graphic.y + halfSize },
      ];
    }
    default:
      return [];
  }
};

const calculateBounds = (graphics: SymbolGraphic[], pins: SymbolPin[]) => {
  console.info("[parseKiCadLegacyLib] Calculating symbol bounds", {
    graphicCount: graphics.length,
    pinCount: pins.length,
  });

  const points: Point[] = [
    ...graphics.flatMap(collectGraphicPoints),
    ...pins
      .filter((pin) => !pin.hidden)
      .flatMap((pin) => {
        const direction = PIN_DIR[pin.orientation];
        return [
          { x: pin.x, y: pin.y },
          {
            x: pin.x + direction.x * pin.length,
            y: pin.y + direction.y * pin.length,
          },
        ];
      }),
  ];

  if (points.length === 0) {
    return { minX: -50, minY: -50, maxX: 50, maxY: 50 };
  }

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
};

type PartialLegacySymbol = {
  name: string;
  referencePrefix?: string;
  value?: string;
  footprint?: string;
  datasheet?: string;
  description?: string;
  keywords: string[];
  graphics: SymbolGraphic[];
  pins: SymbolPin[];
};

const finalizeSymbol = (partial: PartialLegacySymbol, libraryName: string): LibrarySymbol => {
  console.info("[parseKiCadLegacyLib] Finalizing parsed legacy symbol", {
    name: partial.name,
    libraryName,
  });

  const symbol: LibrarySymbol = {
    id: buildSymbolId("kicad-lib", libraryName, partial.name),
    source: "kicad-lib",
    libraryName,
    name: partial.name,
    description: partial.description,
    keywords: partial.keywords,
    referencePrefix: partial.referencePrefix,
    footprint: partial.footprint,
    datasheet: partial.datasheet,
    graphics: partial.graphics,
    pins: partial.pins,
    bounds: calculateBounds(partial.graphics, partial.pins),
    importedAt: Date.now(),
  };

  // Validate pin body geometry using shared helper.
  symbol.pins.forEach((pin) => {
    getPinBodyPoint(pin);
  });

  return symbol;
};

const parseFieldLine = (command: string, args: string[], partial: PartialLegacySymbol) => {
  if (command === "F0" && args.length > 0) {
    partial.referencePrefix = unquote(args[0]).replace(/\d+$/, "").trim() || undefined;
    return;
  }

  if (command === "F1" && args.length > 0) {
    partial.value = unquote(args[0]);
    return;
  }

  if (command === "F2" && args.length > 0) {
    partial.footprint = unquote(args[0]);
    return;
  }

  if (command === "F3" && args.length > 0) {
    partial.datasheet = unquote(args[0]);
  }
};

const parseDrawPrimitive = (
  command: string,
  args: string[],
  partial: PartialLegacySymbol,
): SymbolGraphic | null => {
  switch (command) {
    case "S":
      return parseRectangle(args);
    case "C":
      return parseCircle(args);
    case "P":
      return parsePolyline(args);
    case "A":
      return parseArc(args);
    case "T":
      return parseText(args);
    case "X": {
      const pin = parsePin(args);
      if (pin) {
        partial.pins.push(pin);
      }
      return null;
    }
    default:
      return null;
  }
};

export const parseKiCadLegacyLib = (content: string, libraryName: string): LegacyLibParseResult => {
  console.info("[parseKiCadLegacyLib] Parsing legacy KiCad library file", { libraryName });

  const symbols: LibrarySymbol[] = [];
  const errors: string[] = [];
  let skipped = 0;

  let current: PartialLegacySymbol | undefined;
  let inDraw = false;

  const lines = content.split(/\r?\n/);

  const resetCurrent = () => {
    current = undefined;
    inDraw = false;
  };

  lines.forEach((rawLine, lineIndex) => {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("$")) {
      return;
    }

    const tokens = tokenizeLegacyLine(trimmed);
    if (tokens.length === 0) {
      return;
    }

    const command = tokens[0];

    try {
      if (command === "DEF") {
        if (tokens.length < 2) {
          skipped += 1;
          errors.push(`Line ${lineIndex + 1}: malformed DEF`);
          return;
        }

        current = {
          name: unquote(tokens[1]),
          keywords: [],
          graphics: [],
          pins: [],
        };
        inDraw = false;
        return;
      }

      if (!current) {
        return;
      }

      if (command === "DRAW") {
        inDraw = true;
        return;
      }

      if (command === "ENDDRAW") {
        inDraw = false;
        return;
      }

      if (command === "ENDDEF") {
        if (current.graphics.length === 0 && current.pins.length === 0) {
          skipped += 1;
          errors.push(`Symbol "${current.name}" skipped: no graphics or pins`);
        } else {
          symbols.push(finalizeSymbol(current, libraryName));
        }
        resetCurrent();
        return;
      }

      if (command === "ALIAS") {
        const aliases = tokens.slice(1).map(unquote).filter(Boolean);
        current.keywords.push(...aliases);
        return;
      }

      if (command.startsWith("F")) {
        parseFieldLine(command, tokens.slice(1), current);
        return;
      }

      if (!inDraw) {
        return;
      }

      const graphic = parseDrawPrimitive(command, tokens.slice(1), current);
      if (graphic) {
        current.graphics.push(graphic);
      }
    } catch (error) {
      skipped += 1;
      const message = error instanceof Error ? error.message : "Unknown parse error";
      errors.push(`Line ${lineIndex + 1}: ${message}`);
    }
  });

  if (current) {
    skipped += 1;
    errors.push(`Symbol "${current.name}" missing ENDDEF`);
  }

  return {
    symbols,
    skipped,
    errors,
  };
};

export default parseKiCadLegacyLib;
