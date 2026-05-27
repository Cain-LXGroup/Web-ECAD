import type { SchematicProject } from "../library/types";
import { BubbleButton } from "./ui/BubbleButton";
import { GlassPanel } from "./ui/GlassPanel";
import { chromeBody, chromeInput, chromeLabel, chromeTitle, glassPanelInset } from "./ui/uiStyles";

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
          <h3 className={chromeTitle}>Projects</h3>
          <p className={`mt-1 ${chromeBody}`}>Save and reload template projects from IndexedDB.</p>
        </div>
        <span className="rounded-full border border-[var(--chrome-border)] px-3 py-1 text-xs text-[var(--chrome-muted)]">
          {projects.length} total
        </span>
      </div>

      <label className="mb-3 block">
        <span className={`mb-2 block ${chromeLabel}`}>Active Project Name</span>
        <input
          className={chromeInput}
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
        <div className={`px-4 py-3 text-sm text-[var(--chrome-muted)] ${glassPanelInset}`}>Load below</div>
      </div>

      <div className={`max-h-64 overflow-y-auto ${glassPanelInset}`}>
        {projects.length === 0 ? (
          <div className="p-4 text-sm text-[var(--chrome-faint)]">
            Create your first template project to start saving local drafts.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--chrome-list-divider)]">
            {projects.map((project) => {
              const selected = project.id === activeProjectId;

              return (
                <li key={project.id} className={selected ? "bg-[var(--chrome-list-selected)]" : ""}>
                  <div className="flex items-center gap-2 p-3">
                    <button
                      className="min-w-0 flex-1 touch-manipulation rounded-2xl px-3 py-3 text-left hover:bg-[var(--chrome-list-hover)]"
                      type="button"
                      onClick={() => onSelectProject(project.id)}
                    >
                      <p className="truncate text-sm font-semibold text-[var(--chrome-heading)]">{project.name}</p>
                      <p className="text-xs text-[var(--chrome-faint)]">
                        Updated {new Date(project.updatedAt).toLocaleString()}
                      </p>
                    </button>
                    <button
                      className="touch-manipulation rounded-2xl border border-[var(--chrome-border)] px-3 py-3 text-sm text-[var(--chrome-muted)] hover:bg-[var(--chrome-list-hover)]"
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
