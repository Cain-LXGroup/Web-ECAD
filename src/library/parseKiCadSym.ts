import { buildSymbolId } from "./normalizeSymbol";
import {
  findChildLists,
  isSExprList,
  parseSExpr,
  sExprAtom,
  sExprHead,
  type SExpr,
} from "./sexpr";
import type {
  LibrarySymbol,
  Point,
  SymbolGraphic,
  SymbolPin,
  SymbolPinOrientation,
} from "./types";

const MM_TO_LIB_UNITS = 100 / 2.54;

const scale = (value: number): number => value * MM_TO_LIB_UNITS;

const parseNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isUnitSymbolName = (name: string): boolean => /_\d+_\d+$/.test(name);

const angleToOrientation = (angle: number): SymbolPinOrientation => {
  const normalized = ((angle % 360) + 360) % 360;

  if (normalized === 90) {
    return "U";
  }

  if (normalized === 180) {
    return "L";
  }

  if (normalized === 270) {
    return "D";
  }

  return "R";
};

const hasHideEffect = (expr: SExpr): boolean => {
  if (!isSExprList(expr)) {
    return false;
  }

  for (const effectsExpr of findChildLists(expr, "effects")) {
    if (findChildLists(effectsExpr, "hide").some((hideExpr) => sExprAtom(hideExpr, 1) === "yes")) {
      return true;
    }
  }

  return findChildLists(expr, "hide").some((hideExpr) => sExprAtom(hideExpr, 1) === "yes");
};

const getFillType = (expr: SExpr): "none" | "white" => {
  const fillLists = findChildLists(expr, "fill");

  for (const fill of fillLists) {
    const typeLists = findChildLists(fill, "type");

    for (const typeExpr of typeLists) {
      const fillType = sExprAtom(typeExpr, 1);

      if (fillType === "background" || fillType === "outline") {
        return "white";
      }
    }
  }

  return "none";
};

const getStrokeWidth = (expr: SExpr): number => {
  const strokeLists = findChildLists(expr, "stroke");

  for (const stroke of strokeLists) {
    const widthLists = findChildLists(stroke, "width");
    const rawWidth = widthLists[0] ? parseNumber(sExprAtom(widthLists[0], 1)) : 0;
    return rawWidth > 0 ? scale(rawWidth) : 2;
  }

  return 2;
};

const parseRectangle = (expr: SExpr): SymbolGraphic | null => {
  const startLists = findChildLists(expr, "start");
  const endLists = findChildLists(expr, "end");

  if (startLists.length === 0 || endLists.length === 0) {
    return null;
  }

  const x1 = scale(parseNumber(sExprAtom(startLists[0], 1)));
  const y1 = scale(parseNumber(sExprAtom(startLists[0], 2)));
  const x2 = scale(parseNumber(sExprAtom(endLists[0], 1)));
  const y2 = scale(parseNumber(sExprAtom(endLists[0], 2)));

  return {
    type: "rect",
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
    strokeWidth: getStrokeWidth(expr),
    fill: getFillType(expr),
  };
};

const parsePolyline = (expr: SExpr): SymbolGraphic | null => {
  const ptsLists = findChildLists(expr, "pts");

  if (ptsLists.length === 0) {
    return null;
  }

  const points: Point[] = [];

  for (const xy of findChildLists(ptsLists[0], "xy")) {
    points.push({
      x: scale(parseNumber(sExprAtom(xy, 1))),
      y: scale(parseNumber(sExprAtom(xy, 2))),
    });
  }

  if (points.length < 2) {
    return null;
  }

  const fill = getFillType(expr);
  const first = points[0];
  const last = points[points.length - 1];
  const closed = fill === "white" || (first.x === last.x && first.y === last.y);

  return {
    type: "polyline",
    points,
    strokeWidth: getStrokeWidth(expr),
    fill,
    closed,
  };
};

const parseCircle = (expr: SExpr): SymbolGraphic | null => {
  const centerLists = findChildLists(expr, "center");
  const radiusLists = findChildLists(expr, "radius");

  if (centerLists.length === 0 || radiusLists.length === 0) {
    return null;
  }

  return {
    type: "circle",
    cx: scale(parseNumber(sExprAtom(centerLists[0], 1))),
    cy: scale(parseNumber(sExprAtom(centerLists[0], 2))),
    r: scale(parseNumber(sExprAtom(radiusLists[0], 1))),
    strokeWidth: getStrokeWidth(expr),
    fill: getFillType(expr),
  };
};

