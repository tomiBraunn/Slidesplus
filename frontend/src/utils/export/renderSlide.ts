// Renderiza UN <section> de slide a su tamaño real 1920×1080 dentro de un iframe
// fuera de pantalla y lo captura a PNG con html2canvas. Reusa el mismo <style>
// de reset que LivePreview para que el export se vea idéntico al editor, pero
// SIN el transform:scale() (render a tamaño completo para máxima resolución).
import html2canvas from "html2canvas"

export const SLIDE_W = 1920
export const SLIDE_H = 1080

// Mismo reset que LivePreview.tsx, sin transform:scale.
const RESET_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${SLIDE_W}px; height: ${SLIDE_H}px; overflow: hidden; background: #fff; }
  body { display: flex; align-items: center; justify-content: center; }
  section {
    width: ${SLIDE_W}px; height: ${SLIDE_H}px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 4rem; text-align: center; background: #fff;
  }
`

export type RenderedSlide = {
  /** PNG dataURL de la slide a 1920×1080. */
  png: string
  /** Documento del iframe, vivo, para que extractTextBoxes lea geometría real.
      El llamador DEBE invocar dispose() cuando termine de usarlo. */
  doc: Document
  /** Quita el iframe del DOM. */
  dispose: () => void
}

// Extrae el innerHTML del <body> de la slide (el doc de slide es un documento
// HTML completo con <section> adentro). Si no hay body, usa el string tal cual.
function bodyOf(slideHtml: string): string {
  try {
    const parsed = new DOMParser().parseFromString(slideHtml, "text/html")
    return parsed.body?.innerHTML || slideHtml
  } catch {
    return slideHtml
  }
}

function waitForImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images)
  if (imgs.length === 0) return Promise.resolve()
  return Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.addEventListener("load", () => res(), { once: true })
              img.addEventListener("error", () => res(), { once: true })
            })
    )
  ).then(() => undefined)
}

// Selector de los bloques de texto que se vuelven cajas editables en el PPTX
// editable. Debe coincidir con el de extractTextBoxes.
const TEXT_SELECTOR = "h1,h2,h3,h4,p,li"

export type RenderOptions = {
  /** Oculta el texto (h1..li) en la captura, dejando solo fondo/gráficos.
      Se usa para el PPTX editable, donde el texto va en cajas nativas y no
      debe quedar también "quemado" en la imagen de fondo. */
  hideText?: boolean
}

/**
 * Renderiza una slide a PNG. El iframe queda montado hasta que se llama
 * dispose(), para permitir leer geometría del DOM renderizado.
 *
 * Importante: la geometría del texto (getBoundingClientRect) se lee del DOM
 * con el texto en su layout normal. Con hideText usamos visibility:hidden (no
 * display:none) para no alterar el layout, así las cajas siguen alineadas.
 */
export async function renderSlide(
  slideHtml: string,
  options: RenderOptions = {}
): Promise<RenderedSlide> {
  const iframe = document.createElement("iframe")
  iframe.style.cssText = `position:fixed; left:-99999px; top:0; border:0; width:${SLIDE_W}px; height:${SLIDE_H}px;`
  iframe.setAttribute("aria-hidden", "true")
  document.body.appendChild(iframe)

  const dispose = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }

  const idoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!idoc) {
    dispose()
    throw new Error("No se pudo acceder al documento del iframe de render")
  }

  idoc.open()
  idoc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${RESET_CSS}</style></head><body>${bodyOf(
      slideHtml
    )}</body></html>`
  )
  idoc.close()

  // Esperar fuentes e imágenes para que la captura no salga a medio cargar.
  try {
    await (idoc as any).fonts?.ready
  } catch {
    /* fonts API no disponible: seguir */
  }
  await waitForImages(idoc)

  // Para el modo editable: ocultar el texto SOLO durante la captura, con
  // visibility:hidden para no romper el layout. Se restaura inmediatamente
  // después para que extractTextBoxes lea la geometría real.
  let hidden: HTMLElement[] = []
  if (options.hideText) {
    const section = idoc.querySelector("section")
    if (section) {
      hidden = Array.from(section.querySelectorAll(TEXT_SELECTOR)).filter(
        (el) => !el.querySelector(TEXT_SELECTOR)
      ) as HTMLElement[]
      hidden.forEach((el) => {
        el.dataset.csPrevVis = el.style.visibility
        el.style.visibility = "hidden"
      })
    }
  }

  const canvas = await html2canvas(idoc.body, {
    width: SLIDE_W,
    height: SLIDE_H,
    windowWidth: SLIDE_W,
    windowHeight: SLIDE_H,
    scale: 1,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  })

  // Restaurar visibilidad para que la lectura de geometría sea correcta.
  hidden.forEach((el) => {
    el.style.visibility = el.dataset.csPrevVis || ""
    delete el.dataset.csPrevVis
  })

  return { png: canvas.toDataURL("image/png"), doc: idoc, dispose }
}
