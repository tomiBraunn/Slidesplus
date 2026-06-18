// Exporta las slides a .pptx en dos variantes distintas (el usuario elige):
//
//  • exportToPptxImage    — cada diapositiva es la imagen de la slide a sangre
//                           completa. Fidelidad visual perfecta, NO editable.
//  • exportToPptxEditable — el fondo se renderiza SIN el texto (solo gráficos,
//                           gradientes, SVG) y el texto va en cajas nativas de
//                           PowerPoint encima. Editable, sin texto duplicado.
import PptxGenJS from "pptxgenjs"
import { renderSlide } from "./renderSlide"
import { extractTextBoxes } from "./extractTextBoxes"
import type { ProgressFn } from "./exportPdf"

const SLIDE_W_IN = 13.333
const SLIDE_H_IN = 7.5

function newDeck(): PptxGenJS {
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: "CS_WIDE", width: SLIDE_W_IN, height: SLIDE_H_IN })
  pptx.layout = "CS_WIDE"
  return pptx
}

function addErrorSlide(slide: PptxGenJS.Slide, i: number) {
  slide.addText(`Slide ${i + 1} no se pudo renderizar`, {
    x: 0,
    y: 3.25,
    w: SLIDE_W_IN,
    h: 1,
    align: "center",
    fontSize: 32,
    color: "888888",
  })
}

/** PPTX como imágenes: fiel, no editable. */
export async function exportToPptxImage(
  slides: string[],
  name: string,
  onProgress?: ProgressFn
): Promise<void> {
  if (slides.length === 0) return
  const pptx = newDeck()

  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length)
    const slide = pptx.addSlide()
    let rendered
    try {
      rendered = await renderSlide(slides[i])
      slide.addImage({ data: rendered.png, x: 0, y: 0, w: SLIDE_W_IN, h: SLIDE_H_IN })
    } catch (err) {
      console.error(`Error renderizando slide ${i + 1}:`, err)
      addErrorSlide(slide, i)
    } finally {
      rendered?.dispose()
    }
  }

  await pptx.writeFile({ fileName: `${sanitize(name)}.pptx` })
}

/** PPTX editable: fondo sin texto + cajas de texto nativas encima. */
export async function exportToPptxEditable(
  slides: string[],
  name: string,
  onProgress?: ProgressFn
): Promise<void> {
  if (slides.length === 0) return
  const pptx = newDeck()

  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length)
    const slide = pptx.addSlide()
    let rendered
    try {
      // Fondo SIN texto (hideText) para no duplicarlo con las cajas.
      rendered = await renderSlide(slides[i], { hideText: true })
      slide.addImage({ data: rendered.png, x: 0, y: 0, w: SLIDE_W_IN, h: SLIDE_H_IN })

      // El texto, como cajas nativas editables.
      const boxes = extractTextBoxes(rendered.doc)
      for (const b of boxes) {
        slide.addText(b.text, {
          x: b.x,
          y: b.y,
          w: b.w,
          h: b.h,
          fontSize: b.fontSize,
          color: b.color,
          fontFace: b.fontFace,
          bold: b.bold,
          italic: b.italic,
          align: b.align,
          valign: "middle",
          margin: 0,
          fill: { type: "none" },
          line: { type: "none" },
        })
      }
    } catch (err) {
      console.error(`Error renderizando slide ${i + 1}:`, err)
      addErrorSlide(slide, i)
    } finally {
      rendered?.dispose()
    }
  }

  await pptx.writeFile({ fileName: `${sanitize(name)}.pptx` })
}

function sanitize(name: string): string {
  return (name || "presentation").replace(/[^\w\-. ]+/g, "_").trim() || "presentation"
}
