// @ts-nocheck
import { useExternalStoreRuntime, AssistantRuntimeProvider } from "@assistant-ui/react";
import { useState, useCallback, type ReactNode } from "react";
import { urlbackend } from "../../config.js";

/* ── types ─────────────────────────────────────────────── */
export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  previewSlides?: string[];
  codeBlock?: { lang?: string; code: string; description: string };
  attachments?: { name: string; type: string; size: number; url: string }[];
};

/* ── helpers ────────────────────────────────────────────── */
const SLIDES_SYSTEM_PROMPT = `You are an elite presentation designer who creates stunning, magazine-quality presentations. Every slide must feel like it was designed by a senior UI/UX designer at a top agency.

CRITICAL RULES:
- All slides MUST have 16:9 aspect ratio
- Add this to EVERY <section>: style="width:100%;aspect-ratio:16/9;display:flex;flex-direction:column;justify-content:center;align-items:center;overflow:hidden;position:relative;"
- Return ONLY <section> tags. NO <!doctype>, <html>, <head>, <body>
- Every slide must look DIFFERENT from the others

IMAGES — use Unsplash: <img src="https://images.unsplash.com/photo-{PHOTO_ID}?w=1200&q=80&fit=crop" />
COLOR PALETTES — rotate: MIDNIGHT PRO (#0f172a + #6366f1), PURE LIGHT (#fff + #6366f1), OCEAN DEPTH (#0c1445→#1e3a5f), FOREST DARK (#0d1f1a + #10b981), SUNSET WARM (#1c0a00 + #f97316).
TYPOGRAPHY — titles: clamp(2rem,4vw,3.5rem) weight 800; use Inter always.
TEMPLATES — hero, split, card grid, full-bleed, accent panel, stat, quote, icon row. Never repeat two in a row.`;

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

function extractSlides(html: string): string[] {
  const sections = html.match(/<section[\s\S]*?<\/section>/gi);
  return sections?.filter((s) => s.trim().startsWith("<section")) ?? [];
}

function classifyPrompt(msg: string): "slides" | "code" | "chat" {
  const s = msg.toLowerCase();
  if (["slides","slide deck","presentation","deck","slideshow","diapositivas"].some((k) => s.includes(k))) return "slides";
  if (
    [/<\w+[^>]*>/.test(msg), /function\s*\(|class\s+\w+/.test(msg)].some(Boolean) ||
    ["generate","create","write","build","implement","refactor","convert"].some((v) => s.includes(v)) ||
    ["html","css","javascript","typescript","react","tsx","jsx","python","java","sql","tailwind"].some((l) => s.includes(l))
  ) return "code";
  return "chat";
}

function generateCodeDescription(code: string, lang?: string): string {
  const c = code.trim().toLowerCase();
  if (lang === "html" || c.includes("<html") || c.includes("<!doctype")) return "I created an HTML document";
  if (lang === "css") return "I created CSS styling";
  if (lang === "python" || lang === "py") return "I created Python code";
  if (lang === "typescript" || lang === "ts") return "I created TypeScript code";
  return "I generated code for you";
}

function normalizeLLMText(data: any): string {
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text)?.filter(Boolean)?.join("\n")
    || data?.text || "No response";
}

