import { useRef } from "react";

import { BundledLibraryPanel } from "./BundledLibraryPanel";
import type { BundledLibraryPackId } from "../library/bundledLibraryCatalog";
import type { BundledLibrarySeedProgress } from "../library/seedBundledLibraries";

export type ImportPanelStatus = {
  fileName: string;
  importedCount: number;
  skippedCount: number;
  errors: string[];
};

type ImportPanelProps = {
  symbolCount: number;
  importStatus?: ImportPanelStatus[];
  isImporting?: boolean;
  installedBundledPacks?: Partial<Record<BundledLibraryPackId, boolean>>;
  bundledSeedProgress?: BundledLibrarySeedProgress;
  activeBundledPackId?: BundledLibraryPackId;
  onInstallBundledPack: (packId: BundledLibraryPackId) => void;
  onLoadStarterSymbols: () => void;
  onLibraryFilesSelected: (files: FileList | null) => void;
};

export const ImportPanel = ({
  symbolCount,
  importStatus,
  isImporting = false,
  installedBundledPacks,
  bundledSeedProgress,
  activeBundledPackId,
  onInstallBundledPack,
  onLoadStarterSymbols,
  onLibraryFilesSelected,
}: ImportPanelProps) => {
  console.info("[ImportPanel] Rendering import panel", { symbolCount });

  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Import Library</h3>
          <p className="mt-1 text-sm text-slate-400">
            Import KiCad legacy `.lib` symbol libraries for offline search and placement.
          </p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          {symbolCount} stored
        </span>
      </div>

      <div className="space-y-3">
        <BundledLibraryPanel
          installedPacks={installedBundledPacks ?? {}}
          activePackId={activeBundledPackId}
          seedProgress={bundledSeedProgress}
          onInstallPack={onInstallBundledPack}
        />

        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".lib,.kicad_sym"
          multiple
          onChange={(event) => onLibraryFilesSelected(event.target.files)}
        />

        <button
          className="w-full touch-manipulation rounded-2xl border border-dashed border-slate-700 px-4 py-3 text-left text-base text-slate-200 hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={isImporting}
          onClick={() => inputRef.current?.click()}
        >
          {isImporting ? "Importing library..." : "Choose `.lib` or `.kicad_sym` files"}
        </button>

        <button
          className="w-full touch-manipulation rounded-2xl bg-slate-800 px-4 py-3 text-base font-medium text-white hover:bg-slate-700"
          type="button"
          onClick={onLoadStarterSymbols}
        >
          Load Starter Symbols
        </button>

        <p className="text-sm text-slate-500">
          The starter library seeds resistor, capacitor, diode, op amp, connector, IC, ground, and VCC symbols.
        </p>

        {importStatus && importStatus.length > 0 ? (
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            {importStatus.map((result) => (
              <div key={result.fileName} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm">
                <p className="font-medium text-white">{result.fileName}</p>
                <p className="mt-1 text-slate-400">
                  Imported {result.importedCount} symbol{result.importedCount === 1 ? "" : "s"}
                  {result.skippedCount > 0 ? `, skipped ${result.skippedCount}` : ""}.
                </p>
                {result.errors.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-amber-300">
                    {result.errors.slice(0, 5).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                    {result.errors.length > 5 ? (
                      <li>...and {result.errors.length - 5} more warnings</li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ImportPanel;
