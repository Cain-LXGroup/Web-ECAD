import { useEffect } from "react";

import type { Tool } from "../editor/useEditorState";

type UseEditorKeyboardShortcutsOptions = {
  onSetTool: (tool: Tool) => void;
  onDeleteSelected: () => void;
  onCancelWire: () => void;
  onFinishWire: () => void;
  hasWireDraft: boolean;
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
};

export const useEditorKeyboardShortcuts = ({
  onSetTool,
  onDeleteSelected,
  onCancelWire,
  onFinishWire,
  hasWireDraft,
}: UseEditorKeyboardShortcutsOptions) => {
  useEffect(() => {
    console.info("[useEditorKeyboardShortcuts] Attaching keyboard shortcuts");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        onDeleteSelected();
        return;
      }

      if (key === "escape") {
        if (hasWireDraft) {
          event.preventDefault();
          onCancelWire();
        }
        return;
      }

      if (key === "enter" && hasWireDraft) {
        event.preventDefault();
        onFinishWire();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const toolByKey: Record<string, Tool> = {
        v: "select",
        w: "wire",
        l: "label",
        t: "text",
        h: "pan",
        p: "pan",
      };

      const nextTool = toolByKey[key];
      if (nextTool) {
        event.preventDefault();
        onSetTool(nextTool);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasWireDraft, onCancelWire, onDeleteSelected, onFinishWire, onSetTool]);
};

export default useEditorKeyboardShortcuts;
