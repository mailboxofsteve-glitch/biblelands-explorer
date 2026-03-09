import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "jspdf-autotable";
import type { CustomPin } from "@/hooks/useCustomPins";

// Augment jsPDF with autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

/**
 * Capture the map canvas element as a data URL.
 * Mapbox renders on a WebGL canvas, so we grab it directly.
 */
export function captureMapCanvas(): string | null {
  const mapCanvas = document.querySelector<HTMLCanvasElement>(
    ".mapboxgl-canvas"
  );
  if (!mapCanvas) return null;
  return mapCanvas.toDataURL("image/png");
}

/**
 * Download the map as a standalone PNG.
 */
export function downloadMapScreenshot(title: string) {
  const dataUrl = captureMapCanvas();
  if (!dataUrl) return;

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${slug}-map.png`;
  a.click();
}

/**
 * Generate a 2-page PDF handout.
 * Page 1: Map image + lesson header + overlay legend
 * Page 2: Pin locations table
 */
export function generatePDFHandout(
  lessonTitle: string,
  activeOverlayNames: { name: string; color: string }[],
  pins: CustomPin[]
) {
  const dataUrl = captureMapCanvas();
  if (!dataUrl) return;

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // --- Page 1: Map ---
  // Header
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(lessonTitle, 14, 16);

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 14, 23);
  pdf.setTextColor(0, 0, 0);

  // Map image
  const imgW = pageW - 28;
  const imgH = (imgW * 9) / 16; // 16:9 aspect
  const mapY = 28;
  pdf.addImage(dataUrl, "PNG", 14, mapY, imgW, Math.min(imgH, pageH - 60));

  // Overlay legend below map
  const legendY = mapY + Math.min(imgH, pageH - 60) + 6;
  if (activeOverlayNames.length > 0 && legendY < pageH - 10) {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("Active Overlays:", 14, legendY);
    pdf.setFont("helvetica", "normal");

    let x = 50;
    for (const overlay of activeOverlayNames) {
      if (x > pageW - 40) break;
      // Color dot
      const hex = overlay.color || "#c8a020";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      pdf.setFillColor(r, g, b);
      pdf.circle(x, legendY - 1.2, 1.5, "F");
      pdf.text(overlay.name, x + 4, legendY);
      x += pdf.getTextWidth(overlay.name) + 12;
    }
  }

  // Footer
  pdf.setFontSize(7);
  pdf.setTextColor(160, 160, 160);
  pdf.text("Generated with BibleLands", pageW / 2, pageH - 5, { align: "center" });
  pdf.setTextColor(0, 0, 0);

  // --- Page 2: Pins table ---
  if (pins.length > 0) {
    pdf.addPage();

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Location Notes", 14, 16);

    const tableData = pins.map((pin) => [
      pin.popup_title || pin.label,
      pin.icon_type,
      (pin.scripture_refs ?? []).join(", ") || "—",
      pin.popup_body || "—",
    ]);

    pdf.autoTable({
      startY: 22,
      head: [["Location", "Type", "Scripture Reference", "Notes"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [60, 60, 60] },
      margin: { left: 14, right: 14 },
    });

    // Footer
    pdf.setFontSize(7);
    pdf.setTextColor(160, 160, 160);
    pdf.text("Generated with BibleLands", pageW / 2, pageH - 5, { align: "center" });
  }

  const slug = lessonTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  pdf.save(`${slug}-handout.pdf`);
}
