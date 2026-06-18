// Del <section> ya renderizado a 1920×1080, extrae los bloques de texto
// principales (h1,h2,h3,p) con su posición y estilo, en unidades listas para
// pptxgenjs (pulgadas). Estas se vuelven cajas de texto editables encima del
// fondo-imagen en el .pptx.
import { SLIDE_W, SLIDE_H } from "./renderSlide"

// Diapositiva WIDE de pptxgenjs: 13.333in × 7.5in para 16:9.
const PPTX_W_IN = 13.333
const PPTX_H_IN = 7.5
const PX_TO_IN_X = PPTX_W_IN / SLIDE_W
const PX_TO_IN_Y = PPTX_H_IN / SLIDE_H
// 1px ≈ 0.75pt para el tamaño de fuente.
const PX_TO_PT = 0.75

export type TextBox = {
  text: string
  x: number // in
  y: number // in
  w: number // in
  h: number // in
  fontSize: number // pt
  color: string // hex sin '#'
  fontFace: string
  bold: boolean
  italic: boolean
  align: "left" | "center" | "right"
}

const SELECTOR = "h1,h2,h3,h4,p,li"

function rgbToHex(color: string): string {
  if (!color) return "000000"
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) {
    if (color.startsWith("#")) return color.slice(1)
    return "000000"
  }
  return [m[1], m[2], m[3]]
    .map((n) => parseInt(n, 10).toString(16).padStart(2, "0"))
    .join("")
}

function firstFontFace(fontFamily: string): string {
  if (!fontFamily) return "Arial"
  return fontFamily.split(",")[0].replace(/['"]/g, "").trim() || "Arial"
}

function mapAlign(a: string): TextBox["align"] {
  if (a === "right" || a === "end") return "right"
  if (a === "center") return "center"
  return "left"
}

// Texto directo del elemento, sin el de sus hijos del mismo tipo, para no
// duplicar (ej. un <p> dentro de un <div>). Tomamos solo elementos hoja-ish:
// si el elemento contiene otro elemento del selector, lo saltamos.
function ownText(el: Element): string {
  return (el.textContent || "").replace(/\s+/g, " ").trim()
}

export function extractTextBoxes(doc: Document): TextBox[] {
  const win = doc.defaultView
  if (!win) return []
  const section = doc.querySelector("section")
  if (!section) return []

  const els = Array.from(section.querySelectorAll(SELECTOR))
  const boxes: TextBox[] = []

  for (const el of els) {
    // Saltar contenedores que tienen hijos del mismo tipo (evita duplicar texto).
    if (el.querySelector(SELECTOR)) continue

    const text = ownText(el)
    if (!text) continue

    const rect = (el as HTMLElement).getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue

    const cs = win.getComputedStyle(el as HTMLElement)
    const fontSizePx = parseFloat(cs.fontSize) || 24
    const weight = parseInt(cs.fontWeight, 10)

    boxes.push({
      text,
      x: rect.left * PX_TO_IN_X,
      y: rect.top * PX_TO_IN_Y,
      w: rect.width * PX_TO_IN_X,
      h: rect.height * PX_TO_IN_Y,
      fontSize: Math.max(6, fontSizePx * PX_TO_PT),
      color: rgbToHex(cs.color),
      fontFace: firstFontFace(cs.fontFamily),
      bold: weight >= 600,
      italic: cs.fontStyle === "italic",
      align: mapAlign(cs.textAlign),
    })
  }

  return boxes
}
