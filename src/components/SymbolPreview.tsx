import type { LibrarySymbol } from "../library/types";
import { ComponentInspector } from "./ComponentInspector";

type SymbolPreviewProps = {
  symbol?: LibrarySymbol;
};

export const SymbolPreview = ({ symbol }: SymbolPreviewProps) => {
  console.info("[SymbolPreview] Rendering symbol preview", { symbolName: symbol?.name });

  return (
    <ComponentInspector
      symbol={symbol}
      emptyMessage="Select a symbol to preview it with KiCad-style fields."
      maxMetadataRows={6}
    />
  );
};

export default SymbolPreview;
