import type { LibrarySymbol, SchematicProject, SymbolInstance } from "../library/types";
import { ComponentInspector } from "./ComponentInspector";
import { GlassPanel } from "./ui/GlassPanel";
import { chromeBody, chromeTitle } from "./ui/uiStyles";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";
import { schematicColorVar } from "../theme/schematicTheme";

type SelectedCanvasObject =
  | {
      type: "symbol";
      name: string;
      detail: string;
    }
  | {
      type: "wire";
      name: string;
      detail: string;
    }
  | {
      type: "net-label";
      name: string;
      detail: string;
    }
  | {
      type: "text-note";
      name: string;
      detail: string;
    };

type InspectorPanelProps = {
  project: SchematicProject;
  symbolIndex: Record<string, LibrarySymbol>;
  selectedIds: string[];
  selectedCanvasObject?: SelectedCanvasObject;
  netHighlightEnabled?: boolean;
  onNetHighlightEnabledChange?: (enabled: boolean) => void;
};

const resolveSelectedSymbol = (
  project: SchematicProject,
  symbolIndex: Record<string, LibrarySymbol>,
  selectedId?: string,
): { instance: SymbolInstance; librarySymbol: LibrarySymbol } | undefined => {
  console.info("[InspectorPanel] Resolving selected symbol for inspector", { selectedId });

  if (!selectedId) {
    return undefined;
  }

  const instance = project.symbols.find((symbol) => symbol.id === selectedId);

  if (!instance) {
    return undefined;
  }

  const librarySymbol = symbolIndex[instance.symbolId];

  if (!librarySymbol) {
    return undefined;
  }

  return { instance, librarySymbol };
};

export const InspectorPanel = ({
  project,
  symbolIndex,
  selectedIds,
  selectedCanvasObject,
  netHighlightEnabled = true,
  onNetHighlightEnabledChange,
}: InspectorPanelProps) => {
  console.info("[InspectorPanel] Rendering inspector panel", { selectedIds, netHighlightEnabled });

  const selectedSymbol = resolveSelectedSymbol(project, symbolIndex, selectedIds[0]);

  return (
    <GlassPanel>
      <h2 className={chromeTitle}>Inspector</h2>

      {onNetHighlightEnabledChange ? (
        <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--chrome-inset-border)] bg-[var(--chrome-inset-bg)] px-3 py-2.5 text-sm text-[var(--chrome-text)]">
          <span>Highlight connected net</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-cyan-400"
            checked={netHighlightEnabled}
            onChange={(event) => onNetHighlightEnabledChange(event.target.checked)}
          />
        </label>
      ) : null}

      {selectedSymbol ? (
        <div className="mt-3">
          <ComponentInspector
            symbol={selectedSymbol.librarySymbol}
            reference={selectedSymbol.instance.ref}
            value={selectedSymbol.instance.value}
          />
        </div>
      ) : selectedCanvasObject ? (
        <div
          className="mt-3 rounded-2xl border p-4"
          style={{
            borderColor: "rgba(192, 112, 112, 0.35)",
            backgroundColor: schematicColorVar("background"),
          }}
        >
          <p
            className="font-bold"
            style={{
              color: schematicColorVar("valueText"),
              fontFamily: kicadSchematicTheme.fontFamily,
              fontSize: "1.1rem",
            }}
          >
            {selectedCanvasObject.name}
          </p>
          <p className={`mt-2 ${chromeBody}`}>{selectedCanvasObject.detail}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.12em] text-[var(--chrome-faint)]">
            Type: {selectedCanvasObject.type.replace("-", " ")}
          </p>
        </div>
      ) : (
        <p className={`mt-2 ${chromeBody}`}>Select a symbol, wire, or label on the canvas to inspect it here.</p>
      )}
    </GlassPanel>
  );
};

export default InspectorPanel;
