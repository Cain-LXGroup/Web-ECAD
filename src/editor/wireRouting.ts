import type {
  LibrarySymbol,
  Point,
  SchematicProject,
  SymbolInstance,
  Wire,
  WireConnection,
} from "../library/types";

const dedupeConsecutivePoints = (points: Point[]): Point[] => {
  console.info("[wireRouting] Deduplicating consecutive points", { pointCount: points.length });

  return points.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const previousPoint = points[index - 1];
    return previousPoint.x !== point.x || previousPoint.y !== point.y;
  });
};

const removeCollinearPoints = (points: Point[]): Point[] => {
  console.info("[wireRouting] Removing collinear points", { pointCount: points.length });

  if (points.length <= 2) {
    return points;
  }

  const nextPoints: Point[] = [points[0]];

  for (let pointIndex = 1; pointIndex < points.length - 1; pointIndex += 1) {
    const previousPoint = nextPoints[nextPoints.length - 1];
    const currentPoint = points[pointIndex];
    const nextPoint = points[pointIndex + 1];

    const isVertical = previousPoint.x === currentPoint.x && currentPoint.x === nextPoint.x;
    const isHorizontal = previousPoint.y === currentPoint.y && currentPoint.y === nextPoint.y;

    if (!isVertical && !isHorizontal) {
      nextPoints.push(currentPoint);
    }
  }

  nextPoints.push(points[points.length - 1]);
  return nextPoints;
};

export const routeOrthogonalSegment = (draft: Point[], nextPoint: Point): Point[] => {
  console.info("[wireRouting] Routing orthogonal wire segment", {
    draftLength: draft.length,
    nextPoint,
  });

  if (draft.length === 0) {
    return [nextPoint];
  }

  const lastPoint = draft[draft.length - 1];
  if (lastPoint.x === nextPoint.x || lastPoint.y === nextPoint.y) {
    return normalizeWirePoints([...draft, nextPoint]);
  }

  return normalizeWirePoints([
    ...draft,
    {
      x: nextPoint.x,
      y: lastPoint.y,
    },
    nextPoint,
  ]);
};

export const normalizeWirePoints = (points: Point[]): Point[] => {
  console.info("[wireRouting] Normalizing wire point list", { pointCount: points.length });

  return removeCollinearPoints(dedupeConsecutivePoints(points));
};

const rotatePoint = (point: Point, rotation: SymbolInstance["rotation"]): Point => {
  console.info("[wireRouting] Rotating point for symbol transform", { point, rotation });

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

const transformSymbolPointToCanvas = (instance: SymbolInstance, localPoint: Point): Point => {
  console.info("[wireRouting] Transforming symbol-local point to canvas", {
    instanceId: instance.id,
    localPoint,
  });

  const mirroredPoint = {
    x: instance.mirrored ? -localPoint.x : localPoint.x,
    y: -localPoint.y,
  };
  const rotatedPoint = rotatePoint(mirroredPoint, instance.rotation);

  return {
    x: instance.x + rotatedPoint.x,
    y: instance.y + rotatedPoint.y,
  };
};

export const resolveWireConnectionPoint = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  connection: WireConnection,
): Point | undefined => {
  console.info("[wireRouting] Resolving wire connection point", { connection });

  const instance = project.symbols.find((symbol) => symbol.id === connection.symbolInstanceId);
  if (!instance) {
    return undefined;
  }

  const symbol = symbolIndex[instance.symbolId];
  if (!symbol) {
    return undefined;
  }

  const pin = symbol.pins.find((candidatePin) => candidatePin.number === connection.pinNumber && !candidatePin.hidden);
  if (!pin) {
    return undefined;
  }

  return transformSymbolPointToCanvas(instance, {
    x: pin.x,
    y: pin.y,
  });
};