const parsePin = (expr: SExpr): SymbolPin | null => {
  const atLists = findChildLists(expr, "at");
  const lengthLists = findChildLists(expr, "length");
  const nameLists = findChildLists(expr, "name");
  const numberLists = findChildLists(expr, "number");

  if (atLists.length === 0 || lengthLists.length === 0 || numberLists.length === 0) {
    return null;
  }

  const at = atLists[0];
  const angle = parseNumber(sExprAtom(at, 3));
  const orientation = angleToOrientation(angle);
  const length = scale(parseNumber(sExprAtom(lengthLists[0], 1)));
  const nameExpr = nameLists[0];
  const numberExpr = numberLists[0];
  const shape = sExprAtom(expr, 3);
  const pintypeLists = findChildLists(expr, "pintype");
  const positionalType = sExprAtom(expr, 1);
  const electricalType =
    pintypeLists.length > 0 ? sExprAtom(pintypeLists[0], 1) : positionalType;

  return {
    number: sExprAtom(numberExpr, 1),
    name: sExprAtom(nameExpr, 1),
    x: scale(parseNumber(sExprAtom(at, 1))),
    y: scale(parseNumber(sExprAtom(at, 2))),
    length,
    orientation,
    electricalType,
    hidden:
      shape.toLowerCase() === "invisible" || hasHideEffect(nameExpr) || hasHideEffect(numberExpr),
  };
};

const parseGraphic = (expr: SExpr): SymbolGraphic | null => {
  const head = sExprHead(expr);

  if (head === "rectangle") {
    return parseRectangle(expr);
  }

  if (head === "polyline") {
    return parsePolyline(expr);
  }

  if (head === "circle") {
    return parseCircle(expr);
  }

  return null;
};

const collectGraphicPoints = (graphic: SymbolGraphic): Point[] => {
  switch (graphic.type) {
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
    default:
      return [];
  }
};

const calculateBounds = (graphics: SymbolGraphic[], pins: SymbolPin[]) => {
  const pinDirections: Record<SymbolPinOrientation, Point> = {
    R: { x: 1, y: 0 },
    L: { x: -1, y: 0 },
    U: { x: 0, y: 1 },
    D: { x: 0, y: -1 },
  };

  const points: Point[] = [
    ...graphics.flatMap(collectGraphicPoints),
    ...pins
      .filter((pin) => !pin.hidden)
      .flatMap((pin) => {
        const direction = pinDirections[pin.orientation];
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
    return { minX: -100, minY: -100, maxX: 100, maxY: 100 };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

const parsePropertyMap = (expr: SExpr): Record<string, string> => {
  const properties: Record<string, string> = {};

  for (const propertyExpr of findChildLists(expr, "property")) {
    const key = sExprAtom(propertyExpr, 1);
    const value = sExprAtom(propertyExpr, 2);

    if (key) {
      properties[key] = value;
    }
  }

  return properties;
};

const parseDrawingUnit = (expr: SExpr): { graphics: SymbolGraphic[]; pins: SymbolPin[] } => {
  const graphics: SymbolGraphic[] = [];
  const pins: SymbolPin[] = [];

  if (!isSExprList(expr)) {
    return { graphics, pins };
  }

  for (const child of expr.slice(1)) {
    if (!isSExprList(child)) {
      continue;
    }

    const head = sExprHead(child);

    if (head === "pin") {
      const pin = parsePin(child);

      if (pin) {
        pins.push(pin);
      }
      continue;
    }

    const graphic = parseGraphic(child);

    if (graphic) {
      graphics.push(graphic);
    }
  }

  return { graphics, pins };
};

const finalizeSymbol = (
  name: string,
  libraryName: string,
  properties: Record<string, string>,
  graphics: SymbolGraphic[],
  pins: SymbolPin[],
): LibrarySymbol => {
  const keywords = (properties.ki_keywords ?? properties.Keywords ?? "")
    .split(/[\s,]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return {
    id: buildSymbolId("kicad-sym", libraryName, name),
    source: "kicad-sym",
    libraryName,
    name,
    description: properties.Description,
    keywords,
    referencePrefix: properties.Reference,
    footprint: properties.Footprint,
    datasheet: properties.Datasheet,
    properties,
    graphics,
    pins,
    bounds: calculateBounds(graphics, pins),
    importedAt: Date.now(),
  };
};

export const parseKiCadSym = (content: string, libraryName: string): LibrarySymbol[] => {
  console.info("[parseKiCadSym] Parsing modern KiCad symbol library", { libraryName });

  const root = parseSExpr(content);

  if (!isSExprList(root) || sExprHead(root) !== "kicad_symbol_lib") {
    return [];
  }

  const symbolBlocks = findChildLists(root, "symbol");
  const parsedSymbols: LibrarySymbol[] = [];

  for (const symbolExpr of symbolBlocks) {
    const symbolName = sExprAtom(symbolExpr, 1);

    if (!symbolName || isUnitSymbolName(symbolName)) {
      continue;
    }

    const properties = parsePropertyMap(symbolExpr);
    const graphics: SymbolGraphic[] = [];
    const pins: SymbolPin[] = [];
    const unitBlocks = findChildLists(symbolExpr, "symbol");
    const drawingBlocks = unitBlocks.length > 0 ? unitBlocks : [symbolExpr];

    for (const drawingBlock of drawingBlocks) {
      const parsedUnit = parseDrawingUnit(drawingBlock);
      graphics.push(...parsedUnit.graphics);
      pins.push(...parsedUnit.pins);
    }

    if (graphics.length === 0 && pins.length === 0) {
      continue;
    }

    parsedSymbols.push(finalizeSymbol(symbolName, libraryName, properties, graphics, pins));
  }

  return parsedSymbols;
};

export default parseKiCadSym;
