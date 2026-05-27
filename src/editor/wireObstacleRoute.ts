import { getPinDirection } from "../library/symbolGeometry";
import type {
  LibrarySymbol,
  Point,
  SchematicProject,
  SymbolInstance,
  WireConnection,
} from "../library/types";
import { snapPoint } from "./snapping";
import { normalizeWirePoints, transformSymbolPointToCanvas } from "./wireRouting";

export type ObstacleRect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  instanceId: string;
};

export type AutoRouteContext = {
  project: SchematicProject;
  symbolIndex: Record<string, LibrarySymbol>;
  gridSize: number;
  routeClearancePx?: number;
  startConnection?: WireConnection;
  endConnection?: WireConnection;
};

const DEFAULT_CLEARANCE_MULTIPLIER = 4;
const MIN_CLEARANCE = 120;
const PIN_EXIT_MULTIPLIER = 3;
const MIN_PIN_EXIT = 100;

const rotatePoint = (point: Point, rotation: SymbolInstance["rotation"]): Point => {
  switch (rotation) {
    case 90:
      return { x: -point.y, y: point.x };
    case 180:
      return { x: -point.x, y: -point.y };
    case 270:
      return { x: point.y, y: -point.x };
    default:
      return point;
  }
};

const transformSymbolDirectionToCanvas = (instance: SymbolInstance, localDirection: Point): Point => {
  const mirroredDirection = {
    x: instance.mirrored ? -localDirection.x : localDirection.x,
    y: -localDirection.y,
  };

  return rotatePoint(mirroredDirection, instance.rotation);
};

const inflateRect = (rect: ObstacleRect, padding: number): ObstacleRect => ({
  minX: rect.minX - padding,
  minY: rect.minY - padding,
  maxX: rect.maxX + padding,
  maxY: rect.maxY + padding,
  instanceId: rect.instanceId,
});

export const getSymbolInstanceObstacleRect = (
  instance: SymbolInstance,
  symbol: LibrarySymbol,
  clearance: number,
): ObstacleRect => {
  console.info("[wireObstacleRoute] Building symbol obstacle rectangle", {
    instanceId: instance.id,
    clearance,
  });

  const corners: Point[] = [
    { x: symbol.bounds.minX, y: symbol.bounds.minY },
    { x: symbol.bounds.maxX, y: symbol.bounds.minY },
    { x: symbol.bounds.maxX, y: symbol.bounds.maxY },
    { x: symbol.bounds.minX, y: symbol.bounds.maxY },
  ].map((corner) => transformSymbolPointToCanvas(instance, corner));

  symbol.pins
    .filter((pin) => !pin.hidden)
    .forEach((pin) => {
      corners.push(transformSymbolPointToCanvas(instance, { x: pin.x, y: pin.y }));
    });

  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return inflateRect(
    {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
      instanceId: instance.id,
    },
    clearance,
  );
};

export const collectSymbolObstacles = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  gridSize: number,
  routeClearancePx?: number,
): ObstacleRect[] => {
  console.info("[wireObstacleRoute] Collecting symbol obstacles for auto-routing", {
    symbolCount: project.symbols.length,
    gridSize,
    routeClearancePx,
  });

  const clearance =
    routeClearancePx ?? Math.max(MIN_CLEARANCE, gridSize * DEFAULT_CLEARANCE_MULTIPLIER);

  return project.symbols.flatMap((instance) => {
    const symbol = symbolIndex[instance.symbolId];
    if (!symbol) {
      return [];
    }

    return [getSymbolInstanceObstacleRect(instance, symbol, clearance)];
  });
};

const pointInRect = (point: Point, rect: ObstacleRect, margin = 0): boolean =>
  point.x >= rect.minX - margin &&
  point.x <= rect.maxX + margin &&
  point.y >= rect.minY - margin &&
  point.y <= rect.maxY + margin;

const segmentsOverlap = (aMin: number, aMax: number, bMin: number, bMax: number): boolean =>
  Math.max(aMin, bMin) < Math.min(aMax, bMax);

const horizontalSegmentHitsRect = (start: Point, end: Point, rect: ObstacleRect): boolean => {
  const y = start.y;
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);

  if (y < rect.minY || y > rect.maxY) {
    return false;
  }

  return segmentsOverlap(minX, maxX, rect.minX, rect.maxX);
};

const verticalSegmentHitsRect = (start: Point, end: Point, rect: ObstacleRect): boolean => {
  const x = start.x;
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  if (x < rect.minX || x > rect.maxX) {
    return false;
  }

  return segmentsOverlap(minY, maxY, rect.minY, rect.maxY);
};

