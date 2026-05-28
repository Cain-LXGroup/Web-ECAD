import type { LibrarySymbol, Point, SchematicProject, WireConnection } from "../library/types";
import { resolveWireConnectionPoint } from "./wireRouting";

const DEFAULT_PIN_WIRE_TOLERANCE = 36;

const connectionsMatch = (
  left: WireConnection | undefined,
  right: WireConnection,
): boolean =>
  left?.symbolInstanceId === right.symbolInstanceId && left?.pinNumber === right.pinNumber;

const isPointNearPin = (point: Point, pinPoint: Point, tolerance: number): boolean => {
  const dx = point.x - pinPoint.x;
  const dy = point.y - pinPoint.y;
  return dx * dx + dy * dy <= tolerance * tolerance;
};

/** True when a pin is on a wire endpoint, explicit wire connection, or net label. */
export const isPinElectricallyConnected = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  connection: WireConnection,
  tolerance = DEFAULT_PIN_WIRE_TOLERANCE,
): boolean => {
  console.info("[pinConnectivity] Checking whether pin is electrically connected", { connection, tolerance });

  const pinPoint = resolveWireConnectionPoint(project, symbolIndex, connection);
  if (!pinPoint) {
    return false;
  }

  for (const wire of project.wires) {
    if (
      connectionsMatch(wire.startConnection, connection) ||
      connectionsMatch(wire.endConnection, connection)
    ) {
      return true;
    }

    if (wire.points.length === 0) {
      continue;
    }

    const wireEndpoints = [wire.points[0], wire.points[wire.points.length - 1]];
    if (wireEndpoints.some((endpoint) => isPointNearPin(endpoint, pinPoint, tolerance))) {
      return true;
    }
  }

  for (const label of project.netLabels) {
    if (connectionsMatch(label.pinConnection, connection)) {
      return true;
    }
  }

  return false;
};
