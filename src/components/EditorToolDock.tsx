import { bottomToolbarActions, type BottomToolbarAction } from "../app/routes";
import { KicadToolIcon, getKicadToolLabel } from "./icons/KicadToolIcon";
import { glassDock, iconToolButtonActive, iconToolButtonIdle } from "./ui/uiStyles";

type EditorToolDockProps = {
  activeTool: BottomToolbarAction | string;
  onAction: (actionId: BottomToolbarAction) => void;
  className?: string;
  orientation?: "horizontal" | "vertical";
};

const isToolbarAction = (tool: string): tool is BottomToolbarAction => {
  return bottomToolbarActions.some((action) => action.id === tool);
};

export const EditorToolDock = ({
  activeTool,
  onAction,
  className = "",
  orientation = "horizontal",
}: EditorToolDockProps) => {
  console.info("[EditorToolDock] Rendering editor tool dock", { activeTool, orientation });

  const layoutClass = orientation === "vertical" ? "flex-col" : "flex-row items-center";

  return (
    <nav
      className={`${glassDock} flex gap-1 p-2 ${layoutClass} ${className}`}
      aria-label="Editor tools"
    >
      {bottomToolbarActions.map((action) => {
        const isActive = isToolbarAction(activeTool) && activeTool === action.id;
        const label = getKicadToolLabel(action.id);

        return (
          <button
            key={action.id}
            className={isActive ? iconToolButtonActive : iconToolButtonIdle}
            type="button"
            aria-label={label}
            title={label}
            onClick={() => onAction(action.id)}
          >
            <KicadToolIcon tool={action.id} size={26} />
          </button>
        );
      })}
    </nav>
  );
};

export default EditorToolDock;