type SegmentObstacleOptions = {
  allowedBoundaryCrossingInstanceIds?: string[];
};

export const segmentIntersectsObstacle = (
  start: Point,
  end: Point,
  obstacles: ObstacleRect[],
  options: SegmentObstacleOptions = {},
): boolean => {
  if (start.x === end.x && start.y === end.y) {
    return false;
  }

  for (const obstacle of obstacles) {
    if (options.allowedBoundaryCrossingInstanceIds?.includes(obstacle.instanceId)) {
      const startInside = pointInRect(start, obstacle);
      const endInside = pointInRect(end, obstacle);
      if (startInside !== endInside) {
        continue;
      }
    }

    if (start.x === end.x) {
      if (verticalSegmentHitsRect(start, end, obstacle)) {
        return true;
      }
      continue;
    }

    if (start.y === end.y) {
      if (horizontalSegmentHitsRect(start, end, obstacle)) {
        return true;
      }
    }
  }

  return false;
};

export const pathIntersectsObstacles = (
  points: Point[],
  obstacles: ObstacleRect[],
  options: SegmentObstacleOptions = {},
): boolean => {
  for (let index = 0; index < points.length - 1; index += 1) {
    if (segmentIntersectsObstacle(points[index], points[index + 1], obstacles, options)) {
      return true;
    }
  }

  return false;
};

const pathLength = (points: Point[]): number => {
  let length = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    length += Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
  }

  return length;
};

const getPinExitPoint = (
  connection: WireConnection,
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  gridSize: number,
): Point | undefined => {
  console.info("[wireObstacleRoute] Calculating pin exit point", { connection });

  const instance = project.symbols.find((symbol) => symbol.id === connection.symbolInstanceId);
  if (!instance) {
    return undefined;
  }

  const symbol = symbolIndex[instance.symbolId];
  if (!symbol) {
    return undefined;
  }

  const pin = symbol.pins.find(
    (candidatePin) => candidatePin.number === connection.pinNumber && !candidatePin.hidden,
  );
  if (!pin) {
    return undefined;
  }

  const pinPoint = transformSymbolPointToCanvas(instance, { x: pin.x, y: pin.y });
  const direction = transformSymbolDirectionToCanvas(instance, getPinDirection(pin.orientation));
  const exitDistance = Math.max(MIN_PIN_EXIT, gridSize * PIN_EXIT_MULTIPLIER);

  return {
    x: pinPoint.x + direction.x * exitDistance,
    y: pinPoint.y + direction.y * exitDistance,
  };
};

const buildSimpleLRoute = (startPoint: Point, endPoint: Point, horizontalFirst: boolean): Point[] => {
  if (startPoint.x === endPoint.x || startPoint.y === endPoint.y) {
    return [startPoint, endPoint];
  }

  if (horizontalFirst) {
    return [startPoint, { x: endPoint.x, y: startPoint.y }, endPoint];
  }

  return [startPoint, { x: startPoint.x, y: endPoint.y }, endPoint];
};

const uniqueNumbers = (values: number[]): number[] => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = value.toFixed(2);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const generateCandidateRoutes = (
  startPoint: Point,
  endPoint: Point,
  obstacles: ObstacleRect[],
  gridSize: number,
): Point[][] => {
  console.info("[wireObstacleRoute] Generating candidate auto-routes", {
    obstacleCount: obstacles.length,
    gridSize,
  });

  const candidates: Point[][] = [
    buildSimpleLRoute(startPoint, endPoint, true),
    buildSimpleLRoute(startPoint, endPoint, false),
  ];

  const union = obstacles.reduce(
    (currentUnion, obstacle) => ({
      minX: Math.min(currentUnion.minX, obstacle.minX),
      minY: Math.min(currentUnion.minY, obstacle.minY),
      maxX: Math.max(currentUnion.maxX, obstacle.maxX),
      maxY: Math.max(currentUnion.maxY, obstacle.maxY),
    }),
    {
      minX: Math.min(startPoint.x, endPoint.x),
      minY: Math.min(startPoint.y, endPoint.y),
      maxX: Math.max(startPoint.x, endPoint.x),
      maxY: Math.max(startPoint.y, endPoint.y),
    },
  );

  const clearance = Math.max(MIN_CLEARANCE, gridSize * DEFAULT_CLEARANCE_MULTIPLIER);
  const midXs = uniqueNumbers([
    startPoint.x,
    endPoint.x,
    snapPoint({ x: (startPoint.x + endPoint.x) / 2, y: 0 }, gridSize).x,
    union.minX - clearance,
    union.maxX + clearance,
  ]);
  const midYs = uniqueNumbers([
    startPoint.y,
    endPoint.y,
    snapPoint({ x: 0, y: (startPoint.y + endPoint.y) / 2 }, gridSize).y,
    union.minY - clearance,
    union.maxY + clearance,
  ]);

  midXs.forEach((midX) => {
    candidates.push(
      normalizeWirePoints([
        startPoint,
        { x: midX, y: startPoint.y },
        { x: midX, y: endPoint.y },
        endPoint,
      ]),
    );
  });

  midYs.forEach((midY) => {
    candidates.push(
      normalizeWirePoints([
        startPoint,
        { x: startPoint.x, y: midY },
        { x: endPoint.x, y: midY },
        endPoint,
      ]),
    );
  });

  return candidates.map((candidate) => normalizeWirePoints(candidate));
};

