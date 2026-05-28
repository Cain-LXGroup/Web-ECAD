import type { PointerEvent as ReactPointerEvent } from "react";

import { useLongPress } from "../hooks/useLongPress";
import type { Bus } from "../library/types";
import { schematicColorVar } from "../theme/schematicTheme";

type BusViewProps = {
  bus: Bus;
  selected?: boolean;
  netHighlighted?: boolean;
  onPointerDown?: (event: ReactPointerEvent<SVGElement>) => void;
  onLongPress?: (event: ReactPointerEvent<SVGElement>) => void;
};

export const BusView = ({
  bus,
  selected = false,
  netHighlighted = false,
  onPointerDown,
  onLongPress,
}: BusViewProps) => {
  console.info("[BusView] Rendering bus", { busId: bus.id, pointCount: bus.points.length, selected });

  const longPressHandlers = useLongPress(
    (event) => {
      event.stopPropagation();
      onLongPress?.(event);
    },
    { disabled: !onLongPress },
  );

  if (bus.points.length < 2) {
    return null;
  }

  const polyline = bus.points.map((point) => `${point.x},${point.y}`).join(" ");
  const stroke = netHighlighted
    ? schematicColorVar("netHighlight")
    : selected
      ? schematicColorVar("selection")
      : schematicColorVar("busStroke");

  return (
    <polyline
      points={polyline}
      fill="none"
      stroke={stroke}
      strokeWidth={selected || netHighlighted ? 10 : 8}
      strokeLinecap="round"
      strokeLinejoin="round"
      onPointerDown={(event) => {
        longPressHandlers.onPointerDown(event);
        onPointerDown?.(event);
      }}
      onPointerMove={longPressHandlers.onPointerMove}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerCancel={longPressHandlers.onPointerCancel}
    />
  );
};

export default BusView;
