import { sanitizeFileName } from "./downloadFile";
import { downloadSvgSnapshot } from "./schematicSvgSnapshot";

export const exportSvg = (svg: SVGSVGElement, projectName: string): void => {
  console.info("[exportSvg] Exporting schematic SVG", { projectName });

  downloadSvgSnapshot(svg, `${sanitizeFileName(projectName)}.svg`);
};

export default exportSvg;
