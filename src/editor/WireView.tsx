import type { PointerEvent as ReactPointerEvent } from "react";

import { useLongPress } from "../hooks/useLongPress";
import type { Wire } from "../library/types";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";

type WireViewProps = {
  wire: Wire;
  selected?: boolean;
  dashed?: boolean;
  onPointerDown?: (event: ReactPointerEvent<SVGElement>) => void;
  onLongPress?: (event: ReactPointerEvent<SVGElement>) => void;
};

export const WireView = ({
  wire,
  selected = false,
  dashed = false,
  onPointerDown,
  onLongPress,
}: WireViewProps) => {
  console.info("[WireView] Rendering wire", { wireId: wire.id, pointCount: wire.points.length, selected });

  const points = wire.points.map((point) => `${point.x},${point.y}`).join(" ");

  const longPressHandlers = useLongPress(
    (event) => {
      event.stopPropagation();
      onLongPress?.(event);
    },
    { disabled: !onLongPress },
  );

  return (
    <>
      <polyline
        points={points}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
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
      <polyline
        points={points}
        fill="none"
        stroke={selected ? kicadSchematicTheme.wireSelected : kicadSchematicTheme.wire}
        strokeWidth={selected ? 6 : 4}
        strokeDasharray={dashed ? "14 10" : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
    </>
  );
};

export default WireView;
