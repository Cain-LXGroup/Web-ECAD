import { UndoRedoIcon } from "./icons/UndoRedoIcon";
import { glassDock, iconToolButtonIdle } from "./ui/uiStyles";

type UndoRedoRailProps = {
  hidden?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  theme?: "dark" | "light";
  onUndo: () => void;
  onRedo: () => void;
};

export const UndoRedoRail = ({
  hidden = false,
  canUndo,
  canRedo,
  theme = "dark",
  onUndo,
  onRedo,
}: UndoRedoRailProps) => {
  console.info("[UndoRedoRail] Rendering undo/redo rail", { hidden, canUndo, canRedo });

  if (hidden) {
    return null;
  }

  return (
    <div className={`pointer-events-auto ${glassDock} flex flex-col gap-1 p-2`} aria-label="Undo and redo">
      <button
        className={`${iconToolButtonIdle} ${!canUndo ? "opacity-40" : ""}`}
        type="button"
        aria-label="Undo"
        title="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <UndoRedoIcon variant="undo" size={26} theme={theme} />
      </button>
      <button
        className={`${iconToolButtonIdle} ${!canRedo ? "opacity-40" : ""}`}
        type="button"
        aria-label="Redo"
        title="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <UndoRedoIcon variant="redo" size={26} theme={theme} />
      </button>
    </div>
  );
};

export default UndoRedoRail;
