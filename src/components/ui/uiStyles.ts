/** Shared chrome styles — Apple-like glass panels (not used on the schematic worksheet). */

export const glassPanel =
  "rounded-[1.35rem] border border-[var(--chrome-border)] bg-[var(--chrome-panel)] shadow-[var(--chrome-shadow)] backdrop-blur-2xl backdrop-saturate-150";

export const glassPanelInset =
  "rounded-2xl border border-[var(--chrome-inset-border)] bg-[var(--chrome-inset-bg)]";

export const glassDock =
  "rounded-[1.75rem] border border-[var(--chrome-border)] bg-[var(--chrome-dock)] shadow-[var(--chrome-shadow)] backdrop-blur-3xl backdrop-saturate-150";

export const bubbleButtonBase =
  "touch-manipulation rounded-2xl text-base font-semibold transition-all duration-200 ease-out active:scale-[0.97]";

export const bubbleButtonPrimary =
  `${bubbleButtonBase} bg-cyan-400/95 text-slate-950 shadow-[0_8px_28px_rgba(34,211,238,0.35)] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`;

export const bubbleButtonSecondary =
  `${bubbleButtonBase} border border-[var(--chrome-button-border)] bg-[var(--chrome-button-bg)] text-[var(--chrome-button-text)] shadow-[var(--chrome-shadow)] hover:border-[var(--chrome-border-strong)] hover:bg-[var(--chrome-button-hover-bg)] disabled:cursor-not-allowed disabled:text-[var(--chrome-button-disabled-text)]`;

export const iconToolButtonBase =
  "relative flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-2xl border transition-all duration-200 ease-out active:scale-95";

export const iconToolButtonIdle =
  `${iconToolButtonBase} border-transparent bg-transparent text-[var(--chrome-text)] hover:border-[var(--chrome-border)] hover:bg-[var(--chrome-tab-hover-bg)]`;

export const iconToolButtonActive =
  `${iconToolButtonBase} border-[var(--chrome-accent)]/35 bg-[var(--chrome-accent-surface)] text-[var(--chrome-accent-text)] shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_8px_24px_rgba(34,211,238,0.18)]`;

export const chromeHeading =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--chrome-muted)]";

export const chromeTitle = "text-base font-semibold text-[var(--chrome-heading)]";

export const chromeBody = "text-sm text-[var(--chrome-muted)]";

export const chromeLabel = "text-sm font-medium text-[var(--chrome-text)]";

export const chromeInput =
  `w-full px-4 py-3 text-base text-[var(--chrome-input-text)] outline-none placeholder:text-[var(--chrome-input-placeholder)] focus:border-[var(--chrome-accent)]/60 ${glassPanelInset}`;

export const floatingChromeButton =
  "touch-manipulation rounded-full border border-[var(--chrome-border)] bg-[var(--chrome-chip-bg)] px-4 py-3 text-base font-semibold text-[var(--chrome-chip-text)] shadow-[var(--chrome-shadow)] backdrop-blur-2xl transition-all duration-200 ease-out hover:border-[var(--chrome-border-strong)] hover:bg-[var(--chrome-button-hover-bg)] active:scale-[0.97]";
