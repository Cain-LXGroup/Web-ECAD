import type { BottomToolbarAction } from "../../app/routes";

const KICAD_ICON_MAP: Record<BottomToolbarAction, string> = {
  select: "cursor",
  wire: "add_line",
  bus: "add_line",
  "label-global": "add_label",
  "label-sheet": "add_label",
  "label-hierarchical": "add_label",
  "label-bus": "add_label",
  "sheet-pin": "add_line",
  text: "text",
};

const KICAD_ICON_LABELS: Record<BottomToolbarAction, string> = {
  select: "Select",
  wire: "Wire",
  bus: "Bus",
  "label-global": "Global net label",
  "label-sheet": "Sheet net label",
  "label-hierarchical": "Hierarchical label",
  "label-bus": "Bus label",
  "sheet-pin": "Sheet pin",
  text: "Text",
};

const iconBaseUrl = `${import.meta.env.BASE_URL}icons/kicad/`;

type KicadToolIconProps = {
  tool: BottomToolbarAction;
  className?: string;
  size?: number;
  theme?: "dark" | "light";
};

export const KicadToolIcon = ({
  tool,
  className = "",
  size = 24,
  theme = "dark",
}: KicadToolIconProps) => {
  console.info("[KicadToolIcon] Rendering KiCad tool icon", { tool, size, theme });

  const iconName = KICAD_ICON_MAP[tool];
  const suffix = theme === "light" ? "" : "-dark";

  return (
    <img
      className={`pointer-events-none select-none ${className}`}
      src={`${iconBaseUrl}${iconName}${suffix}.svg`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      aria-hidden
    />
  );
};

export const getKicadToolLabel = (tool: BottomToolbarAction): string => KICAD_ICON_LABELS[tool];

export type ContextActionIcon = "rotate" | "mirror" | "delete" | "zoom" | "edit" | "text";

const CONTEXT_ICON_MAP: Record<ContextActionIcon, string> = {
  rotate: "rotate_cw",
  mirror: "mirror_v",
  delete: "delete_cursor",
  zoom: "move",
  edit: "text",
  text: "text",
};

const CONTEXT_ICON_LABELS: Record<ContextActionIcon, string> = {
  rotate: "Rotate",
  mirror: "Mirror",
  delete: "Delete",
  zoom: "Zoom to selection",
  edit: "Edit symbol text",
  text: "Add text",
};

type KicadContextIconProps = {
  action: ContextActionIcon;
  className?: string;
  size?: number;
  theme?: "dark" | "light";
};

export const KicadContextIcon = ({
  action,
  className = "",
  size = 24,
  theme = "dark",
}: KicadContextIconProps) => {
  console.info("[KicadContextIcon] Rendering KiCad context icon", { action, size, theme });

  const iconName = CONTEXT_ICON_MAP[action];
  const suffix = theme === "light" ? "" : "-dark";

  return (
    <img
      className={`pointer-events-none select-none ${className}`}
      src={`${iconBaseUrl}${iconName}${suffix}.svg`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      aria-hidden
    />
  );
};

export const getKicadContextLabel = (action: ContextActionIcon): string => CONTEXT_ICON_LABELS[action];

export default KicadToolIcon;
