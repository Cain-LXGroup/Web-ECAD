type GridProps = {
  width: number;
  height: number;
  gridSize: number;
};

export const Grid = ({ width, height, gridSize }: GridProps) => {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <pattern id="schematic-grid-pattern" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#schematic-grid-pattern)" />
    </svg>
  );
};

export default Grid;
