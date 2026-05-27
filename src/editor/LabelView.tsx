import type { PointerEvent as ReactPointerEvent } from "react";

import type { NetLabel, TextNote } from "../library/types";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";

type LabelViewProps = {
  item: NetLabel | TextNote;
  selected?: boolean;
  variant: "net-label" | "text-note";
  onPointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
};

const hasRotation = (item: NetLabel | TextNote): item is NetLabel => {
  console.info("[LabelView] Checking whether item has rotation metadata", { itemId: item.id });

  return "rotation" in item;
};

export const LabelView = ({ item, selected = false, variant, onPointerDown }: LabelViewProps) => {
  console.info("[LabelView] Rendering label-like item", { itemId: item.id, variant, selected });

  const fill = variant === "net-label" ? kicadSchematicTheme.netLabel : kicadSchematicTheme.textNote;
  const fontSize = variant === "net-label" ? 50 : 42;
  const backgroundFill = selected ? "rgba(154, 212, 255, 0.16)" : "rgba(32, 34, 40, 0.92)";

  return (
    <g
      transform={`translate(${item.x} ${item.y}) rotate(${hasRotation(item) ? item.rotation : 0})`}
      onPointerDown={onPointerDown}
    >
      <rect x={-16} y={-34} width={item.text.length * (fontSize * 0.54) + 32} height={56} rx={16} fill={backgroundFill} stroke={selected ? kicadSchematicTheme.selection : "#4b5563"} strokeWidth={2} />
      <text x={0} y={0} fill={fill} fontSize={fontSize} fontFamily={kicadSchematicTheme.fontFamily} fontWeight={700} dominantBaseline="middle">
        {item.text}
      </text>
    </g>
  );
};

export default LabelView;
