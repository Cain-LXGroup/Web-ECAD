import type { PointerEvent as ReactPointerEvent } from "react";

import type { Wire } from "../library/types";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";

type WireViewProps = {
  wire: Wire;
  selected?: boolean;
  dashed?: boolean;
  onPointerDown?: (event: ReactPointerEvent<SVGPolylineElement>) => void;
};

export const WireView = ({ wire, selected = false, dashed = false, onPointerDown }: WireViewProps) => {
  console.info("[WireView] Rendering wire", { wireId: wire.id, pointCount: wire.points.length, selected });

  const points = wire.points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <>
      <polyline
        points={points}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        strokeLinecap="round"
        strokeLinejoin="round"
        onPointerDown={onPointerDown}
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
