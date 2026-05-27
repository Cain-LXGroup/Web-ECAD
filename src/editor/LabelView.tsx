import type { PointerEvent as ReactPointerEvent } from "react";

import { useLongPress } from "../hooks/useLongPress";
import type { NetLabel, TextNote } from "../library/types";
import {
  DEFAULT_SCHEMATIC_TEXT_SIZE,
  getNetLabelFontSize,
  getTextNoteFontSize,
} from "./schematicTextSizing";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";

type LabelViewProps = {
  item: NetLabel | TextNote;
  selected?: boolean;
  netHighlighted?: boolean;
  variant: "net-label" | "text-note";
  schematicTextSize?: number;
  onPointerDown?: (event: ReactPointerEvent<SVGElement>) => void;
  onLongPress?: (event: ReactPointerEvent<SVGElement>) => void;
};

const hasRotation = (item: NetLabel | TextNote): item is NetLabel => {
  console.info("[LabelView] Checking whether item has rotation metadata", { itemId: item.id });

  return "rotation" in item;
};

export const LabelView = ({
  item,
  selected = false,
  netHighlighted = false,
  variant,
  schematicTextSize = DEFAULT_SCHEMATIC_TEXT_SIZE,
  onPointerDown,
  onLongPress,
}: LabelViewProps) => {
  console.info("[LabelView] Rendering label-like item", {
    itemId: item.id,
    variant,
    selected,
    netHighlighted,
    schematicTextSize,
  });

  const netLabel = variant === "net-label" ? (item as NetLabel) : undefined;
  const scopeSuffix =
    netLabel?.labelScope === "global" ? " ⬡" : netLabel?.labelScope === "sheet" ? " ▫" : "";
  const displayText = variant === "net-label" ? `${item.text}${scopeSuffix}` : item.text;

  const fill = variant === "net-label" ? kicadSchematicTheme.netLabel : kicadSchematicTheme.textNote;
  const fontSize =
    variant === "net-label"
      ? getNetLabelFontSize(schematicTextSize)
      : getTextNoteFontSize(schematicTextSize);
  const labelHeight = Math.round(fontSize * 1.12);
  const backgroundFill = selected
    ? "rgba(154, 212, 255, 0.16)"
    : netHighlighted
      ? "rgba(250, 204, 21, 0.2)"
      : "rgba(32, 34, 40, 0.92)";

  const longPressHandlers = useLongPress(
    (event) => {
      event.stopPropagation();
      onLongPress?.(event);
    },
    { disabled: !onLongPress },
  );

  return (
    <g
      transform={`translate(${item.x} ${item.y}) rotate(${hasRotation(item) ? item.rotation : 0})`}
      onPointerDown={(event) => {
        longPressHandlers.onPointerDown(event);
        onPointerDown?.(event);
      }}
      onPointerMove={longPressHandlers.onPointerMove}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerCancel={longPressHandlers.onPointerCancel}
    >
      <rect
        x={-16}
        y={-labelHeight * 0.6}
        width={displayText.length * (fontSize * 0.54) + 32}
        height={labelHeight}
        rx={16}
        fill={backgroundFill}
        stroke={selected ? kicadSchematicTheme.selection : netHighlighted ? "rgba(250, 204, 21, 0.9)" : "#4b5563"}
        strokeWidth={2}
      />
      <text x={0} y={0} fill={fill} fontSize={fontSize} fontFamily={kicadSchematicTheme.fontFamily} fontWeight={700} dominantBaseline="middle">
        {displayText}
      </text>
    </g>
  );
};

export default LabelView;
