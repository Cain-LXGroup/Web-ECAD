import {
  getBundledLibraryPack,
  type BundledLibraryFile,
  type BundledLibraryPack,
  type BundledLibraryPackId,
} from "./bundledLibraryCatalog";
import { parseKiCadLegacyLib } from "./parseKiCadLegacyLib";
import { parseKiCadSym } from "./parseKiCadSym";
import type { LibrarySymbol } from "./types";
import { saveSymbols } from "../storage/libraryStore";
import { getAppSetting, setAppSetting } from "../storage/settingsStore";

const SAVE_BATCH_SIZE = 250;

export type BundledLibrarySeedProgress = {
  packId: BundledLibraryPackId;
  phase: "listing" | "fetching" | "parsing" | "saving" | "complete";
  fileIndex: number;
  fileCount: number;
  fileName: string;
  symbolsImported: number;
  message: string;
};

export type BundledLibrarySeedResult = {
  packId: BundledLibraryPackId;
  importedCount: number;
  fileCount: number;
  errors: string[];
};

const getLibraryName = (fileName: string): string => {
  return fileName.replace(/\.(lib|kicad_sym)$/i, "");
};

const parseBundledFile = (content: string, file: BundledLibraryFile): LibrarySymbol[] => {
  const libraryName = getLibraryName(file.fileName);

  if (file.format === "lib") {
    return parseKiCadLegacyLib(content, libraryName).symbols;
  }

  return parseKiCadSym(content, libraryName);
};

const saveSymbolsInBatches = async (symbols: LibrarySymbol[]): Promise<void> => {
  for (let index = 0; index < symbols.length; index += SAVE_BATCH_SIZE) {
    const batch = symbols.slice(index, index + SAVE_BATCH_SIZE);
    await saveSymbols(batch);
  }
};

export const isBundledLibraryPackInstalled = async (packId: BundledLibraryPackId): Promise<boolean> => {
  console.info("[seedBundledLibraries] Checking bundled library install state", { packId });

  const pack = getBundledLibraryPack(packId);

  if (!pack) {
    return false;
  }

  const value = await getAppSetting(pack.settingKey);
  return value === "installed";
};

export const seedBundledLibraryPack = async (
  packId: BundledLibraryPackId,
  onProgress?: (progress: BundledLibrarySeedProgress) => void,
): Promise<BundledLibrarySeedResult> => {
  console.info("[seedBundledLibraries] Seeding bundled library pack", { packId });

  const pack = getBundledLibraryPack(packId);

  if (!pack) {
    throw new Error(`Unknown bundled library pack "${packId}"`);
  }

  const report = (progress: BundledLibrarySeedProgress) => {
    onProgress?.(progress);
  };

  report({
    packId,
    phase: "listing",
    fileIndex: 0,
    fileCount: 0,
    fileName: "",
    symbolsImported: 0,
    message: `Listing ${pack.label} files...`,
  });

  const files = await pack.listFiles();
  const errors: string[] = [];
  let importedCount = 0;

  for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
    const file = files[fileIndex];

    report({
      packId,
      phase: "fetching",
      fileIndex,
      fileCount: files.length,
      fileName: file.fileName,
      symbolsImported: importedCount,
      message: `Downloading ${file.fileName}...`,
    });

    try {
      const response = await fetch(file.url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const content = await response.text();

      report({
        packId,
        phase: "parsing",
        fileIndex,
        fileCount: files.length,
        fileName: file.fileName,
        symbolsImported: importedCount,
        message: `Parsing ${file.fileName}...`,
      });

      const symbols = parseBundledFile(content, file);

      report({
        packId,
        phase: "saving",
        fileIndex,
        fileCount: files.length,
        fileName: file.fileName,
        symbolsImported: importedCount,
        message: `Saving ${symbols.length} symbols from ${file.fileName}...`,
      });

      await saveSymbolsInBatches(symbols);
      importedCount += symbols.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown import error";
      errors.push(`${file.fileName}: ${message}`);
    }
  }

  if (importedCount > 0) {
    await setAppSetting(pack.settingKey, "installed");
  }

  report({
    packId,
    phase: "complete",
    fileIndex: files.length,
    fileCount: files.length,
    fileName: "",
    symbolsImported: importedCount,
    message: `Finished installing ${pack.label}.`,
  });

  return {
    packId,
    importedCount,
    fileCount: files.length,
    errors,
  };
};

export const getBundledPackLabel = (pack: BundledLibraryPack): string => pack.label;

export default seedBundledLibraryPack;
