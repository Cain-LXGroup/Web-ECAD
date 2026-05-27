import type { BundledLibraryPackId } from "../library/bundledLibraryCatalog";
import { bundledLibraryPacks } from "../library/bundledLibraryCatalog";
import type { BundledLibrarySeedProgress } from "../library/seedBundledLibraries";
import { BubbleButton } from "./ui/BubbleButton";
import { GlassPanel } from "./ui/GlassPanel";
import { glassPanelInset } from "./ui/uiStyles";

type BundledLibraryPanelProps = {
  installedPacks: Partial<Record<BundledLibraryPackId, boolean>>;
  activePackId?: BundledLibraryPackId;
  seedProgress?: BundledLibrarySeedProgress;
  onInstallPack: (packId: BundledLibraryPackId) => void;
};

export const BundledLibraryPanel = ({
  installedPacks,
  activePackId,
  seedProgress,
  onInstallPack,
}: BundledLibraryPanelProps) => {
  console.info("[BundledLibraryPanel] Rendering bundled library panel", {
    installedPacks,
    activePackId,
  });

  return (
    <GlassPanel>
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[var(--chrome-heading)]">Standard Libraries</h3>
        <p className="mt-1 text-sm text-[var(--chrome-muted)]">
          Install Digi-Key and JLCPCB symbol catalogs once, then search offline without importing individual files.
        </p>
      </div>

      <div className="space-y-3">
        {bundledLibraryPacks.map((pack) => {
          const installed = installedPacks[pack.id] === true;
          const isActive = activePackId === pack.id;
          const progressPercent =
            seedProgress && seedProgress.packId === pack.id && seedProgress.fileCount > 0
              ? Math.round((seedProgress.fileIndex / seedProgress.fileCount) * 100)
              : 0;

          return (
            <article key={pack.id} className={`p-4 ${glassPanelInset}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--chrome-heading)]">{pack.label}</h4>
                  <p className="mt-1 text-xs text-[var(--chrome-muted)]">{pack.description}</p>
                  <a
                    className="mt-2 inline-block text-xs text-[var(--chrome-accent-muted)] hover:text-[var(--chrome-accent)]"
                    href={pack.repositoryUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View on GitHub
                  </a>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    installed
                      ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border border-[var(--chrome-border)] text-[var(--chrome-muted)]"
                  }`}
                >
                  {installed ? "Installed" : "Not installed"}
                </span>
              </div>

              {isActive && seedProgress ? (
                <div className="mt-3 space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--chrome-inset-bg)]">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all"
                      style={{ width: `${seedProgress.phase === "complete" ? 100 : progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--chrome-text)]">{seedProgress.message}</p>
                  <p className="text-xs text-[var(--chrome-faint)]">
                    {seedProgress.symbolsImported.toLocaleString()} symbols imported so far
                  </p>
                </div>
              ) : null}

              <BubbleButton
                variant="primary"
                className="mt-3 w-full"
                disabled={Boolean(isActive) || installed}
                onClick={() => onInstallPack(pack.id)}
              >
                {installed ? "Already Installed" : isActive ? "Installing..." : `Install ${pack.label}`}
              </BubbleButton>
            </article>
          );
        })}
      </div>
    </GlassPanel>
  );
};

export default BundledLibraryPanel;
