import { useState, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useScroll,
  useSpring,
} from "framer-motion";
import SEO from "../SEO";
import AppIconWithoutLink from "../RegularComponents/MultiuseComponents/AppIconWithoutLink";

// ─── Brand palette ────────────────────────────────────────────────────────────
// Concepto: la landing ES una presentación. Cada sección es un slide numerado,
// con contador fijo, barra de progreso y marcas de corte tipo imprenta.

const GREEN = "#249931";
const PERIWINKLE = "#7182FF";
const PAPER = "#F6F5EF";
const INK = "#111110";

// ─── Types ────────────────────────────────────────────────────────────────────

type Language = "en" | "es";

type ContentShape = {
  seoTitle: string;
  seoDescription: string;
  skip: string;
  navLabels: string[];
  navHrefs: string[];
  start: string;
  slideLabels: string[];
  heroKicker: string;
  heroLine1: string;
  heroItalic: string;
  heroLine2: string;
  heroCopy: string;
  heroCta: string;
  heroSecondary: string;
  showcaseTitle: string[];
  showcaseNote: string;
  featuresTitle: string[];
  features: { num: string; title: string; copy: string }[];
  workflowTitle: string[];
  steps: { title: string; copy: string }[];
  openEditor: string;
  faqTitle: string[];
  faqNote: string;
  faqs: string[][];
  endKicker: string;
  endLine1: string;
  endItalic: string;
  endCta: string;
  copyright: string;
};

// ─── Content ──────────────────────────────────────────────────────────────────

