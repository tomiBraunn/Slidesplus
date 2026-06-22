// @ts-nocheck
// Wizard inline estilo Claude: cuando el usuario pide una presentación nueva, en
// vez de generar directo, aparece este bloque en el chat con unas preguntas
// (cuántas slides, para qué público, qué estilo). Las opciones se seleccionan
// con las teclas numéricas (1-9) o con click. Al terminar, llama onComplete con
// la configuración elegida.
import React, { useEffect, useState } from "react";

export type WizardResult = {
  count: number;
  audience: string;
  templateName: string;
  templateLabel: string;
};

type Option = { label: string; sublabel?: string; value: any };

// 4 estilos preseleccionados, diversos entre sí. Cada uno es un template real
// con un example.html renderizable en /templates/{name}/example.html.
const STYLE_OPTIONS: { name: string; label: string; sublabel: string }[] = [
  { name: "html-ppt-zhangzara-broadside", label: "Broadside", sublabel: "Tech · bold · oscuro" },
  { name: "html-ppt-taste-editorial", label: "Editorial", sublabel: "Elegante · serif · claro" },
  { name: "html-ppt-zhangzara-cobalt-grid", label: "Cobalt Grid", sublabel: "Datos · analítico · grilla" },
  { name: "html-ppt-pitch-deck", label: "Pitch Deck", sublabel: "Startup · pitch · directo" },
];

const COUNT_OPTIONS: Option[] = [
  { label: "5 slides", sublabel: "Resumen breve", value: 5 },
  { label: "8 slides", sublabel: "Estándar", value: 8 },
  { label: "10 slides", sublabel: "Completa", value: 10 },
  { label: "15 slides", sublabel: "Extensa", value: 15 },
];

const AUDIENCE_OPTIONS: Option[] = [
  { label: "Ejecutivos", sublabel: "Directo, alto nivel", value: "ejecutivos / dirección, lenguaje de alto nivel y conciso" },
  { label: "Equipo técnico", sublabel: "Detalle técnico", value: "un equipo técnico, con detalle y precisión" },
  { label: "Clientes", sublabel: "Persuasivo, claro", value: "clientes potenciales, persuasivo y claro" },
  { label: "Educativo", sublabel: "Didáctico", value: "una audiencia educativa, didáctico y explicativo" },
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
          transform: "scale(0.25)",
          transformOrigin: "top left",
          width: "400%",
          height: "400%",
          border: "none",
          pointerEvents: "none",
          position: "absolute",
          top: 0,
          left: 0,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.3s",
        }}
        onLoad={() => setLoaded(true)}
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
        title={name}
      />
    </div>
  );
}

type Step = 0 | 1 | 2;

export default function SlidesWizard({
  onComplete,
  onCancel,
}: {
  onComplete: (result: WizardResult) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>(0);
  const [count, setCount] = useState<number | null>(null);
  const [audience, setAudience] = useState<string | null>(null);

  const stepCount = 3;

  const selectCount = (v: number) => { setCount(v); setStep(1); };
  const selectAudience = (v: string) => { setAudience(v); setStep(2); };
  const selectStyle = (idx: number) => {
    const s = STYLE_OPTIONS[idx];
    onComplete({
      count: count!,
      audience: audience!,
      templateName: s.name,
      templateLabel: s.label,
    });
  };

  const goBack = () => {
    if (step === 0) { onCancel(); return; }
    setStep((s) => (s - 1) as Step);
  };

  // Teclas: 1-9 seleccionan opción del paso actual, Backspace = atrás, Esc = cancelar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
      if (e.key === "Backspace") { e.preventDefault(); goBack(); return; }
      const n = parseInt(e.key, 10);
      if (isNaN(n) || n < 1) return;
      const idx = n - 1;
      if (step === 0 && idx < COUNT_OPTIONS.length) { e.preventDefault(); selectCount(COUNT_OPTIONS[idx].value); }
      else if (step === 1 && idx < AUDIENCE_OPTIONS.length) { e.preventDefault(); selectAudience(AUDIENCE_OPTIONS[idx].value); }
      else if (step === 2 && idx < STYLE_OPTIONS.length) { e.preventDefault(); selectStyle(idx); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, count, audience]);

  const titles = ["¿Cuántas slides?", "¿Para qué público?", "Elegí un estilo"];

  return (
    <div className="bg-theme-primary border border-theme-tertiary rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme-tertiary">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#7182FF]" style={{ fontSize: 18 }}>auto_awesome</span>
          <span className="text-sm font-medium text-theme-primary">{titles[step]}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: stepCount }).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? "bg-[#7182FF]" : i < step ? "bg-theme-secondary" : "bg-theme-tertiary"}`} />
            ))}
          </div>
          <button onClick={onCancel} className="p-1 rounded-md text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary transition-colors" title="Cancelar (Esc)">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {step === 0 && (
          <div className="grid grid-cols-2 gap-2">
            {COUNT_OPTIONS.map((o, i) => (
              <OptionButton key={o.label} index={i} label={o.label} sublabel={o.sublabel} onClick={() => selectCount(o.value)} />
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 gap-2">
            {AUDIENCE_OPTIONS.map((o, i) => (
              <OptionButton key={o.label} index={i} label={o.label} sublabel={o.sublabel} onClick={() => selectAudience(o.value)} />
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-2.5">
            {STYLE_OPTIONS.map((s, i) => (
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
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-theme-tertiary">
        <span className="text-[11px] text-theme-secondary">Tecla 1-{step === 2 ? STYLE_OPTIONS.length : 4} para elegir</span>
        <span className="text-[11px] text-theme-secondary">{step > 0 ? "Backspace para volver" : "Esc para cancelar"}</span>
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
