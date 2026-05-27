import type { ReactNode } from "react";

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
    <header className="relative z-50 shrink-0 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Schematic Tablet
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">{projectName}</h1>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300">
              Local-first PWA shell
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="max-w-xl rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 lg:max-w-md">
            {statusMessage}
          </p>
          {workspaceMenu}
          <button className="touch-manipulation rounded-2xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-400" type="button" onClick={onSaveProject}>
            Save
          </button>
        </div>
      </div>
    </header>
  );
};

export default Toolbar;
