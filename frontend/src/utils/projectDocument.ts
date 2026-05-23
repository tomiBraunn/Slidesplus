export function parseSlidesFromDoc(doc: string): Array<{ html: string; position: number }> {
  return doc
    .split(/<section/i)
    .slice(1)
    .map((s) => "<section" + s.split("</section>")[0] + "</section>")
    .filter((s) => s.trim() !== "")
    .map((html, position) => ({ html, position, css: "" }))
}

export function buildSlidesPayload(doc: string) {
  return parseSlidesFromDoc(doc)
}