type GridCoord = { gx: number; gy: number };

const routeWithAStar = (
  startPoint: Point,
  endPoint: Point,
  obstacles: ObstacleRect[],
  gridSize: number,
): Point[] => {
  console.info("[wireObstacleRoute] Running grid A* auto-route fallback", { gridSize });

  const start = snapPoint(startPoint, gridSize);
  const end = snapPoint(endPoint, gridSize);

  if (start.x === end.x && start.y === end.y) {
    return [startPoint, endPoint];
  }

  const searchBounds = obstacles.reduce(
    (bounds, obstacle) => ({
      minX: Math.min(bounds.minX, obstacle.minX),
      minY: Math.min(bounds.minY, obstacle.minY),
      maxX: Math.max(bounds.maxX, obstacle.maxX),
      maxY: Math.max(bounds.maxY, obstacle.maxY),
    }),
    {
      minX: Math.min(start.x, end.x),
      minY: Math.min(start.y, end.y),
      maxX: Math.max(start.x, end.x),
      maxY: Math.max(start.y, end.y),
    },
  );

  const margin = gridSize * 8;
  const minX = searchBounds.minX - margin;
  const minY = searchBounds.minY - margin;
  const maxX = searchBounds.maxX + margin;
  const maxY = searchBounds.maxY + margin;
  const columns = Math.max(2, Math.ceil((maxX - minX) / gridSize) + 1);
  const rows = Math.max(2, Math.ceil((maxY - minY) / gridSize) + 1);

  const toWorld = (coord: GridCoord): Point => ({
    x: minX + coord.gx * gridSize,
    y: minY + coord.gy * gridSize,
  });

  const toGrid = (point: Point): GridCoord => ({
    gx: Math.round((point.x - minX) / gridSize),
    gy: Math.round((point.y - minY) / gridSize),
  });

  const isBlocked = (coord: GridCoord): boolean => {
    const worldPoint = toWorld(coord);
    return obstacles.some((obstacle) => pointInRect(worldPoint, obstacle));
  };

  const startCoord = toGrid(start);
  const endCoord = toGrid(end);

  const key = (coord: GridCoord) => `${coord.gx}:${coord.gy}`;
  const open: Array<{ coord: GridCoord; f: number }> = [{ coord: startCoord, f: 0 }];
  const cameFrom = new Map<string, GridCoord>();
  const gScore = new Map<string, number>([[key(startCoord), 0]]);

  const heuristic = (coord: GridCoord): number =>
    Math.abs(coord.gx - endCoord.gx) + Math.abs(coord.gy - endCoord.gy);

  while (open.length > 0) {
    open.sort((left, right) => left.f - right.f);
    const current = open.shift()?.coord;
    if (!current) {
      break;
    }

    if (current.gx === endCoord.gx && current.gy === endCoord.gy) {
      const path: Point[] = [end];
      let cursor: GridCoord | undefined = current;

      while (cursor) {
        path.unshift(toWorld(cursor));
        const parent = cameFrom.get(key(cursor));
        cursor = parent;
      }

      path[0] = startPoint;
      path[path.length - 1] = endPoint;
      return normalizeWirePoints(path);
    }

    const neighbors: GridCoord[] = [
      { gx: current.gx + 1, gy: current.gy },
      { gx: current.gx - 1, gy: current.gy },
      { gx: current.gx, gy: current.gy + 1 },
      { gx: current.gx, gy: current.gy - 1 },
    ];

    neighbors.forEach((neighbor) => {
      if (
        neighbor.gx < 0 ||
        neighbor.gy < 0 ||
        neighbor.gx >= columns ||
        neighbor.gy >= rows ||
        (isBlocked(neighbor) &&
          !(neighbor.gx === endCoord.gx && neighbor.gy === endCoord.gy) &&
          !(neighbor.gx === startCoord.gx && neighbor.gy === startCoord.gy))
      ) {
        return;
      }

      const tentativeG = (gScore.get(key(current)) ?? Number.POSITIVE_INFINITY) + 1;
      const neighborKey = key(neighbor);

      if (tentativeG >= (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
        return;
      }

      cameFrom.set(neighborKey, current);
      gScore.set(neighborKey, tentativeG);
      open.push({ coord: neighbor, f: tentativeG + heuristic(neighbor) });
    });
  }

  return buildSimpleLRoute(startPoint, endPoint, true);
};

const getBoundaryCrossingInstanceIds = (context: AutoRouteContext): string[] => {
  const instanceIds: string[] = [];

  if (context.startConnection) {
    instanceIds.push(context.startConnection.symbolInstanceId);
  }

  if (context.endConnection) {
    instanceIds.push(context.endConnection.symbolInstanceId);
  }

  return instanceIds;
};

const chooseBestRoute = (
  startPoint: Point,
  endPoint: Point,
  obstacles: ObstacleRect[],
  gridSize: number,
  segmentOptions: SegmentObstacleOptions,
): Point[] => {
  const candidates = generateCandidateRoutes(startPoint, endPoint, obstacles, gridSize);
  let bestPath: Point[] | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    if (pathIntersectsObstacles(candidate, obstacles, segmentOptions)) {
      return;
    }

    const bendPenalty = Math.max(0, candidate.length - 2) * gridSize;
    const score = pathLength(candidate) + bendPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestPath = candidate;
    }
  });

  if (bestPath) {
    return bestPath;
  }

  return routeWithAStar(startPoint, endPoint, obstacles, gridSize);
};