const content: Record<Language, ContentShape> = {
  en: {
    seoTitle: "slides+ | Presentations with AI, an editor, and code.",
    seoDescription:
      "Slides+ is the presentation tool with AI to start, a visual editor to refine, and code for full control.",
    skip: "Skip to main content",
    navLabels: ["Showcase", "Features", "Workflow", "FAQ"],
    navHrefs: ["#showcase", "#features", "#workflow", "#faq"],
    start: "Start free",
    slideLabels: [
      "TITLE SLIDE",
      "LIVE DEMO",
      "FEATURES",
      "WORKFLOW",
      "Q&A",
      "END OF DECK",
    ],
    heroKicker: "A deck about decks",
    heroLine1: "This page is",
    heroItalic: "a presentation",
    heroLine2: "about presentations.",
    heroCopy:
      "Slides+ gives you AI to get started, a visual editor to go deeper, and code when you want pixel-level control. You're reading slide one right now.",
    heroCta: "Open the editor",
    heroSecondary: "Keep scrolling ↓",
    showcaseTitle: ["Slides rendered", "live, not screenshots."],
    showcaseNote:
      "Every deck below is real HTML running in the same engine you'll present with. Hover, scroll, judge for yourself.",
    featuresTitle: ["Three tools.", "One deck."],
    features: [
      {
        num: "A",
        title: "AI to start",
        copy: "Describe the talk you need to give. Slides+ drafts the structure, the copy and the flow so you never face a blank canvas.",
      },
      {
        num: "B",
        title: "Editor to refine",
        copy: "Drag, retype, recolor. The visual editor covers the whole deck without asking you to learn anything new.",
      },
      {
        num: "C",
        title: "Code to control",
        copy: "Every slide is HTML underneath. Open the code panel when you want exact layouts, custom charts or animations.",
      },
    ],
    workflowTitle: ["From prompt", "to podium."],
    steps: [
      {
        title: "Create a project",
        copy: "Blank deck, AI prompt or existing HTML — start wherever you are.",
      },
      {
        title: "Shape the slides",
        copy: "Tune hierarchy, layout and color in the editor without losing momentum.",
      },
      {
        title: "Iterate freely",
        copy: "Switch between visual editing and code at any point. Nothing locks you in.",
      },
      {
        title: "Present or export",
        copy: "Open a clean view link to present, or export when the deck is ready to ship.",
      },
    ],
    openEditor: "Open the editor",
    faqTitle: ["Questions", "from the audience."],
    faqNote: "The part of every talk where the lights come up.",
    faqs: [
      [
        "What can I create with Slides+?",
        "Pitches, lessons, product demos, reports, workshops — any presentation where you want more control than a typical slide tool gives you.",
      ],
      [
        "Can I use AI and still edit manually?",
        "Yes. AI generates a starting point; after that you can keep editing visually or with code, in any order.",
      ],
      [
        "Do I need to know how to code?",
        "Not at all. The visual editor covers everything. Code access is there when you want it, never required.",
      ],
      [
        "Can I present from the app?",
        "Yes. Every project has a clean view link designed for presenting full-screen.",
      ],
    ],
    endKicker: "Last slide",
    endLine1: "Thank you.",
    endItalic: "Questions? Just start.",
    endCta: "Start for free",
    copyright: "2026 Slides+. All rights reserved.",
  },
  es: {
    seoTitle: "slides+ | Presentaciones con IA, editor y código.",
    seoDescription:
      "Slides+ es la herramienta de presentaciones con IA para arrancar, editor visual para refinar y código para control total.",
    skip: "Saltar al contenido principal",
    navLabels: ["Demo", "Funciones", "Flujo", "FAQ"],
    navHrefs: ["#showcase", "#features", "#workflow", "#faq"],
    start: "Empezar gratis",
    slideLabels: [
      "PORTADA",
      "DEMO EN VIVO",
      "FUNCIONES",
      "FLUJO",
      "PREGUNTAS",
      "FIN DEL DECK",
    ],
    heroKicker: "Un deck sobre decks",
    heroLine1: "Esta página es",
    heroItalic: "una presentación",
    heroLine2: "sobre presentaciones.",
    heroCopy:
      "Slides+ te da IA para arrancar, un editor visual para profundizar y código cuando querés control al pixel. Ahora mismo estás leyendo el slide uno.",
    heroCta: "Abrir el editor",
    heroSecondary: "Seguí bajando ↓",
    showcaseTitle: ["Slides renderizados", "en vivo, no capturas."],
    showcaseNote:
      "Cada deck de abajo es HTML real corriendo en el mismo motor con el que vas a presentar. Mirá, scrolleá, juzgá vos.",
    featuresTitle: ["Tres herramientas.", "Un solo deck."],
    features: [
      {
        num: "A",
        title: "IA para arrancar",
        copy: "Describí la charla que tenés que dar. Slides+ arma la estructura, el copy y el flujo para que nunca enfrentes un lienzo vacío.",
      },
      {
        num: "B",
        title: "Editor para refinar",
        copy: "Arrastrá, reescribí, recoloreá. El editor visual cubre todo el deck sin pedirte aprender nada nuevo.",
      },
      {
        num: "C",
        title: "Código para controlar",
        copy: "Cada slide es HTML por debajo. Abrí el panel de código cuando quieras layouts exactos, gráficos custom o animaciones.",
      },
    ],
    workflowTitle: ["Del prompt", "al escenario."],
    steps: [
      {
        title: "Creá un proyecto",
        copy: "Deck vacío, prompt de IA o HTML existente — empezá donde estés.",
      },
      {
        title: "Dale forma a los slides",
        copy: "Ajustá jerarquía, layout y color en el editor sin perder ritmo.",
      },
      {
        title: "Iterá libremente",
        copy: "Cambiá entre edición visual y código en cualquier momento. Nada te encierra.",
      },
      {
        title: "Presentá o exportá",
        copy: "Abrí un link de vista limpia para presentar, o exportá cuando el deck esté listo.",
      },
    ],
    openEditor: "Abrir el editor",
    faqTitle: ["Preguntas", "del público."],
    faqNote: "La parte de toda charla donde se prenden las luces.",
    faqs: [
      [
        "¿Qué puedo crear con Slides+?",
        "Pitches, clases, demos de producto, reportes, workshops — cualquier presentación donde quieras más control que en una herramienta tradicional.",
      ],
      [
        "¿Puedo usar IA y editar manualmente?",
        "Sí. La IA genera un punto de partida; después podés seguir editando visualmente o con código, en cualquier orden.",
      ],
      [
        "¿Necesito saber programar?",
        "Para nada. El editor visual cubre todo. El acceso al código está cuando lo querés, nunca es obligatorio.",
      ],
      [
        "¿Puedo presentar desde la app?",
        "Sí. Cada proyecto tiene un link de vista limpia pensado para presentar a pantalla completa.",
      ],
    ],
    endKicker: "Último slide",
    endLine1: "Gracias.",
    endItalic: "¿Preguntas? Empezá.",
    endCta: "Empezar gratis",
    copyright: "2026 Slides+. Todos los derechos reservados.",
  },
};

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const ONCE_VIEWPORT = { once: true, margin: "-80px" } as const;

