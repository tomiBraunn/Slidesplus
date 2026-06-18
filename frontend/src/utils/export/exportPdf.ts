// Exporta las slides a un PDF: una página 16:9 (1920×1080 px) por slide, con la
// imagen de la slide a sangre completa. Fidelidad visual perfecta, no editable.
import { jsPDF } from "jspdf"
import { renderSlide, SLIDE_W, SLIDE_H } from "./renderSlide"

export type ProgressFn = (current: number, total: number) => void

export async function exportToPdf(
  slides: string[],
  name: string,
  onProgress?: ProgressFn
): Promise<void> {
  if (slides.length === 0) return

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [SLIDE_W, SLIDE_H],
    compress: true,
  })

  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length)
    if (i > 0) pdf.addPage([SLIDE_W, SLIDE_H], "landscape")

    let rendered
    try {
      rendered = await renderSlide(slides[i])
      pdf.addImage(rendered.png, "PNG", 0, 0, SLIDE_W, SLIDE_H)
    } catch (err) {
      // Slide que falla → página en blanco con aviso, sin abortar el export.
      console.error(`Error renderizando slide ${i + 1}:`, err)
      pdf.setFontSize(48)
      pdf.text(`Slide ${i + 1} no se pudo renderizar`, SLIDE_W / 2, SLIDE_H / 2, {
        align: "center",
      })
    } finally {
      rendered?.dispose()
    }
  }

  pdf.save(`${sanitize(name)}.pdf`)
}

function sanitize(name: string): string {
  return (name || "presentation").replace(/[^\w\-. ]+/g, "_").trim() || "presentation"
}
