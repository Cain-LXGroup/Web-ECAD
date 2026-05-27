import type { ReactNode } from "react";

import { BubbleButton } from "./ui/BubbleButton";
import { glassDock } from "./ui/uiStyles";

type ToolbarProps = {
  projectName: string;
  statusMessage: string;
  onSaveProject: () => void;
  workspaceMenu?: ReactNode;
};

export const Toolbar = ({
  projectName,
  statusMessage,
  onSaveProject,
  workspaceMenu,
}: ToolbarProps) => {
  console.info("[Toolbar] Rendering top toolbar", { projectName });

  return (
    <header className="relative z-50 shrink-0 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className={`mx-auto flex max-w-[1800px] flex-col gap-2 p-3 ${glassDock} lg:flex-row lg:items-center lg:justify-between`}>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
            Schematic Tablet
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight text-white">{projectName}</h1>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <p className="max-w-xl truncate rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 lg:max-w-md">
            {statusMessage}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {workspaceMenu}
            <BubbleButton variant="primary" className="!py-2.5" onClick={onSaveProject}>
              Save
            </BubbleButton>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Toolbar;
