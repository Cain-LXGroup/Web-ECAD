import { getPinBodyPoint } from "./symbolGeometry";
import { buildSymbolId } from "./normalizeSymbol";
import type { LibrarySymbol, Point, SymbolPin } from "./types";

const buildBounds = (graphicsPoints: Point[], pins: SymbolPin[]) => {
  console.info("[testSymbols] Building symbol bounds", {
    graphicPointCount: graphicsPoints.length,
    pinCount: pins.length,
  });

  const points = [
    ...graphicsPoints,
    ...pins.flatMap((pin) => [getPinBodyPoint(pin), { x: pin.x, y: pin.y }]),
  ];

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
};

const createSymbol = (
  name: string,
  referencePrefix: string,
  description: string,
  graphicsPoints: Point[],
  graphics: LibrarySymbol["graphics"],
  pins: SymbolPin[],
): LibrarySymbol => {
  console.info("[testSymbols] Creating manual test symbol", { name });

  return {
    id: buildSymbolId("manual", "starter-library", name),
    source: "manual",
    libraryName: "starter-library",
    name,
    description,
    keywords: [name, referencePrefix.toLowerCase(), "starter", "manual"],
    referencePrefix,
    graphics,
    pins,
    bounds: buildBounds(graphicsPoints, pins),
    importedAt: Date.now(),
  };
};

