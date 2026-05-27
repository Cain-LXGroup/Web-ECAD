import { v4 as uuidv4 } from "uuid";

import type { SchematicProject, SchematicSheet } from "../library/types";

export const DEFAULT_SHEET_ID = "sheet-default";

export const normalizeProject = (project: SchematicProject): SchematicProject => {
  console.info("[projectSheets] Normalizing project sheet structure", { projectId: project.id });

  if (project.sheets && project.sheets.length > 0) {
    const activeSheet =
      project.sheets.find((sheet) => sheet.id === project.activeSheetId) ?? project.sheets[0];

    return {
      ...project,
      activeSheetId: activeSheet.id,
      symbols: activeSheet.symbols,
      wires: activeSheet.wires,
      netLabels: activeSheet.netLabels,
      textNotes: activeSheet.textNotes,
    };
  }

  const legacySheet: SchematicSheet = {
    id: DEFAULT_SHEET_ID,
    name: "Sheet 1",
    symbols: project.symbols ?? [],
    wires: project.wires ?? [],
    netLabels: project.netLabels ?? [],
    textNotes: project.textNotes ?? [],
  };

  return {
    ...project,
    sheets: [legacySheet],
    activeSheetId: DEFAULT_SHEET_ID,
    symbols: legacySheet.symbols,
    wires: legacySheet.wires,
    netLabels: legacySheet.netLabels,
    textNotes: legacySheet.textNotes,
  };
};

export const getActiveSheetId = (project: SchematicProject, preferredId?: string): string => {
  const normalized = normalizeProject(project);
  if (preferredId && normalized.sheets.some((sheet) => sheet.id === preferredId)) {
    return preferredId;
  }

  return normalized.activeSheetId ?? normalized.sheets[0]?.id ?? DEFAULT_SHEET_ID;
};

export const getProjectView = (project: SchematicProject, sheetId: string): SchematicProject => {
  console.info("[projectSheets] Building flat project view for sheet", { projectId: project.id, sheetId });

  const normalized = normalizeProject(project);
  const sheet = normalized.sheets.find((candidate) => candidate.id === sheetId) ?? normalized.sheets[0];

  return {
    ...normalized,
    activeSheetId: sheet.id,
    symbols: sheet.symbols,
    wires: sheet.wires,
    netLabels: sheet.netLabels,
    textNotes: sheet.textNotes,
  };
};

export const commitSheetContent = (
  project: SchematicProject,
  sheetId: string,
  content: Pick<SchematicSheet, "symbols" | "wires" | "netLabels" | "textNotes">,
): SchematicProject => {
  console.info("[projectSheets] Committing sheet content", { projectId: project.id, sheetId });

  const normalized = normalizeProject(project);

  return {
    ...normalized,
    updatedAt: Date.now(),
    symbols: content.symbols,
    wires: content.wires,
    netLabels: content.netLabels,
    textNotes: content.textNotes,
    sheets: normalized.sheets.map((sheet) =>
      sheet.id === sheetId
        ? {
            ...sheet,
            symbols: content.symbols,
            wires: content.wires,
            netLabels: content.netLabels,
            textNotes: content.textNotes,
          }
        : sheet,
    ),
  };
};

export const createDefaultSheet = (name = "Sheet 1"): SchematicSheet => {
  console.info("[projectSheets] Creating default sheet", { name });

  return {
    id: `sheet-${uuidv4()}`,
    name,
    symbols: [],
    wires: [],
    netLabels: [],
    textNotes: [],
  };
};

export const addSheetToProject = (project: SchematicProject, name?: string): SchematicProject => {
  console.info("[projectSheets] Adding sheet to project", { projectId: project.id, name });

  const normalized = normalizeProject(project);
  const nextSheet = createDefaultSheet(name ?? `Sheet ${normalized.sheets.length + 1}`);

  return {
    ...normalized,
    sheets: [...normalized.sheets, nextSheet],
    activeSheetId: nextSheet.id,
    symbols: nextSheet.symbols,
    wires: nextSheet.wires,
    netLabels: nextSheet.netLabels,
    textNotes: nextSheet.textNotes,
  };
};

export const renameSheet = (project: SchematicProject, sheetId: string, name: string): SchematicProject => {
  console.info("[projectSheets] Renaming sheet", { projectId: project.id, sheetId, name });

  const normalized = normalizeProject(project);

  return {
    ...normalized,
    sheets: normalized.sheets.map((sheet) => (sheet.id === sheetId ? { ...sheet, name } : sheet)),
  };
};
