// @ts-nocheck
import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { CornerRightUp } from "lucide-react";
import { urlbackend } from "../../../config.js";
import { Spinner } from "../../ui/spinner";
import { Timer } from "../../ui/timer";
import { useAnimatedText } from "../../ui/animated-text";
import ComponentsModal from "./ComponentsModal";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: FileAttachment[];
  previewSlides?: string[];
  codeBlock?: { lang?: string; code: string; description: string };
};

type FileAttachment = { name: string; type: string; size: number; url: string };

function extractFirstCodeBlock(s: string): { lang?: string; code: string } | null {
  const m = s.match(/```(\w+)?\s*([\s\S]*?)```/);
  if (!m) return null;
  return { lang: m[1]?.toLowerCase(), code: m[2].trim() };
}

function looksLikeHTML(doc: string): boolean {
  const s = doc.trim();
  if (!s.startsWith("<")) return false;
  return /<html[\s>]/i.test(s) || /<!doctype html>/i.test(s) || /<section[\s>]/i.test(s);
}

function normalizeLLMText(data: any): string {
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text)?.filter(Boolean)?.join("\n")
    || data?.text || "No response";
}

function classifyPrompt(msg: string): "slides" | "code" | "chat" {
  const s = msg.toLowerCase();
  const slidesHints = ["slides", "slide deck", "presentation", "deck", "slideshow", "diapositivas"];
  if (slidesHints.some((k) => s.includes(k))) return "slides";
  const codeVerbs = ["generate", "create", "write", "build", "implement", "refactor", "convert"];
  const langs = ["html", "css", "javascript", "typescript", "react", "tsx", "jsx", "python", "java", "c#", "php", "go", "rust", "sql", "tailwind", "component"];
  const codeWords = ["snippet", "function", "component", "layout", "api", "endpoint", "hook"];
  const looksCodey = /<\w+[^>]*>/.test(msg) || /function\s*\(|class\s+\w+/.test(msg);
  if (looksCodey || codeVerbs.some((v) => s.includes(v)) || langs.some((l) => s.includes(l)) || codeWords.some((w) => s.includes(w))) return "code";
  return "chat";
}

function generateCodeDescription(code: string, lang?: string): string {
  const c = code.trim().toLowerCase();
  if (lang === "html" || c.includes("<html") || c.includes("<!doctype")) {
    if (c.includes("form")) return "I created an HTML form";
    if (c.includes("nav")) return "I created a navigation component";
    if (c.includes("button")) return "I created HTML with interactive buttons";
    return "I created an HTML document";
  }
  if (lang === "css" || c.includes("@media") || c.includes("flex") || c.includes("grid")) return "I created CSS styling";
  if (lang === "javascript" || lang === "js" || c.includes("function") || c.includes("const")) {
    if (c.includes("fetch") || c.includes("axios")) return "I created an API request function";
    if (c.includes("class")) return "I created a JavaScript class";
    return "I created JavaScript code";
  }
  if (lang === "typescript" || lang === "ts" || lang === "tsx") {
    if (c.includes("interface") || c.includes("type")) return "I created TypeScript types and interfaces";
    if (c.includes("function")) return "I created a TypeScript function";
    return "I created TypeScript code";
  }
  if (lang === "react" || lang === "jsx" || lang === "tsx") {
    if (c.includes("usestate") || c.includes("useeffect")) return "I created a React component with hooks";
    if (c.includes("form")) return "I created a React form component";
    if (c.includes("button")) return "I created a React button component";
    return "I created a React component";
  }
  if (lang === "python" || lang === "py") {
    if (c.includes("def")) return "I created a Python function";
    if (c.includes("class")) return "I created a Python class";
    return "I created Python code";
  }
  return "I generated code for you";
}

const SLIDES_SYSTEM_PROMPT = `You are an art director creating HTML presentation slides. Pick ONE style preset below that best fits the topic and tone, then execute it faithfully across every slide.

RENDERING CONTEXT:
Each <section> is rendered in its own ISOLATED iframe. This means:
- CSS defined in one section is COMPLETELY INVISIBLE to all other sections
- <style> blocks, CSS variables (var(--x)), and class-based styles only work in the section they are defined in
- Sections 2, 3, 4... will appear BLACK if they rely on classes or variables defined in section 1

ABSOLUTE RULE — EVERY ELEMENT ON EVERY SECTION MUST USE INLINE style="" ATTRIBUTES ONLY:
- NO CSS classes (no class="title", class="stmt-wrap", class="body-tx", etc.)
- NO CSS variables (no var(--paper), var(--ink), etc.)
- NO <style> blocks except ONE @import for fonts in the FIRST section only
- NO external stylesheets
- Every color, font, size, position — all must be inline style="" on every element, on every section

CRITICAL OUTPUT RULES:
- Return ONLY <section> tags. NO <!doctype>, <html>, <head>, <body>
- Every <section>: style="width:1920px;height:1080px;overflow:hidden;position:relative;"
- All children must stay within 0–1920px × 0–1080px

═══════════════════════════════
CONTAINMENT — MANDATORY
═══════════════════════════════
Full bleed background image:
position:absolute; top:0; left:0; width:1920px; height:1080px; object-fit:cover; z-index:0;

Content wrapper (use on every slide):
position:absolute; top:0; left:0; width:1920px; height:1080px; padding:80px 100px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; z-index:1;

Split layout:
<section style="width:1920px;height:1080px;overflow:hidden;position:relative;">
  <div style="position:absolute;top:0;left:0;width:1920px;height:1080px;display:flex;">
    <div style="width:800px;height:1080px;padding:80px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;"><!-- text --></div>
    <div style="width:1120px;height:1080px;position:relative;overflow:hidden;"><img style="width:1120px;height:1080px;object-fit:cover;" src="..." /></div>
  </div>
</section>

Grid — children widths must sum to ≤1720px:
<div style="display:flex;gap:40px;width:1720px;">
  <div style="width:540px;">...</div><div style="width:540px;">...</div><div style="width:540px;">...</div>
</div>

SAFE ZONE: All text within 100px–1820px × 80px–1000px.

═══════════════════════════════
AGENT DISCIPLINE
═══════════════════════════════
- Each slide has ONE clear message
- Max 5 bullet points, max 8 words each
- Never repeat the same layout twice in a row
- No filler: "In conclusion", "As we can see", "It is important to note"
- Whitespace is a design element
- Don't explain choices — execute

═══════════════════════════════
IMAGES
═══════════════════════════════
Use Picsum on at least 60% of slides: https://picsum.photos/seed/{WORD}/1920/1080
Same seed = same image. Choose words matching slide content.
Seeds: technology, laptop, office, city, finance, team, portrait, forest, ocean, architecture, building, abstract, texture, science, lab, brand, design, book, library

Always add gradient overlay on background images:
<div style="position:absolute;top:0;left:0;width:1920px;height:1080px;background:linear-gradient(135deg,rgba(10,10,10,0.85) 0%,rgba(10,10,10,0.35) 100%);z-index:1;"></div>

═══════════════════════════════
STYLE PRESETS — PICK ONE, APPLY CONSISTENTLY
═══════════════════════════════
Choose based on topic and tone. If the user explicitly names a style, use it.

── PRESET 1 · SOFT EDITORIAL ──────────────────
Use for: culture, fashion, lifestyle, soft brand
Fonts: @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Work+Sans:wght@300;400;500&display=swap');
Display: 'Cormorant Garamond' italic — Body: 'Work Sans' 300
bg:#F2EEDF — text:#2A241B — accents: dusty-pink:#E1A4C2 / chartreuse:#D6DD63 / sage:#B7C7A8
Style: warm cream substrate, italic serif headlines, multiple soft pastel accents, classical proportions, generous whitespace

── PRESET 2 · COBALT GRID ──────────────────────
Use for: data, research, academic, analytical
Fonts: @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;1,300;1,400;1,500&family=Hanken+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
Display: 'Newsreader' italic — Body: 'Hanken Grotesk' — Meta: 'DM Mono'
bg:#F0EBDE — text:#1F2BE0
MANDATORY STRUCTURE — every section must have ALL of these, with ALL styles inline (no classes, no CSS variables, no <style> tags except the font @import in the FIRST section only):

EVERY section needs these 4 structural layers (copy exactly):
1. Grid overlay: <div style="position:absolute;inset:0;background-image:linear-gradient(to right,rgba(31,43,224,0.10) 1px,transparent 1px),linear-gradient(to bottom,rgba(31,43,224,0.10) 1px,transparent 1px);background-size:42px 42px;pointer-events:none;z-index:1;"></div>
2. Hairline top: <div style="position:absolute;left:69px;right:69px;top:50px;height:1.5px;background:#1F2BE0;z-index:4;pointer-events:none;"></div>
3. Hairline bottom: <div style="position:absolute;left:69px;right:69px;bottom:38px;height:1.5px;background:#1F2BE0;z-index:4;pointer-events:none;"></div>
4. Page number (bottom-right): <div style="position:absolute;right:46px;bottom:92px;font-family:'DM Mono',monospace;font-size:16px;color:#1F2BE0;letter-spacing:0.06em;z-index:9;">01 / 06</div>

TYPOGRAPHY RULES (inline styles only):
- Headlines: font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:400;color:#1F2BE0
- Large headline size: font-size:96px to 211px; line-height:0.92 to 1.05; letter-spacing:-0.005em
- Body text: font-family:'Hanken Grotesk',sans-serif;font-weight:400;font-size:18px to 22px;line-height:1.5;color:#1F2BE0
- Labels/eyebrows: font-family:'Hanken Grotesk',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;font-size:15px to 19px;color:#1F2BE0
- Numbers/mono: font-family:'DM Mono',monospace;font-size:16px to 18px;color:#1F2BE0;letter-spacing:0.04em to 0.06em
- Section dividers: border-bottom:1.5px solid #1F2BE0 or border-top:1px solid #1F2BE0

CONTENT POSITIONING: Use position:absolute with explicit top/left/right/bottom in px. Content safe zone: left:69px to right inset, top:140px, bottom:162px.

EXAMPLE — title slide structure:
<section style="width:1920px;height:1080px;overflow:hidden;position:relative;background:#F0EBDE;font-family:'Hanken Grotesk',sans-serif;color:#1F2BE0;">
<style>@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;1,300;1,400;1,500&family=Hanken+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');</style>
<div style="position:absolute;inset:0;background-image:linear-gradient(to right,rgba(31,43,224,0.10) 1px,transparent 1px),linear-gradient(to bottom,rgba(31,43,224,0.10) 1px,transparent 1px);background-size:42px 42px;pointer-events:none;z-index:1;"></div>
<div style="position:absolute;left:69px;right:69px;top:50px;height:1.5px;background:#1F2BE0;z-index:4;pointer-events:none;"></div>
<div style="position:absolute;left:69px;right:69px;bottom:38px;height:1.5px;background:#1F2BE0;z-index:4;pointer-events:none;"></div>
<div style="position:absolute;left:69px;top:154px;z-index:5;max-width:60%;">
  <h1 style="font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:400;font-size:180px;line-height:0.92;letter-spacing:-0.008em;color:#1F2BE0;">Report<br/>2026</h1>
  <div style="margin-top:42px;">
    <div style="font-family:'Hanken Grotesk',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;font-size:19px;color:#1F2BE0;">Subtitle · Volume I</div>
    <div style="font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:48px;line-height:1.1;color:#1F2BE0;margin-top:8px;">A one-line description of the presentation.</div>
  </div>
</div>
<div style="position:absolute;right:46px;bottom:92px;font-family:'DM Mono',monospace;font-size:16px;color:#1F2BE0;letter-spacing:0.06em;z-index:9;">01 / 06</div>
</section>

EXAMPLE — content slide with header + grid of items:
<section style="width:1920px;height:1080px;overflow:hidden;position:relative;background:#F0EBDE;font-family:'Hanken Grotesk',sans-serif;color:#1F2BE0;">
<div style="position:absolute;inset:0;background-image:linear-gradient(to right,rgba(31,43,224,0.10) 1px,transparent 1px),linear-gradient(to bottom,rgba(31,43,224,0.10) 1px,transparent 1px);background-size:42px 42px;pointer-events:none;z-index:1;"></div>
<div style="position:absolute;left:69px;right:69px;top:50px;height:1.5px;background:#1F2BE0;z-index:4;pointer-events:none;"></div>
<div style="position:absolute;left:69px;right:69px;bottom:38px;height:1.5px;background:#1F2BE0;z-index:4;pointer-events:none;"></div>
<div style="position:absolute;inset:140px 69px 162px;display:grid;grid-template-rows:auto 1fr;gap:38px;z-index:5;">
  <div style="display:flex;align-items:flex-end;justify-content:space-between;border-bottom:1.5px solid #1F2BE0;padding-bottom:24px;gap:30px;">
    <div style="font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:86px;line-height:0.95;color:#1F2BE0;">Slide headline here.</div>
    <div style="font-family:'Hanken Grotesk',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;font-size:17px;color:#1F2BE0;text-align:right;">Section label · context</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:27px 54px;">
    <div style="display:grid;grid-template-columns:56px 1fr;gap:27px;align-self:stretch;border-bottom:1px solid rgba(31,43,224,0.18);padding-bottom:19px;"><div style="font-family:'DM Mono',monospace;font-size:17px;color:#1F2BE0;letter-spacing:0.04em;padding-top:6px;">01.</div><div><h3 style="margin:0 0 6px;font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:400;font-size:38px;line-height:1.05;color:#1F2BE0;">Item title</h3><p style="margin:0;font-family:'Hanken Grotesk',sans-serif;font-size:18px;line-height:1.5;color:#1F2BE0;">Item description goes here with enough detail to fill the space.</p></div></div>
    <div style="display:grid;grid-template-columns:56px 1fr;gap:27px;align-self:stretch;border-bottom:1px solid rgba(31,43,224,0.18);padding-bottom:19px;"><div style="font-family:'DM Mono',monospace;font-size:17px;color:#1F2BE0;letter-spacing:0.04em;padding-top:6px;">02.</div><div><h3 style="margin:0 0 6px;font-family:'Newsreader',Georgia,serif;font-style:italic;font-weight:400;font-size:38px;line-height:1.05;color:#1F2BE0;">Item title</h3><p style="margin:0;font-family:'Hanken Grotesk',sans-serif;font-size:18px;line-height:1.5;color:#1F2BE0;">Item description goes here with enough detail to fill the space.</p></div></div>
  </div>
</div>
<div style="position:absolute;right:46px;bottom:92px;font-family:'DM Mono',monospace;font-size:16px;color:#1F2BE0;letter-spacing:0.06em;z-index:9;">02 / 06</div>
</section>

── PRESET 3 · BROADSIDE ────────────────────────
Use for: tech, product, startup, dark/bold
Fonts: @import url('https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,700;0,900;1,700&family=IBM+Plex+Mono:wght@400;500&display=swap');
Display: 'Barlow' 900 — Body: 'Barlow' 300 — Meta: 'IBM Plex Mono'
bg:#111111 — text:#F0ECE5 — accent:#E85D26
Style: dark mode, massive orange type at 140px–200px, IBM Plex Mono labels, high-density layouts with strong typographic hierarchy

── PRESET 4 · VELLUM ───────────────────────────
Use for: luxury, gallery, art, cultural institution
Fonts: @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,300;1,500&family=DM+Sans:wght@300;400&family=Courier+Prime:ital@0;1&display=swap');
Display: 'Cormorant Garamond' italic — Body: 'DM Sans' 300 — Meta: 'Courier Prime'
bg:#2A3870 — text:#E8D85C — accent:#F5E168
Style: deep navy with warm yellow type, italic serif at large scale, gallery-adjacent refinement, Courier Prime for captions and folios

── PRESET 5 · STUDIO ───────────────────────────
Use for: creative agency, branding, bold pitch
Fonts: @import url('https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,700;0,900;1,700&family=IBM+Plex+Mono:wght@400&display=swap');
Display: 'Barlow' 900 — Body: 'Barlow' 400 — Meta: 'IBM Plex Mono'
bg alternates: #1C1C1C (dark) ↔ #F5D200 (acid yellow)
text alternates: #F5D200 on dark, #1C1C1C on yellow
Style: two-environment system, massive type at 160px–220px, stark contrast, no images needed — pure typographic impact

── PRESET 6 · SIGNAL ───────────────────────────
Use for: finance, consulting, executive, authority
Fonts: @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&family=IBM+Plex+Mono:wght@400&display=swap');
Display: 'Source Serif 4' — Body: 'DM Sans' — Meta: 'IBM Plex Mono'
bg:#1C2644 (dark) / #F0ECE3 (light) — text:#E2DCD0 / #1A2030 — accent:#C8A870 (antique gold)
Style: editorial authority, navy + cream + gold, roman/italic serif mix mid-sentence, accessible text hierarchy

── PRESET 7 · GROVE ────────────────────────────
Use for: sustainability, nature, wellness, environmental
Fonts: @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Jost:wght@300;400&family=JetBrains+Mono:wght@400&display=swap');
Display: 'Playfair Display' italic — Body: 'Jost' 300 — Meta: 'JetBrains Mono'
bg:#192B1B (dark forest) / #E8E4D6 (parchment) — text:#D4CFBF / #192B1B — accent:#C8524A (terracotta coral)
Style: deep forest green + warm parchment duality, italic serif headlines in terracotta accent, light-weight body type

── PRESET 8 · PRINT EDITORIAL ──────────────────
Use for: investor memo, report, serious/professional
Fonts: @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
Display: 'Instrument Serif' italic-capable — Body: 'Inter Tight' — Meta: 'JetBrains Mono'
bg:#FBFBFA — text:#1A1A19 — accent: muted sage #346538 or terracotta #9F2F2D
Style: warm off-white substrate, hairline rules (1px solid #E5E3DE), mono eyebrow + section number "01 / 06" on every slide, page number bottom-right in mono, no drop shadows

── PRESET 9 · BOLD POSTER ──────────────────────
Use for: brand manifesto, founder vision, creative-led pitch
Fonts: @import url('https://fonts.googleapis.com/css2?family=Shrikhand&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;600&display=swap');
Display: 'Shrikhand' — Body: 'Libre Baskerville' — Labels: 'Space Grotesk'
bg:#FFFFFF — text:#1C1410 — accent:#D8000F (fire-engine red, ONE accent only)
Style: massive display titles 140px–220px with ±4deg rotation, magazine-cover aesthetic, bold graphic — no images needed

── PRESET 10 · KAMI ────────────────────────────
Use for: clean SaaS, product, minimal tech
Fonts: @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@300;400;600&family=Source+Sans+3:wght@300;400&family=JetBrains+Mono:wght@400&display=swap');
Display: 'Source Serif 4' — Body: 'Source Sans 3' — Meta: 'JetBrains Mono'
bg:#F5F4ED — text:#141413 — accent:#1B365D (ink-blue)
Style: warm parchment, one chromatic accent, horizontal-swipe deck feel, editorial restraint, no italic excess

── PRESET 11 · RAW GRID ────────────────────────
Use for: neobrutalist, design portfolio, experimental
Fonts: @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Space+Mono:wght@400;700&display=swap');
Display: 'Space Grotesk' 700 — Body: 'Space Grotesk' 400 — Accents: 'Space Mono'
bg:#FFFFFF — text:#0A0A0A — accents: soft-pink:#F2D4CF / light-green:#E5EDD6
Style: neobrutalist, 3px solid black borders on cards, 6px offset box-shadows (black), uppercase type-heavy, aggressive grid geometry

── PRESET 12 · IB PITCH BOOK ───────────────────
Use for: financial presentation, M&A, banking, investment
Fonts: @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600&family=DM+Mono:wght@400&display=swap');
Display: 'Libre Baskerville' — Body: 'Source Sans 3' — Meta: 'DM Mono'
bg:#F5F0E8 — text:#1A1A1A — accents: deep-red:#8B1A1A / gold:#B8960C / teal:#1A5F7A
Style: financial print aesthetic, three-accent palette (red/gold/teal), table-heavy layouts, rule lines, formal typographic hierarchy

═══════════════════════════════
FONT SIZES (px, all presets)
═══════════════════════════════
Cover title: 96px–140px; weight:900; letter-spacing:-2px; line-height:1.0
Section headline: 64px–80px; weight:700; letter-spacing:-1px; line-height:1.1
Body text: 28px–36px; line-height:1.75; weight:300
Labels/captions: 18px–22px; letter-spacing:3px; text-transform:uppercase; weight:500
Stats: 120px–180px; weight:900; line-height:1.0
Bullets: 28px–34px; line-height:1.6

═══════════════════════════════
LAYOUT TEMPLATES (mix freely)
═══════════════════════════════
T1 · COVER: Full bleed image + gradient overlay. Title anchored bottom-left at bottom:120px; left:100px. Thin uppercase label + 1px rule above title.
T2 · FEATURE SPREAD: Left panel 800px solid color + text. Right panel 1120px full-height image.
T3 · DATA STORY: Dark bg, no image. 2–3 stats at 160px–180px in flex row, separated by 1px vertical rules.
T4 · TYPOGRAPHIC: No image. Headline 120px–140px. Contrasting italic serif vs upright sans. Single 1px rule at center. 40% whitespace.
T5 · PULL QUOTE: Decorative quote mark 320px opacity:0.08 absolute top:60px left:80px. Quote 52px–64px left-aligned.
T6 · ASYMMETRIC GRID: Left image 1100px × 1080px. Right: two stacked 820px × 540px images. Title overlaid bottom-left.
T7 · SECTION DIVIDER: Single word 180px–220px. 1px center rule. Solid bg only.
T8 · PROFILE: Image left 900px. 1px vertical rule at x:920px. Text at left:980px.
T9 · EDITORIAL MANIFESTO: Hairline-separated items. Serif number 80px left, title 36px center, mono tag right. Eyebrow + section number top.
T10 · BENTO GRID: Flex or CSS grid cells with 1px hairline borders. Mix span sizes. Stat cells: serif number 100px + mono label. No shadows.

Slide order: T1 cover → T7 divider → mix T2/T4/T6 → mix T3/T5/T8/T9/T10 → T7 divider → T1 variant close

NEVER: glassmorphism as primary element · everything centered · PowerPoint header+bullets layout · purple/indigo default · glowing orbs

═══════════════════════════════
DECORATIVE — MAX 2 PER SLIDE
═══════════════════════════════
Rule line: height:1px; background:currentColor; opacity:0.2
Folio: position:absolute; top:60px; right:100px; font-size:18px; letter-spacing:4px; opacity:0.5
Accent block: solid rectangle 12px wide × 120px tall, overlapping title edge
Rotated label: transform:rotate(-90deg); font-size:18px; letter-spacing:6px; text-transform:uppercase

═══════════════════════════════
QUALITY CHECKLIST
═══════════════════════════════
✓ section is exactly 1920×1080px, overflow:hidden
✓ No element exceeds 1920px × 1080px
✓ All text within safe zone 100–1820px × 80–1000px
✓ Font sizes in px, no clamp()/vw/vh
✓ Text contrast > 4.5:1
✓ ONE message per slide
✓ Max 5 bullets, max 8 words each
✓ Consistent preset fonts throughout
✓ Layout not defaulting to centered
✓ Images use Picsum seed URL
✓ No filler phrases · No raw HTML artifacts`;

function extractSlides(html: string): string[] {
  let cleanHtml = html
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .trim();
  const sections = cleanHtml.match(/<section[\s\S]*?<\/section>/gi);
  if (sections && sections.length > 0) {
    return sections.map((s) => s.trim()).filter((s) => s.startsWith("<section"));
  }
  return [];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function uploadFileToStorage(file: File, projectId: string): Promise<string> {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${urlbackend}/projects/${projectId}/upload`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload file");
  const data = await res.json();
  return data.url;
}

function cleanSlideHtml(html: string): string {
  return html
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .trim();
}

// Each <section> is rendered later in its own isolated iframe (srcDoc), so it
// carries no shared CSS context. Templates put their full design system (fonts
// + class definitions) in a single <style> block inside the FIRST section.
// To make every section self-contained, copy that <style> block verbatim into
// each subsequent section that doesn't already have one. Classes are PRESERVED
// — the CSS targets them, so stripping classes would leave slides unstyled.
function injectStyleIntoAllSections(sections: string[]): string[] {
  if (sections.length <= 1) return sections;

  // Grab the complete <style> block from the first section that has one.
  let styleBlock = "";
  for (const s of sections) {
    const m = s.match(/<style[\s\S]*?<\/style>/i);
    if (m) { styleBlock = m[0]; break; }
  }
  if (!styleBlock) return sections;

  // The template CSS may still target "html, body" / "body" — inside a section
  // those never match. Rewrite them to "section" so backgrounds/typography from
  // the template actually apply (defensive: the backend asks the model to do
  // this, but don't depend on it).
  styleBlock = styleBlock
    .replace(/\bhtml\s*,\s*body\b/gi, "section")
    .replace(/(^|[^.\w-])body\b(?!\s*-)/gi, "$1section");

  return sections.map((s) => {
    // Already has its own <style> (e.g. the source section) — leave it.
    if (/<style[\s\S]*?<\/style>/i.test(s)) return s;
    // Inject the shared style block right after the opening <section> tag.
    return s.replace(/(<section[^>]*>)/i, `$1${styleBlock}`);
  });
}

/* ── Code Modal ── */
function CodeModal({ isOpen, onClose, codeBlock, onInsert, onReplace }: {
  isOpen: boolean; onClose: () => void;
  codeBlock: { lang?: string; code: string; description: string };
  onInsert: (code: string) => void; onReplace: (code: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"preview" | "code">("code");
  const canPreview = codeBlock.lang === "html" || looksLikeHTML(codeBlock.code);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-theme-primary border border-theme-tertiary rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-tertiary">
          <h3 className="text-lg font-medium text-theme-primary">Code View</h3>
          <button onClick={onClose} className="p-1 text-theme-secondary hover:text-theme-primary transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {canPreview && (
          <div className="flex items-center justify-center gap-1 px-6 py-3 border-b border-theme-tertiary">
            {(["preview", "code"] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${viewMode === m ? "bg-theme-inverted text-theme-inverted" : "bg-theme-primary text-theme-secondary hover:text-theme-primary"}`}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-auto p-6">
          {viewMode === "preview" && canPreview ? (
            <div className="w-full h-full bg-white rounded-lg overflow-hidden"><iframe srcDoc={codeBlock.code} className="w-full h-full border-none" title="Code preview" /></div>
          ) : (
            <pre className="glassPanel p-4 rounded-lg text-xs text-theme-primary overflow-x-auto border border-theme-tertiary whitespace-pre-wrap">{codeBlock.code}</pre>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-theme-tertiary">
          <button onClick={() => { onInsert(codeBlock.code); onClose(); }} className="px-4 py-2 text-sm font-medium bg-theme-primary hover:bg-[#52585A] text-theme-primary rounded-lg border border-theme-tertiary transition-all">Insert</button>
          <button onClick={() => { onReplace(codeBlock.code); onClose(); }} className="px-4 py-2 text-sm font-medium bg-theme-primary hover:bg-[#52585A] text-theme-primary rounded-lg border border-theme-tertiary transition-all">Replace</button>
          <button onClick={() => navigator.clipboard.writeText(codeBlock.code)} className="px-4 py-2 text-sm font-medium bg-theme-primary hover:bg-[#52585A] text-theme-primary rounded-lg border border-theme-tertiary transition-all">Copy</button>
        </div>
      </div>
    </div>
  );
}

/* ── Slides Preview Modal ── */
function SlidesPreviewModal({ isOpen, onClose, slides, onInsertSlides }: {
  isOpen: boolean; onClose: () => void; slides: string[]; onInsertSlides: (s: string[]) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => {
    if (isOpen) { setMounted(true); document.documentElement.classList.add("overflow-hidden"); requestAnimationFrame(() => setShow(true)); }
    else { setShow(false); document.documentElement.classList.remove("overflow-hidden"); }
  }, [isOpen]);
  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const r = wrapperRef.current.getBoundingClientRect();
      const scale = Math.min(r.width / 1920, r.height / 1080);
      setDims({ width: 1920 * scale, height: 1080 * scale });
    };
    update();
    const ro = new ResizeObserver(() => requestAnimationFrame(update));
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, [isOpen]);
  useEffect(() => {
    if (viewMode !== "visual") return;
    const target = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
    if (!target || !slides[currentIndex]) return;
    const scale = dims.width / 1920 || 1;
    target.open();
    target.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(${scale});transform-origin:top left;display:flex;align-items:center;justify-content:center;}section{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;background:white;}</style></head><body>${slides[currentIndex]}</body></html>`);
    target.close();
  }, [slides, currentIndex, dims, viewMode]);

  const handleClose = () => setShow(false);
  const onEnd = () => { if (!show) { setMounted(false); document.documentElement.classList.remove("overflow-hidden"); onClose(); } };
  if (!mounted) return null;

  return (
    <div
      className={["fixed z-50 inset-0 flex items-center justify-center bg-black/40 transition-[backdrop-filter,opacity] duration-200", show ? "opacity-100 backdrop-blur-xl" : "opacity-0 backdrop-blur-0"].join(" ")}
      onMouseDown={handleClose}
      onTransitionEnd={onEnd}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`rounded-2xl bg-theme-primary border border-theme-tertiary w-[95vw] md:w-[85vw] max-w-[1400px] h-[90vh] flex flex-col overflow-hidden transform transition-all duration-200 ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-theme-tertiary flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-theme-primary">{currentIndex + 1} / {slides.length}</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="p-1.5 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))} disabled={currentIndex === slides.length - 1} className="p-1.5 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-theme-quaternary rounded-lg p-0.5">
              {(["visual", "code"] as const).map((m) => (
                <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === m ? "bg-theme-secondary text-theme-primary" : "text-theme-secondary hover:text-theme-primary"}`}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* body */}
        <div className={`flex ${isMobile ? "flex-col" : "flex-row"} w-full min-h-0 p-3 gap-3`} style={{ flex: "1 1 0", overflow: "hidden" }}>
          {viewMode === "visual" ? (
            <>
              {/* main preview */}
              <div ref={wrapperRef} className={`flex items-center justify-center bg-theme-quaternary rounded-xl overflow-hidden ${isMobile ? "w-full flex-1 min-h-0" : "flex-1 min-h-0 h-full"}`}>
                {dims.width > 0 && (
                  <div className="relative flex-shrink-0 rounded-lg overflow-hidden" style={{ width: dims.width, height: dims.height }}>
                    <iframe ref={iframeRef} className="absolute inset-0 w-full h-full border-none" title="Slide preview" />
                  </div>
                )}
              </div>

              {/* thumbnails */}
              <div className={`flex-shrink-0 flex bg-theme-quaternary rounded-xl p-2 gap-2 scrollbar-custom ${isMobile ? "w-full flex-row overflow-x-auto" : "flex-col overflow-y-auto"}`} style={isMobile ? { height: "80px" } : { width: "140px" }}>
                {slides.map((slide, idx) => {
                  const thumbW = isMobile ? 120 : 120;
                  const thumbH = Math.round(thumbW * (1080 / 1920));
                  const thumbScale = thumbW / 1920;
                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`cursor-pointer rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${currentIndex === idx ? "border-blue-500" : "border-transparent hover:border-theme-tertiary"}`}
                      style={{ width: thumbW, height: thumbH }}
                    >
                      <iframe
                        title={`thumb-${idx}`}
                        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;}body{transform:scale(${thumbScale});transform-origin:top left;}</style></head><body>${slide}</body></html>`}
                        className="border-none pointer-events-none"
                        style={{ width: "1920px", height: "1080px", transform: `scale(${thumbScale})`, transformOrigin: "top left" }}
                        sandbox=""
                      />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="w-full h-full overflow-auto">
              <pre className="p-4 rounded-xl text-xs text-theme-primary overflow-x-auto border border-theme-tertiary whitespace-pre-wrap bg-theme-quaternary h-full">{slides[currentIndex]}</pre>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-theme-tertiary flex-shrink-0">
          <button onClick={() => { onInsertSlides(slides); handleClose(); }} className="px-5 py-2 text-sm font-medium bg-theme-inverted text-theme-inverted rounded-lg hover:opacity-90 transition-all">
            Insert {slides.length} Slide{slides.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Inline slide preview (module-level so it never remounts on parent re-render) ── */
function InlineSlidePreview({ slides: s, msgIndex, onInsert, onOpenModal }: {
  slides: string[];
  msgIndex: number;
  onInsert: (s: string[]) => void;
  onOpenModal: (slides: string[], messageIndex: number) => void;
}) {
  const [pi, setPi] = useState(0);
  const [inlineScale, setInlineScale] = useState(1);
  const inlineWrapperRef = useRef<HTMLDivElement>(null);
  const inlineIframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const update = () => {
      if (!inlineWrapperRef.current) return;
      const r = inlineWrapperRef.current.getBoundingClientRect();
      setInlineScale(Math.min(r.width / 1920, r.height / 1080));
    };
    update();
    const ro = new ResizeObserver(() => requestAnimationFrame(update));
    if (inlineWrapperRef.current) ro.observe(inlineWrapperRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const target = inlineIframeRef.current?.contentDocument || inlineIframeRef.current?.contentWindow?.document;
    if (!target) return;
    target.open();
    target.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"><\/script><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(${inlineScale});transform-origin:top left;display:flex;align-items:center;justify-content:center;}section{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;background:white;}</style></head><body>${s[pi]}</body></html>`);
    target.close();
  }, [s, pi, inlineScale]);
  return (
    <div className="mt-4 space-y-3">
      <div className="bg-theme-primary border border-theme-tertiary rounded-xl p-4">
        <div ref={inlineWrapperRef} className="w-full aspect-[16/9] bg-theme-quaternary rounded-lg overflow-hidden shadow-lg relative">
          <iframe ref={inlineIframeRef} className="absolute top-0 left-0 w-full h-full border-none pointer-events-none" title={`Slide Preview ${pi + 1}`} />
          {s.length > 1 && (
            <div className="absolute bottom-2 right-2 flex gap-1 bg-black/50 rounded-lg p-1">
              <button onClick={() => setPi(Math.max(0, pi - 1))} disabled={pi === 0} className="p-1 text-white hover:bg-white/20 rounded disabled:opacity-30 transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
              </button>
              <span className="text-white text-xs px-2 py-1 flex items-center">{pi + 1} / {s.length}</span>
              <button onClick={() => setPi(Math.min(s.length - 1, pi + 1))} disabled={pi === s.length - 1} className="p-1 text-white hover:bg-white/20 rounded disabled:opacity-30 transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onInsert(s)} className="flex-1 px-4 py-2.5 text-sm font-medium bg-[#d0d0d0] hover:bg-[#bcbcbc] text-black rounded-lg transition-all">
          Insert {s.length} Slide{s.length > 1 ? "s" : ""}
        </button>
        <button onClick={() => onOpenModal(s, msgIndex)} className="p-2.5 text-theme-secondary hover:text-theme-primary bg-theme-primary hover:bg-[#52585A] rounded-lg border border-theme-tertiary transition-all" title="Open in modal">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>visibility</span>
        </button>
      </div>
    </div>
  );
}

/* ── Animated message for AI responses ── */
function AnimatedMessage({ content, isLatest }: { content: string; isLatest: boolean }) {
  const animated = useAnimatedText(isLatest ? content : "");
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {isLatest ? animated || content : content}
    </div>
  );
}

/* ── Main component ── */
export default function GeminiChatbot({
  setCode, code, projectId, currentSlideIndex, slides,
  onDeleteSlide, onDeleteAllSlides, initialPrompt, externalMessage,
}: {
  setCode: (val: string | ((v: string) => string)) => void;
  code?: string;
  projectId?: string;
  currentSlideIndex?: number;
  slides?: string[];
  onDeleteSlide?: (index: number) => void;
  onDeleteAllSlides?: () => void;
  initialPrompt?: string | null;
  // A message pushed in from outside (e.g. the Tweak panel). Bump `nonce` to
  // re-send the same text. Routed through the normal chat flow so it appears
  // in the conversation instead of firing a hidden background request.
  externalMessage?: { text: string; nonce: number } | null;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [latestAssistantMsgId, setLatestAssistantMsgId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedCodeModal, setSelectedCodeModal] = useState<{ lang?: string; code: string; description: string } | null>(null);
  const [selectedSlidesModal, setSelectedSlidesModal] = useState<{ slides: string[]; messageIndex: number } | null>(null);
  const [showCodeMap, setShowCodeMap] = useState<{ [msgIndex: number]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem("selectedModel") || "gpt-4o");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showComponents, setShowComponents] = useState(false);

  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    const normalize = (av?: string | null) =>
      !av ? null : (av.startsWith("data:") || av.startsWith("http") ? av : `data:image/png;base64,${av}`);
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        const av = normalize(u.avatar);
        if (av) { setUserAvatar(av); return; }
      }
      const av = normalize(localStorage.getItem("avatar"));
      if (av) setUserAvatar(av);
    } catch {}
  }, []);

  const ADMIN_MODELS = [
    { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "gemini" },
    { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", provider: "gemini" },
  ];

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${urlbackend}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data?.user?.is_admin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  /* ── load history ── */
  useEffect(() => {
    if (!projectId) { setLoadingHistory(false); return; }
    const token = localStorage.getItem("token");
    if (!token) { setLoadingHistory(false); return; }
    fetch(`${urlbackend}/projects/${projectId}/chat`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.messages) {
          setMessages(data.messages.map((m: any, i: number) => ({
            id: String(i), role: m.role, content: m.content,
            attachments: m.attachments || [], previewSlides: m.previewSlides, codeBlock: m.codeBlock,
          })));
        }
      })
      .catch((err) => console.error("Error loading chat history:", err))
      .finally(() => setLoadingHistory(false));
  }, [projectId]);

  /* ── save to backend ── */
  const saveMessage = useCallback(async (
    role: "user" | "assistant", content: string,
    attachments?: FileAttachment[], previewSlides?: string[],
    codeBlock?: { lang?: string; code: string; description: string },
  ) => {
    if (!projectId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`${urlbackend}/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role, content, attachments, previewSlides, codeBlock }),
      });
    } catch { /* silent */ }
  }, [projectId]);

  /* ── helpers ── */
  const insertIntoEditor = (snippet: string) => setCode((prev: any) => prev ? `${prev}\n${snippet}` : snippet);
  const replaceEditor = (snippet: string) => setCode(snippet);

  const replaceCurrentSlide = (newSlideHtml: string) => {
    if (!slides || currentSlideIndex === undefined) return;
    const cleanSlide = cleanSlideHtml(newSlideHtml);
    const updatedSlides = [...slides];
    updatedSlides[currentSlideIndex] = cleanSlide;
    setCode(`<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${updatedSlides.join("\n")}</body></html>`);
  };

  const insertSlidesAtPosition = (newSlides: string[]) => {
    const cleanSlides = newSlides.map((s) => cleanSlideHtml(s));
    if (!slides) {
      setCode(`<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${cleanSlides.join("\n")}</body></html>`);
      return;
    }
    const pos = currentSlideIndex !== undefined ? currentSlideIndex + 1 : slides.length;
    const updated = [...slides.slice(0, pos), ...cleanSlides, ...slides.slice(pos)];
    setCode(`<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${updated.join("\n")}</body></html>`);
  };

  const clearChat = async () => {
    if (!projectId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`${urlbackend}/projects/${projectId}/chat`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setMessages([]);
    } catch { /* silent */ }
  };

  /* ── main send logic (shared by sendMessage and onNew) ── */
  const processMessage = useCallback(async (userMsg: string, uploadedAttachments: FileAttachment[] = []) => {
    if (!userMsg.trim() && uploadedAttachments.length === 0) return;
    if (!projectId) { setErrors({ form: "Project ID is required to send messages" }); return; }

    if (userMsg === "/clear") { await clearChat(); return; }

    setErrors({});
    setLoading(true);

    const newUserMsg: ChatMsg = {
      id: crypto.randomUUID(), role: "user", content: userMsg,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
    };
    setMessages((prev) => [...prev, newUserMsg]);
    await saveMessage("user", userMsg, uploadedAttachments.length > 0 ? uploadedAttachments : undefined);

    try {
      const token = localStorage.getItem("token");
      const authHeaders = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      // ── Slides agent path: when a presentation is open, the model sees all slides and decides what to do ──
      if (slides && slides.length > 0) {
        let msgWithFiles = userMsg;
        if (uploadedAttachments.length > 0) {
          const fileContents = await Promise.all(uploadedAttachments.map(async (file) => {
            const isText = file.type.startsWith("text/") || file.type === "application/json" || file.type === "application/javascript";
            if (isText) {
              try { const r = await fetch(file.url); const c = await r.text(); return `File: ${file.name}\n${c}`; }
              catch { return `File: ${file.name} [failed to read]`; }
            }
            return `File: ${file.name} (${file.type}) at ${file.url}`;
          }));
          msgWithFiles += "\n\nAttached files:\n" + fileContents.join("\n\n");
        }

        const agentHistory = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
        const res = await fetch(`${urlbackend}/gemini/slides-agent`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ slides, message: msgWithFiles, history: agentHistory, model: isAdmin ? selectedModel : undefined }),
        });
        const data = await res.json();
        if (!res.ok) { setErrors({ form: data?.error || "Error connecting to AI" }); return; }

        const { action, slides: newSlides = [], slideIndex = 0, message: agentMsg = "" } = data;
        let assistantText = agentMsg || "";
        let previewSlides: string[] | undefined;

        if (action === "replace_all" && newSlides.length > 0) {
          const cleanSlides = injectStyleIntoAllSections(newSlides.map((s: string) => cleanSlideHtml(s)));
          setCode(`<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${cleanSlides.join("\n")}</body></html>`);
          previewSlides = cleanSlides;
          assistantText = assistantText || `Created ${cleanSlides.length} slide${cleanSlides.length > 1 ? "s" : ""}.`;
        } else if (action === "replace_slide" && newSlides.length > 0) {
          const clean = cleanSlideHtml(newSlides[0]);
          const updated = [...slides];
          updated[slideIndex] = clean;
          setCode(`<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${updated.join("\n")}</body></html>`);
          assistantText = assistantText || `Updated slide ${slideIndex + 1}.`;
        } else if (action === "insert_after" && newSlides.length > 0) {
          const cleanSlides = newSlides.map((s: string) => cleanSlideHtml(s));
          const pos = slideIndex + 1;
          const updated = [...slides.slice(0, pos), ...cleanSlides, ...slides.slice(pos)];
          setCode(`<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>${updated.join("\n")}</body></html>`);
          previewSlides = cleanSlides;
          assistantText = assistantText || `Added ${cleanSlides.length} slide${cleanSlides.length > 1 ? "s" : ""}.`;
        } else if (action === "delete_slide") {
          if (onDeleteSlide) onDeleteSlide(slideIndex);
          assistantText = assistantText || `Deleted slide ${slideIndex + 1}.`;
        } else if (action === "delete_all") {
          if (onDeleteAllSlides) onDeleteAllSlides();
          assistantText = assistantText || "Deleted all slides.";
        }

        const assistantMsg: ChatMsg = { id: crypto.randomUUID(), role: "assistant", content: assistantText, previewSlides };
        setMessages((prev) => [...prev, assistantMsg]);
        setLatestAssistantMsgId(assistantMsg.id);
        await saveMessage("assistant", assistantText, undefined, previewSlides);
        return;
      }

      // ── No slides open: general purpose path (code generation, chat, or new presentation) ──
      const decision = classifyPrompt(userMsg);
      let message = userMsg;
      let systemPrompt = "Act like a technical assistant similar to GitHub Copilot. If the user asks for code, return a single markdown code block (```lang) with no extra text. If the user asks for HTML slides, return ONLY <section> tags (no doctype, no html/head/body tags). If the user just wants to chat, answer briefly and clearly.";
      let contextToSend = code || undefined;

      let filesContext = "";
      if (uploadedAttachments.length > 0) {
        const fileContents = await Promise.all(uploadedAttachments.map(async (file) => {
          const isText = file.type.startsWith("text/") || file.type === "application/json" || file.type === "application/javascript";
          if (isText) {
            try { const r = await fetch(file.url); const c = await r.text(); return `File: ${file.name} (${file.type})\n${c}`; }
            catch { return `File: ${file.name} (${file.type})\n[Failed to read file]`; }
          }
          return `File: ${file.name} (${file.type}) - ${formatFileSize(file.size)}\n[Image file - available at ${file.url}]`;
        }));
        filesContext = "\n\nAttached files:\n" + fileContents.join("\n\n");
      }

      if (decision === "slides") {
        // The backend picks the design template from the raw message and builds
        // the full prompt (template CSS + example slides). SLIDES_SYSTEM_PROMPT
        // is only a fallback — the backend replaces it in slides mode.
        systemPrompt = SLIDES_SYSTEM_PROMPT;
        message = `${userMsg}${filesContext}`;
      } else if (decision === "code") {
        message = `Return a single markdown code block (\`\`\`<language>) and nothing else.\nIf the language is HTML and it makes sense, return a full document.\n\nSpec:\n${userMsg}${filesContext}`;
      } else {
        message = userMsg + filesContext;
      }

      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(`${urlbackend}/gemini`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ system: systemPrompt, mode: decision === "slides" ? "slides" : "auto", message, context: contextToSend, history, model: isAdmin ? selectedModel : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ form: data?.error || "Error connecting to Gemini" }); return; }
      const raw = normalizeLLMText(data);

      const codeBlock = extractFirstCodeBlock(raw);
      const htmlOnly = !codeBlock && looksLikeHTML(raw);
      let assistantTextToShow = raw;
      let snippetToApply: string | null = null;
      let previewSlides: string[] | undefined;
      let codeBlockData: ChatMsg["codeBlock"] | undefined;

      if (codeBlock) {
        snippetToApply = codeBlock.code;
        if (decision === "slides") {
          previewSlides = injectStyleIntoAllSections(extractSlides(codeBlock.code));
          assistantTextToShow = `I created ${previewSlides.length} slide${previewSlides.length > 1 ? "s" : ""} for you.`;
        } else if (codeBlock.code.includes("<section")) {
          codeBlockData = { lang: codeBlock.lang || "html", code: codeBlock.code, description: "I updated the slide" };
          assistantTextToShow = "I updated the slide for you. Click below to see the code.";
        } else {
          codeBlockData = { lang: codeBlock.lang, code: codeBlock.code, description: generateCodeDescription(codeBlock.code, codeBlock.lang) };
          assistantTextToShow = codeBlockData.description;
        }
      } else if (htmlOnly) {
        snippetToApply = raw;
        if (decision === "slides") {
          previewSlides = injectStyleIntoAllSections(extractSlides(raw));
          assistantTextToShow = `I created ${previewSlides.length} slide${previewSlides.length > 1 ? "s" : ""} for you.`;
        } else if (raw.includes("<section")) {
          codeBlockData = { lang: "html", code: raw, description: "I updated the slide" };
          assistantTextToShow = "I updated the slide for you. Click below to see the code.";
        }
      }

      const assistantMsg: ChatMsg = { id: crypto.randomUUID(), role: "assistant", content: assistantTextToShow, previewSlides, codeBlock: codeBlockData };
      setMessages((prev) => [...prev, assistantMsg]);
      setLatestAssistantMsgId(assistantMsg.id);
      await saveMessage("assistant", assistantTextToShow, undefined, previewSlides, codeBlockData);

      if (snippetToApply && slides && currentSlideIndex !== undefined && !previewSlides) {
        replaceCurrentSlide(snippetToApply);
      }
    } catch {
      setErrors({ form: "Connection error" });
    } finally {
      setLoading(false);
    }
  }, [messages, projectId, code, currentSlideIndex, slides, setCode, saveMessage, onDeleteSlide, onDeleteAllSlides]);

  /* ── style picker actions ── */
  const handleApplyStyle = (templateName: string) => {
    processMessage(`Apply the "${templateName}" template style to all existing slides. Keep all content exactly as-is — same text, same images, same structure. Only change colors, fonts, and visual design to match the template.`);
  };

  const handleRegenerateWithStyle = (templateName: string) => {
    const topic = slides && slides.length > 0 ? "the same topic as the current presentation" : "a general presentation";
    processMessage(`Regenerate the entire presentation about ${topic} using the "${templateName}" template. Create 10 slides with the full visual style of that template.`);
  };

  /* ── send from textarea ── */
  const sendMessage = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;
    const userMsg = inputValue.trim();

    let uploadedAttachments: FileAttachment[] = [];

    if (attachedFiles.length > 0) {
      setUploadingFiles(true);
      try {
        uploadedAttachments = await Promise.all(attachedFiles.map(async (file) => ({
          name: file.name, type: file.type, size: file.size,
          url: await uploadFileToStorage(file, projectId!),
        })));
      } catch {
        setErrors({ form: "Failed to upload files" });
        setUploadingFiles(false);
        return;
      }
      setUploadingFiles(false);
    }

    setInputValue("");
    setAttachedFiles([]);
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.style.height = "48px"; }
    await processMessage(userMsg, uploadedAttachments);
  };

  /* ── onNew for assistant-ui suggestions ── */
  const onNew = useCallback(async (appendMsg: any) => {
    const text: string = appendMsg.content?.filter((p: any) => p.type === "text")?.map((p: any) => p.text)?.join("") ?? "";
    if (!text.trim()) return;
    setInputValue(text);
    await processMessage(text);
    setInputValue("");
  }, [processMessage]);

  /* ── runtime (for Suggestion primitive only) ── */
  const runtime = useExternalStoreRuntime({
    messages,
    isRunning: loading,
    onNew,
    convertMessage: (msg: ChatMsg) => ({
      id: msg.id, role: msg.role,
      content: [{ type: "text" as const, text: msg.content }],
    }),
  });

  /* ── initial prompt ── */
  useEffect(() => {
    if (initialPrompt && !loadingHistory && messages.length === 0 && projectId) {
      setInputValue(initialPrompt);
      setTimeout(() => { processMessage(initialPrompt); setInputValue(""); }, 500);
    }
  }, [initialPrompt, loadingHistory, messages.length, projectId]);

  /* ── external message (Tweak panel, etc.) ── */
  const lastExternalNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!externalMessage || externalMessage.nonce === lastExternalNonce.current) return;
    lastExternalNonce.current = externalMessage.nonce;
    if (externalMessage.text.trim()) processMessage(externalMessage.text);
  }, [externalMessage, processMessage]);

  /* ── regenerate ── */
  const regenerateLastMessage = async () => {
    if (messages.length < 2) return;
    const lastUserMsgIndex = messages.findLastIndex((m) => m.role === "user");
    if (lastUserMsgIndex === -1) return;
    const lastUserMsg = messages[lastUserMsgIndex];
    setMessages((prev) => prev.slice(0, lastUserMsgIndex));
    setTimeout(() => processMessage(lastUserMsg.content), 100);
  };


  /* ── code block accordion ── */
  const renderCodeBlock = (msg: ChatMsg, msgIndex: number) => {
    if (!msg.codeBlock) return null;
    const showCode = showCodeMap[msgIndex] ?? false;
    const toggleShowCode = () => setShowCodeMap((p) => ({ ...p, [msgIndex]: !p[msgIndex] }));
    return (
      <div className="bg-theme-primary border border-theme-tertiary rounded-xl overflow-hidden transition-all">
        <div className="px-4 py-3 flex items-center justify-between hover:bg-[#52585A] transition-colors cursor-pointer" onClick={toggleShowCode}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            <span className="text-sm font-medium text-theme-primary">{msg.codeBlock.lang ? msg.codeBlock.lang.toUpperCase() : "CODE"}</span>
          </div>
          <svg className={`w-4 h-4 text-theme-secondary transition-transform ${showCode ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        <div className="border-t border-theme-tertiary" onClick={(e) => e.stopPropagation()}>
          <pre className={`p-4 text-xs text-theme-primary overflow-x-auto whitespace-pre-wrap bg-[#0a0a0a] transition-all w-0 min-w-full ${showCode ? "max-h-96 overflow-y-auto" : "max-h-[3rem] overflow-hidden"}`} style={{ lineHeight: "1.5" }}>
            {msg.codeBlock.code}
          </pre>
          {showCode && (
            <div className="flex gap-2 p-3 border-t border-theme-tertiary bg-theme-primary">
              {[["Insert", () => insertIntoEditor(msg.codeBlock!.code)], ["Replace", () => replaceEditor(msg.codeBlock!.code)], ["Copy", () => navigator.clipboard.writeText(msg.codeBlock!.code)]].map(([label, fn]) => (
                <button key={label} onClick={(e) => { e.stopPropagation(); (fn as any)(); }} className="flex-1 px-3 py-2 text-xs font-medium bg-theme-primary hover:bg-[#52585A] text-theme-primary rounded-lg border border-theme-tertiary transition-all">{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-col h-full w-full overflow-hidden p-4 relative">
        <div className="absolute inset-0 w-full h-full bg-theme-alt" />

        <div className="flex flex-col bg-theme-primary border border-theme-tertiary text-theme-primary rounded-xl min-h-full min-w-full p-4 overflow-hidden relative z-[1]">
          {/* Top edge blur — sits above the scroll container, not inside it */}
          <div className="absolute top-4 left-4 pointer-events-none z-10" style={{ height: 20, right: "calc(1rem + 8px)" }} aria-hidden="true">
            {[2, 4, 8, 12].map((blur, i, arr) => (
              <div key={blur} className="absolute inset-0" style={{
                backdropFilter: `blur(${blur}px)`,
                WebkitBackdropFilter: `blur(${blur}px)`,
                maskImage: `linear-gradient(to bottom, black ${(i / arr.length) * 100}%, transparent ${((i + 1) / arr.length) * 100}%)`,
                WebkitMaskImage: `linear-gradient(to bottom, black ${(i / arr.length) * 100}%, transparent ${((i + 1) / arr.length) * 100}%)`,
              }} />
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-6">
            {/* Loading history */}
            {loadingHistory && (
              <div className="flex items-center justify-center mt-12">
                <Spinner className="size-5 text-theme-secondary" />
              </div>
            )}

            {/* Empty state */}
            {!loadingHistory && messages.length === 0 && (
              <div className="text-center text-theme-secondary mt-12 space-y-3">
                <p className="text-sm">How can I help you today?</p>
                <p className="text-xs text-theme-secondary">Ask me to create slides, write code, or chat</p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => {
              const isAssistant = msg.role === "assistant";
              return (
                <React.Fragment key={msg.id}>
                <div className="animate-fadeIn" style={{ animation: "fadeIn 0.3s ease-in", opacity: 0, animationFillMode: "forwards", animationDelay: `${i * 0.05}s` }}>
                  <div className={`flex gap-3 group ${isAssistant ? "" : "flex-row-reverse"}`}>
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-theme-quaternary border border-theme-tertiary">
                    {isAssistant ? (
                      <svg width="20" height="20" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.8482 24.0516C22.7386 22.9498 22.2684 22.0939 21.4374 21.4838C20.6064 20.8737 19.4787 20.5687 18.0542 20.5687C17.0862 20.5687 16.269 20.7052 15.6024 20.9784C14.9358 21.2425 14.4244 21.6113 14.0683 22.0848C13.7213 22.5583 13.5478 23.0955 13.5478 23.6965C13.5295 24.1973 13.6345 24.6344 13.8628 25.0077C14.1002 25.3811 14.4244 25.7043 14.8353 25.9775C15.2462 26.2416 15.7211 26.4738 16.2598 26.6741C16.7986 26.8653 17.3739 27.0292 17.9857 27.1658L20.506 27.7668C21.7296 28.04 22.8528 28.4042 23.8755 28.8595C24.8982 29.3148 25.784 29.8748 26.5328 30.5395C27.2816 31.2042 27.8614 31.9873 28.2723 32.8888C28.6924 33.7903 28.907 34.8238 28.9161 35.9893C28.907 37.7012 28.4686 39.1855 27.6012 40.4421C26.7428 41.6896 25.5009 42.6593 23.8755 43.3514C22.2592 44.0343 20.3097 44.3758 18.0268 44.3758C15.7622 44.3758 13.7898 44.0298 12.1096 43.3377C10.4385 42.6457 9.13271 41.6213 8.19217 40.2645C7.26075 38.8986 6.77222 37.2095 6.72656 35.1971H12.4657C12.5296 36.135 12.799 36.9181 13.2738 37.5464C13.7578 38.1656 14.4016 38.6346 15.2052 38.9533C16.0179 39.2629 16.9356 39.4177 17.9583 39.4177C18.9628 39.4177 19.8348 39.272 20.5745 38.9806C21.3233 38.6892 21.9031 38.284 22.314 37.765C22.7249 37.2459 22.9304 36.6495 22.9304 35.9757C22.9304 35.3474 22.7432 34.8192 22.3688 34.3913C22.0036 33.9633 21.4648 33.5991 20.7525 33.2986C20.0494 32.9981 19.1865 32.7249 18.1638 32.479L15.1093 31.7142C12.7442 31.1405 10.8768 30.2436 9.5071 29.0234C8.13738 27.8032 7.45708 26.1596 7.46621 24.0926C7.45708 22.3989 7.90909 20.9192 8.82224 19.6535C9.74452 18.3878 11.0092 17.3998 12.6164 16.6896C14.2235 15.9793 16.0498 15.6242 18.0953 15.6242C20.1773 15.6242 21.9944 15.9793 23.5468 16.6896C25.1083 17.3998 26.3227 18.3878 27.1902 19.6535C28.0577 20.9192 28.5052 22.3853 28.5326 24.0516H22.8482Z" fill="url(#paint0_chat)"/>
                        <path d="M41.1238 39.7182V20.3774H46.0274V39.7182H41.1238ZM33.8779 32.4927V27.6029H53.2732V32.4927H33.8779Z" fill="url(#paint1_chat)"/>
                        <defs>
                          <linearGradient id="paint0_chat" x1="-10" y1="30" x2="72" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#7182FF"/><stop offset="1" stopColor="#249931"/></linearGradient>
                          <linearGradient id="paint1_chat" x1="-10" y1="30" x2="72" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#7182FF"/><stop offset="1" stopColor="#249931"/></linearGradient>
                        </defs>
                      </svg>
                    ) : userAvatar ? (
                      <img src={userAvatar} alt="You" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-3.5 h-3.5 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    )}
                  </div>

                  {/* Bubble + actions */}
                  <div className={`flex flex-col gap-1 max-w-[85%] ${isAssistant ? "items-start" : "items-end"}`}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-1">
                        {msg.attachments.map((file, idx) => (
                          <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-theme-primary border border-[#52585A] rounded-lg text-xs hover:bg-[#1a1a1a] transition-colors">
                            {file.type.startsWith("image/") ? (
                              <svg className="w-4 h-4 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            ) : (
                              <svg className="w-4 h-4 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            )}
                            <span>{file.name}</span>
                            <span className="text-theme-secondary">({formatFileSize(file.size)})</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isAssistant ? "bg-theme-quaternary text-theme-primary rounded-tl-sm" : "bg-theme-inverted text-theme-inverted rounded-tr-sm"}`}>
                      {isAssistant ? (
                        <AnimatedMessage content={msg.content} isLatest={msg.id === latestAssistantMsgId} />
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>

  
                    {/* Copy + Regenerate */}
                    {isAssistant && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="p-1.5 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary transition-all"
                          title="Copy"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                        {i === messages.length - 1 && (
                          <button
                            onClick={regenerateLastMessage}
                            disabled={messages.length < 2 || loading}
                            className="p-1.5 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Regenerate"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                </div>
                {/* Code block and slide preview at full width, outside bubble constraint */}
                {isAssistant && msg.codeBlock && renderCodeBlock(msg, i)}
                {isAssistant && msg.previewSlides && msg.previewSlides.length > 0 && (
                  <InlineSlidePreview slides={msg.previewSlides} msgIndex={i} onInsert={insertSlidesAtPosition} onOpenModal={(s, idx) => setSelectedSlidesModal({ slides: s, messageIndex: idx })} />
                )}
                </React.Fragment>
              );
            })}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-3 animate-fadeIn">
                <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-theme-quaternary border border-theme-tertiary">
                  <svg width="20" height="20" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.8482 24.0516C22.7386 22.9498 22.2684 22.0939 21.4374 21.4838C20.6064 20.8737 19.4787 20.5687 18.0542 20.5687C17.0862 20.5687 16.269 20.7052 15.6024 20.9784C14.9358 21.2425 14.4244 21.6113 14.0683 22.0848C13.7213 22.5583 13.5478 23.0955 13.5478 23.6965C13.5295 24.1973 13.6345 24.6344 13.8628 25.0077C14.1002 25.3811 14.4244 25.7043 14.8353 25.9775C15.2462 26.2416 15.7211 26.4738 16.2598 26.6741C16.7986 26.8653 17.3739 27.0292 17.9857 27.1658L20.506 27.7668C21.7296 28.04 22.8528 28.4042 23.8755 28.8595C24.8982 29.3148 25.784 29.8748 26.5328 30.5395C27.2816 31.2042 27.8614 31.9873 28.2723 32.8888C28.6924 33.7903 28.907 34.8238 28.9161 35.9893C28.907 37.7012 28.4686 39.1855 27.6012 40.4421C26.7428 41.6896 25.5009 42.6593 23.8755 43.3514C22.2592 44.0343 20.3097 44.3758 18.0268 44.3758C15.7622 44.3758 13.7898 44.0298 12.1096 43.3377C10.4385 42.6457 9.13271 41.6213 8.19217 40.2645C7.26075 38.8986 6.77222 37.2095 6.72656 35.1971H12.4657C12.5296 36.135 12.799 36.9181 13.2738 37.5464C13.7578 38.1656 14.4016 38.6346 15.2052 38.9533C16.0179 39.2629 16.9356 39.4177 17.9583 39.4177C18.9628 39.4177 19.8348 39.272 20.5745 38.9806C21.3233 38.6892 21.9031 38.284 22.314 37.765C22.7249 37.2459 22.9304 36.6495 22.9304 35.9757C22.9304 35.3474 22.7432 34.8192 22.3688 34.3913C22.0036 33.9633 21.4648 33.5991 20.7525 33.2986C20.0494 32.9981 19.1865 32.7249 18.1638 32.479L15.1093 31.7142C12.7442 31.1405 10.8768 30.2436 9.5071 29.0234C8.13738 27.8032 7.45708 26.1596 7.46621 24.0926C7.45708 22.3989 7.90909 20.9192 8.82224 19.6535C9.74452 18.3878 11.0092 17.3998 12.6164 16.6896C14.2235 15.9793 16.0498 15.6242 18.0953 15.6242C20.1773 15.6242 21.9944 15.9793 23.5468 16.6896C25.1083 17.3998 26.3227 18.3878 27.1902 19.6535C28.0577 20.9192 28.5052 22.3853 28.5326 24.0516H22.8482Z" fill="url(#paint0_load)"/>
                    <path d="M41.1238 39.7182V20.3774H46.0274V39.7182H41.1238ZM33.8779 32.4927V27.6029H53.2732V32.4927H33.8779Z" fill="url(#paint1_load)"/>
                    <defs>
                      <linearGradient id="paint0_load" x1="-10" y1="30" x2="72" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#7182FF"/><stop offset="1" stopColor="#249931"/></linearGradient>
                      <linearGradient id="paint1_load" x1="-10" y1="30" x2="72" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#7182FF"/><stop offset="1" stopColor="#249931"/></linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-theme-quaternary flex items-center gap-2">
                  <Spinner className="size-3 text-theme-secondary" />
                  <Timer
                    loading={loading}
                    format="MM:SS"
                    variant="ghost"
                    size="sm"
                    className="px-0 py-0 gap-1"
                    icon={() => null}
                  />
                </div>
              </div>
            )}

            {uploadingFiles && <div className="text-blue-400 text-sm">Uploading files...</div>}

            {errors.form && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-900/50 rounded-lg px-4 py-2">{errors.form}</div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-6 py-4 border-t border-[#52585A]">
            {attachedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-theme-primary border border-[#52585A] rounded-lg text-xs">
                    {file.type.startsWith("image/") ? (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                    <span>{file.name}</span>
                    <span className="text-theme-secondary">({formatFileSize(file.size)})</span>
                    <button onClick={() => setAttachedFiles((p) => p.filter((_, j) => j !== index))} className="ml-1 text-theme-secondary hover:text-theme-primary transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <div className="relative flex items-center gap-2 mb-1">
                <button
                  onClick={() => setShowModelPicker(p => !p)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-theme-tertiary bg-theme-primary hover:bg-[#52585A] text-theme-secondary transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  {ADMIN_MODELS.find(m => m.id === selectedModel)?.label || selectedModel}
                  <svg className={`w-3 h-3 transition-transform ${showModelPicker ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showModelPicker && (
                  <div className="absolute bottom-full mb-1 left-0 bg-theme-primary border border-theme-tertiary rounded-lg shadow-lg overflow-hidden z-10">
                    {ADMIN_MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModel(m.id); localStorage.setItem("selectedModel", m.id); setShowModelPicker(false); }}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-[#52585A] transition-colors flex items-center gap-2 ${selectedModel === m.id ? "text-theme-primary font-medium" : "text-theme-secondary"}`}
                      >
                        {selectedModel === m.id && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
                        {selectedModel !== m.id && <span className="w-1.5 h-1.5 inline-block" />}
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 items-center">
              <input ref={fileInputRef} type="file" multiple onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setAttachedFiles((p) => [...p, ...files.filter((f) => f.size <= 10 * 1024 * 1024)]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }} className="hidden" accept="*/*" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles || loading} className="bg-theme-primary hover:bg-[#52585A] border border-[#52585A] rounded-lg px-3 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0" title="Attach files">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
              <button onClick={() => setShowComponents(true)} disabled={uploadingFiles || loading} className="bg-theme-primary hover:bg-[#52585A] border border-[#52585A] rounded-lg px-3 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0" title="Componentes">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
              </button>
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={uploadingFiles}
                className="flex-1 bg-theme-primary rounded-lg border border-[#52585A] px-4 py-3 text-sm focus:outline-none focus:border-[#3a3a3a] transition-colors disabled:opacity-50 resize-none overflow-y-auto min-h-[48px] max-h-[200px]"
                placeholder="Message AI Assistant"
                rows={1}
                style={{ height: "auto", minHeight: "48px" }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 200) + "px"; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !loading && !uploadingFiles) { e.preventDefault(); sendMessage(); } }}
              />
              <button
                onClick={sendMessage}
                disabled={uploadingFiles || loading || (!inputValue.trim() && attachedFiles.length === 0)}
                className="bg-theme-inverted text-theme-inverted disabled:bg-[#52585A] disabled:opacity-50 rounded-lg font-medium text-sm transition-all disabled:cursor-not-allowed flex items-center justify-center min-h-full p-4 aspect-square"
              >
                {loading ? (
                  <div className="w-4 h-4 bg-theme-primary rounded-sm animate-spin" style={{ animationDuration: "3s" }} />
                ) : (
                  <CornerRightUp className={`w-4 h-4 transition-opacity ${inputValue.trim() || attachedFiles.length > 0 ? "opacity-100" : "opacity-50"}`} />
                )}
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0);   }
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-in forwards; }
        `}</style>
      </div>

      {selectedCodeModal && (
        <CodeModal isOpen onClose={() => setSelectedCodeModal(null)} codeBlock={selectedCodeModal} onInsert={insertIntoEditor} onReplace={replaceEditor} />
      )}
      {selectedSlidesModal && (
        <SlidesPreviewModal isOpen onClose={() => setSelectedSlidesModal(null)} slides={selectedSlidesModal.slides} onInsertSlides={insertSlidesAtPosition} />
      )}
      <ComponentsModal
        isOpen={showComponents}
        onClose={() => setShowComponents(false)}
        onApplyStyle={handleApplyStyle}
        onRegenerate={handleRegenerateWithStyle}
        onInsertComponent={insertSlidesAtPosition}
      />
    </AssistantRuntimeProvider>
  );
}
