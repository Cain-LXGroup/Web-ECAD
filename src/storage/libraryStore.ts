import type { LibrarySymbol } from "../library/types";
import { normalizeSymbol } from "../library/normalizeSymbol";
import { db } from "./db";

const SYMBOL_SEARCH_LIMIT = 250;

const toSearchText = (symbol: LibrarySymbol): string => {
  return [
    symbol.name,
    symbol.libraryName,
    symbol.description ?? "",
    symbol.footprint ?? "",
    symbol.properties?.Value ?? "",
    symbol.properties?.LCSC ?? "",
    symbol.properties?.Manufacturer ?? "",
    symbol.properties?.Part ?? "",
    ...(symbol.keywords ?? []),
    ...Object.values(symbol.properties ?? {}),
  ]
    .join(" ")
    .toLowerCase();
};

export const saveSymbols = async (symbols: LibrarySymbol[]): Promise<void> => {
  console.info("[libraryStore] Saving symbols", { count: symbols.length });

  if (symbols.length === 0) {
    return;
  }

  const normalizedSymbols = symbols.map((symbol) => normalizeSymbol(symbol));
  await db.symbols.bulkPut(normalizedSymbols);
};

export const getAllSymbols = async (): Promise<LibrarySymbol[]> => {
  console.info("[libraryStore] Loading all stored symbols");

  return db.symbols.orderBy("importedAt").reverse().toArray();
};

export const searchStoredSymbols = async (query: string): Promise<LibrarySymbol[]> => {
  console.info("[libraryStore] Searching stored symbols", { query });

  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return db.symbols.orderBy("importedAt").reverse().limit(SYMBOL_SEARCH_LIMIT).toArray();
  }

  const allSymbols = await db.symbols.toArray();

  return allSymbols
    .filter((symbol) => toSearchText(symbol).includes(trimmedQuery))
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, SYMBOL_SEARCH_LIMIT);
};

export const deleteSymbol = async (id: string): Promise<void> => {
  console.info("[libraryStore] Deleting stored symbol", { id });

  await db.symbols.delete(id);
};
