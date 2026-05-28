import { useMemo } from "react";

import { listCrossSheetHierarchicalNets } from "../editor/electricalModel";
import type { SchematicProject } from "../library/types";
import { GlassPanel } from "./ui/GlassPanel";
import { chromeBody, chromeTitle } from "./ui/uiStyles";

type HierarchyPanelProps = {
  fullProject: SchematicProject;
};

export const HierarchyPanel = ({ fullProject }: HierarchyPanelProps) => {
  console.info("[HierarchyPanel] Rendering hierarchy panel", { projectId: fullProject.id });

  const hierarchicalNets = useMemo(
    () => listCrossSheetHierarchicalNets(fullProject),
    [fullProject],
  );

  return (
    <GlassPanel>
      <h2 className={chromeTitle}>Hierarchy</h2>
      <p className={`mt-2 ${chromeBody}`}>
        Hierarchical labels (⇄) and sheet pins connect across sheets when they share the same net name.
      </p>
      {hierarchicalNets.length === 0 ? (
        <p className="mt-3 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-panel-soft)] px-3 py-2 text-sm text-[var(--chrome-muted)]">
          No hierarchical nets yet. Add sheet pins and hierarchical labels with matching names on each sheet.
        </p>
      ) : (
        <ul className="mt-3 max-h-[min(40vh,360px)] space-y-2 overflow-y-auto pr-1">
          {hierarchicalNets.map((entry) => (
            <li
              key={entry.name}
              className="rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-panel-soft)] px-3 py-2"
            >
              <p className="text-sm font-semibold text-[var(--chrome-text)]">{entry.name}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-[var(--chrome-muted)]">
                {entry.occurrences.map((occurrence) => (
                  <li key={`${entry.name}-${occurrence}`}>{occurrence}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
};

export default HierarchyPanel;
