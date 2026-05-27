type UndoRedoIconProps = {
  variant: "undo" | "redo";
  className?: string;
  size?: number;
  theme?: "dark" | "light";
};

export const UndoRedoIcon = ({
  variant,
  className = "",
  size = 24,
  theme = "dark",
}: UndoRedoIconProps) => {
  console.info("[UndoRedoIcon] Rendering undo/redo icon", { variant, size, theme });

  const stroke = theme === "light" ? "#334155" : "#e2e8f0";
  const accent = theme === "light" ? "#0891b2" : "#22d3ee";

  const undoPath =
    "M 7 9.5 C 7 6.5 9.8 4 13.2 4 C 16.1 4 18.6 5.6 19.6 8 M 7 9.5 L 4.5 7 M 7 9.5 L 9.5 7";
  const redoPath =
    "M 17 9.5 C 17 6.5 14.2 4 10.8 4 C 7.9 4 5.4 5.6 4.4 8 M 17 9.5 L 19.5 7 M 17 9.5 L 14.5 7";

  return (
    <svg
      className={`pointer-events-none select-none ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d={variant === "undo" ? undoPath : redoPath}
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 12 20 C 15.5 20 18.5 17.4 19 14"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
};

export default UndoRedoIcon;