/* ── hook that wires assistant-ui to our Gemini backend ─── */
export function useGeminiRuntime({
  projectId,
  code,
  currentSlideIndex,
  slides,
  onDeleteSlide,
  onDeleteAllSlides,
  setCode,
  onMessages,
}: {
  projectId?: string;
  code?: string;
  currentSlideIndex?: number;
  slides?: string[];
  onDeleteSlide?: (i: number) => void;
  onDeleteAllSlides?: () => void;
  setCode: (v: string | ((p: string) => string)) => void;
  onMessages?: (msgs: ChatMsg[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const saveToBackend = useCallback(async (
    role: "user" | "assistant",
    content: string,
    extras?: Partial<ChatMsg>,
  ) => {
    if (!projectId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`${urlbackend}/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role, content, ...extras }),
      });
    } catch { /* silent */ }
  }, [projectId]);

  const onNew = useCallback(async (appendMsg: any) => {
    const userText: string = appendMsg.content
      ?.filter((p: any) => p.type === "text")
      ?.map((p: any) => p.text)
      ?.join("") ?? "";

    if (!userText.trim()) return;
    if (!projectId) return;

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: userText };
    const next = [...messages, userMsg];
    setMessages(next);
    onMessages?.(next);
    await saveToBackend("user", userText);

    setIsRunning(true);

    try {
      /* ── delete commands ─────────────────────────────── */
      const lower = userText.toLowerCase();
      const isDelete = ["delete","remove","erase","elimina","borra","quita"].some((k) => lower.includes(k));
      const isAll    = ["all","todas","todos","everything","todo"].some((k) => lower.includes(k));
      const isCurr   = ["this slide","current slide","esta slide","actual"].some((k) => lower.includes(k));
      const hasSlide = lower.includes("slide") || lower.includes("diapositiva");

      if (isDelete && isAll && hasSlide && onDeleteAllSlides) {
        onDeleteAllSlides();
        const assistantMsg: ChatMsg = { id: crypto.randomUUID(), role: "assistant", content: "Deleted all slides." };
        const withAssistant = [...next, assistantMsg];
        setMessages(withAssistant);
        onMessages?.(withAssistant);
        await saveToBackend("assistant", assistantMsg.content);
        return;
      }
      if (isDelete && hasSlide && isCurr && onDeleteSlide && currentSlideIndex !== undefined) {
        onDeleteSlide(currentSlideIndex);
        const assistantMsg: ChatMsg = { id: crypto.randomUUID(), role: "assistant", content: `Deleted slide ${currentSlideIndex + 1}.` };
        const withAssistant = [...next, assistantMsg];
        setMessages(withAssistant);
        onMessages?.(withAssistant);
        await saveToBackend("assistant", assistantMsg.content);
        return;
      }

      /* ── classify & build prompt ─────────────────────── */
      const decision = classifyPrompt(userText);
      let systemPrompt = "Act like a technical assistant similar to GitHub Copilot. If the user asks for code, return a single markdown code block. If the user asks for HTML slides, return ONLY <section> tags. If the user wants to chat, answer briefly.";
      let message = userText;
      let contextToSend = code;

      if (slides && currentSlideIndex !== undefined && slides[currentSlideIndex]) {
        systemPrompt = SLIDES_SYSTEM_PROMPT;
        contextToSend = slides[currentSlideIndex];
        message = `Edit this slide. Current HTML:\n${slides[currentSlideIndex]}\n\nUser request: ${userText}\n\nReturn ONLY the modified <section> HTML.`;
      } else if (decision === "slides") {
        systemPrompt = SLIDES_SYSTEM_PROMPT;
        message = `Create presentation slides about: ${userText}. Return ONLY <section> tags with inline styles.`;
      } else if (decision === "code") {
        message = `Return a single markdown code block (\`\`\`<language>) and nothing else.\n\nSpec:\n${userText}`;
      }

      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${urlbackend}/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, mode: "auto", message, context: contextToSend, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gemini error");

      const raw = normalizeLLMText(data);

      /* ── parse response ──────────────────────────────── */
      const codeBlock = extractFirstCodeBlock(raw);
      const htmlOnly  = !codeBlock && looksLikeHTML(raw);
      let displayText = raw;
      let previewSlides: string[] | undefined;
      let codeBlockData: ChatMsg["codeBlock"] | undefined;

      if (codeBlock) {
        if (decision === "slides") {
          previewSlides = extractSlides(codeBlock.code);
          displayText   = `I created ${previewSlides.length} slide${previewSlides.length !== 1 ? "s" : ""} for you.`;
        } else if (codeBlock.code.includes("<section")) {
          const clean = codeBlock.code.replace(/<!doctype[^>]*>/gi,"").replace(/<\/?html[^>]*>/gi,"").replace(/<\/?(?:head|body)[^>]*>/gi,"").trim();
          // auto-apply single slide edit
          if (slides && currentSlideIndex !== undefined) {
            const updated = [...slides];
            updated[currentSlideIndex] = clean;
            setCode(`<!doctype html><html><head><meta charset='utf-8'></head><body>${updated.join("\n")}</body></html>`);
          }
          codeBlockData = { lang: codeBlock.lang || "html", code: codeBlock.code, description: "I updated the slide" };
          displayText   = "I updated the slide for you.";
        } else {
          codeBlockData = { lang: codeBlock.lang, code: codeBlock.code, description: generateCodeDescription(codeBlock.code, codeBlock.lang) };
          displayText   = codeBlockData.description;
        }
      } else if (htmlOnly) {
        if (decision === "slides") {
          previewSlides = extractSlides(raw);
          displayText   = `I created ${previewSlides.length} slide${previewSlides.length !== 1 ? "s" : ""} for you.`;
        }
      }

      const assistantMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: displayText,
        previewSlides,
        codeBlock: codeBlockData,
      };
      const withAssistant = [...next, assistantMsg];
      setMessages(withAssistant);
      onMessages?.(withAssistant);
      await saveToBackend("assistant", displayText, { previewSlides, codeBlock: codeBlockData });
    } catch (err) {
      const errMsg: ChatMsg = { id: crypto.randomUUID(), role: "assistant", content: "Connection error. Please try again." };
      const withErr = [...next, errMsg];
      setMessages(withErr);
      onMessages?.(withErr);
    } finally {
      setIsRunning(false);
    }
  }, [messages, projectId, code, currentSlideIndex, slides, setCode, saveToBackend, onMessages, onDeleteSlide, onDeleteAllSlides]);

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    onNew,
    convertMessage: (msg: ChatMsg) => ({
      id: msg.id,
      role: msg.role,
      content: [{ type: "text" as const, text: msg.content }],
    }),
  });

  return { runtime, messages, setMessages };
}

/* ── Provider component ─────────────────────────────────── */
export function GeminiRuntimeProvider({
  children,
  ...props
}: Parameters<typeof useGeminiRuntime>[0] & { children: ReactNode }) {
  const { runtime } = useGeminiRuntime(props);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
