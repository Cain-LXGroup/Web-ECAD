import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import type { BottomToolbarAction } from "./routes";
import { APP_DISPLAY_VERSION } from "./version";
import { CanvasContextMenu, type CanvasContextMenuTarget } from "../components/CanvasContextMenu";
import { EditorContextRail } from "../components/EditorContextRail";
import { EditorSettingsPanel } from "../components/EditorSettingsPanel";
import { SchematicColorsPanel } from "../components/SchematicColorsPanel";
import { UndoRedoRail } from "../components/UndoRedoRail";
import { InspectorPanel } from "../components/InspectorPanel";
import { ErcPanel } from "../components/ErcPanel";
import { ExportPanel } from "../components/ExportPanel";
import { ImportPanel, type ImportPanelStatus } from "../components/ImportPanel";
import { ProjectPanel } from "../components/ProjectPanel";
import { Sidebar } from "../components/Sidebar";
import { SymbolSearchPanel } from "../components/SymbolSearchPanel";
import { EditorRightRail } from "../components/EditorRightRail";
import { WireToolRail } from "../components/WireToolRail";
import { FloatingChromeButton } from "../components/FloatingChromeButton";
import { WireToolPalette } from "../components/WireToolPalette";
import { WorkspaceMenu } from "../components/WorkspaceMenu";
import { GlassPanel } from "../components/ui/GlassPanel";
import { SheetDrawer } from "../components/ui/SheetDrawer";
import { BubbleButton } from "../components/ui/BubbleButton";
import { chromeBody, chromeTitle } from "../components/ui/uiStyles";
import { SchematicCanvas, type SchematicCanvasHandle } from "../editor/SchematicCanvas";
import { computeNetHighlight, type NetHighlightSet } from "../editor/netHighlight";
import { computeErcViolations } from "../editor/erc";
import { FavouritesDockStrip } from "../components/FavouritesDockStrip";
import { createDefaultSheet, normalizeProject } from "../editor/projectSheets";
import { DEFAULT_GRID_SIZE } from "../editor/snapping";
import { useEditorState } from "../editor/useEditorState";
import { exportBackup, importBackup } from "../export/backup";
import { exportPdf } from "../export/exportPdf";
import { exportPng } from "../export/exportPng";
import { exportProjectJson } from "../export/exportProjectJson";
import { exportSvg } from "../export/exportSvg";
import { useAppSettings } from "../hooks/useAppSettings";
import { useEditorKeyboardShortcuts } from "../hooks/useEditorKeyboardShortcuts";
import { playPlacementClick } from "../lib/feedback";
import type { BundledLibraryPackId } from "../library/bundledLibraryCatalog";
import { importLibraryFiles } from "../library/importLibraryFiles";
import {
  isBundledLibraryPackInstalled,
  seedBundledLibraryPack,
  type BundledLibrarySeedProgress,
} from "../library/seedBundledLibraries";
import { getDefaultSymbolInstanceValue } from "../editor/symbolDisplay";
import { getTestSymbols } from "../library/testSymbols";
import type { LibrarySymbol, SchematicProject } from "../library/types";
import { getAllSymbols, saveSymbols, searchStoredSymbols } from "../storage/libraryStore";
import { deleteProject, getAllProjects, saveProject } from "../storage/projectStore";

