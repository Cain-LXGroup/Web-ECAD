import { v4 as uuidv4 } from "uuid";

import type { Bus, SchematicProject, SchematicSheet, SheetPin } from "../library/types";

export const DEFAULT_SHEET_ID = "sheet-default";

const emptyBuses = (): Bus[] => [];
const emptySheetPins = (): SheetPin[] => [];

const normalizeSheet = (sheet: SchematicSheet): SchematicSheet => ({
  ...sheet,
  buses: sheet.buses ?? emptyBuses(),
  sheetPins: sheet.sheetPins ?? emptySheetPins(),
});

export const normalizeProject = (project: SchematicProject): SchematicProject => {
  console.info("[projectSheets] Normalizing project sheet structure", { projectId: project.id });

  if (project.sheets && project.sheets.length > 0) {
    const sheets = project.sheets.map(normalizeSheet);
    const activeSheet = sheets.find((sheet) => sheet.id === project.activeSheetId) ?? sheets[0];

    return {
      ...project,
      sheets,
      activeSheetId: activeSheet.id,
      buses: activeSheet.buses,
      sheetPins: activeSheet.sheetPins,
      symbols: activeSheet.symbols,
      wires: activeSheet.wires,
      netLabels: activeSheet.netLabels,
      textNotes: activeSheet.textNotes,
    };
  }

  const legacySheet = normalizeSheet({
    id: DEFAULT_SHEET_ID,
    name: "Sheet 1",
    symbols: project.symbols ?? [],
    wires: project.wires ?? [],
    buses: project.buses ?? emptyBuses(),
    netLabels: project.netLabels ?? [],
    sheetPins: project.sheetPins ?? emptySheetPins(),
    textNotes: project.textNotes ?? [],
  });

  return {
    ...project,
    sheets: [legacySheet],
    activeSheetId: DEFAULT_SHEET_ID,
    buses: legacySheet.buses,
    sheetPins: legacySheet.sheetPins,
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
  const sheet = normalizeSheet(
    normalized.sheets.find((candidate) => candidate.id === sheetId) ?? normalized.sheets[0],
  );

  return {
    ...normalized,
    activeSheetId: sheet.id,
    symbols: sheet.symbols,
    wires: sheet.wires,
    buses: sheet.buses,
    netLabels: sheet.netLabels,
    sheetPins: sheet.sheetPins,
    textNotes: sheet.textNotes,
  };
};

export const commitSheetContent = (
  project: SchematicProject,
  sheetId: string,
  content: Pick<SchematicSheet, "symbols" | "wires" | "buses" | "netLabels" | "sheetPins" | "textNotes">,
): SchematicProject => {
  console.info("[projectSheets] Committing sheet content", { projectId: project.id, sheetId });

  const normalized = normalizeProject(project);
  const normalizedContent = {
    symbols: content.symbols,
    wires: content.wires,
    buses: content.buses ?? emptyBuses(),
    netLabels: content.netLabels,
    sheetPins: content.sheetPins ?? emptySheetPins(),
    textNotes: content.textNotes,
  };

  return {
    ...normalized,
    updatedAt: Date.now(),
    ...normalizedContent,
    sheets: normalized.sheets.map((sheet) =>
      sheet.id === sheetId
        ? {
            ...sheet,
            ...normalizedContent,
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
    buses: [],
    netLabels: [],
    sheetPins: [],
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
    buses: nextSheet.buses,
    netLabels: nextSheet.netLabels,
    sheetPins: nextSheet.sheetPins,
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
