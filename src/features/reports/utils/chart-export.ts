/**
 * Client-Side Chart Image Exporter (SVG to PNG)
 *
 * Converts a Recharts or standard SVG chart container into a high-resolution,
 * branded PNG image with an executive header banner and downloads it directly.
 */

export async function exportChartAsImage(
  containerId: string,
  fileName: string,
  reportTitle: string
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`[CHART_EXPORT] Container element #${containerId} not found.`);
      return false;
    }

    const svgElement = container.querySelector("svg");
    if (!svgElement) {
      console.warn(`[CHART_EXPORT] No SVG element found inside container #${containerId}.`);
      return false;
    }

    const svgRect = svgElement.getBoundingClientRect();
    const svgWidth = Math.max(svgRect.width, 600);
    const svgHeight = Math.max(svgRect.height, 350);

    const bannerHeight = 80;
    const padding = 24;
    const totalWidth = svgWidth + padding * 2;
    const totalHeight = svgHeight + bannerHeight + padding * 2;

    // Create 2x resolution canvas for crisp image rendering
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = totalWidth * scale;
    canvas.height = totalHeight * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    ctx.scale(scale, scale);

    // 1. Draw Canvas Background (Dark/Light aware neutral dark-slate background)
    const isDarkMode = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDarkMode ? "#09090b" : "#ffffff";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // 2. Draw Top Executive Header
    ctx.fillStyle = isDarkMode ? "#18181b" : "#f4f4f5";
    ctx.fillRect(0, 0, totalWidth, bannerHeight);

    // Accent line
    ctx.fillStyle = "#3b82f6"; // Primary blue
    ctx.fillRect(0, 0, totalWidth, 4);

    // Title text
    ctx.fillStyle = isDarkMode ? "#f4f4f5" : "#09090b";
    ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("NATIONAL FORENSIC SCIENCES UNIVERSITY (NFSU)", padding, 30);

    ctx.fillStyle = isDarkMode ? "#a1a1aa" : "#71717a";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`Report: ${reportTitle}`, padding, 50);

    const timeStr = new Date().toISOString().replace("T", " ").slice(0, 19);
    ctx.font = "10px monospace";
    ctx.fillText(`Generated: ${timeStr}`, padding, 68);

    // 3. Serialize and Render SVG
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    // Ensure xmlns is present
    if (!svgString.includes("xmlns=\"http://www.w3.org/2000/svg\"")) {
      svgString = svgString.replace("<svg ", "<svg xmlns=\"http://www.w3.org/2000/svg\" ");
    }

    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, padding, bannerHeight + padding, svgWidth, svgHeight);
        URL.revokeObjectURL(blobUrl);
        resolve();
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(blobUrl);
        reject(err);
      };
      img.src = blobUrl;
    });

    // 4. Trigger Direct File Download
    return new Promise<boolean>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        resolve(true);
      }, "image/png");
    });
  } catch (err) {
    console.error("[CHART_EXPORT_ERROR] Failed to export chart image:", err);
    return false;
  }
}
