import type { SchematicProject } from "../library/types";
import { downloadText } from "./downloadFile";
import { serializeProject } from "./serializeProject";

export const exportProjectJson = (project: SchematicProject): void => {
  console.info("[exportProjectJson] Exporting project JSON", { projectId: project.id });

  const safeName = project.name.trim() || "project";
  downloadText(serializeProject(project), `${safeName.replace(/[^\w.-]+/g, "_")}.json`, "application/json");
};

export default exportProjectJson;
