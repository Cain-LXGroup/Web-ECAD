import type { PointerEvent as ReactPointerEvent } from "react";

import type { Point, Wire } from "../library/types";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";

export type WireNodeSelection = {
  wireId: string;
  pointIndex: number;
};

type WireNodeHandlesProps = {
  wire: Wire;
  selectedNode?: WireNodeSelection;
  onNodePointerDown: (pointIndex: number, event: ReactPointerEvent<SVGCircleElement>) => void;
  onNodeDoubleClick?: (pointIndex: number) => void;
};

const NODE_RADIUS = 14;
const SELECTED_NODE_RADIUS = 18;

export const WireNodeHandles = ({
  wire,
  selectedNode,
  onNodePointerDown,
  onNodeDoubleClick,
}: WireNodeHandlesProps) => {
  console.info("[WireNodeHandles] Rendering wire node handles", {
    wireId: wire.id,
    pointCount: wire.points.length,
    selectedNode,
  });

  return (
    <g aria-label="Wire nodes">
      {wire.points.map((point: Point, pointIndex) => {
        const isSelected =
          selectedNode?.wireId === wire.id && selectedNode.pointIndex === pointIndex;
        const canDelete = wire.points.length > 2;

        return (
          <g key={`${wire.id}-node-${pointIndex}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={NODE_RADIUS + 8}
              fill="transparent"
              onPointerDown={(event) => {
                event.stopPropagation();
                onNodePointerDown(pointIndex, event);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                if (canDelete) {
                  onNodeDoubleClick?.(pointIndex);
                }
              }}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={isSelected ? SELECTED_NODE_RADIUS : NODE_RADIUS}
              fill={isSelected ? kicadSchematicTheme.selection : "rgba(34, 211, 238, 0.92)"}
              stroke={isSelected ? "#ffffff" : "#0f172a"}
              strokeWidth={isSelected ? 4 : 3}
              pointerEvents="none"
            />
            {isSelected && canDelete ? (
              <text
                x={point.x}
                y={point.y - 28}
                textAnchor="middle"
                fill="rgba(226, 232, 240, 0.95)"
                fontSize={22}
                fontFamily={kicadSchematicTheme.fontFamily}
                fontWeight={600}
                pointerEvents="none"
              >
                Double-tap to remove
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
};

export default WireNodeHandles;