const createBlankProject = (name: string): SchematicProject => {
  console.info("[App] Creating blank project", { name });

  const timestamp = Date.now();
  const defaultSheet = createDefaultSheet("Sheet 1");

  return normalizeProject({
    id: uuidv4(),
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    symbols: defaultSheet.symbols,
    wires: defaultSheet.wires,
    netLabels: defaultSheet.netLabels,
    textNotes: defaultSheet.textNotes,
    gridSize: DEFAULT_GRID_SIZE,
    sheets: [defaultSheet],
    activeSheetId: defaultSheet.id,
  });
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
  const [contextMenuTarget, setContextMenuTarget] = useState<CanvasContextMenuTarget | null>(null);
  const [isFavouritesDockOpen, setIsFavouritesDockOpen] = useState(false);
  const [renamingSheetId, setRenamingSheetId] = useState<string | undefined>(undefined);
  const [sheetRenameDraft, setSheetRenameDraft] = useState("");
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveSkipRef = useRef(true);
  const appSettings = useAppSettings();

  const symbolIndex = useMemo(
    () =>
      allSymbols.reduce<Record<string, LibrarySymbol>>((nextIndex, symbol) => {
        nextIndex[symbol.id] = symbol;
        return nextIndex;
      }, {}),
    [allSymbols],
  );

  const editor = useEditorState(editorSeedProject, symbolIndex, {
    wireRouteClearance: appSettings.wireRouteClearance,
  });

  const getCanvasSvg = useCallback(() => {
    console.info("[App] Resolving schematic canvas SVG for export");

    const svg = canvasRef.current?.getSvgElement();
    if (!svg) {
      throw new Error("Schematic canvas is not ready yet.");
    }

    return svg;
  }, []);

  const handleFitView = useCallback(() => {
    console.info("[App] Fitting viewport to content");

    if (editor.state.selectedIds.length > 0) {
      editor.fitToSelection(symbolIndex);
      setStatusMessage("Zoomed to the current selection.");
      return;
    }

    editor.fitToContent(symbolIndex);
    setStatusMessage("Zoomed to fit the schematic.");
  }, [editor, symbolIndex]);

  const emptyNetHighlight = useMemo<NetHighlightSet>(
    () => ({
      wireIds: new Set(),
      labelIds: new Set(),
      symbolInstanceIds: new Set(),
    }),
    [],
  );

  const netHighlight = useMemo(() => {
    if (!appSettings.netHighlightEnabled) {
      return emptyNetHighlight;
    }

    return computeNetHighlight(editor.state.project, symbolIndex, editor.state.selectedIds);
  }, [
    appSettings.netHighlightEnabled,
    editor.state.project,
    editor.state.selectedIds,
    emptyNetHighlight,
    symbolIndex,
  ]);

  const ercViolations = useMemo(
    () => computeErcViolations(editor.state.project, symbolIndex),
    [editor.state.project, symbolIndex],
  );

  useEffect(() => {
    console.info("[App] Scheduling debounced auto-save", { projectId: editor.state.project.id });

    if (!activeProjectId || editor.state.project.id !== activeProjectId) {
      return;
    }

    if (autoSaveSkipRef.current) {
      autoSaveSkipRef.current = false;
      return;
    }

    setAutoSaveState("saving");
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const projectToSave = normalizeProject({
            ...editor.state.project,
            activeSheetId: editor.state.activeSheetId,
            name: editor.state.project.name.trim() || "Untitled Project",
            updatedAt: Date.now(),
          });
          await saveProject(projectToSave);
          setEditorSeedProject(projectToSave);
          setAutoSaveState("saved");
        } catch (error) {
          console.error("[App] Auto-save failed", error);
          setAutoSaveState("idle");
        }
      })();
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeProjectId, editor.state.activeSheetId, editor.state.project]);

  useEditorKeyboardShortcuts({
    onSetTool: editor.setTool,
    onCopy: () => {
      if (editor.copySelection()) {
        setStatusMessage("Copied selection to clipboard.");
      }
    },
    onCut: () => {
      if (editor.cutSelection()) {
        setStatusMessage("Cut selection to clipboard.");
      }
    },
    onPaste: () => {
      if (editor.pasteSelection()) {
        setStatusMessage("Pasted selection with offset.");
      }
    },
    onDeleteSelected: () => {
      const hadWireNode = Boolean(editor.state.selectedWireNode);
      editor.deleteSelected();
      setStatusMessage(
        hadWireNode ? "Removed the wire corner." : "Deleted the selected object.",
      );
    },
    onCancelWire: () => {
      editor.cancelWire();
      setStatusMessage("Cancelled the current wire draft.");
    },
    onFinishWire: () => {
      editor.finishWire();
      playPlacementClick(appSettings.soundEnabled);
      setStatusMessage("Placed the current wire.");
    },
    onUndo: () => {
      editor.undo();
      setStatusMessage("Undid the last action.");
    },
    onRedo: () => {
      editor.redo();
      setStatusMessage("Redid the last action.");
    },
    hasWireDraft: Boolean(editor.state.wireDraft),
  });
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId),
    [activeProjectId, projects],
  );
  const selectedLibrarySymbol = selectedSymbolId ? symbolIndex[selectedSymbolId] : undefined;
  const favoriteSymbols = useMemo(
    () => allSymbols.filter((symbol) => appSettings.starredSymbolIds.includes(symbol.id)),
    [allSymbols, appSettings.starredSymbolIds],
  );
  const librarySymbolsForPanel = useMemo(() => {
    const favoriteIds = new Set(appSettings.starredSymbolIds);
    return visibleSymbols.filter((symbol) => !favoriteIds.has(symbol.id));
  }, [appSettings.starredSymbolIds, visibleSymbols]);
  const projectSheets = editor.state.project.sheets ?? [];
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
      autoSaveSkipRef.current = true;
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

    const updatedProject = normalizeProject({
      ...editor.state.project,
      activeSheetId: editor.state.activeSheetId,
      name: editor.state.project.name.trim() || "Untitled Project",
      updatedAt: Date.now(),
    });

    await saveProject(updatedProject);
    await refreshProjects();
    setActiveProjectId(updatedProject.id);
    setEditorSeedProject(updatedProject);
    editor.loadProject(updatedProject);
    autoSaveSkipRef.current = true;
    setAutoSaveState("saved");
    setStatusMessage(`Saved project "${updatedProject.name}".`);
  }, [editor, refreshProjects]);

  const handleDuplicateProject = useCallback(async () => {
    console.info("[App] Handling project duplication");

    if (!editor.state.project) {
      setStatusMessage("Select or create a project before duplicating it.");
      return;
    }

    const duplicateProject = normalizeProject({
      ...editor.state.project,
      id: uuidv4(),
      name: `${editor.state.project.name} Copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

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
        autoSaveSkipRef.current = true;
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
    (actionId: BottomToolbarAction) => {
      console.info("[App] Handling bottom toolbar action", { actionId });

      editor.setTool(actionId);
      if (actionId === "label-global") {
        setStatusMessage("Placing global net labels (⬡). Press G to switch back.");
        return;
      }

      if (actionId === "label-sheet") {
        setStatusMessage("Placing sheet-local net labels (▫). Press L to switch back.");
        return;
      }

      setStatusMessage(`Switched to ${actionId} tool.`);
    },
    [editor],
  );

  const hasSymbolSelection = useMemo(
    () =>
      editor.state.selectedIds.some((selectedId) =>
        editor.state.project.symbols.some((symbol) => symbol.id === selectedId),
      ),
    [editor.state.project.symbols, editor.state.selectedIds],
  );

  const hasLabelSelection = useMemo(
    () =>
      editor.state.selectedIds.some((selectedId) =>
        editor.state.project.netLabels.some((label) => label.id === selectedId),
      ),
    [editor.state.project.netLabels, editor.state.selectedIds],
  );

  const hasTransformableSelection = hasSymbolSelection || hasLabelSelection;

  const singleSelectedSymbolId = useMemo(() => {
    if (editor.state.selectedIds.length !== 1) {
      return undefined;
    }

    const selectedId = editor.state.selectedIds[0];
    return editor.state.project.symbols.some((symbol) => symbol.id === selectedId) ? selectedId : undefined;
  }, [editor.state.project.symbols, editor.state.selectedIds]);

  const isPinTextEditActive = Boolean(editor.state.symbolPinTextEditInstanceId);

  const selectContextActions = useMemo(() => {
    if (editor.state.activeTool !== "select" || editor.state.selectedIds.length === 0) {
      return [];
    }

    if (isPinTextEditActive) {
      const selectedTarget = editor.state.selectedSymbolText?.target;
      const canEditSelectedText = Boolean(
        selectedTarget && selectedTarget.type !== "pin",
      );

      return [
        {
          id: "edit-symbol-text-content",
          icon: "edit" as const,
          label: "Edit text",
          disabled: !canEditSelectedText,
          onClick: () => {
            const selection = editor.state.selectedSymbolText;
            if (!selection || selection.target.type === "pin") {
              return;
            }

            const instance = editor.state.project.symbols.find((symbol) => symbol.id === selection.instanceId);
            if (!instance) {
              return;
            }

            const target = selection.target;
            let currentText = "";
            if (target.type === "ref") {
              currentText = instance.ref;
            } else if (target.type === "value") {
              currentText = instance.value ?? "";
            } else if (target.type === "custom") {
              currentText =
                instance.customTextLabels?.find((label) => label.id === target.id)?.text ?? "";
            }

            const nextText = window.prompt("Edit label text", currentText);
            if (nextText === null) {
              return;
            }

            editor.setSelectedSymbolTextContent(nextText);
            setStatusMessage("Updated symbol label text.");
          },
        },
        {
          id: "add-symbol-text",
          icon: "text" as const,
          label: "Add text",
          onClick: () => {
            const instanceId = editor.state.symbolPinTextEditInstanceId;
            if (!instanceId) {
              return;
            }

            const instance = editor.state.project.symbols.find((symbol) => symbol.id === instanceId);
            const symbol = instance ? symbolIndex[instance.symbolId] : undefined;
            const defaultText =
              instance?.value?.trim() ||
              (symbol ? getDefaultSymbolInstanceValue(symbol) : undefined) ||
              "10k";
            const nextText = window.prompt("New label text", defaultText);
            if (nextText === null) {
              return;
            }

            if (instance && !instance.value?.trim()) {
              editor.selectSymbolText(instanceId, { type: "value" });
              editor.setSelectedSymbolTextContent(nextText);
              setStatusMessage("Set component value text.");
              return;
            }

            editor.addSymbolCustomText(instanceId, nextText);
            setStatusMessage("Added custom symbol text.");
          },
        },
        {
          id: "rotate-symbol-text",
          icon: "rotate" as const,
          label: "Rotate label",
          disabled: !editor.state.selectedSymbolText,
          onClick: () => {
            editor.rotateSelectedSymbolText();
            setStatusMessage("Rotated the selected label.");
          },
        },
        {
          id: "done-symbol-text-edit",
          icon: "edit" as const,
          label: "Done editing symbol text",
          variant: "primary" as const,
          onClick: () => {
            editor.exitSymbolPinTextEdit();
            setStatusMessage("Finished editing symbol text.");
          },
        },
        {
          id: "zoom-selection",
          icon: "zoom" as const,
          label: "Zoom to selection",
          onClick: () => {
            editor.fitToSelection(symbolIndex);
            setStatusMessage("Zoomed to the current selection.");
          },
        },
        {
          id: "delete",
          icon: "delete" as const,
          label: "Delete",
          onClick: () => {
            editor.deleteSelected();
            setStatusMessage("Deleted the selected object.");
          },
        },
      ];
    }

    const actions = [
      ...(singleSelectedSymbolId
        ? [
            {
              id: "edit-pin-text",
              icon: "edit" as const,
              label: "Edit symbol text",
              variant: "primary" as const,
              onClick: () => {
                editor.enterSymbolPinTextEdit(singleSelectedSymbolId);
                setStatusMessage(
                  "Symbol text edit mode. Tap ref, value, pin labels, or add text; drag to move or rotate.",
                );
              },
            },
          ]
        : []),
      {
        id: "rotate",
        icon: "rotate" as const,
        label: "Rotate",
        disabled: !hasTransformableSelection,
        onClick: () => {
          editor.rotateSelected();
          setStatusMessage(hasLabelSelection ? "Rotated the selected label." : "Rotated the selected symbol.");
        },
      },
      {
        id: "mirror",
        icon: "mirror" as const,
        label: "Mirror",
        disabled: !hasTransformableSelection,
        onClick: () => {
          editor.mirrorSelected();
          setStatusMessage(hasLabelSelection ? "Mirrored the selected label." : "Mirrored the selected symbol.");
        },
      },
      {
        id: "zoom-selection",
        icon: "zoom" as const,
        label: "Zoom to selection",
        variant: singleSelectedSymbolId ? undefined : ("primary" as const),
        onClick: () => {
          editor.fitToSelection(symbolIndex);
          setStatusMessage("Zoomed to the current selection.");
        },
      },
      {
        id: "delete",
        icon: "delete" as const,
        label: "Delete",
        onClick: () => {
          editor.deleteSelected();
          setStatusMessage("Deleted the selected object.");
        },
      },
    ];

    return actions;
  }, [
    editor,
    editor.state.activeTool,
    editor.state.selectedIds.length,
    editor.state.selectedSymbolText,
    editor.state.symbolPinTextEditInstanceId,
    hasLabelSelection,
    hasTransformableSelection,
    isPinTextEditActive,
    singleSelectedSymbolId,
    symbolIndex,
  ]);

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
        netHighlightEnabled={appSettings.netHighlightEnabled}
        onNetHighlightEnabledChange={appSettings.setNetHighlightEnabled}
      />

      <ErcPanel
        violations={ercViolations}
        suppressionCount={editor.state.project.ercSuppressions?.length ?? 0}
        onSelectViolation={(violation) => {
          editor.focusErcViolation(violation, symbolIndex);
          const label = violation.symbolRef ?? violation.title;
          setStatusMessage(
            violation.pinNumber
              ? `Focused ${label} pin ${violation.pinNumber} for ERC.`
              : `Focused ${label} for ERC.`,
          );
        }}
        onSuppressViolation={(violation) => {
          editor.suppressErcViolation(violation);
          setStatusMessage("Suppressed ERC marker for this target.");
        }}
        onClearSuppressions={() => {
          editor.clearErcSuppressions();
          setStatusMessage("Cleared all ERC suppressions.");
        }}
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

      {editor.state.activeTool === "label-global" || editor.state.activeTool === "label-sheet" ? (
        <GlassPanel>
          <h2 className={chromeTitle}>Net Label Scope</h2>
          <p className={`mt-2 ${chromeBody}`}>
            Global labels connect across sheets; sheet labels stay on this sheet only.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["sheet", "global"] as const).map((scope) => (
              <BubbleButton
                key={scope}
                variant={editor.state.labelPlacementScope === scope ? "primary" : "secondary"}
                className="w-full !py-2.5 text-sm"
                onClick={() => {
                  editor.setLabelPlacementScope(scope);
                  setStatusMessage(
                    scope === "global"
                      ? "Placing global net labels (⬡)."
                      : "Placing sheet-local net labels (▫).",
                  );
                }}
              >
                {scope === "global" ? "Global ⬡" : "Sheet ▫"}
              </BubbleButton>
            ))}
          </div>
        </GlassPanel>
      ) : null}

      <GlassPanel>
        <h2 className={chromeTitle}>Wire Routing</h2>
        <p className={`mt-2 ${chromeBody}`}>
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
        <h2 className={chromeTitle}>Wire Draft</h2>
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
        <h2 className={chromeTitle}>Local Data Status</h2>
        <dl className="mt-4 space-y-3 text-sm text-[var(--chrome-text)]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--chrome-faint)]">Symbols</dt>
            <dd>{allSymbols.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--chrome-faint)]">Projects</dt>
            <dd>{projects.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--chrome-faint)]">Selected Symbol</dt>
            <dd>{selectedSymbolId ?? "None"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--chrome-faint)]">Canvas Symbols</dt>
            <dd>{editor.state.project.symbols.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--chrome-faint)]">Wire Mode</dt>
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

  const workspaceMenuPanels = (
    <>
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
      <EditorSettingsPanel
        fingerPansOnly={appSettings.fingerPansOnly}
        soundEnabled={appSettings.soundEnabled}
        wireRouteClearance={appSettings.wireRouteClearance}
        schematicTextSize={appSettings.schematicTextSize}
        colorScheme={appSettings.colorScheme}
        onFingerPansOnlyChange={appSettings.setFingerPansOnly}
        onSoundEnabledChange={appSettings.setSoundEnabled}
        onWireRouteClearanceChange={appSettings.setWireRouteClearance}
        onSchematicTextSizeChange={appSettings.setSchematicTextSize}
        onColorSchemeChange={appSettings.setColorScheme}
      />
      <SchematicColorsPanel
        colorScheme={appSettings.colorScheme}
        schematicColors={appSettings.schematicColors}
        onColorChange={appSettings.setSchematicColor}
        onReset={appSettings.resetSchematicColors}
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
    </>
  );

  return (
    <div className="app-chrome flex h-svh flex-col overflow-hidden bg-transparent text-[var(--chrome-text)]">
      <div className="relative grid h-full min-h-0 w-full flex-1 gap-0 overflow-hidden p-0 xl:mx-auto xl:max-w-[1800px] xl:gap-4 xl:p-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <div className="hidden xl:block">
          <Sidebar title="Symbol Library">
            <SymbolSearchPanel
              query={symbolQuery}
              symbols={librarySymbolsForPanel}
              favoriteSymbols={favoriteSymbols}
              starredSymbolIds={appSettings.starredSymbolIds}
              selectedSymbolId={selectedSymbolId}
              onQueryChange={setSymbolQuery}
              onSelectSymbol={setSelectedSymbolId}
              onPlaceSymbol={handlePlaceSelectedSymbol}
              onToggleStar={appSettings.toggleStarredSymbol}
            />
          </Sidebar>
        </div>

        <div className="pointer-events-none absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex flex-wrap gap-2">
          <div className="pointer-events-auto">
            <WorkspaceMenu
              label="Menu"
              projectName={editor.state.project.name}
              statusMessage={statusMessage}
              onSaveProject={() => {
                void handleSaveProject();
              }}
            >
              {workspaceMenuPanels}
            </WorkspaceMenu>
          </div>
          <FloatingChromeButton
            className="pointer-events-auto xl:hidden"
            label="Symbols"
            onClick={() => {
              console.info("[App] Toggling symbol library drawer", { next: !isLibraryDrawerOpen });
              setIsLibraryDrawerOpen((current) => !current);
            }}
          />
          <FloatingChromeButton
            className="pointer-events-auto xl:hidden"
            label="Inspector"
            onClick={() => {
              console.info("[App] Toggling inspector drawer", { next: !isInspectorDrawerOpen });
              setIsInspectorDrawerOpen((current) => !current);
            }}
          />
          <FloatingChromeButton
            className="pointer-events-auto"
            label="Fit"
            onClick={handleFitView}
          />
          <div className="pointer-events-auto flex max-w-[min(52vw,28rem)] flex-wrap items-center gap-1 rounded-full border border-[var(--chrome-border)] bg-[var(--chrome-panel)] px-2 py-1 shadow-[var(--chrome-shadow)] backdrop-blur-xl">
            {projectSheets.map((sheet) => {
              const isActive = sheet.id === editor.state.activeSheetId;
              const isRenaming = renamingSheetId === sheet.id;

              if (isRenaming) {
                return (
                  <input
                    key={sheet.id}
                    autoFocus
                    className="w-[7rem] rounded-full border border-cyan-400/50 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white outline-none"
                    value={sheetRenameDraft}
                    onChange={(event) => setSheetRenameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        const trimmed = sheetRenameDraft.trim();
                        if (trimmed) {
                          editor.renameActiveSheet(trimmed);
                          setStatusMessage(`Renamed sheet to "${trimmed}".`);
                        }
                        setRenamingSheetId(undefined);
                      }

                      if (event.key === "Escape") {
                        setRenamingSheetId(undefined);
                      }
                    }}
                    onBlur={() => {
                      const trimmed = sheetRenameDraft.trim();
                      if (trimmed && isActive) {
                        editor.renameActiveSheet(trimmed);
                        setStatusMessage(`Renamed sheet to "${trimmed}".`);
                      }
                      setRenamingSheetId(undefined);
                    }}
                  />
                );
              }

              return (
                <button
                  key={sheet.id}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold touch-manipulation ${
                    isActive
                      ? "bg-[var(--chrome-tab-active-bg)] text-[var(--chrome-tab-active-text)]"
                      : "text-[var(--chrome-tab-idle-text)] hover:bg-[var(--chrome-tab-hover-bg)]"
                  }`}
                  onClick={() => {
                    editor.setActiveSheet(sheet.id);
                    setStatusMessage(`Switched to ${sheet.name}.`);
                  }}
                  onDoubleClick={() => {
                    if (!isActive) {
                      return;
                    }

                    setRenamingSheetId(sheet.id);
                    setSheetRenameDraft(sheet.name);
                  }}
                >
                  {sheet.name}
                </button>
              );
            })}
            <button
              type="button"
              className="rounded-full px-2 py-1.5 text-lg leading-none text-[var(--chrome-tab-idle-text)] hover:bg-[var(--chrome-tab-hover-bg)] touch-manipulation"
              aria-label="Add sheet"
              onClick={() => {
                editor.addSheet();
                setStatusMessage("Added a new schematic sheet.");
              }}
            >
              +
            </button>
            {editor.state.activeSheetId ? (
              <button
                type="button"
                className="rounded-full px-2 py-1.5 text-xs font-semibold text-[var(--chrome-tab-idle-text)] hover:bg-[var(--chrome-tab-hover-bg)] touch-manipulation"
                aria-label="Rename active sheet"
                title="Rename active sheet"
                onClick={() => {
                  const activeSheet = projectSheets.find((sheet) => sheet.id === editor.state.activeSheetId);
                  if (!activeSheet) {
                    return;
                  }

                  setRenamingSheetId(activeSheet.id);
                  setSheetRenameDraft(activeSheet.name);
                }}
              >
                ✎
              </button>
            ) : null}
          </div>
          {autoSaveState !== "idle" ? (
            <span className="pointer-events-none self-center rounded-full border border-[var(--chrome-border)] bg-[var(--chrome-panel)] px-3 py-2 text-xs font-medium text-[var(--chrome-muted)] shadow-[var(--chrome-shadow)] backdrop-blur-xl">
              {autoSaveState === "saving" ? "Saving…" : "Saved"}
            </span>
          ) : null}
          <span
            className="pointer-events-none self-center rounded-full border border-[var(--chrome-border)] bg-[var(--chrome-panel)] px-3 py-2 font-mono text-xs font-semibold text-[var(--chrome-muted)] shadow-[var(--chrome-shadow)] backdrop-blur-xl"
            title="Build version"
          >
            {APP_DISPLAY_VERSION}
          </span>
        </div>

        <div className="relative flex min-h-0 flex-col gap-4">
          <SchematicCanvas
            ref={canvasRef}
            project={editor.state.project}
            symbolIndex={symbolIndex}
            selectedIds={editor.state.selectedIds}
            netHighlight={netHighlight}
            selectedWireNode={editor.state.selectedWireNode}
            ercPinFocus={editor.state.ercPinFocus}
            symbolPinTextEditInstanceId={editor.state.symbolPinTextEditInstanceId}
            selectedSymbolText={editor.state.selectedSymbolText}
            activeTool={editor.state.activeTool}
            placingSymbolId={editor.state.placingSymbolId}
            wireDraft={editor.state.wireDraft}
            schematicTextSize={appSettings.schematicTextSize}
            getWirePreviewPoints={editor.getWirePreviewPoints}
            zoom={editor.state.zoom}
            pan={editor.state.pan}
            onSelectObject={editor.selectObject}
            onClearSelection={editor.clearSelection}
            onSelectWireNode={editor.selectWireNode}
            onMoveWireNode={editor.moveWireNode}
            onCommitWireNodeEdit={editor.commitWireNodeEdit}
            onRemoveWireNodeAt={editor.removeWireNodeAt}
            onSelectSymbolText={editor.selectSymbolText}
            onClearSymbolTextSelection={editor.clearSymbolTextSelection}
            onMoveSymbolText={editor.moveSymbolTextByDelta}
            onCommitSymbolTextEdit={editor.commitSymbolTextEdit}
            onMoveSelected={editor.moveSelected}
            onSnapSelectedToGrid={editor.snapSelectedToGrid}
            onPlaceSymbol={(symbolId, point) => {
              editor.placeSymbol(symbolId, point);
              playPlacementClick(appSettings.soundEnabled);
            }}
            onStartWire={editor.startWire}
            onAddWirePoint={editor.addWirePoint}
            onAddNetLabel={editor.addNetLabel}
            onAddTextNote={editor.addTextNote}
            onSetPan={editor.setPan}
            onSetZoom={editor.setZoom}
            fingerPansOnly={appSettings.fingerPansOnly}
            onDoubleTapFit={handleFitView}
            onObjectLongPress={(target) => {
              setContextMenuTarget(target);
            }}
            onPinPointerDown={(connection) => {
              const hadWireDraft = Boolean(editor.state.wireDraft);
              editor.handlePinTap(connection);
              if (hadWireDraft) {
                playPlacementClick(appSettings.soundEnabled);
                setStatusMessage("Placed wire. Switched back to select.");
              } else {
                setStatusMessage("Wire tool active. Tap pins, wires, or the canvas to route and finish.");
              }
            }}
          />
        </div>

        <aside className="hidden min-h-0 flex-col gap-4 overflow-y-auto xl:flex">
          {inspectorSections}
        </aside>
      </div>

      {!isFloatingChromeHidden ? (
        <div className="pointer-events-none fixed right-[max(0.75rem,env(safe-area-inset-right))] bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-50 flex flex-col-reverse items-end gap-3">
          <EditorRightRail
            activeTool={editor.state.activeTool}
            onAction={handleBottomToolbarAction}
            favouritesOpen={isFavouritesDockOpen}
            onToggleFavourites={() => {
              setIsFavouritesDockOpen((current) => !current);
            }}
            theme={appSettings.colorScheme}
          />
          {editor.state.activeTool === "wire" ? (
            <WireToolRail>
              <WireToolPalette
                canPlaceWire={Boolean(editor.state.wireDraft && editor.state.wireDraft.points.length >= 2)}
                canCancelWire={Boolean(editor.state.wireDraft)}
                onPlaceWire={() => {
                  editor.finishWire();
                  playPlacementClick(appSettings.soundEnabled);
                  setStatusMessage("Placed wire. Switched back to select.");
                }}
                onCancelWire={() => {
                  editor.cancelWire();
                  setStatusMessage("Cancelled wire. Switched back to select.");
                }}
              />
            </WireToolRail>
          ) : null}
          <EditorContextRail
            hidden={isFloatingChromeHidden}
            actions={selectContextActions}
            theme={appSettings.colorScheme}
          />
          <UndoRedoRail
            hidden={isFloatingChromeHidden}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            theme={appSettings.colorScheme}
            onUndo={() => {
              editor.undo();
              setStatusMessage("Undid the last action.");
            }}
            onRedo={() => {
              editor.redo();
              setStatusMessage("Redid the last action.");
            }}
          />
        </div>
      ) : null}

      {isFavouritesDockOpen ? (
        <FavouritesDockStrip symbols={favoriteSymbols} onPlaceSymbol={handlePlaceSelectedSymbol} />
      ) : null}

      <SheetDrawer
        isOpen={isLibraryDrawerOpen}
        title="Symbol Library"
        align="left"
        onClose={() => setIsLibraryDrawerOpen(false)}
      >
        <SymbolSearchPanel
          query={symbolQuery}
          symbols={librarySymbolsForPanel}
          favoriteSymbols={favoriteSymbols}
          starredSymbolIds={appSettings.starredSymbolIds}
          selectedSymbolId={selectedSymbolId}
          onQueryChange={setSymbolQuery}
          onSelectSymbol={setSelectedSymbolId}
          onPlaceSymbol={handlePlaceSelectedSymbol}
          onToggleStar={appSettings.toggleStarredSymbol}
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

      <CanvasContextMenu
        target={contextMenuTarget}
        canDuplicate={contextMenuTarget?.objectType === "symbol"}
        onClose={() => setContextMenuTarget(null)}
        onDuplicate={() => {
          if (!contextMenuTarget) {
            return;
          }

          editor.duplicateSelected();
          setContextMenuTarget(null);
          setStatusMessage("Duplicated the selected symbol.");
        }}
        onDelete={() => {
          if (!contextMenuTarget) {
            return;
          }

          editor.selectObject(contextMenuTarget.objectId);
          editor.deleteSelected();
          setContextMenuTarget(null);
          setStatusMessage("Deleted the selected object.");
        }}
        onProperties={() => {
          if (!contextMenuTarget) {
            return;
          }

          editor.selectObject(contextMenuTarget.objectId);
          setContextMenuTarget(null);
          setIsInspectorDrawerOpen(true);
          setStatusMessage("Opened inspector for the selected object.");
        }}
        onNudgeSymbolAnnotation={
          contextMenuTarget?.objectType === "symbol"
            ? (field, direction) => {
                editor.nudgeSymbolAnnotation(contextMenuTarget.objectId, field, direction);
                setStatusMessage(`Moved ${field} label ${direction}.`);
              }
            : undefined
        }
        onRotateSymbolAnnotation={
          contextMenuTarget?.objectType === "symbol"
            ? (field) => {
                editor.rotateSymbolAnnotation(contextMenuTarget.objectId, field);
                setStatusMessage(`Rotated ${field} label.`);
              }
            : undefined
        }
        onToggleSymbolAnnotationHidden={
          contextMenuTarget?.objectType === "symbol"
            ? (field) => {
                editor.toggleSymbolAnnotationHidden(contextMenuTarget.objectId, field);
                setStatusMessage(`Toggled ${field} label visibility.`);
              }
            : undefined
        }
      />
    </div>
  );
}

export default App;
