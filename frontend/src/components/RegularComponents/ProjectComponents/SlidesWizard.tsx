// @ts-nocheck
// Wizard inline estilo Claude: antes de generar una presentación, hace unas
// preguntas multiple-choice. Las preguntas las genera la IA según la idea del
// usuario (prop `questions`); si no llegan, usa un set fijo de respaldo. El
// ÚLTIMO paso siempre es elegir el estilo (con previews visuales, que la IA no
// puede inventar). Selección con teclas 1-4, Backspace = atrás, Esc = cancelar.
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getTemplateCatalog, getCachedCatalog } from "../../../utils/templateCatalog";

export type WizardQuestion = {
  key?: string; // identifica la pregunta (images, quiz, ...) para el armado del prompt
  question: string;
  options: { label: string; sublabel?: string; value: string | number }[];
};

export type WizardResult = {
  // Respuestas crudas por key (para que el llamador arme el prompt y decida acciones).
  values: Record<string, string>;
  templateName: string;
  templateLabel: string;
};

type StyleOption = { name: string; label: string; sublabel: string };

// Fallback si el catálogo no cargó: 4 estilos reales con example.html.
const FALLBACK_STYLES: StyleOption[] = [
  { name: "html-ppt-zhangzara-broadside", label: "Broadside", sublabel: "Tech · bold · oscuro" },
  { name: "html-ppt-taste-editorial", label: "Editorial", sublabel: "Elegante · serif · claro" },
  { name: "html-ppt-zhangzara-cobalt-grid", label: "Cobalt Grid", sublabel: "Datos · analítico · grilla" },
  { name: "html-ppt-pitch-deck", label: "Pitch Deck", sublabel: "Startup · pitch · directo" },
];

