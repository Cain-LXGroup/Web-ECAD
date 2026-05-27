import { parseKiCadLegacyLib } from "./parseKiCadLegacyLib";
import { parseKiCadSym } from "./parseKiCadSym";
import { saveSymbols } from "../storage/libraryStore";

export type LibraryFileImportResult = {
  fileName: string;
  importedCount: number;
  skippedCount: number;
  errors: string[];
};

const getLibraryName = (fileName: string): string => {
  console.info("[importLibraryFiles] Resolving library name from file", { fileName });

  const baseName = fileName.split(/[/\\]/).pop() ?? fileName;
  return baseName.replace(/\.(lib|kicad_sym)$/i, "");
};

export const importLibraryFile = async (file: File): Promise<LibraryFileImportResult> => {
  console.info("[importLibraryFiles] Importing library file", { fileName: file.name });

  const fileName = file.name;
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  const libraryName = getLibraryName(fileName);
  const content = await file.text();

  if (extension === "lib") {
    const parsed = parseKiCadLegacyLib(content, libraryName);

    if (parsed.symbols.length > 0) {
      await saveSymbols(parsed.symbols);
    }

    return {
      fileName,
      importedCount: parsed.symbols.length,
      skippedCount: parsed.skipped,
      errors: parsed.errors,
    };
  }

  if (extension === "kicad_sym") {
    const symbols = parseKiCadSym(content, libraryName);

    if (symbols.length > 0) {
      await saveSymbols(symbols);
    }

    return {
      fileName,
      importedCount: symbols.length,
      skippedCount: 0,
      errors:
        symbols.length === 0
          ? ["Modern .kicad_sym import is not implemented yet. Use .lib files for now."]
          : [],
    };
  }

  return {
    fileName,
    importedCount: 0,
    skippedCount: 1,
    errors: [`Unsupported file type ".${extension}". Use .lib or .kicad_sym files.`],
  };
};

export const importLibraryFiles = async (files: FileList | File[]): Promise<LibraryFileImportResult[]> => {
  console.info("[importLibraryFiles] Importing multiple library files", {
    fileCount: files.length,
  });

  const results: LibraryFileImportResult[] = [];

  for (const file of Array.from(files)) {
    try {
      results.push(await importLibraryFile(file));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown import error";
      results.push({
        fileName: file.name,
        importedCount: 0,
        skippedCount: 1,
        errors: [message],
      });
    }
  }

  return results;
};

export default importLibraryFiles;
