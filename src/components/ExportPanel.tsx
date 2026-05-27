import { useRef } from "react";

type ExportPanelProps = {
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
};

export const ExportPanel = ({ onExportBackup, onImportBackup }: ExportPanelProps) => {
  console.info("[ExportPanel] Rendering backup panel");

  const importInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white">Backup</h3>
        <p className="mt-1 text-sm text-slate-400">
          Export or restore local IndexedDB content to protect against browser storage resets.
        </p>
      </div>

      <input
        ref={importInputRef}
        className="hidden"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const [file] = Array.from(event.target.files ?? []);
          if (file) {
            onImportBackup(file);
          }
        }}
      />

      <div className="grid gap-3">
        <button
          className="w-full touch-manipulation rounded-2xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-400"
          type="button"
          onClick={onExportBackup}
        >
          Export Backup
        </button>
        <button
          className="w-full touch-manipulation rounded-2xl bg-slate-800 px-4 py-3 text-base font-medium text-white hover:bg-slate-700"
          type="button"
          onClick={() => importInputRef.current?.click()}
        >
          Import Backup
        </button>
        <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-500">
          SVG, PNG, PDF, and project JSON export arrive in a later milestone.
        </div>
      </div>
    </section>
  );
};

export default ExportPanel;