export const getTestSymbols = (): LibrarySymbol[] => {
  console.info("[testSymbols] Creating starter test symbol set");

  return [
    createSymbol(
      "resistor",
      "R",
      "Generic two-pin resistor used for editor interaction testing.",
      [
        { x: -120, y: 0 },
        { x: -80, y: 40 },
        { x: -40, y: -40 },
        { x: 0, y: 40 },
        { x: 40, y: -40 },
        { x: 80, y: 40 },
        { x: 120, y: 0 },
      ],
      [
        {
          type: "polyline",
          points: [
            { x: -120, y: 0 },
            { x: -80, y: 40 },
            { x: -40, y: -40 },
            { x: 0, y: 40 },
            { x: 40, y: -40 },
            { x: 80, y: 40 },
            { x: 120, y: 0 },
          ],
          strokeWidth: 2,
        },
      ],
      [
        { number: "1", name: "A", x: -220, y: 0, length: 100, orientation: "R" },
        { number: "2", name: "B", x: 220, y: 0, length: 100, orientation: "L" },
      ],
    ),
    createSymbol(
      "capacitor",
      "C",
      "Generic capacitor with two vertical plates.",
      [
        { x: -30, y: -70 },
        { x: -30, y: 70 },
        { x: 30, y: -70 },
        { x: 30, y: 70 },
      ],
      [
        {
          type: "line",
          start: { x: -30, y: -70 },
          end: { x: -30, y: 70 },
          strokeWidth: 2,
        },
        {
          type: "line",
          start: { x: 30, y: -70 },
          end: { x: 30, y: 70 },
          strokeWidth: 2,
        },
      ],
      [
        { number: "1", name: "A", x: -180, y: 0, length: 150, orientation: "R" },
        { number: "2", name: "B", x: 180, y: 0, length: 150, orientation: "L" },
      ],
    ),
    createSymbol(
      "diode",
      "D",
      "Generic diode symbol for placement and rotation testing.",
      [
        { x: -90, y: -80 },
        { x: -90, y: 80 },
        { x: 60, y: 0 },
        { x: 90, y: -90 },
        { x: 90, y: 90 },
      ],
      [
        {
          type: "polyline",
          points: [
            { x: -90, y: -80 },
            { x: -90, y: 80 },
            { x: 60, y: 0 },
            { x: -90, y: -80 },
          ],
          strokeWidth: 2,
        },
        {
          type: "line",
          start: { x: 90, y: -90 },
          end: { x: 90, y: 90 },
          strokeWidth: 2,
        },
      ],
      [
        { number: "1", name: "A", x: -210, y: 0, length: 120, orientation: "R" },
        { number: "2", name: "K", x: 210, y: 0, length: 120, orientation: "L" },
      ],
    ),
    createSymbol(
      "op-amp",
      "U",
      "Simple operational amplifier triangle.",
      [
        { x: -140, y: -140 },
        { x: -140, y: 140 },
        { x: 150, y: 0 },
      ],
      [
        {
          type: "polyline",
          points: [
            { x: -140, y: -140 },
            { x: -140, y: 140 },
            { x: 150, y: 0 },
            { x: -140, y: -140 },
          ],
          strokeWidth: 2,
        },
        {
          type: "text",
          x: -95,
          y: 60,
          text: "+",
          size: 42,
        },
        {
          type: "text",
          x: -95,
          y: -70,
          text: "-",
          size: 42,
        },
      ],
      [
        { number: "1", name: "IN-", x: -300, y: -70, length: 160, orientation: "R" },
        { number: "2", name: "IN+", x: -300, y: 70, length: 160, orientation: "R" },
        { number: "3", name: "OUT", x: 320, y: 0, length: 170, orientation: "L" },
      ],
    ),
    createSymbol(
      "connector-4",
      "J",
      "Four-pin connector block.",
      [
        { x: -120, y: -180 },
        { x: 120, y: 180 },
      ],
      [
        {
          type: "rect",
          x: -120,
          y: -180,
          width: 240,
          height: 360,
          strokeWidth: 2,
          fill: "none",
        },
        {
          type: "text",
          x: -40,
          y: 200,
          text: "J",
          size: 36,
        },
      ],
      [
        { number: "1", name: "P1", x: -260, y: 120, length: 140, orientation: "R" },
        { number: "2", name: "P2", x: -260, y: 40, length: 140, orientation: "R" },
        { number: "3", name: "P3", x: -260, y: -40, length: 140, orientation: "R" },
        { number: "4", name: "P4", x: -260, y: -120, length: 140, orientation: "R" },
      ],
    ),
    createSymbol(
      "ic-8",
      "U",
      "Generic eight-pin IC body.",
      [
        { x: -140, y: -220 },
        { x: 140, y: 220 },
      ],
      [
        {
          type: "rect",
          x: -140,
          y: -220,
          width: 280,
          height: 440,
          strokeWidth: 2,
          fill: "none",
        },
      ],
      [
        { number: "1", name: "IN1", x: -280, y: 150, length: 140, orientation: "R" },
        { number: "2", name: "IN2", x: -280, y: 50, length: 140, orientation: "R" },
        { number: "3", name: "IN3", x: -280, y: -50, length: 140, orientation: "R" },
        { number: "4", name: "GND", x: -280, y: -150, length: 140, orientation: "R" },
        { number: "5", name: "OUT1", x: 280, y: 150, length: 140, orientation: "L" },
        { number: "6", name: "OUT2", x: 280, y: 50, length: 140, orientation: "L" },
        { number: "7", name: "OUT3", x: 280, y: -50, length: 140, orientation: "L" },
        { number: "8", name: "VCC", x: 280, y: -150, length: 140, orientation: "L" },
      ],
    ),
    createSymbol(
      "ground",
      "G",
      "Ground reference symbol.",
      [
        { x: 0, y: 80 },
        { x: 0, y: -20 },
        { x: -80, y: -20 },
        { x: 80, y: -20 },
        { x: -55, y: -55 },
        { x: 55, y: -55 },
        { x: -30, y: -90 },
        { x: 30, y: -90 },
      ],
      [
        {
          type: "line",
          start: { x: 0, y: 80 },
          end: { x: 0, y: -20 },
          strokeWidth: 2,
        },
        {
          type: "line",
          start: { x: -80, y: -20 },
          end: { x: 80, y: -20 },
          strokeWidth: 2,
        },
        {
          type: "line",
          start: { x: -55, y: -55 },
          end: { x: 55, y: -55 },
          strokeWidth: 2,
        },
        {
          type: "line",
          start: { x: -30, y: -90 },
          end: { x: 30, y: -90 },
          strokeWidth: 2,
        },
      ],
      [{ number: "1", name: "GND", x: 0, y: 180, length: 100, orientation: "D" }],
    ),
    createSymbol(
      "vcc",
      "P",
      "Positive supply flag.",
      [
        { x: 0, y: 170 },
        { x: 0, y: 40 },
        { x: -90, y: 40 },
        { x: 90, y: 40 },
      ],
      [
        {
          type: "line",
          start: { x: 0, y: 170 },
          end: { x: 0, y: 40 },
          strokeWidth: 2,
        },
        {
          type: "polyline",
          points: [
            { x: 0, y: 40 },
            { x: -90, y: -80 },
            { x: 90, y: -80 },
            { x: 0, y: 40 },
          ],
          strokeWidth: 2,
          closed: true,
          fill: "none",
        },
      ],
      [{ number: "1", name: "VCC", x: 0, y: 270, length: 100, orientation: "D" }],
    ),
  ];
};
