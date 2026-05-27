import type { BundledLibraryPackId } from "../library/bundledLibraryCatalog";
import { bundledLibraryPacks } from "../library/bundledLibraryCatalog";
import type { BundledLibrarySeedProgress } from "../library/seedBundledLibraries";

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
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white">Standard Libraries</h3>
        <p className="mt-1 text-sm text-slate-400">
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
            <article key={pack.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-white">{pack.label}</h4>
                  <p className="mt-1 text-xs text-slate-400">{pack.description}</p>
                  <a
                    className="mt-2 inline-block text-xs text-cyan-300 hover:text-cyan-200"
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
                      : "border border-slate-700 text-slate-300"
                  }`}
                >
                  {installed ? "Installed" : "Not installed"}
                </span>
              </div>

              {isActive && seedProgress ? (
                <div className="mt-3 space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all"
                      style={{ width: `${seedProgress.phase === "complete" ? 100 : progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-300">{seedProgress.message}</p>
                  <p className="text-xs text-slate-500">
                    {seedProgress.symbolsImported.toLocaleString()} symbols imported so far
                  </p>
                </div>
              ) : null}

              <button
                className="mt-3 w-full touch-manipulation rounded-2xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                type="button"
                disabled={Boolean(isActive) || installed}
                onClick={() => onInstallPack(pack.id)}
              >
                {installed ? "Already Installed" : isActive ? "Installing..." : `Install ${pack.label}`}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default BundledLibraryPanel;
