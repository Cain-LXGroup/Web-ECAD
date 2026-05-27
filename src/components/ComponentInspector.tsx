import type { LibrarySymbol } from "../library/types";
import { SymbolInstanceView } from "../editor/SymbolInstanceView";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";
import { schematicColorVar } from "../theme/schematicTheme";

export type ComponentMetadataRow = {
  label: string;
  value: string;
  href?: string;
};

type ComponentInspectorProps = {
  symbol?: LibrarySymbol;
  reference?: string;
  value?: string;
  emptyMessage?: string;
  maxMetadataRows?: number;
};

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

export const getComponentMetadataRows = (symbol: LibrarySymbol): ComponentMetadataRow[] => {
  console.info("[ComponentInspector] Building component metadata rows", { symbolName: symbol.name });

  const properties = symbol.properties ?? {};
  const rows: ComponentMetadataRow[] = [];

  const preferredKeys = [
    "Footprint",
    "LCSC",
    "Manufacturer",
    "Part",
    "Description",
    "Datasheet",
    "Price",
    "Stock",
    "Category",
  ];

  for (const key of preferredKeys) {
    const rawValue = properties[key] ?? (key === "Footprint" ? symbol.footprint : key === "Datasheet" ? symbol.datasheet : undefined);

    if (!rawValue?.trim()) {
      continue;
    }

    const value = rawValue.trim();
    rows.push({
      label: key,
      value,
      href: key === "Datasheet" && isHttpUrl(value) ? value : undefined,
    });
  }

  if (rows.length === 0 && symbol.description) {
    rows.push({ label: "Description", value: symbol.description });
  }

  return rows;
};

export const ComponentInspector = ({
  symbol,
  reference,
  value,
  emptyMessage = "Select a symbol to inspect it here.",
  maxMetadataRows,
}: ComponentInspectorProps) => {
  console.info("[ComponentInspector] Rendering component inspector", { symbolName: symbol?.name });

  if (!symbol) {
    return (
      <div
        className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed p-4 text-center text-sm"
        style={{
          borderColor: "rgba(192, 112, 112, 0.35)",
          backgroundColor: schematicColorVar("background"),
          color: "var(--chrome-muted)",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  const displayRef = reference ?? `${symbol.referencePrefix ?? "U"}?`;
  const displayValue = value ?? symbol.properties?.Value ?? symbol.name;
  const metadataRows = getComponentMetadataRows(symbol).slice(0, maxMetadataRows);

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: "rgba(192, 112, 112, 0.35)",
        backgroundColor: schematicColorVar("background"),
      }}
    >
      <div className="px-4 pt-4">
        <p
          className="font-bold leading-none"
          style={{
            color: schematicColorVar("refText"),
            fontFamily: kicadSchematicTheme.fontFamily,
            fontSize: "1.35rem",
          }}
        >
          {displayRef}
        </p>
        <p
          className="mt-2 font-bold leading-tight break-words"
          style={{
            color: schematicColorVar("valueText"),
            fontFamily: kicadSchematicTheme.fontFamily,
            fontSize: "1.2rem",
          }}
        >
          {displayValue}
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--chrome-muted)]">{symbol.libraryName}</p>
      </div>

      <div className="px-3 pb-3 pt-2">
        <svg
          className="h-48 w-full"
          viewBox={`${symbol.bounds.minX - 100} ${-symbol.bounds.maxY - 120} ${
            symbol.bounds.maxX - symbol.bounds.minX + 200
          } ${symbol.bounds.maxY - symbol.bounds.minY + 220}`}
        >
          <rect
            x={symbol.bounds.minX - 100}
            y={-symbol.bounds.maxY - 120}
            width={symbol.bounds.maxX - symbol.bounds.minX + 200}
            height={symbol.bounds.maxY - symbol.bounds.minY + 220}
            fill={schematicColorVar("background")}
          />
          <SymbolInstanceView
            symbol={symbol}
            instance={{
              id: `inspect-${symbol.id}`,
              symbolId: symbol.id,
              ref: displayRef,
              value: displayValue,
              x: 0,
              y: 0,
              rotation: 0,
              mirrored: false,
            }}
            selected={false}
            showPinLabels
            showFieldLabels={false}
          />
        </svg>
      </div>

      {metadataRows.length > 0 ? (
        <div className="space-y-3 border-t border-[var(--chrome-list-divider)] px-4 py-4">
          {metadataRows.map((row) => (
            <div key={row.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--chrome-faint)]">{row.label}</p>
              {row.href ? (
                <a
                  className="mt-1 block break-all text-sm font-medium underline decoration-cyan-500/50 underline-offset-2 hover:text-cyan-200"
                  href={row.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  style={{ color: schematicColorVar("valueText"), fontFamily: kicadSchematicTheme.fontFamily }}
                >
                  {row.value}
                </a>
              ) : (
                <p
                  className="mt-1 break-words text-sm font-medium"
                  style={{ color: schematicColorVar("valueText"), fontFamily: kicadSchematicTheme.fontFamily }}
                >
                  {row.value}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ComponentInspector;
