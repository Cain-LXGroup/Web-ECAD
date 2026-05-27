import type { PointerEvent as ReactPointerEvent } from "react";

import { useLongPress } from "../hooks/useLongPress";
import type { NetLabel, TextNote } from "../library/types";
import {
  DEFAULT_SCHEMATIC_TEXT_SIZE,
  getNetLabelFontSize,
  getTextNoteFontSize,
} from "./schematicTextSizing";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";
import { schematicColorVar } from "../theme/schematicTheme";

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
  const rotation = hasRotation(item) ? item.rotation : 0;
  const mirrored = netLabel?.mirrored ?? false;

  const fill =
    variant === "net-label" ? schematicColorVar("netLabel") : schematicColorVar("textNote");
  const fontSize =
    variant === "net-label"
      ? getNetLabelFontSize(schematicTextSize)
      : getTextNoteFontSize(schematicTextSize);
  const labelWidth = displayText.length * (fontSize * 0.54) + 32;
  const labelHeight = Math.round(fontSize * 1.12);
  const backgroundFill = selected
    ? schematicColorVar("labelSelectionBackground")
    : netHighlighted
      ? schematicColorVar("netHighlightFill")
      : schematicColorVar("labelBackground");

  const longPressHandlers = useLongPress(
    (event) => {
      event.stopPropagation();
      onLongPress?.(event);
    },
    { disabled: !onLongPress },
  );

  const anchorOffsetX = (() => {
    switch (rotation) {
      case 90:
        return mirrored ? labelWidth * 0.5 - 16 : 16 - labelWidth * 0.5;
      case 270:
        return mirrored ? 16 - labelWidth * 0.5 : labelWidth * 0.5 - 16;
      case 180:
        return mirrored ? 16 : -labelWidth + 16;
      default:
        return mirrored ? -labelWidth + 16 : 16;
    }
  })();

  return (
    <g
      transform={`translate(${item.x} ${item.y}) rotate(${rotation}) scale(${mirrored ? -1 : 1} 1)`}
      onPointerDown={(event) => {
        longPressHandlers.onPointerDown(event);
        onPointerDown?.(event);
      }}
      onPointerMove={longPressHandlers.onPointerMove}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerCancel={longPressHandlers.onPointerCancel}
    >
      <circle
        cx={anchorOffsetX}
        cy={0}
        r={5}
        fill={schematicColorVar("pinConnection")}
        stroke={schematicColorVar("junctionStroke")}
        strokeWidth={1}
        pointerEvents="none"
      />
      <rect
        x={anchorOffsetX}
        y={-labelHeight * 0.6}
        width={labelWidth}
        height={labelHeight}
        rx={16}
        fill={backgroundFill}
        stroke={
          selected
            ? schematicColorVar("selection")
            : netHighlighted
              ? schematicColorVar("netHighlight")
              : schematicColorVar("labelBorder")
        }
        strokeWidth={2}
      />
      <text
        x={anchorOffsetX + labelWidth * 0.5}
        y={0}
        fill={fill}
        fontSize={fontSize}
        fontFamily={kicadSchematicTheme.fontFamily}
        fontWeight={700}
        dominantBaseline="middle"
        textAnchor="middle"
      >
        {displayText}
      </text>
    </g>
  );
};

export default LabelView;
