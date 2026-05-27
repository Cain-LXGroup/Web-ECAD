import type { LibrarySymbol } from "../library/types";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";
import { SymbolPreview } from "./SymbolPreview";

type SymbolSearchPanelProps = {
  query: string;
  symbols: LibrarySymbol[];
  selectedSymbolId?: string;
  onQueryChange: (query: string) => void;
  onSelectSymbol: (symbolId: string) => void;
  onPlaceSymbol: (symbolId: string) => void;
};

const getSymbolValueLabel = (symbol: LibrarySymbol): string => {
  return symbol.properties?.Value ?? symbol.name;
};

const getSymbolSecondaryLabel = (symbol: LibrarySymbol): string => {
  const footprint = symbol.properties?.Footprint ?? symbol.footprint;
  const lcsc = symbol.properties?.LCSC;

  if (footprint && lcsc) {
    return `${footprint} · LCSC ${lcsc}`;
  }

  return footprint ?? lcsc ?? symbol.libraryName;
};

export const SymbolSearchPanel = ({
  query,
  symbols,
  selectedSymbolId,
  onQueryChange,
  onSelectSymbol,
  onPlaceSymbol,
}: SymbolSearchPanelProps) => {
  console.info("[SymbolSearchPanel] Rendering search panel", {
    query,
    resultCount: symbols.length,
    selectedSymbolId,
  });

  const selectedSymbol = symbols.find((symbol) => symbol.id === selectedSymbolId);

  return (
    <section
      className="flex min-h-0 flex-1 flex-col rounded-2xl border p-4"
      style={{
        borderColor: "rgba(192, 112, 112, 0.28)",
        backgroundColor: "#171a21",
      }}
    >
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white">Symbol Library</h3>
        <p className="mt-1 text-sm text-slate-400">
          Search installed Digi-Key, JLCPCB, starter, or imported libraries.
        </p>
      </div>

      <label className="mb-3 block">
        <span className="mb-2 block text-sm font-medium text-slate-300">Search</span>
        <input
          className="w-full rounded-2xl border border-slate-700 bg-[#202228] px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
          placeholder="TPS5430, LM741, C12345..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <div
        className="mb-3 min-h-0 flex-1 overflow-y-auto rounded-2xl border"
        style={{ borderColor: "rgba(136, 192, 112, 0.18)", backgroundColor: kicadSchematicTheme.background }}
      >
        {symbols.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">
            No symbols found. Install a standard library from Workspace, or import your own `.lib` / `.kicad_sym` files.
          </div>
        ) : (
          <ul>
            {symbols.map((symbol) => {
              const selected = symbol.id === selectedSymbolId;
              const valueLabel = getSymbolValueLabel(symbol);
              const secondaryLabel = getSymbolSecondaryLabel(symbol);

              return (
                <li key={symbol.id} className="border-b border-slate-800/80 last:border-b-0">
                  <button
                    className="flex w-full touch-manipulation flex-col gap-1 px-4 py-3 text-left"
                    style={{
                      backgroundColor: selected ? "rgba(112, 192, 192, 0.12)" : "transparent",
                    }}
                    type="button"
                    onClick={() => onSelectSymbol(symbol.id)}
                  >
                    <span
                      className="font-bold leading-tight"
                      style={{
                        color: kicadSchematicTheme.valueText,
                        fontFamily: kicadSchematicTheme.fontFamily,
                        fontSize: "1.05rem",
                      }}
                    >
                      {valueLabel}
                    </span>
                    <span
                      className="font-semibold"
                      style={{
                        color: kicadSchematicTheme.refText,
                        fontFamily: kicadSchematicTheme.fontFamily,
                        fontSize: "0.95rem",
                      }}
                    >
                      {symbol.referencePrefix ? `${symbol.referencePrefix}?` : symbol.name} · {symbol.name}
                    </span>
                    <span className="text-xs text-slate-400">{secondaryLabel}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        className="mb-3 w-full touch-manipulation rounded-2xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        type="button"
        disabled={!selectedSymbol}
        onClick={() => {
          if (selectedSymbol) {
            onPlaceSymbol(selectedSymbol.id);
          }
        }}
      >
        Place
      </button>

      <SymbolPreview symbol={selectedSymbol} />
    </section>
  );
};

export default SymbolSearchPanel;
