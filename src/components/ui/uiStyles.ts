/** Shared chrome styles — Apple-like glass panels (not used on the schematic worksheet). */

export const glassPanel =
  "rounded-[1.35rem] border border-white/10 bg-slate-950/55 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150";

export const glassPanelInset = "rounded-2xl border border-white/8 bg-white/[0.04]";

export const glassDock =
  "rounded-[1.75rem] border border-white/12 bg-slate-950/70 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-3xl backdrop-saturate-150";

export const bubbleButtonBase =
  "touch-manipulation rounded-2xl text-base font-semibold transition-all duration-200 ease-out active:scale-[0.97]";

export const bubbleButtonPrimary =
  `${bubbleButtonBase} bg-cyan-400/95 text-slate-950 shadow-[0_8px_28px_rgba(34,211,238,0.35)] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-800/80 disabled:text-slate-500 disabled:shadow-none`;

export const bubbleButtonSecondary =
  `${bubbleButtonBase} border border-white/14 bg-slate-950/80 text-white shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:border-white/25 hover:bg-slate-900/90 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-500`;

export const iconToolButtonBase =
  "relative flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-2xl border transition-all duration-200 ease-out active:scale-95";

export const iconToolButtonIdle =
  `${iconToolButtonBase} border-transparent bg-transparent text-slate-200 hover:border-white/10 hover:bg-white/[0.06]`;

export const iconToolButtonActive =
  `${iconToolButtonBase} border-cyan-400/35 bg-cyan-400/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_8px_24px_rgba(34,211,238,0.18)]`;

export const chromeHeading = "text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400";
