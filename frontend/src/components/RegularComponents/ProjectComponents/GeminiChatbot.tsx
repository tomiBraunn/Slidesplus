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
import { urlbackend } from "../../../config.js";
import { Spinner } from "../../ui/spinner";

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

const SLIDES_SYSTEM_PROMPT = `You are an editorial presentation designer. Your slides must look like they were art-directed by a senior designer at Wired, Bloomberg, or The New York Times. Every slide is a deliberate compositional choice — not a template filled in.

RENDERING CONTEXT — READ THIS FIRST:
Your output is injected into an iframe with a fixed 1920×1080px body. Design for this fixed canvas. Use px for layout and sizing. Do NOT use aspect-ratio, clamp(), or viewport units (vw/vh).

CRITICAL OUTPUT RULES:
- Return ONLY <section> tags. NO <!doctype>, <html>, <head>, <body>
- Every <section> must be exactly: style="width:1920px;height:1080px;overflow:hidden;position:relative;"
- All children must stay within 0–1920px horizontally and 0–1080px vertically

═══════════════════════════════
CONTAINMENT — MANDATORY
═══════════════════════════════
Root section: width:1920px; height:1080px; overflow:hidden; position:relative;

Full bleed background image:
position:absolute; top:0; left:0; width:1920px; height:1080px; object-fit:cover; z-index:0;

Content wrapper (use on every slide):
position:absolute; top:0; left:0; width:1920px; height:1080px; padding:80px 100px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; z-index:1;

Split layout pattern:
<section style="width:1920px;height:1080px;overflow:hidden;position:relative;">
  <div style="position:absolute;top:0;left:0;width:1920px;height:1080px;display:flex;">
    <div style="width:800px;height:1080px;padding:80px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;">
      <!-- text -->
    </div>
    <div style="width:1120px;height:1080px;position:relative;overflow:hidden;">
      <img style="width:1120px;height:1080px;object-fit:cover;" src="..." />
    </div>
  </div>
</section>

Grid layout — children must use explicit px widths summing to ≤1720px:
<div style="display:flex;gap:40px;width:1720px;">
  <div style="width:540px;"> ... </div>
  <div style="width:540px;"> ... </div>
  <div style="width:540px;"> ... </div>
</div>

SAFE ZONE: Keep all text within horizontal 100px–1820px and vertical 80px–1000px.

═══════════════════════════════
AGENT DISCIPLINE
═══════════════════════════════
- Each slide has ONE clear message
- Max 5 bullet points per slide, max 8 words per bullet
- Never repeat the same layout twice in a row
- Never repeat the same color palette twice in a row
- No filler phrases: "In conclusion", "As we can see", "It is important to note"
- Whitespace is a design element — use it intentionally
- Don't explain your choices — just execute

═══════════════════════════════
TYPOGRAPHY — BANNED AND REQUIRED
═══════════════════════════════
BANNED: Inter, Roboto, Arial, Space Grotesk, system-ui. Never use these.

Load fonts via @import in a <style> tag inside your first <section>. Pick ONE pair for the whole presentation:

Option A — Editorial Sharp:
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');
Display: 'Playfair Display' — Body: 'DM Sans'

Option B — Modern Condensed:
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Libre+Baskerville:ital,wght@0,400;1,400&display=swap');
Display: 'Bebas Neue' — Body: 'Libre Baskerville'

Option C — Architectural:
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Crimson+Pro:ital,wght@0,300;1,300&display=swap');
Display: 'Space Mono' — Body: 'Crimson Pro'

Option D — Luxury Serif:
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,300&family=Jost:wght@300;400&display=swap');
Display: 'Cormorant Garamond' — Body: 'Jost'

Font sizes in px for 1920×1080 canvas:
- Display/Cover title: 96px–140px; font-weight:900; letter-spacing:-2px; line-height:1.0
- Section headline: 64px–80px; font-weight:700; letter-spacing:-1px; line-height:1.1
- Body text: 28px–36px; line-height:1.75; font-weight:300
- Labels/captions: 18px–22px; letter-spacing:3px; text-transform:uppercase; font-weight:500
- Stats: 120px–180px; font-weight:900; line-height:1.0
- Bullet points: 28px–34px; line-height:1.6

═══════════════════════════════
IMAGES
═══════════════════════════════
Use real Unsplash images on at least 60% of slides:
<img src="https://images.unsplash.com/photo-{PHOTO_ID}?w=1920&q=80&fit=crop" />

Always add gradient overlay on background images:
<div style="position:absolute;top:0;left:0;width:1920px;height:1080px;background:linear-gradient(135deg,rgba(10,10,10,0.85) 0%,rgba(10,10,10,0.35) 100%);z-index:1;"></div>

Good Unsplash photo IDs by topic:
- Technology: 1518770660439-4636190af475, 1451187580459-43490279c0fa
- Business: 1507003211169-0a1dd7228f2d, 1560472354-b33ff0ad40a4
- Nature: 1441974231531-c6227db76b6e, 1472214103451-9374bd1c798e
- People/Team: 1522202176988-66273c2fd55f, 1517841905240-472988babdf9
- Abstract/Tech: 1620641788421-7a1c342ea42e, 1639762681485-074b7f938ba0
- Data/Analytics: 1551288049-bebda4e38f71, 1460925895917-afdab827c52f
- Innovation: 1485827404703-89b55fcc595e, 1519389950473-47ba0277781c

═══════════════════════════════
COLOR PALETTES — ROTATE, NEVER REPEAT ADJACENT
═══════════════════════════════
NEVER default to purple/indigo.

INK & PAPER: bg:#f5f0e8 — text:#1a1208 — accent:#c8392b
BONE & CHARCOAL: bg:#faf9f7 — text:#2c2c2c — accent:#1a1a1a
NIGHT EDITORIAL: bg:#0e0e0e — text:#f0ece4 — accent:#e8c547
STEEL & COPPER: bg:#1c1c1e — text:#e8e4df — accent:#b87333
CHALK & FOREST: bg:#f2f0eb — text:#1f2b1e — accent:#2d5a27
PRINT BLUE: bg:#f4f6f9 — text:#0d1b2a — accent:#1b4f8a

═══════════════════════════════
LAYOUT TEMPLATES
═══════════════════════════════

TEMPLATE 1 — COVER:
Full bleed image (1920×1080) + gradient overlay
Title (96px–140px) anchored bottom-left: position:absolute; bottom:120px; left:100px
Thin uppercase label above title, 1px rule line between them

TEMPLATE 2 — FEATURE SPREAD:
Left panel: 800px wide solid color, large display text, justify-content:center
Right panel: 1120px wide, full-height image object-fit:cover
Title can overlap boundary using negative margin or absolute positioning

TEMPLATE 3 — DATA STORY:
Dark background, no image
2–3 stat numbers at 160px–180px font-weight:900 in a flex row
Each stat has a 22px label below in small caps
Numbers separated by 1px vertical rules

TEMPLATE 4 — TYPOGRAPHIC:
No image — pure typography
Headline at 120px–140px filling most of the 1720px safe width
Contrasting body copy: italic serif vs upright sans
Single 1px horizontal rule at vertical center
40% of slide is intentional empty space

TEMPLATE 5 — PULL QUOTE:
Solid background
Decorative quote mark: 320px; font-weight:900; opacity:0.08; position:absolute; top:60px; left:80px
Quote text: 52px–64px display font, left-aligned, max-width:1400px
Attribution: 22px small caps with em dash

TEMPLATE 6 — ASYMMETRIC GRID:
Left image: 1100px × 1080px object-fit:cover
Right column: two stacked images each 820px × 540px
Title overlaid on left image: position:absolute; bottom:80px; left:60px; color:white; font-size:72px

TEMPLATE 7 — SECTION DIVIDER:
Single word or phrase at 180px–220px filling the width
1px rule: width:1720px at vertical center
Solid background only — black (#0e0e0e), white (#faf9f7), or solid accent color

TEMPLATE 8 — PROFILE:
Image: position:absolute; left:0; top:0; width:900px; height:1080px; object-fit:cover
1px vertical rule at x:920px; height:800px; top:140px
Text: position:absolute; left:980px; top:200px
  Name: 72px display font
  Role: 22px small caps letter-spaced
  Quote: 30px body font; max-width:800px; margin-top:40px

Slide order:
- Slide 1: TEMPLATE 1 (Cover)
- Slide 2: TEMPLATE 7 (Section Divider)
- Slides 3–5: Mix TEMPLATE 2, 4, 6
- Middle: TEMPLATE 3, 5, 8
- Second to last: TEMPLATE 7
- Last: TEMPLATE 1 variant with closing statement, bottom-anchored

NEVER use glassmorphism as the primary design element.
NEVER center everything by default — use left-aligned, bottom-anchored, or asymmetric.
NEVER make a slide that looks like PowerPoint: header + centered bullets.

═══════════════════════════════
DECORATIVE ELEMENTS — MAX 2 PER SLIDE
═══════════════════════════════
Rule line: height:1px; width:1720px; background:currentColor; opacity:0.2
Folio: position:absolute; top:60px; right:100px; font-size:18px; letter-spacing:4px; opacity:0.5
Overprinted block: solid accent rectangle 12px wide × 120px tall overlapping part of the title
Rotated label: transform:rotate(-90deg); font-size:18px; letter-spacing:6px; text-transform:uppercase

NO glowing orbs. NO glassmorphism as primary element. NO purple gradients.

═══════════════════════════════
QUALITY CHECKLIST
═══════════════════════════════
✓ section is exactly 1920×1080px, overflow:hidden
✓ No element exceeds x:1920 or y:1080
✓ All text within safe zone (100px–1820px × 80px–1000px)
✓ Font sizes in px, no clamp(), no vw/vh
✓ Text contrast > 4.5:1
✓ ONE message per slide
✓ Max 5 bullets, max 8 words each
✓ No Inter, Roboto, Arial, or system fonts
✓ Layout not defaulting to centered — intentional alignment
✓ Images use w=1920 in Unsplash URL
✓ No filler phrases
✓ No raw HTML artifacts`;

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

