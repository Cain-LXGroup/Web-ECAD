import type { LibrarySymbol, SymbolInstance } from "../library/types";

export const resolveSymbolInstanceValue = (
  instance: SymbolInstance,
  symbol: LibrarySymbol,
): string | undefined => {
  console.info("[symbolDisplay] Resolving symbol instance value field", {
    instanceId: instance.id,
    symbolId: symbol.id,
  });

  const raw =
    instance.value?.trim() ||
    symbol.properties?.Value?.trim() ||
    symbol.properties?.value?.trim() ||
    undefined;

  if (!raw) {
    return undefined;
  }

  const genericName = symbol.name.trim().toLowerCase();
  if (raw.toLowerCase() === genericName) {
    return undefined;
  }

  return raw;
};

export const formatSymbolFieldCaption = (
  instance: SymbolInstance,
  symbol: LibrarySymbol,
): { compact?: string; ref: string; value?: string } => {
  console.info("[symbolDisplay] Formatting symbol field caption", { instanceId: instance.id });

  const ref = instance.ref || `${symbol.referencePrefix ?? "U"}?`;
  const value = resolveSymbolInstanceValue(instance, symbol);

  if (value) {
    return {
      compact: `${ref} ${value}`,
      ref,
      value,
    };
  }

  return { ref };
};
