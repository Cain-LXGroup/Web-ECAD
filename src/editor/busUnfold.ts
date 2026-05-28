import { v4 as uuidv4 } from "uuid";

import {
  busMemberCount,
  formatBusMemberName,
  formatBusNotation,
  parseBusNotation,
} from "../library/busNotation";
import type { Bus, LibrarySymbol, NetLabel, Point, SchematicProject } from "../library/types";
import { resolveNetLabelPlacement } from "./labelPlacement";
import { resolveWireConnectionPoint } from "./wireRouting";
import { snapPoint } from "./snapping";

export type BusUnfoldResult = {
  project: SchematicProject;
  memberLabelIds: string[];
  message: string;
};

export const unfoldBusOnSheet = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  bus: Bus,
  options?: { spacing?: number },
): BusUnfoldResult => {
  console.info("[busUnfold] Unfolding bus into member labels", { busId: bus.id, busText: bus.text });

  const parsed = parseBusNotation(bus.text);
  if (!parsed) {
    return {
      project,
      memberLabelIds: [],
      message: `Could not parse bus notation "${bus.text}". Use form like D[0..7].`,
    };
  }

  const gridSize = project.gridSize || 20;
  const spacing = options?.spacing ?? gridSize * 4;
  const anchor =
    bus.points.length > 0
      ? bus.points[Math.floor(bus.points.length / 2)]
      : bus.pinConnection
        ? resolveWireConnectionPoint(project, symbolIndex, bus.pinConnection)
        : undefined;

  if (!anchor) {
    return {
      project,
      memberLabelIds: [],
      message: "Bus has no anchor point for unfolding.",
    };
  }

  const busLabelId = `label-bus-${uuidv4()}`;
  const busLabel: NetLabel = {
    id: busLabelId,
    text: formatBusNotation(parsed.prefix, parsed.start, parsed.end),
    x: anchor.x,
    y: anchor.y - spacing,
    rotation: 0,
    mirrored: false,
    labelKind: "bus",
    labelScope: "sheet",
    wireId: bus.wireId,
    pinConnection: bus.pinConnection,
  };

  const memberCount = busMemberCount(parsed);
  const memberLabelIds: string[] = [];
  const memberLabels: NetLabel[] = [];
  const startX = anchor.x - ((memberCount - 1) * spacing) / 2;

  for (let offset = 0; offset < memberCount; offset += 1) {
    const memberIndex = parsed.start + offset;
    const memberPoint: Point = { x: startX + offset * spacing, y: anchor.y + spacing };
    const snapped = snapPoint(memberPoint, gridSize);
    const placement = resolveNetLabelPlacement(project, symbolIndex, undefined);

    const labelId = `label-member-${uuidv4()}`;
    memberLabelIds.push(labelId);
    memberLabels.push({
      id: labelId,
      text: formatBusMemberName(parsed.prefix, memberIndex),
      x: snapped.x,
      y: snapped.y,
      rotation: placement.rotation,
      mirrored: placement.mirrored,
      labelKind: "bus-member",
      labelScope: "sheet",
      busLabelId,
      busMemberIndex: memberIndex,
    });
  }

  const existingBusLabel = project.netLabels.find(
    (label) => label.labelKind === "bus" && label.text === busLabel.text,
  );

  return {
    project: {
      ...project,
      netLabels: [
        ...project.netLabels.filter((label) => label.id !== existingBusLabel?.id),
        existingBusLabel ?? busLabel,
        ...memberLabels,
      ],
    },
    memberLabelIds,
    message: `Unfolded ${memberCount} bus members for ${busLabel.text}.`,
  };
};
