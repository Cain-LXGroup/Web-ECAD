import { EditorToolDock } from "./EditorToolDock";
import type { BottomToolbarAction } from "../app/routes";
import type { ColorScheme } from "../hooks/useAppSettings";
import { glassDock } from "./ui/uiStyles";

type EditorRightRailProps = {
  activeTool: BottomToolbarAction | string;
  onAction: (actionId: BottomToolbarAction) => void;
  hidden?: boolean;
  theme?: ColorScheme;
};

export const EditorRightRail = ({
  activeTool,
  onAction,
  hidden = false,
  theme = "dark",
}: EditorRightRailProps) => {
  console.info("[EditorRightRail] Rendering editor tool dock rail", { activeTool, hidden });

  if (hidden) {
    return null;
  }

  return (
    <nav
      className={`pointer-events-auto ${glassDock} p-2`}
      aria-label="Editor tools"
    >
      <EditorToolDock
        activeTool={activeTool}
        onAction={onAction}
        orientation="vertical"
        theme={theme}
        className="!border-0 !bg-transparent !p-0 !shadow-none"
      />
    </nav>
  );
};

export default EditorRightRail;
