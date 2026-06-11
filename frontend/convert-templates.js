import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = path.join(__dirname, "public", "templates")
const OUTPUT_DIR = path.join(__dirname, "public", "templates-converted")

function extractBetween(tag, html) {
  const result = []
  const re = new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, "gi")
  let m
  while ((m = re.exec(html)) !== null) result.push(m[0])
  return result
}

function extractGoogleFonts(html) {
  const fonts = []
  const re = /@import\s+url\(['"]([^'"]*fonts\.googleapis[^'"]*)['"]\)/gi
  let m
  while ((m = re.exec(html)) !== null) fonts.push(m[1])
  const linkRe = /<link[^>]*href=["']([^"']*fonts\.googleapis[^"']*)["'][^>]*>/gi
  while ((m = linkRe.exec(html)) !== null) fonts.push(m[1])
  return fonts
}

function extractRootVars(html) {
  const match = /:root\s*\{([^}]*)\}/i.exec(html)
  return match ? match[1].trim() : ""
}

function removeNavElements(sectionHtml) {
  let result = sectionHtml
  result = result.replace(
    /<(div|span|nav|section)[^>]*\bclass="[^"]*\b(deck-header|deck-footer|slide-number|slide-counter|progress-bar|notes(-overlay)?|overview|thumb|slide-meta)\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi,
    ""
  )
  result = result.replace(/<div[^>]*\bid=["']nav-dots["'][^>]*>[\s\S]*?<\/div>/gi, "")
  result = result.replace(/<(span|a|div)[^>]*\bclass="[^"]*\bnav-dot\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, "")
  result = result.replace(/<[^>]*\bid=["']slide-counter["'][^>]*>[\s\S]*?<\/[^>]+>/gi, "")
  result = result.replace(/<nav[\s>][\s\S]*?<\/nav>/gi, "")
  result = result.replace(/<span[^>]*\bclass="[^"]*\bslide-number\b[^"]*"[^>]*\bdata-current\b[^>]*>[\s\S]*?<\/span>/gi, "")
  result = result.replace(/<(div|span)[^>]*\bclass="[^"]*\bnav-hint\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, "")
  result = result.replace(/<(div|span)[^>]*\bclass="[^"]*\bhint\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, "")
  result = result.replace(/<div[^>]*\bid=["']progressBar["'][^>]*>[\s\S]*?<\/div>/gi, "")
  return result
}

function px(val, unit) {
  if (unit === "vw") return Math.round(parseFloat(val) * 19.2) + "px"
  if (unit === "vh") return Math.round(parseFloat(val) * 10.8) + "px"
  if (unit === "em" || unit === "rem") {
    if (val === "0" || val === "0.0") return "0px"
    return Math.round(parseFloat(val) * 16) + "px"
  }
  if (unit === "%") {
    const n = parseFloat(val)
    if (n <= 100) return Math.round(n * 19.2) + "px"
  }
  return val + unit
}

function convertInlineStyles(html) {
  return html.replace(/style="([^"]*)"/gi, (match, styles) => {
    const converted = styles
      .split(";")
      .map((s) => {
        s = s.trim()
        if (!s) return s
        return s.replace(/([\d.]+)\s*(vw|vh|em|rem)/gi, (m, val, unit) => {
          return px(val, unit)
        })
      })
      .join(";")
    return `style="${converted}"`
  })
}