// Nombre legible a partir del slug del template (igual que ComponentsModal).
function prettyLabel(name: string): string {
  return name
    .replace(/^html-ppt-zhangzara-|^html-ppt-|^kami-|^open-design-|^ib-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Elige `n` templates al azar del catálogo (sin repetir). Fisher-Yates parcial.
function pickRandomStyles(catalog: { name: string; description?: string }[], n: number): StyleOption[] {
  const pool = [...catalog];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).map((t) => ({
    name: t.name,
    label: prettyLabel(t.name),
    sublabel: (t.description || "").replace(/\s+/g, " ").trim().slice(0, 28) || "Template",
  }));
}

// Set fijo de preguntas (sin IA). El último paso (estilo) se agrega aparte.
const FIXED_QUESTIONS: WizardQuestion[] = [
  {
    key: "count",
    question: "¿Cuántas slides?",
    options: [
      { label: "5 slides", sublabel: "Resumen breve", value: "5" },
      { label: "8 slides", sublabel: "Estándar", value: "8" },
      { label: "10 slides", sublabel: "Completa", value: "10" },
      { label: "15 slides", sublabel: "Extensa", value: "15" },
    ],
  },
  {
    key: "audience",
    question: "¿Para qué público?",
    options: [
      { label: "Ejecutivos", sublabel: "Directo, alto nivel", value: "ejecutivos, lenguaje de alto nivel y conciso" },
      { label: "Equipo técnico", sublabel: "Detalle técnico", value: "un equipo técnico, con detalle y precisión" },
      { label: "Clientes", sublabel: "Persuasivo", value: "clientes potenciales, persuasivo y claro" },
      { label: "Educativo", sublabel: "Didáctico", value: "una audiencia educativa, didáctico y explicativo" },
    ],
  },
  {
    key: "density",
    question: "¿Cuánto texto por slide?",
    options: [
      { label: "Mínimo", sublabel: "Frases cortas", value: "muy poco texto, frases cortas y mucho aire" },
      { label: "Equilibrado", sublabel: "Lo justo", value: "cantidad equilibrada de texto" },
      { label: "Detallado", sublabel: "Más datos", value: "contenido detallado, más texto y datos por slide" },
      { label: "Solo títulos", sublabel: "Yo completo", value: "solo títulos y puntos clave mínimos" },
    ],
  },
  {
    key: "images",
    question: "¿Imágenes?",
    options: [
      { label: "Sin imágenes", sublabel: "Texto y color", value: "none" },
      { label: "Algunas (AI)", sublabel: "Generadas, donde aporten", value: "some-ai" },
      { label: "Muchas (AI)", sublabel: "Casi todas, generadas", value: "many-ai" },
      { label: "Mix", sublabel: "AI + stock", value: "mix" },
    ],
  },
  {
    key: "quiz",
    question: "¿Agregar un quiz al final?",
    options: [
      { label: "Sí", sublabel: "Slide de quiz interactivo", value: "yes" },
      { label: "No", sublabel: "Solo la presentación", value: "no" },
    ],
  },
];

/* Preview visual de un estilo (template real renderizado a escala). */
function StylePreview({ name }: { name: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="w-full aspect-[16/9] overflow-hidden relative rounded-lg border border-theme-tertiary bg-[#0a0a0a]">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-[#7182FF] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <iframe
        src={`/templates/${name}/example.html`}
        style={{
          transform: "scale(0.25)", transformOrigin: "top left",
          width: "400%", height: "400%", border: "none", pointerEvents: "none",
          position: "absolute", top: 0, left: 0,
          opacity: loaded ? 1 : 0, transition: "opacity 0.3s",
        }}
        onLoad={() => setLoaded(true)}
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
        title={name}
      />
    </div>
  );
}

export default function SlidesWizard({
  onComplete,
  onCancel,
}: {
  questions?: WizardQuestion[]; // ignorado: el wizard usa un set fijo
  onComplete: (result: WizardResult) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const qs = FIXED_QUESTIONS;
  const totalSteps = qs.length + 1; // + el paso de estilo (último)

  const [step, setStep] = useState(0);
  // Respuestas por key (count, audience, density, images, quiz).
  const [values, setValues] = useState<Record<string, string>>({});

  // 4 templates al azar, distintos cada vez que se abre el wizard. Se eligen del
  // catálogo cacheado al montar (memoizado para no recambiar entre re-renders);
  // si el catálogo no está cargado aún, se trae y se vuelven a sortear.
  const [styleOptions, setStyleOptions] = useState<StyleOption[]>(() => {
    const cached = getCachedCatalog();
    return cached && cached.length >= 4 ? pickRandomStyles(cached, 4) : FALLBACK_STYLES;
  });
  useEffect(() => {
    if (getCachedCatalog()) return; // ya teníamos catálogo → no re-sortear
    getTemplateCatalog()
      .then((cat) => { if (cat && cat.length >= 4) setStyleOptions(pickRandomStyles(cat, 4)); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isStyleStep = step === qs.length;
  const optionCount = isStyleStep ? styleOptions.length : qs[step].options.length;

  const selectAnswer = (value: string | number) => {
    const key = qs[step].key || String(step);
    setValues((v) => ({ ...v, [key]: String(value) }));
    setStep((s) => s + 1);
  };

  const selectStyle = (idx: number) => {
    const s = styleOptions[idx];
    if (!s) return;
    onComplete({ values, templateName: s.name, templateLabel: s.label });
  };

  const goBack = () => {
    if (step === 0) { onCancel(); return; }
    setStep((s) => s - 1);
  };

  // Teclas: 1-4 eligen, Backspace = atrás, Esc = cancelar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
      if (e.key === "Backspace") { e.preventDefault(); goBack(); return; }
      const n = parseInt(e.key, 10);
      if (isNaN(n) || n < 1 || n > optionCount) return;
      e.preventDefault();
      const idx = n - 1;
      if (isStyleStep) selectStyle(idx);
      else selectAnswer(qs[step].options[idx].value);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, values, styleOptions]);

  const title = isStyleStep ? t("wizard.chooseStyle") : qs[step].question;

  return (
    <div className="bg-theme-primary border border-theme-tertiary rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme-tertiary">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[#7182FF] flex-shrink-0" style={{ fontSize: 18 }}>auto_awesome</span>
          <span className="text-sm font-medium text-theme-primary truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === step ? "bg-[#7182FF]" : i < step ? "bg-theme-secondary" : "bg-theme-tertiary"}`} />
            ))}
          </div>
          <button onClick={onCancel} className="p-1 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary transition-colors" title={t("wizard.cancelTitle")}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {isStyleStep ? (
          <div className="grid grid-cols-2 gap-2.5">
            {styleOptions.map((s, i) => (
              <button
                key={s.name}
                onClick={() => selectStyle(i)}
                className="group flex flex-col gap-1.5 text-left rounded-xl border border-theme-tertiary hover:border-[#7182FF] bg-theme-quaternary p-1.5 transition-all"
              >
                <StylePreview name={s.name} />
                <div className="flex items-center gap-1.5 px-1 pb-0.5">
                  <KeyCap n={i + 1} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-theme-primary truncate">{s.label}</span>
                    <span className="block text-[10px] text-theme-secondary truncate">{s.sublabel}</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {qs[step].options.map((o, i) => (
              <OptionButton key={`${o.label}-${i}`} index={i} label={o.label} sublabel={o.sublabel} onClick={() => selectAnswer(o.value)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-theme-tertiary">
        <span className="text-[11px] text-theme-secondary">{t("wizard.keyHint", { count: optionCount })}</span>
        <span className="text-[11px] text-theme-secondary">{step > 0 ? t("wizard.backHint") : t("wizard.cancelHint")}</span>
      </div>
    </div>
  );
}

function KeyCap({ n }: { n: number }) {
  return (
    <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md border border-theme-tertiary bg-theme-primary text-[11px] font-medium text-theme-secondary">
      {n}
    </span>
  );
}

function OptionButton({ index, label, sublabel, onClick }: { index: number; label: string; sublabel?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 text-left rounded-xl border border-theme-tertiary hover:border-[#7182FF] bg-theme-quaternary hover:bg-theme-hover px-3 py-2.5 transition-all"
    >
      <KeyCap n={index + 1} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-theme-primary truncate">{label}</span>
        {sublabel && <span className="block text-[11px] text-theme-secondary truncate">{sublabel}</span>}
      </span>
    </button>
  );
}
