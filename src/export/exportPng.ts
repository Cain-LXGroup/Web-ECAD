import { sanitizeFileName, downloadBlob } from "./downloadFile";
import { rasterizeSvgElement } from "./schematicSvgSnapshot";

export const exportPng = async (svg: SVGSVGElement, projectName: string): Promise<void> => {
  console.info("[exportPng] Exporting schematic PNG", { projectName });

  const canvas = await rasterizeSvgElement(svg, 2);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error("Failed to encode PNG."));
        return;
      }

      resolve(nextBlob);
    }, "image/png");
  });

  downloadBlob(blob, `${sanitizeFileName(projectName)}.png`);
};

export default exportPng;
