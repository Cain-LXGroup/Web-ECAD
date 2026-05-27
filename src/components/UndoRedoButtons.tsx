import { glassDock } from "./ui/uiStyles";

type UndoRedoButtonsProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export const UndoRedoButtons = ({ canUndo, canRedo, onUndo, onRedo }: UndoRedoButtonsProps) => {
  console.info("[UndoRedoButtons] Rendering undo/redo controls", { canUndo, canRedo });

  return (
    <div className="pointer-events-none fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-3 z-40 flex flex-col gap-2 xl:bottom-6">
      <button
        className={`pointer-events-auto flex h-12 w-12 touch-manipulation items-center justify-center rounded-2xl border text-lg font-bold transition-all active:scale-95 ${glassDock} ${
          canUndo ? "border-white/15 text-white hover:border-cyan-400/40" : "border-white/5 text-slate-600"
        }`}
        type="button"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        ↶
      </button>
      <button
        className={`pointer-events-auto flex h-12 w-12 touch-manipulation items-center justify-center rounded-2xl border text-lg font-bold transition-all active:scale-95 ${glassDock} ${
          canRedo ? "border-white/15 text-white hover:border-cyan-400/40" : "border-white/5 text-slate-600"
        }`}
        type="button"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        ↷
      </button>
    </div>
  );
};

export default UndoRedoButtons;
