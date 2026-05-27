import { kicadSchematicTheme } from "../theme/kicadSchematicTheme";
import { downloadBlob } from "./downloadFile";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const prepareExportSvgClone = (svg: SVGSVGElement): SVGSVGElement => {
  console.info("[schematicSvgSnapshot] Preparing SVG clone for export");

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NAMESPACE);
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const viewBox = clone.viewBox.baseVal;
  const background = document.createElementNS(SVG_NAMESPACE, "rect");
  background.setAttribute("x", String(viewBox.x));
  background.setAttribute("y", String(viewBox.y));
  background.setAttribute("width", String(viewBox.width));
  background.setAttribute("height", String(viewBox.height));
  background.setAttribute("fill", kicadSchematicTheme.background);
  clone.insertBefore(background, clone.firstChild);

  return clone;
};

export const serializeSvgElement = (svg: SVGSVGElement): string => {
  console.info("[schematicSvgSnapshot] Serializing SVG element");

  const clone = prepareExportSvgClone(svg);
  const rect = svg.getBoundingClientRect();
  const pixelWidth = Math.max(1, Math.round(rect.width));
  const pixelHeight = Math.max(1, Math.round(rect.height));

  clone.setAttribute("width", String(pixelWidth));
  clone.setAttribute("height", String(pixelHeight));

  return new XMLSerializer().serializeToString(clone);
};

export const rasterizeSvgElement = async (
  svg: SVGSVGElement,
  scale = 2,
): Promise<HTMLCanvasElement> => {
  console.info("[schematicSvgSnapshot] Rasterizing SVG element", { scale });

  const rect = svg.getBoundingClientRect();
  const pixelWidth = Math.max(1, Math.round(rect.width * scale));
  const pixelHeight = Math.max(1, Math.round(rect.height * scale));
  const svgMarkup = serializeSvgElement(svg);
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to rasterize schematic SVG."));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    context.fillStyle = kicadSchematicTheme.background;
    context.fillRect(0, 0, pixelWidth, pixelHeight);
    context.drawImage(image, 0, 0, pixelWidth, pixelHeight);

    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const downloadSvgSnapshot = (svg: SVGSVGElement, fileName: string): void => {
  console.info("[schematicSvgSnapshot] Downloading SVG snapshot", { fileName });

  const markup = `<?xml version="1.0" encoding="UTF-8"?>\n${serializeSvgElement(svg)}`;
  downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), fileName);
};