// ─── Showcase data ────────────────────────────────────────────────────────────

const SHOWCASE_TEMPLATES = [
  "html-ppt-zhangzara-cobalt-grid",
  "html-ppt-zhangzara-bold-poster",
  "html-ppt-zhangzara-8-bit-orbit",
  "html-ppt-zhangzara-biennale-yellow",
  "html-ppt-zhangzara-block-frame",
  "html-ppt-zhangzara-retro-windows",
  "html-ppt-zhangzara-sakura-chroma",
  "html-ppt-zhangzara-neo-grid-bold",
];

function templateDisplayName(name: string) {
  return name
    .replace(/^html-ppt-zhangzara-|^html-ppt-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CropMark({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const pos = {
    tl: "left-0 top-0 border-l border-t",
    tr: "right-0 top-0 border-r border-t",
    bl: "left-0 bottom-0 border-l border-b",
    br: "right-0 bottom-0 border-r border-b",
  }[corner];
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-4 w-4 border-black/25 ${pos}`}
    />
  );
}

// Etiqueta mono de slide: "SLIDE 03 — FEATURES"
function SlideTag({ index, label }: { index: number; label: string }) {
  return (
    <motion.p
      variants={fadeUp}
      className="alt3-mono flex items-center gap-3 text-[11px] tracking-[0.22em] text-black/45"
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: index % 2 === 0 ? GREEN : PERIWINKLE }}
        aria-hidden="true"
      />
      SLIDE {String(index + 1).padStart(2, "0")} — {label}
    </motion.p>
  );
}

function SlideHeading({ lines }: { lines: string[] }) {
  return (
    <motion.h2
      variants={fadeUp}
      className="alt3-display mt-6 text-balance text-[clamp(2.4rem,5.4vw,4.8rem)] font-medium leading-[1.02] tracking-tight text-black"
    >
      {lines[0]}
      <br />
      <em className="alt3-display italic" style={{ color: PERIWINKLE }}>
        {lines[1]}
      </em>
    </motion.h2>
  );
}

function ArrowRight() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function InkButton({
  children,
  inverted = false,
}: {
  children: React.ReactNode;
  inverted?: boolean;
}) {
  return (
    <span
      className={`group/btn relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-7 py-3.5 text-sm font-medium tracking-wide transition-colors duration-300 ${
        inverted ? "bg-white text-black" : "bg-black text-white"
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 translate-y-full rounded-full transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-y-0"
        style={{ background: `linear-gradient(90deg, ${GREEN}, ${PERIWINKLE})` }}
      />
      <span className="relative z-10 transition-colors duration-300 group-hover/btn:text-white">
        {children}
      </span>
      <span className="relative z-10 transition-all duration-300 group-hover/btn:translate-x-1 group-hover/btn:text-white">
        <ArrowRight />
      </span>
    </span>
  );
}

function TemplateCard({ name }: { name: string }) {
  const displayName = templateDisplayName(name);
  return (
    <div className="mr-5 w-[300px] shrink-0 sm:mr-7 sm:w-[460px]">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-black/15 bg-white shadow-[0_2px_24px_rgba(17,17,16,0.08)]">
        <iframe
          src={`/templates/${name}/example.html`}
          title={`${displayName} template`}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          className="pointer-events-none absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left scale-[0.15625] border-0 sm:scale-[0.2396]"
        />
      </div>
      <p className="alt3-mono mt-3 text-[11px] tracking-[0.18em] text-black/45 uppercase">
        {displayName}
      </p>
    </div>
  );
}

// Acordeón FAQ claro
function FaqAccordion({ faqs }: { faqs: string[][] }) {
  const [openIndex, setOpenIndex] = useState<number>(0);
  return (
    <div>
      {faqs.map(([question, answer], i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={question}
            className="border-t border-black/10 last:border-b last:border-black/10"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
              className="group flex w-full cursor-pointer items-center gap-6 py-6 text-left sm:py-7"
            >
              <span className="alt3-mono w-8 shrink-0 text-[11px] tracking-widest text-black/35">
                Q{i + 1}
              </span>
              <span className="flex-1 text-base font-medium leading-snug tracking-tight text-black/80 transition-colors duration-200 group-hover:text-black sm:text-lg">
                {question}
              </span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300"
                style={{
                  borderColor: isOpen ? PERIWINKLE : "rgba(0,0,0,0.15)",
                  color: isOpen ? PERIWINKLE : "rgba(0,0,0,0.4)",
                  transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                }}
                aria-hidden="true"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <p className="max-w-[62ch] pb-7 pl-14 text-sm leading-relaxed text-black/60 sm:pb-9 sm:text-[15px]">
                    {answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AltLandingPage3() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(
    () => (navigator.language?.startsWith("es") ? "es" : "en") as Language,
  );
  const t = content[language];

  // Contador de slide actual basado en qué sección está en viewport
  const [currentSlide, setCurrentSlide] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.4,
  });

  useEffect(() => {
    const sections = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = sections.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setCurrentSlide(idx);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!href.startsWith("#")) return;
    event.preventDefault();
    document
      .querySelector(href)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
  };

  const setSectionRef = (index: number) => (el: HTMLElement | null) => {
    sectionRefs.current[index] = el;
  };

  return (
    <>
      <SEO
        title={t.seoTitle}
        description={t.seoDescription}
        canonicalUrl="https://slidesplus.com/altlanding3"
      />

      {/* Estilos locales: tipografía display/mono y grano de papel */}
      <style>{`
        .alt3-display { font-family: "Playfair Display", Georgia, serif; }
        .alt3-mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
        .alt3-paper {
          background-color: ${PAPER};
          background-image: radial-gradient(rgba(17,17,16,0.05) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        @keyframes alt3-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .alt3-marquee { animation: alt3-marquee 70s linear infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .alt3-marquee { animation: none; } }
      `}</style>

      <MotionConfig reducedMotion="user">
        <div
          className="alt3-paper relative min-h-screen w-full antialiased"
          style={{ color: INK, overflowY: "auto" }}
        >
          {/* Skip link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-white"
          >
            {t.skip}
          </a>

          {/* Barra de progreso de la "presentación" */}
          <motion.div
            aria-hidden="true"
            className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left"
            style={{
              scaleX: progress,
              background: `linear-gradient(90deg, ${GREEN}, ${PERIWINKLE})`,
            }}
          />

          {/* ── NAVBAR ── */}
          <nav
            aria-label="Primary"
            className="fixed inset-x-0 top-[3px] z-50 border-b border-black/10 backdrop-blur-md"
            style={{ background: "rgba(246,245,239,0.85)" }}
          >
            <div className="mx-auto flex max-w-[1560px] items-center justify-between px-5 py-3.5 sm:px-10">
              <a
                href="#main-content"
                onClick={(e) => scrollToSection(e, "#main-content")}
                className="flex items-center gap-2.5"
              >
                <span
                  aria-hidden="true"
                  className="block h-7 w-7 overflow-hidden rounded-lg"
                >
                  <AppIconWithoutLink />
                </span>
                <span className="text-lg font-semibold tracking-tight">
                  slides
                  <span style={{ color: PERIWINKLE }}>+</span>
                </span>
              </a>

              <div className="flex items-center gap-5 sm:gap-7">
                {t.navLabels.map((label, i) => (
                  <a
                    key={label}
                    href={t.navHrefs[i]}
                    onClick={(e) => scrollToSection(e, t.navHrefs[i])}
                    className="hidden text-sm font-medium text-black/60 transition-colors hover:text-black md:inline-block"
                  >
                    {label}
                  </a>
                ))}
                <button
                  type="button"
                  aria-label={
                    language === "en" ? "Switch to Spanish" : "Cambiar a inglés"
                  }
                  className="alt3-mono text-[11px] font-semibold tracking-[0.2em] text-black/50 transition-colors hover:text-black"
                  onClick={() => setLanguage(language === "en" ? "es" : "en")}
                >
                  {language === "en" ? "EN" : "ES"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="rounded-full bg-black px-5 py-2 text-xs font-semibold tracking-wide text-white transition-opacity hover:opacity-85"
                >
                  {t.start}
                </button>
              </div>
            </div>
          </nav>

          {/* Contador de slide fijo, como en una presentación real */}
          <div
            className="alt3-mono pointer-events-none fixed bottom-5 right-5 z-50 hidden items-center gap-3 rounded-full border border-black/15 bg-white/80 px-4 py-2 text-[11px] tracking-[0.25em] text-black/55 backdrop-blur-sm sm:flex"
            aria-hidden="true"
          >
            <span style={{ color: currentSlide >= 5 ? GREEN : INK }}>
              {String(currentSlide + 1).padStart(2, "0")}
            </span>
            <span className="text-black/25">/</span>
            <span>06</span>
          </div>

          <main id="main-content" className="relative">
            {/* ── SLIDE 01 · HERO ── */}
            <section
              ref={setSectionRef(0)}
              className="relative flex min-h-screen items-center px-5 pt-24 sm:px-10"
            >
              <div className="relative mx-auto w-full max-w-[1560px] px-2 py-14 sm:px-12 sm:py-20">
                <CropMark corner="tl" />
                <CropMark corner="tr" />
                <CropMark corner="bl" />
                <CropMark corner="br" />

                <motion.div initial="hidden" animate="visible" variants={stagger}>
                  <SlideTag index={0} label={t.slideLabels[0]} />

                  <motion.h1
                    variants={fadeUp}
                    className="alt3-display mt-8 max-w-[16ch] text-balance text-[clamp(2.9rem,8vw,7.5rem)] font-medium leading-[1.0] tracking-tight"
                  >
                    {t.heroLine1}{" "}
                    <em className="italic" style={{ color: PERIWINKLE }}>
                      {t.heroItalic}
                    </em>{" "}
                    <span className="relative inline-block">
                      {t.heroLine2}
                      <motion.span
                        aria-hidden="true"
                        className="absolute -bottom-1 left-0 h-[0.09em] w-full origin-left rounded-full sm:-bottom-2"
                        style={{ background: GREEN }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.7, delay: 0.9, ease: "easeOut" }}
                      />
                    </span>
                  </motion.h1>

                  <motion.div
                    variants={fadeUp}
                    className="mt-12 flex flex-col gap-8 sm:mt-16 sm:flex-row sm:items-end sm:justify-between"
                  >
                    <p className="max-w-[46ch] text-base leading-relaxed text-black/60 sm:text-lg">
                      {t.heroCopy}
                    </p>
                    <div className="flex shrink-0 items-center gap-5">
                      <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="cursor-pointer"
                      >
                        <InkButton>{t.heroCta}</InkButton>
                      </button>
                      <span className="alt3-mono hidden text-[11px] tracking-[0.2em] text-black/40 lg:inline">
                        {t.heroSecondary}
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </section>

            {/* ── SLIDE 02 · SHOWCASE ── */}
            <motion.section
              ref={setSectionRef(1)}
              initial="hidden"
              whileInView="visible"
              viewport={ONCE_VIEWPORT}
              variants={stagger}
              id="showcase"
              aria-labelledby="showcase-heading"
              className="relative scroll-mt-24 border-t border-black/10 py-24 sm:py-32"
            >
              <div className="mx-auto max-w-[1560px] px-5 sm:px-10">
                <SlideTag index={1} label={t.slideLabels[1]} />
                <div id="showcase-heading">
                  <SlideHeading lines={t.showcaseTitle} />
                </div>
                <motion.p
                  variants={fadeUp}
                  className="mt-5 max-w-[56ch] text-base leading-relaxed text-black/60"
                >
                  {t.showcaseNote}
                </motion.p>
              </div>

              <motion.div variants={fadeUp} className="relative mt-14 overflow-hidden">
                <div className="alt3-marquee flex w-max">
                  {[...SHOWCASE_TEMPLATES, ...SHOWCASE_TEMPLATES].map((name, i) => (
                    <TemplateCard key={`${name}-${i}`} name={name} />
                  ))}
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-28"
                  style={{
                    background: `linear-gradient(90deg, ${PAPER}, transparent)`,
                  }}
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-28"
                  style={{
                    background: `linear-gradient(270deg, ${PAPER}, transparent)`,
                  }}
                  aria-hidden="true"
                />
              </motion.div>
            </motion.section>

            {/* ── SLIDE 03 · FEATURES ── */}
            <motion.section
              ref={setSectionRef(2)}
              initial="hidden"
              whileInView="visible"
              viewport={ONCE_VIEWPORT}
              variants={stagger}
              id="features"
              aria-labelledby="features-heading"
              className="relative scroll-mt-24 border-t border-black/10 py-24 sm:py-32"
            >
              <div className="mx-auto max-w-[1560px] px-5 sm:px-10">
                <SlideTag index={2} label={t.slideLabels[2]} />
                <div id="features-heading">
                  <SlideHeading lines={t.featuresTitle} />
                </div>

                <motion.div
                  variants={fadeUp}
                  className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-black/10 bg-black/10 sm:mt-20 lg:grid-cols-3"
                >
                  {t.features.map((feature, i) => (
                    <article
                      key={feature.title}
                      className="group relative flex flex-col gap-16 p-8 transition-colors duration-300 sm:p-10 lg:gap-24"
                      style={{ background: PAPER }}
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 transition-transform duration-400 ease-out group-hover:scale-x-100"
                        style={{
                          background: i % 2 === 0 ? GREEN : PERIWINKLE,
                        }}
                      />
                      <span
                        className="alt3-display text-[clamp(3.4rem,5vw,5.5rem)] italic leading-none"
                        style={{ color: i % 2 === 0 ? GREEN : PERIWINKLE }}
                        aria-hidden="true"
                      >
                        {feature.num}
                      </span>
                      <div>
                        <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                          {feature.title}
                        </h3>
                        <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-black/60 sm:text-[15px]">
                          {feature.copy}
                        </p>
                      </div>
                    </article>
                  ))}
                </motion.div>
              </div>
            </motion.section>

            {/* ── SLIDE 04 · WORKFLOW ── */}
            <motion.section
              ref={setSectionRef(3)}
              initial="hidden"
              whileInView="visible"
              viewport={ONCE_VIEWPORT}
              variants={stagger}
              id="workflow"
              aria-labelledby="workflow-heading"
              className="relative scroll-mt-24 border-t border-black/10 py-24 sm:py-32"
            >
              <div className="mx-auto max-w-[1560px] px-5 sm:px-10">
                <SlideTag index={3} label={t.slideLabels[3]} />
                <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
                  <div id="workflow-heading">
                    <SlideHeading lines={t.workflowTitle} />
                  </div>
                  <motion.div variants={fadeUp} className="shrink-0 pb-1">
                    <button
                      type="button"
                      onClick={() => navigate("/home")}
                      className="cursor-pointer"
                    >
                      <InkButton>{t.openEditor}</InkButton>
                    </button>
                  </motion.div>
                </div>

                <motion.ol
                  variants={fadeUp}
                  className="mt-14 grid grid-cols-1 gap-10 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4"
                >
                  {t.steps.map((step, index) => (
                    <li key={step.title} className="relative">
                      <div className="flex items-center gap-4">
                        <span
                          className="alt3-mono flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                          style={{
                            background: index % 2 === 0 ? GREEN : PERIWINKLE,
                          }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {index < t.steps.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="hidden h-px flex-1 bg-black/15 lg:block"
                          />
                        )}
                      </div>
                      <h3 className="mt-5 text-lg font-semibold tracking-tight">
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-black/60">
                        {step.copy}
                      </p>
                    </li>
                  ))}
                </motion.ol>
              </div>
            </motion.section>

            {/* ── SLIDE 05 · FAQ ── */}
            <motion.section
              ref={setSectionRef(4)}
              initial="hidden"
              whileInView="visible"
              viewport={ONCE_VIEWPORT}
              variants={stagger}
              id="faq"
              aria-labelledby="faq-heading"
              className="relative scroll-mt-24 border-t border-black/10 py-24 sm:py-32"
            >
              <div className="mx-auto max-w-[1560px] px-5 sm:px-10">
                <SlideTag index={4} label={t.slideLabels[4]} />
                <div className="grid grid-cols-1 gap-x-16 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <div id="faq-heading">
                      <SlideHeading lines={t.faqTitle} />
                    </div>
                    <motion.p
                      variants={fadeUp}
                      className="mt-5 max-w-[32ch] text-sm leading-relaxed text-black/55"
                    >
                      {t.faqNote}
                    </motion.p>
                  </div>
                  <motion.div variants={fadeUp} className="mt-12 lg:col-span-7 lg:mt-8">
                    <FaqAccordion faqs={t.faqs} />
                  </motion.div>
                </div>
              </div>
            </motion.section>

            {/* ── SLIDE 06 · END OF DECK (footer) ── */}
            <motion.footer
              ref={setSectionRef(5)}
              initial="hidden"
              whileInView="visible"
              viewport={ONCE_VIEWPORT}
              variants={stagger}
              className="relative text-white"
              style={{ background: INK }}
            >
              <div
                aria-hidden="true"
                className="h-[3px] w-full"
                style={{
                  background: `linear-gradient(90deg, ${GREEN}, ${PERIWINKLE})`,
                }}
              />
              <div className="mx-auto max-w-[1560px] px-5 py-24 sm:px-10 sm:py-32">
                <motion.p
                  variants={fadeUp}
                  className="alt3-mono flex items-center gap-3 text-[11px] tracking-[0.22em] text-white/40"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: GREEN }}
                    aria-hidden="true"
                  />
                  SLIDE 06 — {t.slideLabels[5]} · {t.endKicker.toUpperCase()}
                </motion.p>

                <motion.h2
                  variants={fadeUp}
                  className="alt3-display mt-8 text-balance text-[clamp(3rem,8vw,7.5rem)] font-medium leading-[1.0] tracking-tight"
                >
                  {t.endLine1}
                  <br />
                  <em className="italic" style={{ color: PERIWINKLE }}>
                    {t.endItalic}
                  </em>
                </motion.h2>

                <motion.div
                  variants={fadeUp}
                  className="mt-14 flex flex-col gap-12 sm:mt-20 sm:flex-row sm:items-end sm:justify-between"
                >
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="cursor-pointer self-start"
                  >
                    <InkButton inverted>{t.endCta}</InkButton>
                  </button>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="block h-6 w-6 overflow-hidden rounded-md"
                      >
                        <AppIconWithoutLink />
                      </span>
                      <span className="text-base font-semibold tracking-tight">
                        slides
                        <span style={{ color: PERIWINKLE }}>+</span>
                      </span>
                    </div>
                    <p className="alt3-mono text-[11px] tracking-[0.15em] text-white/40">
                      {t.copyright}
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.footer>
          </main>
        </div>
      </MotionConfig>
    </>
  );
}
