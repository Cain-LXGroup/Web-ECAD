import type { LibrarySymbol } from "./types";

const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const buildSymbolId = (
  source: LibrarySymbol["source"],
  libraryName: string,
  symbolName: string,
): string => {
  console.info("[normalizeSymbol] Building symbol identifier", {
    source,
    libraryName,
    symbolName,
  });

  return [source, slugify(libraryName), slugify(symbolName)].join(":");
};

export const normalizeSymbol = (symbol: LibrarySymbol): LibrarySymbol => {
  console.info("[normalizeSymbol] Normalizing symbol metadata", { name: symbol.name });

  return {
    ...symbol,
    id: symbol.id || buildSymbolId(symbol.source, symbol.libraryName, symbol.name),
    description: symbol.description?.trim() || undefined,
    keywords: symbol.keywords?.map((keyword) => keyword.trim()).filter(Boolean) ?? [],
    referencePrefix: symbol.referencePrefix?.trim() || undefined,
    footprint: symbol.footprint?.trim() || undefined,
    datasheet: symbol.datasheet?.trim() || undefined,
    importedAt: symbol.importedAt || Date.now(),
  };
};
