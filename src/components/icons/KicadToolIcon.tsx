import type { BottomToolbarAction } from "../../app/routes";

const KICAD_ICON_MAP: Record<BottomToolbarAction, string> = {
  select: "cursor",
  wire: "add_line",
  label: "add_label",
  text: "text",
  rotate: "rotate_cw",
  mirror: "mirror_v",
  delete: "delete_cursor",
  pan: "move",
};

const KICAD_ICON_LABELS: Record<BottomToolbarAction, string> = {
  select: "Select",
  wire: "Wire",
  label: "Net label",
  text: "Text",
  rotate: "Rotate",
  mirror: "Mirror",
  delete: "Delete",
  pan: "Pan",
};

const iconBaseUrl = `${import.meta.env.BASE_URL}icons/kicad/`;

type KicadToolIconProps = {
  tool: BottomToolbarAction;
  className?: string;
  size?: number;
};

export const KicadToolIcon = ({ tool, className = "", size = 24 }: KicadToolIconProps) => {
  console.info("[KicadToolIcon] Rendering KiCad tool icon", { tool, size });

  const iconName = KICAD_ICON_MAP[tool];

  return (
    <img
      className={`pointer-events-none select-none ${className}`}
      src={`${iconBaseUrl}${iconName}-dark.svg`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      aria-hidden
    />
  );
};

export const getKicadToolLabel = (tool: BottomToolbarAction): string => KICAD_ICON_LABELS[tool];

export default KicadToolIcon;
