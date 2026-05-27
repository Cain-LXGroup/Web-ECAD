import { glassDock, iconToolButtonIdle } from "./ui/uiStyles";

type UndoRedoRailProps = {
  hidden?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export const UndoRedoRail = ({ hidden = false, canUndo, canRedo, onUndo, onRedo }: UndoRedoRailProps) => {
  console.info("[UndoRedoRail] Rendering undo/redo rail", { hidden, canUndo, canRedo });

  if (hidden) {
    return null;
  }

  return (
    <div className={`pointer-events-auto ${glassDock} flex flex-col gap-1 p-2`} aria-label="Undo and redo">
      <button
        className={`${iconToolButtonIdle} text-xl font-bold ${!canUndo ? "opacity-40" : ""}`}
        type="button"
        aria-label="Undo"
        title="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        ↶
      </button>
      <button
        className={`${iconToolButtonIdle} text-xl font-bold ${!canRedo ? "opacity-40" : ""}`}
        type="button"
        aria-label="Redo"
        title="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        ↷
      </button>
    </div>
  );
};

export default UndoRedoRail;
