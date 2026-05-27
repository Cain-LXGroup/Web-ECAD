import { EditorToolDock } from "./EditorToolDock";
import type { BottomToolbarAction } from "../app/routes";
import type { ColorScheme } from "../hooks/useAppSettings";
import { glassDock, iconToolButtonIdle } from "./ui/uiStyles";

type EditorRightRailProps = {
  activeTool: BottomToolbarAction | string;
  onAction: (actionId: BottomToolbarAction) => void;
  favouritesOpen?: boolean;
  onToggleFavourites?: () => void;
  hidden?: boolean;
  theme?: ColorScheme;
};

export const EditorRightRail = ({
  activeTool,
  onAction,
  favouritesOpen = false,
  onToggleFavourites,
  hidden = false,
  theme = "dark",
}: EditorRightRailProps) => {
  console.info("[EditorRightRail] Rendering editor tool dock rail", { activeTool, hidden, favouritesOpen });

  if (hidden) {
    return null;
  }

  return (
    <nav
      className={`pointer-events-auto ${glassDock} flex flex-col gap-2 p-2`}
      aria-label="Editor tools"
    >
      <EditorToolDock
        activeTool={activeTool}
        onAction={onAction}
        orientation="vertical"
        theme={theme}
        className="!border-0 !bg-transparent !p-0 !shadow-none"
      />
      {onToggleFavourites ? (
        <button
          type="button"
          className={`${iconToolButtonIdle} ${favouritesOpen ? "!border-cyan-400/60 !bg-cyan-500/20" : ""}`}
          aria-label={favouritesOpen ? "Hide favourites" : "Show favourites"}
          title={favouritesOpen ? "Hide favourites" : "Show favourites"}
          onClick={onToggleFavourites}
        >
          <span className="text-xl leading-none" aria-hidden>
            {favouritesOpen ? "★" : "☆"}
          </span>
        </button>
      ) : null}
    </nav>
  );
};

export default EditorRightRail;
