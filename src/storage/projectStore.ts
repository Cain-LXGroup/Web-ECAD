import { normalizeProject } from "../editor/projectSheets";
import type { SchematicProject } from "../library/types";
import { db } from "./db";

export const saveProject = async (project: SchematicProject): Promise<void> => {
  console.info("[projectStore] Saving project", { id: project.id, name: project.name });

  await db.projects.put(normalizeProject(project));
};

export const getProject = async (id: string): Promise<SchematicProject | undefined> => {
  console.info("[projectStore] Loading project", { id });

  const project = await db.projects.get(id);
  return project ? normalizeProject(project) : undefined;
};

export const getAllProjects = async (): Promise<SchematicProject[]> => {
  console.info("[projectStore] Loading all projects");

  const projects = await db.projects.orderBy("updatedAt").reverse().toArray();
  return projects.map((project) => normalizeProject(project));
};

export const deleteProject = async (id: string): Promise<void> => {
  console.info("[projectStore] Deleting project", { id });

  await db.projects.delete(id);
};
