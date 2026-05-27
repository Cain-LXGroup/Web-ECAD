import type { SchematicProject } from "../library/types";
import { BubbleButton } from "./ui/BubbleButton";
import { GlassPanel } from "./ui/GlassPanel";
import { glassPanelInset } from "./ui/uiStyles";

type ProjectPanelProps = {
  projects: SchematicProject[];
  activeProjectId?: string;
  activeProjectName: string;
  onActiveProjectNameChange: (name: string) => void;
  onCreateProject: () => void;
  onDuplicateProject: () => void;
  onSaveProject: () => void;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
};

export const ProjectPanel = ({
  projects,
  activeProjectId,
  activeProjectName,
  onActiveProjectNameChange,
  onCreateProject,
  onDuplicateProject,
  onSaveProject,
  onSelectProject,
  onDeleteProject,
}: ProjectPanelProps) => {
  console.info("[ProjectPanel] Rendering project panel", {
    projectCount: projects.length,
    activeProjectId,
  });

  return (
    <GlassPanel>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Projects</h3>
          <p className="mt-1 text-sm text-slate-400">Save and reload template projects from IndexedDB.</p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          {projects.length} total
        </span>
      </div>

      <label className="mb-3 block">
        <span className="mb-2 block text-sm font-medium text-slate-300">Active Project Name</span>
        <input
          className={`w-full px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60 ${glassPanelInset}`}
          value={activeProjectName}
          onChange={(event) => onActiveProjectNameChange(event.target.value)}
          placeholder="Untitled Project"
        />
      </label>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <BubbleButton variant="secondary" className="w-full" onClick={onCreateProject}>
          New
        </BubbleButton>
        <BubbleButton variant="primary" className="w-full" onClick={onSaveProject}>
          Save
        </BubbleButton>
        <BubbleButton variant="secondary" className="w-full" onClick={onDuplicateProject}>
          Duplicate
        </BubbleButton>
        <div className={`px-4 py-3 text-sm text-slate-400 ${glassPanelInset}`}>Load below</div>
      </div>

      <div className={`max-h-64 overflow-y-auto ${glassPanelInset}`}>
        {projects.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">Create your first template project to start saving local drafts.</div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {projects.map((project) => {
              const selected = project.id === activeProjectId;

              return (
                <li key={project.id} className={selected ? "bg-cyan-500/10" : ""}>
                  <div className="flex items-center gap-2 p-3">
                    <button
                      className="min-w-0 flex-1 touch-manipulation rounded-2xl px-3 py-3 text-left hover:bg-slate-900"
                      type="button"
                      onClick={() => onSelectProject(project.id)}
                    >
                      <p className="truncate text-sm font-semibold text-white">{project.name}</p>
                      <p className="text-xs text-slate-500">
                        Updated {new Date(project.updatedAt).toLocaleString()}
                      </p>
                    </button>
                    <button
                      className="touch-manipulation rounded-2xl border border-slate-700 px-3 py-3 text-sm text-slate-300 hover:bg-slate-900"
                      type="button"
                      onClick={() => onDeleteProject(project.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </GlassPanel>
  );
};

export default ProjectPanel;
