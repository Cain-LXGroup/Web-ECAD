import { saveAs } from "file-saver";

import type { LibrarySymbol, SchematicProject } from "../library/types";
import { db } from "../storage/db";

export type AppBackup = {
  version: 1;
  symbols: LibrarySymbol[];
  projects: SchematicProject[];
};

const BACKUP_FILE_PREFIX = "schematic-tablet-backup";

const createBackupPayload = async (): Promise<AppBackup> => {
  console.info("[backup] Creating backup payload");

  const [symbols, projects] = await Promise.all([db.symbols.toArray(), db.projects.toArray()]);

  return {
    version: 1,
    symbols,
    projects,
  };
};

export const exportBackup = async (): Promise<void> => {
  console.info("[backup] Exporting full application backup");

  const payload = await createBackupPayload();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });

  saveAs(file, `${BACKUP_FILE_PREFIX}-${timestamp}.json`);
};

export const importBackup = async (file: File): Promise<void> => {
  console.info("[backup] Importing full application backup", { fileName: file.name });

  const raw = await file.text();
  const parsed = JSON.parse(raw) as Partial<AppBackup>;

  if (parsed.version !== 1 || !Array.isArray(parsed.symbols) || !Array.isArray(parsed.projects)) {
    throw new Error("Unsupported backup format.");
  }

  const symbols = parsed.symbols;
  const projects = parsed.projects;

  await db.transaction("rw", db.symbols, db.projects, async () => {
    await db.symbols.bulkPut(symbols);
    await db.projects.bulkPut(projects);
  });
};
