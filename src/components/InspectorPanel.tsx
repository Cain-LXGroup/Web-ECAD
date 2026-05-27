import type { LibrarySymbol, SchematicProject, SymbolInstance } from "../library/types";
import { ComponentInspector } from "./ComponentInspector";
import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";

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
}: InspectorPanelProps) => {
  console.info("[InspectorPanel] Rendering inspector panel", { selectedIds });

  const selectedSymbol = resolveSelectedSymbol(project, symbolIndex, selectedIds[0]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <h2 className="text-base font-semibold text-white">Inspector</h2>

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
            backgroundColor: kicadSchematicTheme.background,
          }}
        >
          <p
            className="font-bold"
            style={{
              color: kicadSchematicTheme.valueText,
              fontFamily: kicadSchematicTheme.fontFamily,
              fontSize: "1.1rem",
            }}
          >
            {selectedCanvasObject.name}
          </p>
          <p className="mt-2 text-sm text-slate-400">{selectedCanvasObject.detail}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-500">
            Type: {selectedCanvasObject.type.replace("-", " ")}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-400">
          Select a symbol, wire, or label on the canvas to inspect it here.
        </p>
      )}
    </section>
  );
};

export default InspectorPanel;
