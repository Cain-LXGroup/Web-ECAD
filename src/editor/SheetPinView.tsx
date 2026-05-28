import type { PointerEvent as ReactPointerEvent } from "react";

import type { SheetPin } from "../library/types";
import { schematicColorVar } from "../theme/schematicTheme";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";

type SheetPinViewProps = {
  pin: SheetPin;
  selected?: boolean;
  netHighlighted?: boolean;
  schematicTextSize?: number;
  onPointerDown?: (event: ReactPointerEvent<SVGElement>) => void;
};

const directionGlyph = (direction: SheetPin["direction"]): string => {
  switch (direction) {
    case "input":
      return "◁";
    case "output":
      return "▷";
    default:
      return "◆";
  }
};

export const SheetPinView = ({
  pin,
  selected = false,
  netHighlighted = false,
  schematicTextSize = 1,
  onPointerDown,
}: SheetPinViewProps) => {
  console.info("[SheetPinView] Rendering sheet pin", { pinId: pin.id, pinName: pin.name, selected });

  const fontSize = Math.round(28 * schematicTextSize);
  const stroke = netHighlighted
    ? schematicColorVar("netHighlight")
    : selected
      ? schematicColorVar("selection")
      : schematicColorVar("hierarchicalPin");

  return (
    <g
      transform={`translate(${pin.x} ${pin.y}) rotate(${pin.rotation})`}
      onPointerDown={onPointerDown}
    >
      <polygon
        points="-18,-12 18,0 -18,12"
        fill={schematicColorVar("hierarchicalPinFill")}
        stroke={stroke}
        strokeWidth={selected ? 3 : 2}
      />
      <text
        x={28}
        y={6}
        fontSize={fontSize}
        fill={schematicColorVar("hierarchicalPin")}
        fontFamily={kicadSchematicTheme.fontFamily}
        fontWeight={600}
      >
        {directionGlyph(pin.direction)} {pin.name}
      </text>
    </g>
  );
};

export default SheetPinView;
