import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { bottomToolbarActions } from "./routes";
import { ContextMenu } from "../components/ContextMenu";
import { InspectorPanel } from "../components/InspectorPanel";
import { ExportPanel } from "../components/ExportPanel";
import { ImportPanel, type ImportPanelStatus } from "../components/ImportPanel";
import { ProjectPanel } from "../components/ProjectPanel";
import { Sidebar } from "../components/Sidebar";
import { SymbolSearchPanel } from "../components/SymbolSearchPanel";
import { Toolbar } from "../components/Toolbar";
import { EditorToolDock } from "../components/EditorToolDock";
import { FloatingChromeButton } from "../components/FloatingChromeButton";
import { WireToolPalette } from "../components/WireToolPalette";
import { WorkspaceMenu } from "../components/WorkspaceMenu";
import { GlassPanel } from "../components/ui/GlassPanel";
import { SheetDrawer } from "../components/ui/SheetDrawer";
import { BubbleButton } from "../components/ui/BubbleButton";
import { SchematicCanvas, type SchematicCanvasHandle } from "../editor/SchematicCanvas";
import { DEFAULT_GRID_SIZE } from "../editor/snapping";
import { useEditorState } from "../editor/useEditorState";
import { exportBackup, importBackup } from "../export/backup";
import { exportPdf } from "../export/exportPdf";
import { exportPng } from "../export/exportPng";
import { exportProjectJson } from "../export/exportProjectJson";
import { exportSvg } from "../export/exportSvg";
import { useEditorKeyboardShortcuts } from "../hooks/useEditorKeyboardShortcuts";
import type { BundledLibraryPackId } from "../library/bundledLibraryCatalog";
import { importLibraryFiles } from "../library/importLibraryFiles";
import {
  isBundledLibraryPackInstalled,
  seedBundledLibraryPack,
  type BundledLibrarySeedProgress,
} from "../library/seedBundledLibraries";
import { getTestSymbols } from "../library/testSymbols";
import type { LibrarySymbol, SchematicProject } from "../library/types";
import { getAllSymbols, saveSymbols, searchStoredSymbols } from "../storage/libraryStore";
import { deleteProject, getAllProjects, saveProject } from "../storage/projectStore";

const createBlankProject = (name: string): SchematicProject => {
  console.info("[App] Creating blank project", { name });

  const timestamp = Date.now();

  return {
    id: uuidv4(),
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    symbols: [],
    wires: [],
    netLabels: [],
    textNotes: [],
    gridSize: DEFAULT_GRID_SIZE,
  };
};

