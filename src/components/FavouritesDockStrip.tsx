import type { LibrarySymbol } from "../library/types";
import { glassPanel } from "./ui/uiStyles";
import { formatSymbolFieldCaption } from "../editor/symbolDisplay";

type FavouritesDockStripProps = {
  symbols: LibrarySymbol[];
  onPlaceSymbol: (symbolId: string) => void;
};

const resolveSymbolCardLabel = (symbol: LibrarySymbol): string => {
  const value = symbol.properties?.Value?.trim() || symbol.properties?.value?.trim();
  if (value && value.toLowerCase() !== symbol.name.trim().toLowerCase()) {
    return `${symbol.name} · ${value}`;
  }

  return symbol.name;
};

export const FavouritesDockStrip = ({ symbols, onPlaceSymbol }: FavouritesDockStripProps) => {
  console.info("[FavouritesDockStrip] Rendering favourites dock strip", { count: symbols.length });

  if (symbols.length === 0) {
    return null;
  }

  return (
    <div
      className={`pointer-events-auto fixed inset-x-0 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-[min(100%,64rem)] px-3 ${glassPanel}`}
      aria-label="Favourite symbols"
    >
      <div className="flex gap-3 overflow-x-auto py-2 [scrollbar-width:thin]">
        {symbols.map((symbol) => {
          const previewRef = `${symbol.referencePrefix ?? "U"}?`;
          const previewInstance = {
            id: "preview",
            symbolId: symbol.id,
            ref: previewRef,
            value: symbol.properties?.Value,
            x: 0,
            y: 0,
            rotation: 0 as const,
            mirrored: false,
          };
          const caption = formatSymbolFieldCaption(previewInstance, symbol);

          return (
            <button
              key={symbol.id}
              type="button"
              className="flex min-w-[5.5rem] shrink-0 flex-col items-center gap-1 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] px-3 py-2 text-center touch-manipulation hover:bg-white/10"
              title={resolveSymbolCardLabel(symbol)}
              onClick={() => onPlaceSymbol(symbol.id)}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/30 text-lg text-cyan-200">
                {(symbol.referencePrefix ?? symbol.name.charAt(0)).toUpperCase()}
              </span>
              <span className="max-w-[7rem] truncate text-xs font-semibold text-[var(--chrome-heading)]">
                {caption.compact ?? caption.ref}
              </span>
              <span className="max-w-[7rem] truncate text-[10px] text-[var(--chrome-muted)]">
                {symbol.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FavouritesDockStrip;
