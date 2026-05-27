import { jsPDF } from "jspdf";

import { sanitizeFileName } from "./downloadFile";
import { rasterizeSvgElement } from "./schematicSvgSnapshot";

export const exportPdf = async (svg: SVGSVGElement, projectName: string): Promise<void> => {
  console.info("[exportPdf] Exporting schematic PDF", { projectName });

  const canvas = await rasterizeSvgElement(svg, 2);
  const imageData = canvas.toDataURL("image/png");
  const orientation = canvas.width >= canvas.height ? "landscape" : "portrait";

  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [canvas.width, canvas.height],
    compress: true,
  });

  pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${sanitizeFileName(projectName)}.pdf`);
};

export default exportPdf;
