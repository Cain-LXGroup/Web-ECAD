import type { LibrarySymbol } from "./types";

const toSearchText = (symbol: LibrarySymbol): string => {
  return [
    symbol.name,
    symbol.libraryName,
    symbol.description ?? "",
    symbol.footprint ?? "",
    ...(symbol.keywords ?? []),
  ]
    .join(" ")
    .toLowerCase();
};

export const searchSymbols = (symbols: LibrarySymbol[], query: string): LibrarySymbol[] => {
  console.info("[symbolSearch] Filtering in-memory symbols", {
    symbolCount: symbols.length,
    query,
  });

  const trimmedQuery = query.trim().toLowerCase();

  if (!trimmedQuery) {
    return symbols.slice(0, 100);
  }

  return symbols.filter((symbol) => toSearchText(symbol).includes(trimmedQuery)).slice(0, 100);
};
