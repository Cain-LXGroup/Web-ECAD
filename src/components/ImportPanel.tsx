import { useRef } from "react";

import { BundledLibraryPanel } from "./BundledLibraryPanel";
import { BubbleButton } from "./ui/BubbleButton";
import { GlassPanel } from "./ui/GlassPanel";
import { chromeBody, chromeTitle, glassPanelInset } from "./ui/uiStyles";
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
    <GlassPanel>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className={chromeTitle}>Import Library</h3>
          <p className={`mt-1 ${chromeBody}`}>
            Import KiCad legacy `.lib` symbol libraries for offline search and placement.
          </p>
        </div>
        <span className="rounded-full border border-[var(--chrome-border)] px-3 py-1 text-xs text-[var(--chrome-muted)]">
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

        <BubbleButton
          variant="secondary"
          className="w-full border border-dashed border-[var(--chrome-border-strong)] !text-left"
          disabled={isImporting}
          onClick={() => inputRef.current?.click()}
        >
          {isImporting ? "Importing library..." : "Choose `.lib` or `.kicad_sym` files"}
        </BubbleButton>

        <BubbleButton variant="secondary" className="w-full" onClick={onLoadStarterSymbols}>
          Load Starter Symbols
        </BubbleButton>

        <p className="text-sm text-[var(--chrome-faint)]">
          The starter library seeds resistor, capacitor, diode, op amp, connector, IC, ground, and VCC symbols.
        </p>

        {importStatus && importStatus.length > 0 ? (
          <div className={`max-h-48 space-y-2 overflow-y-auto p-3 ${glassPanelInset}`}>
            {importStatus.map((result) => (
              <div
                key={result.fileName}
                className="rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-inset-bg)] p-3 text-sm"
              >
                <p className="font-medium text-[var(--chrome-heading)]">{result.fileName}</p>
                <p className="mt-1 text-[var(--chrome-muted)]">
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
    </GlassPanel>
  );
};

export default ImportPanel;