async function convertTemplate(dirPath) {
  const dirName = path.basename(dirPath)
  const htmlPath = path.join(dirPath, "example.html")
  if (!fs.existsSync(htmlPath)) {
    console.log(`  SKIP: no example.html in ${dirName}`)
    return
  }

  let html = fs.readFileSync(htmlPath, "utf-8")

  // Extract Google Fonts
  const fonts = extractGoogleFonts(html)
  const fontImports = fonts.map((f) => `@import url('${f}');`).join("\n")

  // Extract :root variables
  const rootVars = extractRootVars(html)

  // Determine slide pattern
  let slides = []

  // Pattern 1: <section class="slide..."> or <div class="slide...">
  const slideRe = /<(section|div)\s+class=["']slide["'\s][^>]*>[\s\S]*?<\/\1>/gi
  let m
  while ((m = slideRe.exec(html)) !== null) {
    slides.push(m[0])
  }

  // Pattern 2: <deck-stage> with direct <section> children (no "slide" class)
  if (slides.length === 0) {
    // Match the entire <deck-stage>...</deck-stage>
    const deckStageRe = /<deck-stage[^>]*>([\s\S]*?)<\/deck-stage>/i
    const deckMatch = deckStageRe.exec(html)
    if (deckMatch) {
      const deckContent = deckMatch[1]
      // Extract direct <section> children
      const sectionRe = /<section([^>]*)>([\s\S]*?)<\/section>/gi
      let sm
      while ((sm = sectionRe.exec(deckContent)) !== null) {
        const attrs = sm[1]
        const content = sm[2]
        // Skip if it's not a slide (e.g., may have specific class indicating it's a slide)
        slides.push(`<section${attrs}>${content}</section>`)
      }
    }
  }

  // Pattern 3: <div class="slides" id="slides"> with direct <div class="slide-..." children
  if (slides.length === 0) {
    const slidesDivRe = /<div[^>]*\bclass="[^"]*\bslides\b[^"]*"[^>]*id="slides"[^>]*>([\s\S]*?)<\/div>/i
    const divMatch = slidesDivRe.exec(html)
    if (divMatch) {
      const content = divMatch[1]
      const slideRe2 = /<div\s+class="([^"]*slide[^"]*)"[^>]*data-index="[^"]*"[^>]*>[\s\S]*?<\/div>/gi
      let sm
      while ((sm = slideRe2.exec(content)) !== null) {
        slides.push(sm[0])
      }
    }
  }

  if (slides.length === 0) {
    console.log(`  SKIP: no slides found in ${dirName}`)
    return
  }

  // Build output
  const outputParts = []

  slides.forEach((slide, i) => {
    let cleaned = removeNavElements(slide)
    cleaned = convertInlineStyles(cleaned)

    // Extract inner content of the section/div
    const innerMatch = /<(section|div)[^>]*>([\s\S]*)<\/\1>/i.exec(cleaned)
    const innerContent = innerMatch ? innerMatch[2].trim() : cleaned

    let sectionContent = `<section style="width:1920px;height:1080px;overflow:hidden;position:relative;">`

    if (i === 0) {
      let styleContent = ""
      if (fontImports) styleContent += fontImports + "\n"
      if (rootVars) styleContent += `:root{${rootVars}}\n`
      if (styleContent) {
        sectionContent += `<style>${styleContent}</style>`
      }
    }

    sectionContent += `\n${innerContent}\n</section>`
    outputParts.push(sectionContent)
  })

  const outDir = path.join(OUTPUT_DIR, dirName)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, "slides-plus.html"), outputParts.join("\n\n"), "utf-8")
  console.log(`  OK: ${dirName} (${slides.length} slides)`)
}

async function main() {
  console.log("Converting templates to Slides+ format...\n")

  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(`Templates directory not found: ${TEMPLATES_DIR}`)
    process.exit(1)
  }

  const dirs = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort()

  console.log(`Found ${dirs.length} template directories\n`)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const dirName of dirs) {
    await convertTemplate(path.join(TEMPLATES_DIR, dirName))
  }

  const catalogPath = path.join(TEMPLATES_DIR, "catalog.json")
  if (fs.existsSync(catalogPath)) {
    fs.copyFileSync(catalogPath, path.join(OUTPUT_DIR, "catalog.json"))
    console.log("\n  (catalog.json copied)")
  }

  console.log(`\nDone! Output in: ${OUTPUT_DIR}`)
}

main().catch(console.error)