function App() {
  console.info("[App] Rendering application shell");

  const [allSymbols, setAllSymbols] = useState<LibrarySymbol[]>([]);
  const [visibleSymbols, setVisibleSymbols] = useState<LibrarySymbol[]>([]);
  const [projects, setProjects] = useState<SchematicProject[]>([]);
  const [editorSeedProject, setEditorSeedProject] = useState<SchematicProject>(() =>
    createBlankProject("Untitled Project"),
  );
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(undefined);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | undefined>(undefined);
  const [symbolQuery, setSymbolQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "Load starter symbols or import a KiCad .lib file, then place parts and wire your template.",
  );
  const [importStatus, setImportStatus] = useState<ImportPanelStatus[]>([]);
  const [isImportingLibrary, setIsImportingLibrary] = useState(false);
  const [installedBundledPacks, setInstalledBundledPacks] = useState<
    Partial<Record<BundledLibraryPackId, boolean>>
  >({});
  const [activeBundledPackId, setActiveBundledPackId] = useState<BundledLibraryPackId | undefined>(
    undefined,
  );
  const [bundledSeedProgress, setBundledSeedProgress] = useState<BundledLibrarySeedProgress | undefined>(
    undefined,
  );
  const [isLibraryDrawerOpen, setIsLibraryDrawerOpen] = useState(false);
  const [isInspectorDrawerOpen, setIsInspectorDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<SchematicCanvasHandle | null>(null);

  const symbolIndex = useMemo(
    () =>
      allSymbols.reduce<Record<string, LibrarySymbol>>((nextIndex, symbol) => {
        nextIndex[symbol.id] = symbol;
        return nextIndex;
      }, {}),
    [allSymbols],
  );

  const editor = useEditorState(editorSeedProject, symbolIndex);

  const getCanvasSvg = useCallback(() => {
    console.info("[App] Resolving schematic canvas SVG for export");

    const svg = canvasRef.current?.getSvgElement();
    if (!svg) {
      throw new Error("Schematic canvas is not ready yet.");
    }

    return svg;
  }, []);

  useEditorKeyboardShortcuts({
    onSetTool: editor.setTool,
    onDeleteSelected: () => {
      editor.deleteSelected();
      setStatusMessage("Deleted the selected object.");
    },
    onCancelWire: () => {
      editor.cancelWire();
      setStatusMessage("Cancelled the current wire draft.");
    },
    onFinishWire: () => {
      editor.finishWire();
      setStatusMessage("Placed the current wire.");
    },
    hasWireDraft: Boolean(editor.state.wireDraft),
  });
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId),
    [activeProjectId, projects],
  );
  const selectedLibrarySymbol = selectedSymbolId ? symbolIndex[selectedSymbolId] : undefined;
  const selectedCanvasObject = useMemo(() => {
    console.info("[App] Resolving selected canvas object for inspector", {
      selectedIds: editor.state.selectedIds,
    });

    const selectedId = editor.state.selectedIds[0];
    if (!selectedId) {
      return undefined;
    }

    const symbolInstance = editor.state.project.symbols.find((symbol) => symbol.id === selectedId);
    if (symbolInstance) {
      return {
        type: "symbol" as const,
        name: symbolIndex[symbolInstance.symbolId]?.name ?? symbolInstance.ref,
        detail: symbolInstance.ref,
      };
    }

    const wire = editor.state.project.wires.find((currentWire) => currentWire.id === selectedId);
    if (wire) {
      return {
        type: "wire" as const,
        name: "Wire",
        detail: `${wire.points.length} points, ${wire.routingMode ?? "manual"} routing`,
      };
    }

    const label = editor.state.project.netLabels.find((currentLabel) => currentLabel.id === selectedId);
    if (label) {
      return {
        type: "net-label" as const,
        name: label.text,
        detail: "Net label",
      };
    }

    const note = editor.state.project.textNotes.find((currentNote) => currentNote.id === selectedId);
    if (note) {
      return {
        type: "text-note" as const,
        name: note.text,
        detail: "Text note",
      };
    }

    return undefined;
  }, [editor.state.project.netLabels, editor.state.project.symbols, editor.state.project.textNotes, editor.state.project.wires, editor.state.selectedIds, symbolIndex]);

  const refreshProjects = useCallback(async (): Promise<SchematicProject[]> => {
    console.info("[App] Refreshing stored projects");

    const storedProjects = await getAllProjects();
    setProjects(storedProjects);

    setActiveProjectId((currentActiveProjectId) => {
      if (currentActiveProjectId && storedProjects.some((project) => project.id === currentActiveProjectId)) {
        return currentActiveProjectId;
      }

      return storedProjects[0]?.id;
    });

    return storedProjects;
  }, []);

  const refreshSymbols = useCallback(async (query: string): Promise<void> => {
    console.info("[App] Refreshing stored symbols", { query });

    const [storedSymbols, searchedSymbols] = await Promise.all([
      getAllSymbols(),
      searchStoredSymbols(query),
    ]);

    setAllSymbols(storedSymbols);
    setVisibleSymbols(searchedSymbols);

    setSelectedSymbolId((currentSelectedSymbolId) => {
      if (currentSelectedSymbolId && searchedSymbols.some((symbol) => symbol.id === currentSelectedSymbolId)) {
        return currentSelectedSymbolId;
      }

      return searchedSymbols[0]?.id;
    });
  }, []);

  const seedStarterSymbols = useCallback(async () => {
    console.info("[App] Seeding starter symbols into IndexedDB");

    await saveSymbols(getTestSymbols());
  }, []);

  const refreshBundledInstallState = useCallback(async (): Promise<void> => {
    console.info("[App] Refreshing bundled library install flags");

    const [digikeyInstalled, jlcpcbInstalled] = await Promise.all([
      isBundledLibraryPackInstalled("digikey"),
      isBundledLibraryPackInstalled("jlcpcb"),
    ]);

    setInstalledBundledPacks({
      digikey: digikeyInstalled,
      jlcpcb: jlcpcbInstalled,
    });
  }, []);

  useEffect(() => {
    console.info("[App] Bootstrapping dashboard state");

    const initialize = async () => {
      try {
        const storedSymbols = await getAllSymbols();
        if (storedSymbols.length === 0) {
          await seedStarterSymbols();
        }

        await Promise.all([refreshProjects(), refreshSymbols(""), refreshBundledInstallState()]);
      } catch (error) {
        console.error("[App] Failed to initialize application shell", error);
        setStatusMessage("Unable to load local data. Check the console for more details.");
      } finally {
        setIsLoading(false);
      }
    };

    void initialize();
  }, [refreshBundledInstallState, refreshProjects, refreshSymbols, seedStarterSymbols]);

  useEffect(() => {
    console.info("[App] Scheduling debounced symbol search", { symbolQuery });

    const timeout = window.setTimeout(() => {
      void refreshSymbols(symbolQuery);
    }, 150);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [refreshSymbols, symbolQuery]);

  useEffect(() => {
    console.info("[App] Syncing active stored project into editor seed", { projectId: activeProject?.id });

    if (activeProject) {
      setEditorSeedProject(activeProject);
    }
  }, [activeProject]);

  const handleCreateProject = useCallback(async () => {
    console.info("[App] Handling new project creation");

    const nextProject = createBlankProject(`Template ${projects.length + 1}`);
    await saveProject(nextProject);
    await refreshProjects();
    setActiveProjectId(nextProject.id);
    setEditorSeedProject(nextProject);
    editor.loadProject(nextProject);
    setStatusMessage(`Created project "${nextProject.name}".`);
  }, [editor, projects.length, refreshProjects]);

  const handleSaveProject = useCallback(async () => {
    console.info("[App] Handling project save");

    const updatedProject: SchematicProject = {
      ...editor.state.project,
      name: editor.state.project.name.trim() || "Untitled Project",
      updatedAt: Date.now(),
    };

    await saveProject(updatedProject);
    await refreshProjects();
    setActiveProjectId(updatedProject.id);
    setEditorSeedProject(updatedProject);
    editor.loadProject(updatedProject);
    setStatusMessage(`Saved project "${updatedProject.name}".`);
  }, [editor, refreshProjects]);

  const handleDuplicateProject = useCallback(async () => {
    console.info("[App] Handling project duplication");

    if (!editor.state.project) {
      setStatusMessage("Select or create a project before duplicating it.");
      return;
    }

    const duplicateProject: SchematicProject = {
      ...editor.state.project,
      id: uuidv4(),
      name: `${editor.state.project.name} Copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveProject(duplicateProject);
    await refreshProjects();
    setActiveProjectId(duplicateProject.id);
    setEditorSeedProject(duplicateProject);
    editor.loadProject(duplicateProject);
    setStatusMessage(`Duplicated project as "${duplicateProject.name}".`);
  }, [editor, refreshProjects]);

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      console.info("[App] Handling project deletion", { projectId });

      const projectName = projects.find((project) => project.id === projectId)?.name ?? "project";

      await deleteProject(projectId);
      const updatedProjects = await refreshProjects();

      if (projectId === activeProjectId) {
        const nextProject = updatedProjects[0] ?? createBlankProject("Untitled Project");
        setActiveProjectId(updatedProjects[0]?.id);
        setEditorSeedProject(nextProject);
        editor.loadProject(nextProject);
      }

      setStatusMessage(`Deleted "${projectName}".`);
    },
    [activeProjectId, editor, projects, refreshProjects],
  );

  const handleLoadStarterSymbols = useCallback(async () => {
    console.info("[App] Handling starter symbol load");

    await seedStarterSymbols();
    await refreshSymbols(symbolQuery);
    setStatusMessage("Loaded the starter symbol set into IndexedDB.");
  }, [refreshSymbols, seedStarterSymbols, symbolQuery]);

  const handleInstallBundledPack = useCallback(
    async (packId: BundledLibraryPackId) => {
      console.info("[App] Handling bundled library install", { packId });

      setActiveBundledPackId(packId);
      setBundledSeedProgress(undefined);

      try {
        const result = await seedBundledLibraryPack(packId, (progress) => {
          setBundledSeedProgress(progress);
        });

        await Promise.all([refreshSymbols(symbolQuery), refreshBundledInstallState()]);

        if (result.importedCount > 0) {
          setStatusMessage(
            `Installed ${result.importedCount.toLocaleString()} symbols from the ${packId === "digikey" ? "Digi-Key" : "JLCPCB"} catalog.`,
          );
        } else {
          setStatusMessage("Bundled library install finished, but no symbols were imported.");
        }
      } catch (error) {
        console.error("[App] Bundled library install failed", error);
        setStatusMessage("Bundled library install failed. Check the console for details.");
      } finally {
        setActiveBundledPackId(undefined);
      }
    },
    [refreshBundledInstallState, refreshSymbols, symbolQuery],
  );

  const handleLibraryFilesSelected = useCallback(
    async (files: FileList | null) => {
      console.info("[App] Handling library file selection", { fileCount: files?.length ?? 0 });

      if (!files || files.length === 0) {
        return;
      }

      setIsImportingLibrary(true);

      try {
        const results = await importLibraryFiles(files);
        setImportStatus(results);

        const importedTotal = results.reduce((sum, result) => sum + result.importedCount, 0);
        const errorTotal = results.reduce((sum, result) => sum + result.errors.length, 0);

        await refreshSymbols(symbolQuery);

        if (importedTotal > 0) {
          setStatusMessage(
            `Imported ${importedTotal} symbol${importedTotal === 1 ? "" : "s"} from ${results.length} file${results.length === 1 ? "" : "s"}. Search the library to place them.`,
          );
        } else if (errorTotal > 0) {
          setStatusMessage("No symbols were imported. See the import panel for details.");
        } else {
          setStatusMessage("Import finished, but no symbols were found in the selected files.");
        }
      } catch (error) {
        console.error("[App] Library import failed", error);
        setStatusMessage("Library import failed. Check the console for details.");
      } finally {
        setIsImportingLibrary(false);
      }
    },
    [refreshSymbols, symbolQuery],
  );

  const handleExportBackup = useCallback(async () => {
    console.info("[App] Handling backup export");

    await exportBackup();
    setStatusMessage("Exported a full local backup JSON file.");
  }, []);

  const handleExportProjectJson = useCallback(() => {
    console.info("[App] Handling project JSON export");

    exportProjectJson(editor.state.project);
    setStatusMessage(`Exported "${editor.state.project.name}" as JSON.`);
  }, [editor.state.project]);

  const handleExportSvg = useCallback(() => {
    console.info("[App] Handling SVG export");

    try {
      exportSvg(getCanvasSvg(), editor.state.project.name);
      setStatusMessage("Exported the current schematic view as SVG.");
    } catch (error) {
      console.error("[App] SVG export failed", error);
      setStatusMessage("SVG export failed. Try again after the canvas finishes loading.");
    }
  }, [editor.state.project.name, getCanvasSvg]);

  const handleExportPng = useCallback(async () => {
    console.info("[App] Handling PNG export");

    try {
      await exportPng(getCanvasSvg(), editor.state.project.name);
      setStatusMessage("Exported the current schematic view as PNG.");
    } catch (error) {
      console.error("[App] PNG export failed", error);
      setStatusMessage("PNG export failed. Try again after the canvas finishes loading.");
    }
  }, [editor.state.project.name, getCanvasSvg]);

  const handleExportPdf = useCallback(async () => {
    console.info("[App] Handling PDF export");

    try {
      await exportPdf(getCanvasSvg(), editor.state.project.name);
      setStatusMessage("Exported the current schematic view as PDF.");
    } catch (error) {
      console.error("[App] PDF export failed", error);
      setStatusMessage("PDF export failed. Try again after the canvas finishes loading.");
    }
  }, [editor.state.project.name, getCanvasSvg]);

  const handleImportBackup = useCallback(
    async (file: File) => {
      console.info("[App] Handling backup import", { fileName: file.name });

      await importBackup(file);
      await Promise.all([refreshProjects(), refreshSymbols(symbolQuery)]);
      const refreshedProjects = await getAllProjects();
      if (refreshedProjects[0]) {
        setActiveProjectId(refreshedProjects[0].id);
        setEditorSeedProject(refreshedProjects[0]);
        editor.loadProject(refreshedProjects[0]);
      }
      setStatusMessage(`Imported backup "${file.name}".`);
    },
    [editor, refreshProjects, refreshSymbols, symbolQuery],
  );

  const handleSelectProject = useCallback(
    (projectId: string) => {
      console.info("[App] Handling project selection from sidebar", { projectId });

      const nextProject = projects.find((project) => project.id === projectId);
      setActiveProjectId(projectId);

      if (nextProject) {
        setEditorSeedProject(nextProject);
        editor.loadProject(nextProject);
        setStatusMessage(`Loaded "${nextProject.name}".`);
      }
    },
    [editor, projects],
  );

  const handlePlaceSelectedSymbol = useCallback(
    (symbolId: string) => {
      console.info("[App] Arming symbol placement", { symbolId });

      editor.setPlacingSymbolId(symbolId);
      setSelectedSymbolId(symbolId);
      setIsLibraryDrawerOpen(false);
      setStatusMessage(`Tap the canvas to place ${symbolIndex[symbolId]?.name ?? "the selected symbol"}.`);
    },
    [editor, symbolIndex],
  );

  const handleBottomToolbarAction = useCallback(
    (actionId: (typeof bottomToolbarActions)[number]["id"]) => {
      console.info("[App] Handling bottom toolbar action", { actionId });

      if (actionId === "rotate") {
        editor.rotateSelected();
        setStatusMessage("Rotated the selected symbol.");
        return;
      }

      if (actionId === "mirror") {
        editor.mirrorSelected();
        setStatusMessage("Mirrored the selected symbol.");
        return;
      }

      if (actionId === "delete") {
        editor.deleteSelected();
        setStatusMessage("Deleted the selected object.");
        return;
      }

      editor.setTool(actionId);
      setStatusMessage(`Switched to ${actionId} tool.`);
    },
    [editor],
  );

  const handleWireRoutingModeChange = useCallback(
    (nextWireRoutingMode: "manual" | "auto") => {
      console.info("[App] Handling wire routing mode change", { nextWireRoutingMode });

      editor.setWireRoutingMode(nextWireRoutingMode);
      setStatusMessage(
        nextWireRoutingMode === "auto"
          ? "Auto-routed wires will snap between endpoints and stay connected while parts move."
          : "Manual-routed wires stay editable, but connected endpoints will remain attached to pins.",
      );
    },
    [editor],
  );

  const inspectorSections = (
    <>
      <InspectorPanel
        project={editor.state.project}
        symbolIndex={symbolIndex}
        selectedIds={editor.state.selectedIds}
        selectedCanvasObject={selectedCanvasObject}
      />

      <GlassPanel>
        <h2 className="text-base font-semibold text-white">Placement</h2>
        <p className="mt-2 text-sm text-slate-400">
          {editor.state.placingSymbolId
            ? `Ready to place ${symbolIndex[editor.state.placingSymbolId]?.name ?? "selected symbol"}.`
            : selectedLibrarySymbol
              ? `Selected library symbol: ${selectedLibrarySymbol.name}`
              : "Choose a library symbol, then tap Place."}
        </p>
      </GlassPanel>

      <GlassPanel>
        <h2 className="text-base font-semibold text-white">Wire Routing</h2>
        <p className="mt-2 text-sm text-slate-400">
          Manual keeps your placed corners. Auto re-traces a clean orthogonal path between the endpoints.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["manual", "auto"] as const).map((routingMode) => (
            <BubbleButton
              key={routingMode}
              variant={editor.state.wireRoutingMode === routingMode ? "primary" : "secondary"}
              className="w-full !py-2.5 text-sm"
              onClick={() => handleWireRoutingModeChange(routingMode)}
            >
              {routingMode === "manual" ? "Manual" : "Auto Route"}
            </BubbleButton>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="hidden xl:block">
        <h2 className="text-base font-semibold text-white">Wire Draft</h2>
        <div className="mt-3 grid gap-3">
          <BubbleButton
            variant="primary"
            disabled={!editor.state.wireDraft || editor.state.wireDraft.points.length < 2}
            onClick={() => {
              editor.finishWire();
              setStatusMessage("Finished the current wire.");
            }}
          >
            Place Wire
          </BubbleButton>
          <BubbleButton
            variant="secondary"
            disabled={!editor.state.wireDraft}
            onClick={() => {
              editor.cancelWire();
              setStatusMessage("Cancelled the current wire draft.");
            }}
          >
            Cancel Wire
          </BubbleButton>
        </div>
      </GlassPanel>

      <GlassPanel>
        <h2 className="text-base font-semibold text-white">Local Data Status</h2>
        <dl className="mt-4 space-y-3 text-sm text-slate-300">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Symbols</dt>
            <dd>{allSymbols.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Projects</dt>
            <dd>{projects.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Selected Symbol</dt>
            <dd>{selectedSymbolId ?? "None"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Canvas Symbols</dt>
            <dd>{editor.state.project.symbols.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Wire Mode</dt>
            <dd>{editor.state.wireRoutingMode}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Shell</dt>
            <dd>{isLoading ? "Loading" : "Ready"}</dd>
          </div>
        </dl>
      </GlassPanel>
    </>
  );

  const isFloatingChromeHidden = isLibraryDrawerOpen || isInspectorDrawerOpen;

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-transparent text-slate-100">
      <Toolbar
        projectName={editor.state.project.name}
        statusMessage={statusMessage}
        onSaveProject={() => {
          void handleSaveProject();
        }}
        workspaceMenu={
          <WorkspaceMenu label="Workspace">
            <ImportPanel
              symbolCount={allSymbols.length}
              importStatus={importStatus}
              isImporting={isImportingLibrary}
              installedBundledPacks={installedBundledPacks}
              bundledSeedProgress={bundledSeedProgress}
              activeBundledPackId={activeBundledPackId}
              onInstallBundledPack={(packId) => {
                void handleInstallBundledPack(packId);
              }}
              onLoadStarterSymbols={() => {
                void handleLoadStarterSymbols();
              }}
              onLibraryFilesSelected={(selectedFiles) => {
                void handleLibraryFilesSelected(selectedFiles);
              }}
            />
            <ProjectPanel
              projects={projects}
              activeProjectId={activeProjectId}
              activeProjectName={editor.state.project.name}
              onActiveProjectNameChange={editor.setProjectName}
              onCreateProject={() => {
                void handleCreateProject();
              }}
              onDuplicateProject={() => {
                void handleDuplicateProject();
              }}
              onSaveProject={() => {
                void handleSaveProject();
              }}
              onSelectProject={handleSelectProject}
              onDeleteProject={(projectId) => {
                void handleDeleteProject(projectId);
              }}
            />
            <ExportPanel
              onExportBackup={() => {
                void handleExportBackup();
              }}
              onImportBackup={(file) => {
                void handleImportBackup(file);
              }}
              onExportProjectJson={handleExportProjectJson}
              onExportSvg={handleExportSvg}
              onExportPng={() => {
                void handleExportPng();
              }}
              onExportPdf={() => {
                void handleExportPdf();
              }}
            />
          </WorkspaceMenu>
        }
      />

      <div className="relative grid h-full min-h-0 w-full flex-1 gap-0 overflow-hidden p-0 xl:mx-auto xl:max-w-[1800px] xl:gap-4 xl:p-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <div className="hidden xl:block">
          <Sidebar title="Symbol Library">
            <SymbolSearchPanel
              query={symbolQuery}
              symbols={visibleSymbols}
              selectedSymbolId={selectedSymbolId}
              onQueryChange={setSymbolQuery}
              onSelectSymbol={setSelectedSymbolId}
              onPlaceSymbol={handlePlaceSelectedSymbol}
            />
          </Sidebar>
        </div>

        <div className="pointer-events-none absolute left-3 top-3 z-40 flex gap-2 xl:hidden">
          <FloatingChromeButton
            className="pointer-events-auto"
            label="Symbols"
            onClick={() => {
              console.info("[App] Toggling symbol library drawer", { next: !isLibraryDrawerOpen });
              setIsLibraryDrawerOpen((current) => !current);
            }}
          />
          <FloatingChromeButton
            className="pointer-events-auto"
            label="Inspector"
            onClick={() => {
              console.info("[App] Toggling inspector drawer", { next: !isInspectorDrawerOpen });
              setIsInspectorDrawerOpen((current) => !current);
            }}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-4 pb-24 xl:pb-0">
          {editor.state.activeTool === "wire" && !isFloatingChromeHidden ? (
            <WireToolPalette
              canPlaceWire={Boolean(editor.state.wireDraft && editor.state.wireDraft.points.length >= 2)}
              canCancelWire={Boolean(editor.state.wireDraft)}
              onPlaceWire={() => {
                editor.finishWire();
                setStatusMessage("Placed the current wire.");
              }}
              onCancelWire={() => {
                editor.cancelWire();
                setStatusMessage("Cancelled the current wire draft.");
              }}
            />
          ) : null}

          <SchematicCanvas
            ref={canvasRef}
            project={editor.state.project}
            symbolIndex={symbolIndex}
            selectedIds={editor.state.selectedIds}
            activeTool={editor.state.activeTool}
            placingSymbolId={editor.state.placingSymbolId}
            wireDraft={editor.state.wireDraft}
            getWirePreviewPoints={editor.getWirePreviewPoints}
            zoom={editor.state.zoom}
            pan={editor.state.pan}
            onSelectObject={editor.selectObject}
            onClearSelection={editor.clearSelection}
            onMoveSelected={editor.moveSelected}
            onSnapSelectedToGrid={editor.snapSelectedToGrid}
            onPlaceSymbol={editor.placeSymbol}
            onStartWire={editor.startWire}
            onAddWirePoint={editor.addWirePoint}
            onAddNetLabel={editor.addNetLabel}
            onAddTextNote={editor.addTextNote}
            onSetPan={editor.setPan}
            onSetZoom={editor.setZoom}
          />

          <div className="hidden justify-center xl:flex">
            <EditorToolDock
              activeTool={editor.state.activeTool}
              onAction={handleBottomToolbarAction}
            />
          </div>
        </div>

        <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto xl:flex">
          {inspectorSections}
        </aside>
      </div>

      {!isFloatingChromeHidden ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-3 xl:hidden">
          <EditorToolDock
            className="pointer-events-auto max-w-full overflow-x-auto"
            activeTool={editor.state.activeTool}
            onAction={handleBottomToolbarAction}
          />
        </div>
      ) : null}

      <SheetDrawer
        isOpen={isLibraryDrawerOpen}
        title="Symbol Library"
        align="left"
        onClose={() => setIsLibraryDrawerOpen(false)}
      >
        <SymbolSearchPanel
          query={symbolQuery}
          symbols={visibleSymbols}
          selectedSymbolId={selectedSymbolId}
          onQueryChange={setSymbolQuery}
          onSelectSymbol={setSelectedSymbolId}
          onPlaceSymbol={handlePlaceSelectedSymbol}
        />
      </SheetDrawer>

      <SheetDrawer
        isOpen={isInspectorDrawerOpen}
        title="Inspector"
        align="right"
        onClose={() => setIsInspectorDrawerOpen(false)}
      >
        <div className="flex flex-col gap-4">{inspectorSections}</div>
      </SheetDrawer>

      <ContextMenu />
    </div>
  );
}

export default App;