export const findNearestWireConnection = (
  point: Point,
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  tolerance: number,
): { connection: WireConnection; point: Point } | undefined => {
  console.info("[wireRouting] Finding nearest wire connection", { point, tolerance });

  let bestMatch:
    | {
        connection: WireConnection;
        point: Point;
        distanceSquared: number;
      }
    | undefined;

  project.symbols.forEach((instance) => {
    const symbol = symbolIndex[instance.symbolId];
    if (!symbol) {
      return;
    }

    symbol.pins
      .filter((pin) => !pin.hidden)
      .forEach((pin) => {
        const candidatePoint = transformSymbolPointToCanvas(instance, {
          x: pin.x,
          y: pin.y,
        });
        const dx = candidatePoint.x - point.x;
        const dy = candidatePoint.y - point.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared > tolerance * tolerance) {
          return;
        }

        if (!bestMatch || distanceSquared < bestMatch.distanceSquared) {
          bestMatch = {
            connection: {
              symbolInstanceId: instance.id,
              pinNumber: pin.number,
            },
            point: candidatePoint,
            distanceSquared,
          };
        }
      });
  });

  if (!bestMatch) {
    return undefined;
  }

  return {
    connection: bestMatch.connection,
    point: bestMatch.point,
  };
};

export const findNearestWireSegmentPoint = (
  point: Point,
  project: SchematicProject,
  tolerance: number,
  excludedWireIds: string[] = [],
): { wireId: string; point: Point } | undefined => {
  console.info("[wireRouting] Finding nearest wire segment point", {
    point,
    tolerance,
    excludedWireIds,
  });

  let bestMatch:
    | {
        wireId: string;
        point: Point;
        distanceSquared: number;
      }
    | undefined;

  project.wires.forEach((wire) => {
    if (excludedWireIds.includes(wire.id)) {
      return;
    }

    for (let pointIndex = 0; pointIndex < wire.points.length - 1; pointIndex += 1) {
      const startPoint = wire.points[pointIndex];
      const endPoint = wire.points[pointIndex + 1];

      let projectedPoint: Point | undefined;

      if (startPoint.x === endPoint.x) {
        const minY = Math.min(startPoint.y, endPoint.y);
        const maxY = Math.max(startPoint.y, endPoint.y);
        projectedPoint = {
          x: startPoint.x,
          y: Math.min(Math.max(point.y, minY), maxY),
        };
      } else if (startPoint.y === endPoint.y) {
        const minX = Math.min(startPoint.x, endPoint.x);
        const maxX = Math.max(startPoint.x, endPoint.x);
        projectedPoint = {
          x: Math.min(Math.max(point.x, minX), maxX),
          y: startPoint.y,
        };
      }

      if (!projectedPoint) {
        continue;
      }

      const dx = projectedPoint.x - point.x;
      const dy = projectedPoint.y - point.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared > tolerance * tolerance) {
        continue;
      }

      if (!bestMatch || distanceSquared < bestMatch.distanceSquared) {
        bestMatch = {
          wireId: wire.id,
          point: projectedPoint,
          distanceSquared,
        };
      }
    }
  });

  if (!bestMatch) {
    return undefined;
  }

  return {
    wireId: bestMatch.wireId,
    point: bestMatch.point,
  };
};

export const buildAutoRoute = (startPoint: Point, endPoint: Point): Point[] => {
  console.info("[wireRouting] Building auto-routed wire path", { startPoint, endPoint });

  if (startPoint.x === endPoint.x || startPoint.y === endPoint.y) {
    return [startPoint, endPoint];
  }

  const deltaX = Math.abs(endPoint.x - startPoint.x);
  const deltaY = Math.abs(endPoint.y - startPoint.y);

  if (deltaX >= deltaY) {
    return normalizeWirePoints([
      startPoint,
      {
        x: endPoint.x,
        y: startPoint.y,
      },
      endPoint,
    ]);
  }

  return normalizeWirePoints([
    startPoint,
    {
      x: startPoint.x,
      y: endPoint.y,
    },
    endPoint,
  ]);
};

