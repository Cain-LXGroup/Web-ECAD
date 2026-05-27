type WireToolPaletteProps = {
  canPlaceWire: boolean;
  canCancelWire: boolean;
  onPlaceWire: () => void;
  onCancelWire: () => void;
};

export const WireToolPalette = ({
  canPlaceWire,
  canCancelWire,
  onPlaceWire,
  onCancelWire,
}: WireToolPaletteProps) => {
  console.info("[WireToolPalette] Rendering wire tool palette", { canPlaceWire, canCancelWire });

  return (
    <aside
      className="pointer-events-auto fixed right-3 top-1/2 z-40 flex w-36 -translate-y-1/2 flex-col gap-2 xl:hidden"
      aria-label="Wire tools"
    >
      <button
        className="touch-manipulation rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        type="button"
        disabled={!canPlaceWire}
        onClick={onPlaceWire}
      >
        Place Wire
      </button>
      <button
        className="touch-manipulation rounded-2xl border border-slate-600 bg-slate-950/95 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 disabled:cursor-not-allowed disabled:text-slate-500"
        type="button"
        disabled={!canCancelWire}
        onClick={onCancelWire}
      >
        Cancel Wire
      </button>
    </aside>
  );
};

export default WireToolPalette;
