import type { Core } from "cytoscape";
import type { DownloadResult } from "../api/client";
import { resolveDeviceIcon, deviceIconPath } from "../icons";

export function triggerDownload(result: DownloadResult) {
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

export function downloadTextFile(content: string, filename: string, mimeType: string) {
  triggerDownload({
    blob: new Blob([content], { type: mimeType }),
    filename,
  });
}

export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildTopologySvg(cy: Core) {
  const bounds = cy.elements().boundingBox();
  const width = Math.max(320, Math.ceil(bounds.w + 120));
  const height = Math.max(240, Math.ceil(bounds.h + 120));
  const offsetX = 60 - bounds.x1;
  const offsetY = 60 - bounds.y1;

  let zoneMarkup = "";
  cy.nodes(".zone").forEach((zone) => {
    const position = zone.position();
    const zoneWidth = zone.width();
    const zoneHeight = zone.height();
    zoneMarkup += `
        <g>
          <rect x="${position.x - zoneWidth / 2 + offsetX}" y="${position.y - zoneHeight / 2 + offsetY}" width="${zoneWidth}" height="${zoneHeight}" rx="20" ry="20" fill="#f4f8fa" stroke="#aebfcb" stroke-width="2" stroke-dasharray="8 6" />
          <text x="${position.x - zoneWidth / 2 + 18 + offsetX}" y="${position.y - zoneHeight / 2 + 26 + offsetY}" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#263b4b">${escapeXml(zone.data("label") ?? "")}</text>
        </g>
      `;
  });

  let edgeMarkup = "";
  cy.edges().forEach((edge) => {
    const source = edge.source().position();
    const target = edge.target().position();
    edgeMarkup += `<line x1="${source.x + offsetX}" y1="${source.y + offsetY}" x2="${target.x + offsetX}" y2="${target.y + offsetY}" stroke="#6f8798" stroke-width="2" />`;
  });

  let nodeMarkup = "";
  cy.nodes(".device").forEach((node) => {
    const position = node.position();
    const label = String(node.data("label") ?? "");
    const lines = label.split("\n");
    const color = String(node.data("color") ?? "#5b7c91");
    const icon = resolveDeviceIcon(String(node.data("icon") ?? "unknown"));
    const iconSvgPath = deviceIconPath(icon);
    const nodeScale = Math.max(0.7, Math.min(2.2, Number(node.data("nodeScale") ?? 1)));
    const size = Math.max(30, Math.min(130, 44 * nodeScale));
    const scale = size / 24;
    nodeMarkup += `
        <g>
          <g transform="translate(${position.x + offsetX - 12 * scale} ${position.y + offsetY - 12 * scale}) scale(${scale})">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${escapeXml(color)}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              ${iconSvgPath}
            </svg>
          </g>
          ${lines
            .map(
              (line, index) =>
                `<text x="${position.x + offsetX}" y="${position.y + 44 + offsetY + index * 14}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#13212b">${escapeXml(line)}</text>`,
            )
            .join("")}
        </g>
      `;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#fbfdfe" />
  ${zoneMarkup}
  ${edgeMarkup}
  ${nodeMarkup}
</svg>`;
}