const applyManualStartConnection = (points: Point[], nextStartPoint: Point): Point[] => {
  console.info("[wireRouting] Applying manual start connection adjustment", {
    pointCount: points.length,
    nextStartPoint,
  });

  if (points.length <= 1) {
    return [nextStartPoint];
  }

  const [currentStartPoint, nextPoint, ...restPoints] = points;
  if (nextStartPoint.x === nextPoint.x || nextStartPoint.y === nextPoint.y) {
    return normalizeWirePoints([nextStartPoint, nextPoint, ...restPoints]);
  }

  const firstSegmentWasHorizontal = currentStartPoint.y === nextPoint.y;
  const elbowPoint = firstSegmentWasHorizontal
    ? { x: nextPoint.x, y: nextStartPoint.y }
    : { x: nextStartPoint.x, y: nextPoint.y };

  return normalizeWirePoints([nextStartPoint, elbowPoint, nextPoint, ...restPoints]);
};

const applyManualEndConnection = (points: Point[], nextEndPoint: Point): Point[] => {
  console.info("[wireRouting] Applying manual end connection adjustment", {
    pointCount: points.length,
    nextEndPoint,
  });

  if (points.length <= 1) {
    return [nextEndPoint];
  }

  const restPoints = points.slice(0, -2);
  const previousPoint = points[points.length - 2];
  const currentEndPoint = points[points.length - 1];

  if (nextEndPoint.x === previousPoint.x || nextEndPoint.y === previousPoint.y) {
    return normalizeWirePoints([...restPoints, previousPoint, nextEndPoint]);
  }

  const lastSegmentWasHorizontal = previousPoint.y === currentEndPoint.y;
  const elbowPoint = lastSegmentWasHorizontal
    ? { x: previousPoint.x, y: nextEndPoint.y }
    : { x: nextEndPoint.x, y: previousPoint.y };

  return normalizeWirePoints([...restPoints, previousPoint, elbowPoint, nextEndPoint]);
};

export const applyWireConnections = (
  wire: Wire,
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
): Wire => {
  console.info("[wireRouting] Applying stored wire connections", {
    wireId: wire.id,
    routingMode: wire.routingMode ?? "manual",
  });

  const nextStartPoint = wire.startConnection
    ? resolveWireConnectionPoint(project, symbolIndex, wire.startConnection)
    : undefined;
  const nextEndPoint = wire.endConnection
    ? resolveWireConnectionPoint(project, symbolIndex, wire.endConnection)
    : undefined;
  const nextRoutingMode = wire.routingMode ?? "manual";

  const nextWire: Wire = {
    ...wire,
    startConnection: nextStartPoint ? wire.startConnection : undefined,
    endConnection: nextEndPoint ? wire.endConnection : undefined,
    routingMode: nextRoutingMode,
  };

  if (nextRoutingMode === "auto") {
    const startPoint = nextStartPoint ?? nextWire.points[0];
    const endPoint = nextEndPoint ?? nextWire.points[nextWire.points.length - 1];

    return {
      ...nextWire,
      points: buildAutoRoute(startPoint, endPoint),
    };
  }

  let nextPoints = [...nextWire.points];

  if (nextStartPoint) {
    nextPoints = applyManualStartConnection(nextPoints, nextStartPoint);
  }

  if (nextEndPoint) {
    nextPoints = applyManualEndConnection(nextPoints, nextEndPoint);
  }

  return {
    ...nextWire,
    points: normalizeWirePoints(nextPoints),
  };
};

export const getWireJunctionPoints = (wires: Wire[]): Point[] => {
  console.info("[wireRouting] Calculating wire junction points", { wireCount: wires.length });

  const junctionPoints = new Map<string, Point>();

  wires.forEach((wire) => {
    if (wire.startWireId) {
      const startPoint = wire.points[0];
      junctionPoints.set(`${startPoint.x}:${startPoint.y}`, startPoint);
    }

    if (wire.endWireId) {
      const endPoint = wire.points[wire.points.length - 1];
      junctionPoints.set(`${endPoint.x}:${endPoint.y}`, endPoint);
    }
  });

  return Array.from(junctionPoints.values());
};