/* ── Main component ── */
export default function GeminiChatbot({
  setCode, code, projectId, currentSlideIndex, slides,
  onDeleteSlide, onDeleteAllSlides, initialPrompt,
}: {
  setCode: (val: string | ((v: string) => string)) => void;
  code?: string;
  projectId?: string;
  currentSlideIndex?: number;
  slides?: string[];
  onDeleteSlide?: (index: number) => void;
  onDeleteAllSlides?: () => void;
  initialPrompt?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
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
      const lower = userMsg.toLowerCase();
      const isDelete = ["delete", "remove", "erase", "elimina", "borra", "quita"].some((k) => lower.includes(k));
      const isAll    = ["all", "todas", "todos", "everything", "todo"].some((k) => lower.includes(k));
      const isCurr   = ["this slide", "current slide", "esta slide", "esta diapositiva", "current", "actual"].some((k) => lower.includes(k));
      const hasSlide = lower.includes("slide") || lower.includes("diapositiva");

      if (isDelete && isAll && hasSlide && onDeleteAllSlides) {
        onDeleteAllSlides();
        const m: ChatMsg = { id: crypto.randomUUID(), role: "assistant", content: "Deleted all slides" };
        setMessages((prev) => [...prev, m]); await saveMessage("assistant", m.content); return;
      }
      if (isDelete && hasSlide && isCurr && onDeleteSlide && currentSlideIndex !== undefined) {
        onDeleteSlide(currentSlideIndex);
        const m: ChatMsg = { id: crypto.randomUUID(), role: "assistant", content: `Deleted current slide (slide ${currentSlideIndex + 1})` };
        setMessages((prev) => [...prev, m]); await saveMessage("assistant", m.content); return;
      }

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

      if (slides && currentSlideIndex !== undefined && slides[currentSlideIndex]) {
        systemPrompt = SLIDES_SYSTEM_PROMPT;
        contextToSend = slides[currentSlideIndex];
        message = `Edit this slide. Current slide HTML:\n${slides[currentSlideIndex]}\n\nUser request: ${userMsg}${filesContext}\n\nReturn ONLY the modified <section> HTML, nothing else.`;
      } else if (decision === "slides") {
        systemPrompt = SLIDES_SYSTEM_PROMPT;
        message = `Create presentation slides about: ${userMsg}${filesContext}. Return ONLY <section> tags with inline styles. Do NOT include doctype, html, head, or body tags.`;
      } else if (decision === "code") {
        message = `Return a single markdown code block (\`\`\`<language>) and nothing else.\nIf the language is HTML and it makes sense, return a full document.\n\nSpec:\n${userMsg}${filesContext}`;
      } else {
        message = userMsg + filesContext;
      }

      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const token = localStorage.getItem("token");
      const res = await fetch(`${urlbackend}/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ system: systemPrompt, mode: "auto", message, context: contextToSend, history, model: isAdmin ? selectedModel : undefined }),
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
          previewSlides = extractSlides(codeBlock.code);
          assistantTextToShow = `I created ${previewSlides.length} slide${previewSlides.length > 1 ? "s" : ""} for you.`;
        } else if (codeBlock.code.includes("<section") && decision !== "slides") {
          codeBlockData = { lang: codeBlock.lang || "html", code: codeBlock.code, description: "I updated the slide" };
          assistantTextToShow = "I updated the slide for you. Click below to see the code.";
        } else {
          codeBlockData = { lang: codeBlock.lang, code: codeBlock.code, description: generateCodeDescription(codeBlock.code, codeBlock.lang) };
          assistantTextToShow = codeBlockData.description;
        }
      } else if (htmlOnly) {
        snippetToApply = raw;
        if (decision === "slides") {
          previewSlides = extractSlides(raw);
          assistantTextToShow = `I created ${previewSlides.length} slide${previewSlides.length > 1 ? "s" : ""} for you.`;
        } else if (raw.includes("<section")) {
          codeBlockData = { lang: "html", code: raw, description: "I updated the slide" };
          assistantTextToShow = "I updated the slide for you. Click below to see the code.";
        }
      }

      const assistantMsg: ChatMsg = { id: crypto.randomUUID(), role: "assistant", content: assistantTextToShow, previewSlides, codeBlock: codeBlockData };
      setMessages((prev) => [...prev, assistantMsg]);
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
  const renderActionsForAssistant = (msg: ChatMsg, msgIndex: number) => {
    const showCode = showCodeMap[msgIndex] ?? false;
    const toggleShowCode = () => setShowCodeMap((p) => ({ ...p, [msgIndex]: !p[msgIndex] }));

    if (msg.previewSlides && msg.previewSlides.length > 0) {
      return <InlineSlidePreview slides={msg.previewSlides} msgIndex={msgIndex} onInsert={insertSlidesAtPosition} onOpenModal={(s, i) => setSelectedSlidesModal({ slides: s, messageIndex: i })} />;
    }
    if (msg.codeBlock) {
      return (
        <div className="mt-4">
          <div className="bg-theme-primary border border-theme-tertiary rounded-xl overflow-hidden transition-all">
            <div className="px-4 py-3 flex items-center justify-between hover:bg-[#52585A] transition-colors cursor-pointer" onClick={toggleShowCode}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                <span className="text-sm font-medium text-theme-primary">{msg.codeBlock.lang ? msg.codeBlock.lang.toUpperCase() : "CODE"}</span>
              </div>
              <svg className={`w-4 h-4 text-theme-secondary transition-transform ${showCode ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div className="border-t border-theme-tertiary" onClick={(e) => e.stopPropagation()}>
              <pre className={`p-4 text-xs text-theme-primary overflow-x-auto whitespace-pre-wrap bg-[#0a0a0a] transition-all ${showCode ? "max-h-96 overflow-y-auto" : "max-h-[3rem] overflow-hidden"}`} style={{ lineHeight: "1.5" }}>
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
        </div>
      );
    }
    return null;
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-col h-full w-full overflow-hidden p-4 relative">
        <div className="absolute inset-0 w-full h-full bg-theme-alt" />

        <div className="flex flex-col bg-theme-primary border border-theme-tertiary text-theme-primary rounded-xl min-h-full min-w-full p-4 overflow-hidden relative z-[1]">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">

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
                <div key={msg.id} className="space-y-2 animate-fadeIn group" style={{ animation: "fadeIn 0.3s ease-in", opacity: 0, animationFillMode: "forwards", animationDelay: `${i * 0.05}s` }}>
                  <div className={`text-xs font-medium ${isAssistant ? "text-theme-secondary" : ""}`}>
                    {isAssistant ? "Assistant" : "You"}
                  </div>

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
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

                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  {isAssistant && renderActionsForAssistant(msg, i)}

                  {/* Copy button on hover for assistant messages */}
                  {isAssistant && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => navigator.clipboard.writeText(msg.content)} className="px-2 py-1 text-xs text-theme-secondary hover:text-theme-primary bg-theme-primary hover:bg-[#52585A] rounded-lg border border-theme-tertiary transition-all" title="Copy">
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Regenerate button */}
            {messages.length > 0 && !loading && (
              <div className="flex gap-2 pt-2">
                <button onClick={regenerateLastMessage} disabled={messages.length < 2} className="px-4 py-2 text-xs font-medium bg-theme-primary hover:bg-[#52585A] text-theme-primary rounded-lg border border-theme-tertiary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Regenerate
                </button>
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center gap-2 animate-fadeIn">
                <div className="text-xs font-medium text-theme-primary">Assistant</div>
                <Spinner className="size-3 text-theme-secondary mt-0.5" />
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

            <div className="flex gap-2 items-end">
              <input ref={fileInputRef} type="file" multiple onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setAttachedFiles((p) => [...p, ...files.filter((f) => f.size <= 10 * 1024 * 1024)]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }} className="hidden" accept="*/*" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles || loading} className="bg-theme-primary hover:bg-[#52585A] border border-[#52585A] rounded-lg px-3 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0" title="Attach files">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={uploadingFiles || loading}
                className="flex-1 bg-theme-primary rounded-lg border border-[#52585A] px-4 py-3 text-sm focus:outline-none focus:border-[#3a3a3a] transition-colors disabled:opacity-50 resize-none overflow-y-auto min-h-[48px] max-h-[200px]"
                placeholder="Message AI Assistant"
                rows={1}
                style={{ height: "auto", minHeight: "48px" }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 200) + "px"; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !loading && !uploadingFiles) { e.preventDefault(); sendMessage(); } }}
              />
              <button onClick={sendMessage} disabled={loading || uploadingFiles || (!inputValue.trim() && attachedFiles.length === 0)} className="bg-theme-inverted text-theme-inverted disabled:bg-[#52585A] disabled:opacity-50 rounded-lg px-6 py-3 font-medium text-sm transition-all disabled:cursor-not-allowed shrink-0">
                {uploadingFiles ? "Uploading..." : loading ? "..." : "Send"}
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
    </AssistantRuntimeProvider>
  );
}
