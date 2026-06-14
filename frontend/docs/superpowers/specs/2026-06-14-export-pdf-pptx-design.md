# Export de slides a PDF y PPTX (híbrido, en navegador)

**Fecha:** 2026-06-14
**Estado:** Aprobado para implementación

## Objetivo

Permitir exportar las slides de un proyecto a:
- **PDF** — una página 16:9 por slide, imagen full-bleed. Para compartir/imprimir.
- **PPTX (.pptx)** — híbrido: fondo imagen (fidelidad visual perfecta) + cajas de texto editables encima.

Todo corre **en el navegador** (sin cambios de backend), usando librerías ya instaladas: `pptxgenjs`, `jspdf`, `html2canvas`.

## Decisiones de diseño

- **Híbrido, fidelidad visual primero.** El fondo-imagen incluye TODO (texto renderizado, SVG, gradientes, blur). Encima se ponen cajas de texto transparentes con el texto real, alineadas lo mejor posible sobre `h1,h2,h3,p`.
- **Caja editable transparente, sin relleno.** El texto real va en la caja; no tapa el fondo. El usuario edita/reemplaza el texto en PowerPoint.
- **Disparador:** botón "Export" en el navbar del editor (`ProjectNavBar`), con menú PDF / PowerPoint. Exporta todas las slides del proyecto actual.

## Contexto del código existente

- Las slides son HTML/CSS arbitrario: cada una es un `<section>` que se renderiza a 1920×1080.
- `LivePreview.tsx` ya renderiza un `<section>` dentro de un iframe a 1920×1080 con un `<style>` de reset conocido ([LivePreview.tsx:68-104](../../../src/components/RegularComponents/ProjectComponents/LivePreview.tsx#L68-L104)). El export reusa ese mismo style, pero sin `transform: scale()` (render a tamaño real).
- `ProjectPageContent` ya tiene el array `slides: string[]` y `name: string`.

## Arquitectura

Módulo cliente autónomo:

```
src/utils/export/
  renderSlide.ts      → renderiza UN <section> a 1920×1080 en iframe oculto → PNG (html2canvas)
  exportPdf.ts        → PDF (jsPDF): una página 16:9 por slide, imagen full-bleed
  extractTextBoxes.ts → del <section> renderizado, extrae h1/h2/h3/p con posición y estilo
  exportPptx.ts       → .pptx (pptxgenjs): fondo PNG + cajas de texto editables encima
  index.ts            → exportToPdf(slides, name) / exportToPptx(slides, name)
```

### renderSlide.ts

- Crea un iframe oculto (`position:fixed; left:-99999px; width:1920px; height:1080px`).
- Escribe dentro el mismo `<style>` de reset que LivePreview, **sin** `transform: scale()`.
- Inyecta el `innerHTML` del `<section>` de la slide.
- Espera a `document.fonts.ready` y a que las imágenes carguen.
- Captura con `html2canvas` (scale 1, width/height 1920×1080) → dataURL PNG.
- Devuelve `{ png: string, doc: Document }` para que `extractTextBoxes` pueda leer geometría del mismo render.
- Limpia el iframe al terminar.

### exportPdf.ts

- `new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] })`.
- Por cada slide: `renderSlide` → `addImage(png, 'PNG', 0, 0, 1920, 1080)`, `addPage()` entre slides.
- `doc.save(\`\${name}.pdf\`)`.

### extractTextBoxes.ts

- Recibe el `Document` del render a tamaño real.
- Selecciona `h1,h2,h3,p` dentro del `<section>`.
- Por cada uno: `getBoundingClientRect()` (px sobre 1920×1080) + `getComputedStyle` (color, fontSize, fontFamily, fontWeight, textAlign, lineHeight).
- Devuelve cajas `{ text, x, y, w, h, color, fontSizePt, fontFace, bold, align }` en unidades convertibles a pulgadas para pptxgenjs (1920px = 13.333in, 1080px = 7.5in → factor px→in = 13.333/1920).

### exportPptx.ts

- `new pptxgenjs()`, layout `LAYOUT_WIDE` (13.333×7.5in, 16:9).
- Por cada slide: addSlide → `addImage` del PNG cubriendo toda la diapo → por cada caja de texto, `addText` con posición/estilo convertidos, fondo transparente (`fill: { type: 'none' }` o sin fill).
- `pptx.writeFile({ fileName: \`\${name}.pptx\` })`.

### index.ts

- `exportToPdf(slides: string[], name: string, onProgress?)` y `exportToPptx(...)`.
- Iteran slides llamando renderSlide; reportan progreso "slide i/n".

## UI

En `ProjectNavBar.tsx`, junto al botón "Present":
- Botón "Export" (ícono `download`) que abre un menú pequeño: **PDF** y **PowerPoint (.pptx)**.
- Al elegir, muestra spinner/progreso mientras genera, luego descarga.
- Recibe `slides: string[]` y `name: string` por props nuevas desde `ProjectPageContent`.

## Manejo de errores

- Si una slide falla al capturar, se sustituye por página/diapo en blanco con aviso y se continúa (no abortar todo).
- Indicador de progreso "Generando slide i/n" para presentaciones largas.

## Riesgo conocido

`html2canvas` puede no capturar perfecto `backdrop-filter`/`blur` y algunos SVG complejos. Si en pruebas se ve mal, el plan B documentado es mover solo el render a backend con Puppeteer. Arrancamos en cliente.

## Fuera de alcance (YAGNI)

- Export desde el visor `/v/:id` (solo editor por ahora).
- Texto editable nativo 100% sin imagen de fondo.
- Configuración de calidad/resolución por el usuario.
