import Dexie, { type Table } from "dexie";

import type { LibrarySymbol, SchematicProject } from "../library/types";

export type AppSettingRecord = {
  key: string;
  value: string;
  updatedAt: number;
};

export class SchematicDb extends Dexie {
  symbols!: Table<LibrarySymbol, string>;
  projects!: Table<SchematicProject, string>;
  settings!: Table<AppSettingRecord, string>;

  constructor() {
    console.info("[db] Initializing IndexedDB schema");

    super("schematicTabletPwaDb");

    this.version(1).stores({
      symbols: "id, name, libraryName, source, importedAt",
      projects: "id, name, updatedAt",
      settings: "key, updatedAt",
    });
  }
}

export const db = new SchematicDb();
