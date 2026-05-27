type CanvasHudProps = {
  measureLabel?: string;
};

export const CanvasHud = ({ measureLabel }: CanvasHudProps) => {
  console.info("[CanvasHud] Rendering canvas HUD", { measureLabel });

  if (!measureLabel) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-3 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-30 rounded-2xl border border-white/10 bg-slate-950/75 px-3 py-2 text-xs font-medium text-cyan-200 shadow-lg backdrop-blur-xl xl:bottom-6">
      {measureLabel}
    </div>
  );
};

export default CanvasHud;
