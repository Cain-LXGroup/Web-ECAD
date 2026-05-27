import { useRef, useState } from "react";

import { BubbleButton } from "./ui/BubbleButton";
import { GlassPanel } from "./ui/GlassPanel";
import { chromeBody, chromeTitle, glassPanelInset } from "./ui/uiStyles";

type ExportPanelProps = {
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onExportProjectJson: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
};

export const ExportPanel = ({
  onExportBackup,
  onImportBackup,
  onExportProjectJson,
  onExportSvg,
  onExportPng,
  onExportPdf,
}: ExportPanelProps) => {
  console.info("[ExportPanel] Rendering export panel");

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const runExport = async (label: string, action: () => void | Promise<void>) => {
    console.info("[ExportPanel] Running export action", { label });

    setIsExporting(true);

    try {
      await action();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <GlassPanel>
      <div className="mb-3">
        <h3 className={chromeTitle}>Export</h3>
        <p className={`mt-1 ${chromeBody}`}>
          Export the current view, project file, or a full local backup of symbols and projects.
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
        <p className={`text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${glassPanelInset} px-3 py-2`}>
          Current schematic
        </p>
        <div className="grid grid-cols-2 gap-2">
          <BubbleButton
            variant="primary"
            className="w-full !py-2.5 text-sm"
            disabled={isExporting}
            onClick={() => {
              void runExport("svg", onExportSvg);
            }}
          >
            SVG
          </BubbleButton>
          <BubbleButton
            variant="primary"
            className="w-full !py-2.5 text-sm"
            disabled={isExporting}
            onClick={() => {
              void runExport("png", onExportPng);
            }}
          >
            PNG
          </BubbleButton>
          <BubbleButton
            variant="secondary"
            className="w-full !py-2.5 text-sm"
            disabled={isExporting}
            onClick={() => {
              void runExport("pdf", onExportPdf);
            }}
          >
            PDF
          </BubbleButton>
          <BubbleButton
            variant="secondary"
            className="w-full !py-2.5 text-sm"
            disabled={isExporting}
            onClick={() => {
              void runExport("json", onExportProjectJson);
            }}
          >
            Project JSON
          </BubbleButton>
        </div>

        <p className={`text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${glassPanelInset} px-3 py-2`}>
          Full backup
        </p>
        <BubbleButton
          variant="primary"
          className="w-full"
          disabled={isExporting}
          onClick={() => {
            void runExport("backup", onExportBackup);
          }}
        >
          Export Backup
        </BubbleButton>
        <BubbleButton
          variant="secondary"
          className="w-full"
          disabled={isExporting}
          onClick={() => importInputRef.current?.click()}
        >
          Import Backup
        </BubbleButton>
      </div>
    </GlassPanel>
  );
};

export default ExportPanel;
