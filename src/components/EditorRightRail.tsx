import type { ReactNode } from "react";

import { EditorToolDock } from "./EditorToolDock";
import type { BottomToolbarAction } from "../app/routes";
import { glassDock } from "./ui/uiStyles";

type EditorRightRailProps = {
  activeTool: BottomToolbarAction | string;
  onAction: (actionId: BottomToolbarAction) => void;
  wireTools?: ReactNode;
  hidden?: boolean;
};

export const EditorRightRail = ({ activeTool, onAction, wireTools, hidden = false }: EditorRightRailProps) => {
  console.info("[EditorRightRail] Rendering right editor rail", { activeTool, hidden });

  if (hidden) {
    return null;
  }

  return (
    <div
      className={`pointer-events-auto fixed right-[max(0.75rem,env(safe-area-inset-right))] top-1/2 z-50 flex max-h-[min(92svh,720px)] -translate-y-1/2 flex-col gap-2 p-2 ${glassDock}`}
      aria-label="Editor tools rail"
    >
      {wireTools ? <div className="flex flex-col gap-2">{wireTools}</div> : null}
      <EditorToolDock activeTool={activeTool} onAction={onAction} orientation="vertical" className="!border-0 !bg-transparent !p-0 !shadow-none" />
    </div>
  );
};

export default EditorRightRail;
