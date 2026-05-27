import type { LibrarySymbol } from "../library/types";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";
import { schematicColorVar } from "../theme/schematicTheme";
import { BubbleButton } from "./ui/BubbleButton";
import { glassPanelInset } from "./ui/uiStyles";

type SymbolSearchPanelProps = {
  query: string;
  symbols: LibrarySymbol[];
  favoriteSymbols?: LibrarySymbol[];
  selectedSymbolId?: string;
  starredSymbolIds?: string[];
  onQueryChange: (query: string) => void;
  onSelectSymbol: (symbolId: string) => void;
  onPlaceSymbol: (symbolId: string) => void;
  onToggleStar?: (symbolId: string) => void;
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
  favoriteSymbols = [],
  selectedSymbolId,
  starredSymbolIds = [],
  onQueryChange,
  onSelectSymbol,
  onPlaceSymbol,
  onToggleStar,
}: SymbolSearchPanelProps) => {
  console.info("[SymbolSearchPanel] Rendering search panel", {
    query,
    resultCount: symbols.length,
    favoriteCount: favoriteSymbols.length,
    selectedSymbolId,
  });

  const renderSymbolRow = (symbol: LibrarySymbol) => {
    const selected = symbol.id === selectedSymbolId;
    const valueLabel = getSymbolValueLabel(symbol);
    const secondaryLabel = getSymbolSecondaryLabel(symbol);
    const manufacturer = symbol.properties?.Manufacturer;
    const lcsc = symbol.properties?.LCSC;
    const part = symbol.properties?.Part;
    const description = symbol.properties?.Description ?? symbol.description;
    const starred = starredSymbolIds.includes(symbol.id);

    return (
      <li key={symbol.id} className="border-b border-[var(--chrome-list-divider)] last:border-b-0">
        <div
          className="px-4 py-3"
          style={{
            backgroundColor: selected ? "rgba(112, 192, 192, 0.12)" : "transparent",
          }}
        >
          <div className="flex items-start gap-2">
            {onToggleStar ? (
              <button
                type="button"
                className="mt-1 shrink-0 touch-manipulation text-xl leading-none"
                aria-label={starred ? "Remove from favourites" : "Add to favourites"}
                onClick={() => onToggleStar(symbol.id)}
              >
                {starred ? "★" : "☆"}
              </button>
            ) : null}
            <button
              className="flex min-w-0 flex-1 touch-manipulation flex-col gap-1 text-left"
              type="button"
              onClick={() => onSelectSymbol(symbol.id)}
            >
              <span
                className="font-bold leading-tight"
                style={{
                  color: schematicColorVar("valueText"),
                  fontFamily: kicadSchematicTheme.fontFamily,
                  fontSize: "1.05rem",
                }}
              >
                {valueLabel}
              </span>
              <span
                className="font-semibold"
                style={{
                  color: schematicColorVar("refText"),
                  fontFamily: kicadSchematicTheme.fontFamily,
                  fontSize: "0.95rem",
                }}
              >
                {symbol.referencePrefix ? `${symbol.referencePrefix}?` : symbol.name} · {symbol.name}
              </span>
              <span className="text-xs text-[var(--chrome-muted)]">{secondaryLabel}</span>
            </button>
          </div>

          {selected ? (
            <div className={`mt-3 p-3 ${glassPanelInset}`}>
              <BubbleButton
                variant="primary"
                className="w-full"
                onClick={() => onPlaceSymbol(symbol.id)}
              >
                Place {valueLabel}
              </BubbleButton>
              <dl className="mt-3 grid gap-2 text-xs text-slate-300">
                <div>
                  <dt className="text-slate-500">Library</dt>
                  <dd>{symbol.libraryName}</dd>
                </div>
                {manufacturer ? (
                  <div>
                    <dt className="text-[var(--chrome-faint)]">Manufacturer</dt>
                    <dd>{manufacturer}</dd>
                  </div>
                ) : null}
                {part ? (
                  <div>
                    <dt className="text-[var(--chrome-faint)]">Part</dt>
                    <dd>{part}</dd>
                  </div>
                ) : null}
                {lcsc ? (
                  <div>
                    <dt className="text-[var(--chrome-faint)]">LCSC</dt>
                    <dd>{lcsc}</dd>
                  </div>
                ) : null}
                {description ? (
                  <div>
                    <dt className="text-[var(--chrome-faint)]">Description</dt>
                    <dd className="max-h-12 overflow-hidden text-ellipsis">{description}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="mb-3">
        <h3 className={chromeTitle}>Symbol Library</h3>
        <p className={`mt-1 ${chromeBody}`}>
          Search installed Digi-Key, JLCPCB, starter, or imported libraries.
        </p>
      </div>

      <label className="mb-3 block">
        <span className={`mb-2 block ${chromeLabel}`}>Search</span>
        <input
          className={chromeInput}
          placeholder="TPS5430, LM741, C12345..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <div
        className="min-h-0 flex-1 overflow-y-auto rounded-2xl border"
        style={{
          borderColor: "rgba(136, 192, 112, 0.18)",
          backgroundColor: schematicColorVar("background"),
        }}
      >
        {favoriteSymbols.length > 0 ? (
          <div className="border-b border-[var(--chrome-list-divider)]">
            <p className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-[var(--chrome-accent-muted)]">
              Favourites
            </p>
            <ul>{favoriteSymbols.map((symbol) => renderSymbolRow(symbol))}</ul>
          </div>
        ) : null}
        {symbols.length === 0 ? (
          <div className="p-4 text-sm text-[var(--chrome-faint)]">
            No symbols found. Install a standard library from Workspace, or import your own `.lib` / `.kicad_sym` files.
          </div>
        ) : (
          <ul>{symbols.map((symbol) => renderSymbolRow(symbol))}</ul>
        )}
      </div>
    </section>
  );
};

export default SymbolSearchPanel;
