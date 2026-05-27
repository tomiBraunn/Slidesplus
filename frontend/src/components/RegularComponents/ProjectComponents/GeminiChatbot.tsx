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

const SLIDES_SYSTEM_PROMPT = `You are an elite presentation designer who creates stunning, magazine-quality presentations. Every slide must feel like it was designed by a senior UI/UX designer at a top agency.

CRITICAL RULES:
- All slides MUST have 16:9 aspect ratio
- Add this to EVERY <section>: style="width:100%;aspect-ratio:16/9;display:flex;flex-direction:column;justify-content:center;align-items:center;overflow:hidden;position:relative;"
- Return ONLY <section> tags. NO <!doctype>, <html>, <head>, <body>
- Every slide must look DIFFERENT from the others (vary layouts, colors, compositions)

═══════════════════════════════
AGENT DISCIPLINE — FOLLOW STRICTLY
═══════════════════════════════
- Never add content just to fill space. If it doesn't add value, cut it.
- Each slide must have ONE clear message. Not two, not three. ONE.
- If a slide has more than 5 bullets, split it into two slides.
- Bullet points must be SHORT: maximum 8 words each. No exceptions.
- Never repeat the same layout twice in a row.
- Never repeat the same color palette twice in a row.
- If the topic is vague or broad, make your interpretation explicit in speakerNotes.
- Don't apologize or explain your choices in the output — just execute.
- Never use filler phrases like "In conclusion", "As we can see", "It is important to note".
- If an image doesn't add meaning to the slide, don't add one. Images must earn their place.
- Prioritize clarity over decoration. A readable slide beats a beautiful but confusing one.
- Whitespace is a design element. Use it aggressively.

═══════════════════════════════
IMAGES — MANDATORY
═══════════════════════════════
You MUST use real images from Unsplash on most slides. Use this exact format:
<img src="https://images.unsplash.com/photo-{PHOTO_ID}?w=1200&q=80&fit=crop" />

Rules for images:
- Use relevant, high-quality photo IDs that match the slide topic
- Never use placeholder or fake photo IDs
- Integrate images as: full bleed backgrounds, side panels, accent elements, or overlapping cards
- When using as background: add a gradient overlay so text remains readable
- Example overlay: background: linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.4) 100%)
- If an image doesn't clearly relate to the slide content, skip it entirely

Good Unsplash photo IDs by topic (use these or similar real ones):
- Technology: 1518770660439-4636190af475, 1451187580459-43490279c0fa
- Business: 1507003211169-0a1dd7228f2d, 1560472354-b33ff0ad40a4
- Nature: 1441974231531-c6227db76b6e, 1472214103451-9374bd1c798e
- People/Team: 1522202176988-66273c2fd55f, 1517841905240-472988babdf9
- Abstract/Tech: 1620641788421-7a1c342ea42e, 1639762681485-074b7f938ba0
- Data/Analytics: 1551288049-bebda4e38f71, 1460925895917-afdab827c52f
- Innovation: 1485827404703-89b55fcc595e, 1519389950473-47ba0277781c

═══════════════════════════════
COLOR SYSTEMS — USE THESE PALETTES
═══════════════════════════════
Rotate through these palettes across slides:

MIDNIGHT PRO (dark, elegant):
- Background: #0f172a
- Accent: #6366f1 (indigo) or #8b5cf6 (violet)
- Text: #f8fafc, #94a3b8
- Card: rgba(30,41,59,0.8)

PURE LIGHT (clean, corporate):
- Background: #ffffff or #f8fafc
- Accent: #6366f1 or #0ea5e9
- Text: #0f172a, #475569
- Card: #f1f5f9

OCEAN DEPTH (blue gradient):
- Background: linear-gradient(135deg, #0c1445, #1e3a5f)
- Accent: #38bdf8 or #0ea5e9
- Text: #ffffff, #bae6fd

FOREST DARK (green, premium):
- Background: #0d1f1a or linear-gradient(135deg, #0d1f1a, #1a3a2a)
- Accent: #10b981 or #34d399
- Text: #ecfdf5, #6ee7b7

SUNSET WARM (orange/red, energetic):
- Background: linear-gradient(135deg, #1c0a00, #3d1500)
- Accent: #f97316 or #fb923c
- Text: #fff7ed, #fed7aa

═══════════════════════════════
LAYOUT TEMPLATES — VARY ACROSS SLIDES
═══════════════════════════════

TEMPLATE 1 — HERO (title slide):
Full bleed image background + dark overlay + centered title + subtitle + decorative line

TEMPLATE 2 — SPLIT (content):
Left 45%: solid color with title + bullets
Right 55%: full-height image

TEMPLATE 3 — CARD GRID (lists):
Dark background + 3-4 glassmorphism cards in a row
Card style: background:rgba(255,255,255,0.05); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1); border-radius:16px

TEMPLATE 4 — FULL BLEED IMAGE:
Image covers 100% + strong gradient overlay + content overlaid

TEMPLATE 5 — ACCENT PANEL:
Solid background + left colored vertical bar (8px wide, full height) + content offset to the right

TEMPLATE 6 — STAT/HIGHLIGHT:
Dark background + 1-3 large number stats in colored boxes + supporting text

TEMPLATE 7 — QUOTE:
Full bleed subtle background + large quotation mark (decorative, 20rem opacity-10) + quote text centered + attribution

TEMPLATE 8 — MINIMAL ICON ROW:
Light background + row of 3-4 emoji or unicode icons + labels below each

═══════════════════════════════
TYPOGRAPHY RULES
═══════════════════════════════
- Titles: font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 800; letter-spacing: -0.02em; line-height: 1.1
- Subtitles: font-size: clamp(1rem, 2vw, 1.4rem); font-weight: 400; opacity: 0.75
- Body/bullets: font-size: clamp(0.85rem, 1.5vw, 1.1rem); line-height: 1.7
- Stats: font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 900
- Use font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif always
- Add text-shadow: 0 2px 20px rgba(0,0,0,0.3) on light text over images
- Never use more than 2 font sizes on the same slide

═══════════════════════════════
DECORATIVE ELEMENTS
═══════════════════════════════
Use these to add visual richness — only when they serve the content:

Glassmorphism cards:
background: rgba(255,255,255,0.05);
backdrop-filter: blur(20px);
border: 1px solid rgba(255,255,255,0.15);
border-radius: 20px;
box-shadow: 0 8px 32px rgba(0,0,0,0.3);

Gradient accents:
background: linear-gradient(90deg, #6366f1, #8b5cf6);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;

Subtle SVG patterns (opacity 0.04-0.08 max):
Dots grid, diagonal lines, hexagons as background texture

Glowing orbs (decorative, position:absolute):
width:400px; height:400px;
background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
border-radius: 50%;
pointer-events: none;

Colored top border on cards:
border-top: 3px solid #6366f1;

Numbered badges instead of plain bullets:
Inline circle with number, indigo background

═══════════════════════════════
SLIDE STRUCTURE RULES
═══════════════════════════════
- Slide 1 (title): Always TEMPLATE 1 (hero with image)
- Slides 2-4: TEMPLATE 2 or 4 (image-heavy)
- Middle slides: Mix TEMPLATE 3, 5, 6 (data/content focused)
- Second to last: TEMPLATE 7 or 6 (highlight or quote)
- Last slide: Hero image again with strong closing message or CTA

NEVER repeat the same template twice in a row.
NEVER repeat the same color palette twice in a row.
ALWAYS have at least 60% of slides include an Unsplash image.

═══════════════════════════════
QUALITY CHECKLIST — APPLY TO EVERY SLIDE
═══════════════════════════════
✓ ONE clear message per slide
✓ Text contrast ratio > 4.5:1 (readability over aesthetics)
✓ No more than 5 bullet points
✓ Each bullet max 8 words
✓ At least one visual element beyond plain text
✓ Minimum 48px padding on all sides
✓ No filler phrases or padding content
✓ Whitespace used intentionally
✓ Font sizes use clamp() for responsiveness
✓ Decorative elements don't overlap readable content
✓ No raw HTML artifacts visible in output`;

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
  const [mainScale, setMainScale] = useState(1);
  const mainPreviewRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewsHeight, setPreviewsHeight] = useState(0);
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
    const update = () => { if (!mainPreviewRef.current) return; const r = mainPreviewRef.current.getBoundingClientRect(); setMainScale(Math.min(r.width / 1920, r.height / 1080)); };
    update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update);
  }, [slides]);
  useEffect(() => {
    const update = () => { if (mainPreviewRef.current) setPreviewsHeight(mainPreviewRef.current.offsetHeight); };
    update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update);
  }, [slides]);
  useEffect(() => {
    if (viewMode !== "visual") return;
    const target = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
    if (!target || !slides[currentIndex]) return;
    target.open();
    target.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(${mainScale});transform-origin:top left;display:flex;align-items:center;justify-content:center;}section{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;background:white;}</style></head><body>${slides[currentIndex]}</body></html>`);
    target.close();
  }, [slides, currentIndex, mainScale, viewMode]);

  const handleClose = () => setShow(false);
  const onEnd = () => { if (!show) { setMounted(false); document.documentElement.classList.remove("overflow-hidden"); onClose(); } };
  if (!mounted) return null;

  return (
    <div className={["fixed z-50 inset-0 flex items-center justify-center bg-black/40 transition-[backdrop-filter,opacity] duration-200", show ? "opacity-100 backdrop-blur-xl" : "opacity-0 backdrop-blur-0"].join(" ")} onMouseDown={handleClose} onTransitionEnd={onEnd}>
      <div onMouseDown={(e) => e.stopPropagation()} className={`rounded-xl bg-[#0b0b0bcc] border border-white/10 w-[95vw] md:w-[85vw] max-w-[1400px] h-[90vh] flex flex-col overflow-hidden transform transition-all duration-200 ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-tertiary">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-theme-primary">Preview ({currentIndex + 1} / {slides.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="p-1.5 text-theme-secondary hover:text-theme-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Previous slide">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))} disabled={currentIndex === slides.length - 1} className="p-1.5 text-theme-secondary hover:text-theme-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Next slide">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {(["visual", "code"] as const).map((m) => (
                <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${viewMode === m ? "bg-theme-inverted text-theme-inverted" : "bg-theme-primary text-theme-secondary hover:text-theme-primary"}`}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={handleClose} className="p-1 text-theme-secondary hover:text-theme-primary transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className={`flex ${isMobile ? "flex-col" : "flex-row"} items-start justify-start gap-2 w-full min-h-0 px-2 md:px-4 pb-1 md:pb-2`} style={{ flex: "1 1 0", overflow: "hidden" }}>
          {viewMode === "visual" ? (
            <>
              <div ref={mainPreviewRef} className={`text-white rounded-xl border bg-white ${isMobile ? "w-full flex-1 min-h-0" : "w-full"} ${isMobile ? "" : "aspect-video"} overflow-hidden border-solid relative select-none`}>
                <iframe ref={iframeRef} className="w-full h-full border-none bg-white" title="Slide preview" style={{ background: "white" }} />
              </div>
              <div className={`rounded-xl ${isMobile ? "w-full h-16" : "w-1/6 min-w-[120px]"} p-1.5 md:p-2 flex ${isMobile ? "flex-row overflow-x-auto" : "flex-col overflow-y-auto"} gap-1.5 md:gap-2 scrollbar-custom flex-shrink-0`} style={isMobile ? {} : { height: previewsHeight }}>
                {slides.map((slide, idx) => {
                  const thumbWidth = isMobile ? 90 : mainPreviewRef.current ? mainPreviewRef.current.offsetWidth * 0.2 - 16 : 100;
                  return (
                    <div key={idx} onClick={() => setCurrentIndex(idx)} className={`cursor-pointer border rounded-md overflow-hidden bg-white flex-shrink-0 ${currentIndex === idx ? "border-blue-500 border-2" : "border-transparent"}`} style={{ aspectRatio: "16/9", ...(isMobile ? { width: "90px", height: "50px" } : {}) }}>
                      <iframe title={`slide-${idx}`} srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(${thumbWidth / 1920});transform-origin:top left;}section{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;background:white;}</style></head><body>${slide}</body></html>`} className="w-full h-full border-0 pointer-events-none bg-white" sandbox="" style={{ background: "white" }} />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="w-full p-4">
              <pre className="p-4 rounded-lg text-xs text-theme-primary overflow-x-auto border border-theme-tertiary whitespace-pre-wrap bg-theme-primary">{slides[currentIndex]}</pre>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end px-6 py-4 border-t border-theme-tertiary">
          <button onClick={() => { onInsertSlides(slides); handleClose(); }} className="px-6 py-2.5 text-sm font-medium bg-[#d0d0d0] hover:bg-[#bcbcbc] text-black rounded-lg transition-all">
            Insert {slides.length} Slide{slides.length > 1 ? "s" : ""}
          </button>
        </div>
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

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, loading]);

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

      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(`${urlbackend}/gemini`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, mode: "auto", message, context: contextToSend, history }),
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

  /* ── inline slide preview ── */
  const InlineSlidePreview = ({ slides: s, msgIndex }: { slides: string[]; msgIndex: number }) => {
    const [pi, setPi] = React.useState(0);
    const slideHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"></script><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:1920px;height:1080px;overflow:hidden;background:white;}body{transform:scale(0.26);transform-origin:top left;display:flex;align-items:center;justify-content:center;}section{width:1920px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center;background:white;}</style></head><body>${s[pi]}</body></html>`;
    return (
      <div className="mt-4 space-y-3">
        <div className="bg-theme-primary border border-theme-tertiary rounded-xl p-4">
          <div className="w-full aspect-[16/9] bg-white rounded-lg overflow-hidden shadow-lg relative">
            <iframe srcDoc={slideHtml} className="w-full h-full border-none bg-white pointer-events-none" title={`Slide Preview ${pi + 1}`} style={{ background: "white" }} />
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
          <button onClick={() => insertSlidesAtPosition(s)} className="flex-1 px-4 py-2.5 text-sm font-medium bg-[#d0d0d0] hover:bg-[#bcbcbc] text-black rounded-lg transition-all">
            Insert {s.length} Slide{s.length > 1 ? "s" : ""}
          </button>
          <button onClick={() => setSelectedSlidesModal({ slides: s, messageIndex: msgIndex })} className="p-2.5 text-theme-secondary hover:text-theme-primary bg-theme-primary hover:bg-[#52585A] rounded-lg border border-theme-tertiary transition-all" title="Open in modal">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>visibility</span>
          </button>
        </div>
      </div>
    );
  };

  /* ── code block accordion ── */
  const renderActionsForAssistant = (msg: ChatMsg, msgIndex: number) => {
    const showCode = showCodeMap[msgIndex] ?? false;
    const toggleShowCode = () => setShowCodeMap((p) => ({ ...p, [msgIndex]: !p[msgIndex] }));

    if (msg.previewSlides && msg.previewSlides.length > 0) {
      return <InlineSlidePreview slides={msg.previewSlides} msgIndex={msgIndex} />;
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
      <div className="flex flex-col h-full w-full overflow-hidden p-3 relative">
        <div className="absolute inset-0 bg-theme-alt" />

        <div className="flex flex-col bg-theme-primary border border-theme-tertiary text-theme-primary rounded-xl h-full w-full p-4 overflow-hidden relative z-[1]">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">

            {/* Loading history */}
            {loadingHistory && (
              <div className="flex items-center justify-center gap-2 text-theme-secondary text-sm mt-12">
                <div className="flex gap-1">
                  {[0, 200, 400].map((d) => (
                    <div key={d} className="w-2 h-2 bg-theme-secondary rounded-full animate-pulse" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
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
                <div className="flex gap-1 mt-1">
                  {[0, 100, 200].map((d) => (
                    <div key={d} className="w-2 h-2 bg-theme-secondary rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
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
