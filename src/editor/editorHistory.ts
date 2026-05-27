import type { SchematicProject } from "../library/types";
import type { WireDraftState } from "./useEditorState";
import type { WireNodeSelection } from "./WireNodeHandles";

export const MAX_EDITOR_HISTORY = 50;

export type EditorHistorySnapshot = {
  project: SchematicProject;
  activeSheetId?: string;
  selectedIds: string[];
  selectedWireNode?: WireNodeSelection;
  wireDraft?: WireDraftState;
  placingSymbolId?: string;
};

export const cloneEditorHistorySnapshot = (snapshot: EditorHistorySnapshot): EditorHistorySnapshot => {
  console.info("[editorHistory] Cloning editor history snapshot", {
    projectId: snapshot.project.id,
    selectedCount: snapshot.selectedIds.length,
  });

  return {
    project: structuredClone(snapshot.project),
    activeSheetId: snapshot.activeSheetId,
    selectedIds: [...snapshot.selectedIds],
    selectedWireNode: snapshot.selectedWireNode
      ? { ...snapshot.selectedWireNode }
      : undefined,
    wireDraft: snapshot.wireDraft ? structuredClone(snapshot.wireDraft) : undefined,
    placingSymbolId: snapshot.placingSymbolId,
  };
};

export const pushHistorySnapshot = (
  past: EditorHistorySnapshot[],
  snapshot: EditorHistorySnapshot,
): EditorHistorySnapshot[] => {
  console.info("[editorHistory] Pushing history snapshot", { pastLength: past.length });

  const nextPast = [...past, cloneEditorHistorySnapshot(snapshot)];
  if (nextPast.length > MAX_EDITOR_HISTORY) {
    return nextPast.slice(nextPast.length - MAX_EDITOR_HISTORY);
  }

  return nextPast;
};
