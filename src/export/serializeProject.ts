import type { SchematicProject } from "../library/types";

export const serializeProject = (project: SchematicProject): string => {
  console.info("[serializeProject] Serializing project payload", { id: project.id });

  return JSON.stringify(project, null, 2);
};

export default serializeProject;