export const buildObstacleAwareAutoRoute = (
  startPoint: Point,
  endPoint: Point,
  context: AutoRouteContext,
): Point[] => {
  console.info("[wireObstacleRoute] Building obstacle-aware auto route", {
    startPoint,
    endPoint,
    symbolCount: context.project.symbols.length,
  });

  const obstacles = collectSymbolObstacles(
    context.project,
    context.symbolIndex,
    context.gridSize,
    context.routeClearancePx,
  );
  const segmentOptions: SegmentObstacleOptions = {
    allowedBoundaryCrossingInstanceIds: getBoundaryCrossingInstanceIds(context),
  };
  let routeStart = startPoint;
  let routeEnd = endPoint;
  const prefix: Point[] = [startPoint];
  const suffix: Point[] = [];

  if (context.startConnection) {
    const exitPoint = getPinExitPoint(
      context.startConnection,
      context.project,
      context.symbolIndex,
      context.gridSize,
    );

    if (
      exitPoint &&
      (Math.abs(exitPoint.x - startPoint.x) > 1 || Math.abs(exitPoint.y - startPoint.y) > 1)
    ) {
      prefix.push(exitPoint);
      routeStart = exitPoint;
    }
  }

  if (context.endConnection) {
    const exitPoint = getPinExitPoint(
      context.endConnection,
      context.project,
      context.symbolIndex,
      context.gridSize,
    );

    if (
      exitPoint &&
      (Math.abs(exitPoint.x - endPoint.x) > 1 || Math.abs(exitPoint.y - endPoint.y) > 1)
    ) {
      suffix.unshift(endPoint);
      suffix.unshift(exitPoint);
      routeEnd = exitPoint;
    } else {
      suffix.unshift(endPoint);
    }
  } else {
    suffix.unshift(endPoint);
  }

  const stitchRoute = (coreRoute: Point[]): Point[] => {
    const tail = suffix.length > 1 ? suffix.slice(1) : [];
    return normalizeWirePoints([...prefix, ...coreRoute.slice(1), ...tail]);
  };

  const coreRoute = chooseBestRoute(routeStart, routeEnd, obstacles, context.gridSize, segmentOptions);
  const stitched = stitchRoute(coreRoute);

  if (!pathIntersectsObstacles(stitched, obstacles, segmentOptions)) {
    return stitched;
  }

  const fallback = routeWithAStar(routeStart, routeEnd, obstacles, context.gridSize);
  const fallbackStitched = stitchRoute(fallback);

  if (!pathIntersectsObstacles(fallbackStitched, obstacles, segmentOptions)) {
    return fallbackStitched;
  }

  return fallbackStitched;
};
