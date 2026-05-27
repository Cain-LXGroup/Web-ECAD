import type { SchematicProject } from "../library/types";
import { db } from "./db";

export const saveProject = async (project: SchematicProject): Promise<void> => {
  console.info("[projectStore] Saving project", { id: project.id, name: project.name });

  await db.projects.put(project);
};

export const getProject = async (id: string): Promise<SchematicProject | undefined> => {
  console.info("[projectStore] Loading project", { id });

  return db.projects.get(id);
};

export const getAllProjects = async (): Promise<SchematicProject[]> => {
  console.info("[projectStore] Loading all projects");

  return db.projects.orderBy("updatedAt").reverse().toArray();
};

export const deleteProject = async (id: string): Promise<void> => {
  console.info("[projectStore] Deleting project", { id });

  await db.projects.delete(id);
};
