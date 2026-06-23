import { useState, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import SEO from "../SEO";
import AppIconWithoutLink from "../RegularComponents/MultiuseComponents/AppIconWithoutLink";
import Grainient from "../ThirdPartyComponents/Grainient/Grainient";

// ─── Types ────────────────────────────────────────────────────────────────────

type Language = "en" | "es";

type ContentShape = {
  seoTitle: string;
  seoDescription: string;
  skip: string;
  navLabels: string[];
  navHrefs: string[];
  startShort: string;
  heroTitle: string;
  heroCta: string;
  heroSecondary: string;
  heroCopy: string;
  showcaseTitle: string;
  showcaseNote: string;
  featuresTitle: string;
  features: { title: string; copy: string }[];
  workflowTitle: string;
  steps: string[][];
  openEditor: string;
  faqTitle: string;
  faqs: string[][];
  footerHeadline: string[];
  footerTagline: string;
  footerCta: string;
  copyright: string;
};

// ─── Content ──────────────────────────────────────────────────────────────────

const content: Record<Language, ContentShape> = {
  en: {
    seoTitle: "slides+ | Build presentations with code, AI, and your team.",
    seoDescription:
      "Create presentations with AI, visual editing, and code-level control.",
    skip: "Skip to main content",
    navLabels: ["Features", "Workflow", "FAQ"],
    navHrefs: ["#features", "#workflow", "#faq"],
    startShort: "Start",
    heroTitle: "Every great presentation needs a little plus.",
    heroCta: "Get started",
    heroSecondary: "Explore features",
    heroCopy:
      "Slides+ gives you AI to get started, an editor to go deeper, and code when you need full control. From first idea to final slide — that's slides+.",
    showcaseTitle: "This is what slides+ makes.",
    showcaseNote:
      "Real templates rendered live in HTML — not screenshots. Every deck below is running in the same engine you'll present with.",
    featuresTitle: "One workspace for the whole deck",
    features: [
      {
        title: "Start from an idea",
        copy: "Write a prompt and turn a rough concept into a structured deck with sections, copy, and flow already in place.",
      },
      {
        title: "Edit visually or with code",
        copy: "Move fast in the visual editor, then open the code when you want exact layout control.",
      },
      {
        title: "Present anywhere",
        copy: "Open a clean view link to present directly from the app, or export when the deck is ready to ship.",
      },
    ],
    workflowTitle: "How Slides+ fits into your flow",
    steps: [
      [
        "Create a project",
        "Start from a blank deck, an AI prompt, or an existing HTML idea you want to refine.",
      ],
      [
        "Shape the slides",
        "Use the editor to tune hierarchy, layout, colors, and content without losing momentum.",
      ],
      [
        "Iterate freely",
        "Switch between visual editing and code at any point. Every change is yours to make.",
      ],
      [
        "Present or export",
        "Open a clean view link for presenting, or export when the deck is ready.",
      ],
    ],
    openEditor: "Open editor",
    faqTitle: "Frequently asked questions",
    faqs: [
      [
        "What can I create with Slides+?",
        "Decks for pitches, lessons, product demos, reports, workshops, and any presentation where you want more control than a typical slide tool.",
      ],
      [
        "Can I use AI and still edit manually?",
        "Yes. AI can generate a starting point, and you can keep editing visually or with code after that.",
      ],
      [
        "Do I need to know how to code?",
        "Not at all. The visual editor covers everything. Code access is there when you want it, not required.",
      ],
      [
        "Can I present from the app?",
        "Yes. Project view pages are designed for clean viewing and presenting.",
      ],
    ],
    footerHeadline: ["Every great pitch", "starts somewhere plus."],
    footerTagline:
      "AI to get started. An editor to go deeper. Code when you need it. That's slides+.",
    footerCta: "Start for free",
    copyright: "2026 Slides+. All rights reserved.",
  },
  es: {
    seoTitle: "slides+ | Crea presentaciones con IA y control total.",
    seoDescription:
      "Crea presentaciones con IA, edicion visual y control por codigo.",
    skip: "Saltar al contenido principal",
    navLabels: ["Funciones", "Flujo", "FAQ"],
    navHrefs: ["#features", "#workflow", "#faq"],
    startShort: "Empezar",
    heroTitle: "Toda buena presentación necesita un pequeño plus.",
    heroCta: "Empezar",
    heroSecondary: "Ver funciones",
    heroCopy:
      "Slides+ te da IA para arrancar, un editor para profundizar y codigo cuando necesitas control total. De la primera idea al slide final — eso es slides+.",
    showcaseTitle: "Esto es lo que hace slides+.",
    showcaseNote:
      "Plantillas reales renderizadas en vivo en HTML — no son capturas. Cada deck de abajo corre en el mismo motor con el que vas a presentar.",
    featuresTitle: "Un solo workspace para todo el deck",
    features: [
      {
        title: "Arranca desde una idea",
        copy: "Escribi un prompt y converti un concepto inicial en un deck estructurado con secciones, copy y flujo.",
      },
      {
        title: "Edita visualmente o con codigo",
        copy: "Avanza rapido en el editor visual y abri el codigo cuando quieras controlar el layout con precision.",
      },
      {
        title: "Presenta desde cualquier lugar",
        copy: "Abri un link de vista limpia para presentar directo desde la app, o exporta cuando el deck este listo.",
      },
    ],
    workflowTitle: "Como Slides+ encaja en tu flujo",
    steps: [
      [
        "Crea un proyecto",
        "Empieza desde un deck vacio, un prompt de IA o una idea HTML que quieras refinar.",
      ],
      [
        "Dale forma a las slides",
        "Usa el editor para ajustar jerarquia, layout, colores y contenido sin perder ritmo.",
      ],
      [
        "Itera libremente",
        "Cambia entre edicion visual y codigo en cualquier momento. Cada cambio es tuyo.",
      ],
      [
        "Presenta o exporta",
        "Abri una vista limpia para presentar, o exporta cuando el deck este listo.",
      ],
    ],
    openEditor: "Abrir editor",
    faqTitle: "Preguntas frecuentes",
    faqs: [
      [
        "Que puedo crear con Slides+?",
        "Decks para pitches, clases, demos de producto, reportes, workshops y cualquier presentacion donde quieras mas control que en una herramienta tradicional.",
      ],
      [
        "Puedo usar IA y editar manualmente?",
        "Si. La IA puede generar un punto de partida y despues puedes editar visualmente o con codigo.",
      ],
      [
        "Necesito saber programar?",
        "Para nada. El editor visual cubre todo. El acceso al codigo esta cuando lo queres, no es obligatorio.",
      ],
      [
        "Puedo presentar desde la app?",
        "Si. Las vistas de proyecto estan pensadas para ver y presentar de forma limpia.",
      ],
    ],
    footerHeadline: ["Todo gran pitch", "empieza en algun lugar plus."],
    footerTagline:
      "IA para arrancar. Editor para profundizar. Codigo cuando lo necesitas. Eso es slides+.",
    footerCta: "Empezar gratis",
    copyright: "2026 Slides+. Todos los derechos reservados.",
  },
};

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const ONCE_VIEWPORT = { once: true } as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ArrowRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
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

function AnimatedButton({ children }: { children: React.ReactNode }) {
  return (
    <span className="group/cta inline-flex items-stretch gap-1">
      <span className="px-5 py-3 rounded-md bg-foreground text-background text-xs font-medium tracking-widest uppercase">
        {children}
      </span>
      <span
        className="relative inline-flex items-center justify-center rounded-md px-3 py-3 bg-foreground text-background"
        aria-hidden="true"
        style={{ overflow: "hidden" }}
      >
        <span className="invisible" style={{ width: 16, height: 16 }} />
        <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover/cta:translate-x-full">
          <span className="absolute inset-0 flex items-center justify-center">
            <ArrowRight />
          </span>
          <span className="absolute inset-y-0 right-full w-full flex items-center justify-center">
            <ArrowRight />
          </span>
        </span>
      </span>
    </span>
  );
}

function GrainientBackground() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {isVisible && (
        <Grainient
          color1="#7182FF"
          color2="#249931"
          color3="#0d0d0c"
          timeSpeed={0.22}
          colorBalance={-0.08}
          warpStrength={0.85}
          warpFrequency={4.6}
          warpSpeed={1.4}
          warpAmplitude={58}
          blendAngle={18}
          blendSoftness={0.08}
          rotationAmount={360}
          noiseScale={1.8}
          grainAmount={0.08}
          grainScale={2.4}
          grainAnimated={false}
          contrast={1.25}
          gamma={1}
          saturation={1.08}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      )}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <div className="absolute inset-0 bg-background/28" />
    </div>
  );
}

// Real template decks rendered live — the product showing itself
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

function TemplateCard({ name }: { name: string }) {
  const displayName = templateDisplayName(name);
  return (
    <div className="mr-5 w-[300px] shrink-0 sm:mr-6 sm:w-[440px]">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]">
        <iframe
          src={`/templates/${name}/example.html`}
          title={`${displayName} template`}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          className="pointer-events-none absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left scale-[0.15625] border-0 sm:scale-[0.2292]"
        />
      </div>
      <p className="mt-3 text-sm text-white/60">{displayName}</p>
    </div>
  );
}

function TemplateShowcase({ title, note }: { title: string; note: string }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={ONCE_VIEWPORT}
      variants={stagger}
      id="showcase"
      aria-labelledby="showcase-heading"
      className="relative py-28 sm:py-36"
    >
      <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
        <motion.h2
          id="showcase-heading"
          variants={fadeUp}
          className="max-w-[24ch] text-balance text-3xl sm:text-[clamp(2rem,3.8vw,3.75rem)] font-medium leading-[1.02] tracking-tight text-white"
        >
          {title}
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mt-5 max-w-[58ch] text-base leading-relaxed text-white/65"
        >
          {note}
        </motion.p>
      </div>
      <motion.div variants={fadeUp} className="relative mt-14 overflow-hidden">
        <div className="marquee-track flex w-max">
          {[...SHOWCASE_TEMPLATES, ...SHOWCASE_TEMPLATES].map((name, i) => (
            <TemplateCard key={`${name}-${i}`} name={name} />
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black to-transparent sm:w-28"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black to-transparent sm:w-28"
          aria-hidden="true"
        />
      </motion.div>
    </motion.section>
  );
}

function Divider() {
  return (
    <div className="w-full border-t border-white/[0.06]" aria-hidden="true" />
  );
}

// Controlled FAQ accordion
function FaqAccordion({ faqs }: { faqs: string[][] }) {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <div>
      {faqs.map(([question, answer], i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={question}
            className="border-t border-white/[0.06] last:border-b last:border-white/[0.06]"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
              className="flex w-full cursor-pointer items-center gap-6 px-0 py-6 sm:py-7 text-left group"
            >
              <span className="flex-1 text-base sm:text-lg font-medium tracking-tight leading-snug text-white/85 group-hover:text-white transition-colors duration-200">
                {question}
              </span>
              <span
                className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  isOpen
                    ? "border-white/30 text-white bg-white/[0.06]"
                    : "border-white/10 text-white/40 group-hover:border-white/20 group-hover:text-white/70"
                }`}
                aria-hidden="true"
              >
                <span
                  className="flex items-center justify-center transition-transform duration-300"
                  style={{
                    transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                </span>
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
                  <div className="flex gap-6 pb-7 sm:pb-9">
                    <p className="max-w-[64ch] text-sm sm:text-[15px] leading-relaxed text-white/65">
                      {answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// Shared section header layout
function SectionHeader({ title, id }: { title: string; id: string }) {
  return (
    <motion.h2
      variants={fadeUp}
      id={id}
      className="max-w-[24ch] text-balance text-3xl sm:text-[clamp(2rem,3.8vw,3.75rem)] font-medium leading-[1.02] tracking-tight text-white"
    >
      {title}
    </motion.h2>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AltLandingPage2() {
  const navigate = useNavigate();
  // El idioma es global (compartido con la app vía i18next / toggle de Settings).
  const { i18n } = useTranslation();
  const language: Language = i18n.resolvedLanguage === "es" ? "es" : "en";
  const setLanguage = (l: Language) => i18n.changeLanguage(l);
  const [introDone, setIntroDone] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const t = content[language];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroDone(true);
      const t2 = setTimeout(() => setShowIntro(false), 600);
      return () => clearTimeout(t2);
    }, 1000);
    return () => clearTimeout(timer);
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

  useEffect(() => {
    document.documentElement.classList.add("alt-landing-scroll");
    return () =>
      document.documentElement.classList.remove("alt-landing-scroll");
  }, []);

  return (
    <>
      <SEO
        title={t.seoTitle}
        description={t.seoDescription}
        canonicalUrl="https://slidesplus.com/altlanding2"
      />

      {/*
        Un único overflow-y: el wrapper raíz contiene el scroll.
        Sin overflow-x ni overflow-hidden en ningún otro elemento.
      */}
      <MotionConfig reducedMotion="user">
      <div
        className="relative min-h-screen bg-black text-white font-sans antialiased w-full"
        style={{ overflowY: "auto" }}
      >
        {/* Skip link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          {t.skip}
        </a>

        {/* ── NAVBAR ── */}
        <nav
          aria-label="Primary"
          className={`fixed inset-x-0 top-0 z-50 pointer-events-none transition-opacity duration-500 ${
            introDone ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="mx-auto flex items-center justify-between px-6 py-4 sm:px-14 sm:py-6">
            <a
              href="#main-content"
              onClick={(e) => scrollToSection(e, "#main-content")}
              className="pointer-events-auto relative inline-flex items-center gap-3 text-4xl font-bold tracking-tight rounded-lg text-white hover:text-white/80 transition-colors"
            >
              <span>slides+</span>
            </a>

            <div className="pointer-events-auto flex items-center gap-4 rounded-lg bg-white px-4 py-2 text-black shadow-sm">
              <button
                type="button"
                aria-label={
                  language === "en" ? "Switch to Spanish" : "Cambiar a inglés"
                }
                className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider text-black/60 transition-colors hover:text-black"
                onClick={() => setLanguage(language === "en" ? "es" : "en")}
              >
                {language === "en" ? "EN" : "ES"}
              </button>

              {t.navLabels.map((label, i) => (
                <a
                  key={label}
                  href={t.navHrefs[i]}
                  onClick={(e) => scrollToSection(e, t.navHrefs[i])}
                  className="hidden text-sm font-medium text-black/70 transition-colors hover:text-black sm:inline-block"
                >
                  {label}
                </a>
              ))}

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="inline-flex items-center rounded-md bg-black px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
              >
                {t.startShort}
              </button>
            </div>
          </div>
        </nav>

        <main id="main-content" className="relative z-10 flex-1">
          {/* ── HERO ── */}
          <section
            className="relative min-h-screen bg-black"
            style={{ clipPath: "inset(0)" }}
          >
            <div className="relative h-screen flex items-center justify-center">
              {/* Grainient vive aquí sin overflow propio — el clip del section lo contiene */}
              <div className="absolute inset-0">
                <GrainientBackground />
              </div>

              <AnimatePresence>
                {showIntro && (
                  <motion.div
                    key="intro"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: introDone ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                  >
                    <span className="inline-flex text-[clamp(3rem,10vw,10rem)] font-bold tracking-tight text-white">
                      {"slides+".split("").map((char, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, y: 40 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: i * 0.08,
                            ease: "easeOut",
                          }}
                        >
                          {char === " " ? "\u00A0" : char}
                        </motion.span>
                      ))}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {introDone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                    className="absolute inset-0 flex flex-col justify-between p-6 pt-56 sm:p-10 lg:p-14 xl:p-16 text-white pointer-events-none"
                  >
                    <motion.h1
                      variants={fadeUp}
                      className="max-w-[10ch] text-[clamp(2.25rem,6.5vw,6.5rem)] font-medium leading-[0.95] tracking-tight"
                    >
                      <span className="block mt-20">{t.heroTitle}</span>
                    </motion.h1>

                    <motion.div
                      variants={fadeUp}
                      className="flex items-end justify-between gap-8 flex-col sm:flex-row sm:items-end"
                    >
                      <p className="max-w-xl text-xl sm:text-2xl font-medium leading-snug tracking-tight text-white/80">
                        {t.heroCopy}
                      </p>

                      <div className="pointer-events-auto flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => navigate("/login")}
                          className="group inline-flex items-stretch gap-1 cursor-pointer"
                        >
                          <AnimatedButton>{t.heroCta}</AnimatedButton>
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </section>

          {/* ── SHOWCASE: the product showing itself ── */}
          <TemplateShowcase title={t.showcaseTitle} note={t.showcaseNote} />

          {/* Divider between Showcase and Features */}
          <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
            <Divider />
          </div>

          {/* ── FEATURES ── */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={ONCE_VIEWPORT}
            variants={stagger}
            id="features"
            className="relative py-28 sm:py-36 scroll-mt-24"
            aria-labelledby="features-heading"
          >
            {/* Faint top gradient bleed from hero */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(113,130,255,0.18), rgba(36,153,49,0.12), transparent)",
              }}
              aria-hidden="true"
            />

            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <SectionHeader title={t.featuresTitle} id="features-heading" />

              <motion.div variants={fadeUp} className="mt-16 sm:mt-20">
                {t.features.map((feature) => (
                  <article
                    key={feature.title}
                    className="grid grid-cols-1 gap-3 border-t border-white/[0.08] py-10 last:border-b last:border-white/[0.08] sm:grid-cols-12 sm:gap-10 sm:py-14"
                  >
                    <h3 className="text-2xl font-medium leading-tight tracking-tight text-white sm:col-span-5 sm:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="max-w-[58ch] text-base leading-relaxed text-white/65 sm:col-span-6 sm:col-start-7">
                      {feature.copy}
                    </p>
                  </article>
                ))}
              </motion.div>
            </div>
          </motion.section>

          {/* Divider between Features and Workflow */}
          <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
            <Divider />
          </div>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={ONCE_VIEWPORT}
            variants={stagger}
            id="workflow"
            className="relative py-28 sm:py-36 scroll-mt-24"
            aria-labelledby="workflow-heading"
          >
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <SectionHeader title={t.workflowTitle} id="workflow-heading" />

              <motion.div
                variants={fadeUp}
                className="mt-16 sm:mt-20 space-y-2"
              >
                {t.steps.map(([title, copy], index) => (
                  <div
                    key={title}
                    className="group relative flex items-start gap-6 sm:gap-10 rounded-xl p-7 sm:p-8 transition-colors duration-300 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06]"
                  >
                    {/* Vertical connector line between steps */}
                    {index < t.steps.length - 1 && (
                      <span
                        className="pointer-events-none absolute left-[2.25rem] top-full h-2 w-px bg-white/[0.06]"
                        aria-hidden="true"
                      />
                    )}

                    {/* Step number with dot */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 font-mono text-[9px] tracking-widest text-white/30 tabular-nums transition-all duration-300 group-hover:border-white/20 group-hover:text-white/60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-medium leading-tight tracking-tight text-white/80 group-hover:text-white transition-colors duration-300">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/60 max-w-[60ch]">
                        {copy}
                      </p>
                    </div>

                    {/* Right arrow that appears on hover */}
                    <span
                      className="shrink-0 self-center text-white/20 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                      aria-hidden="true"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="mt-12">
                <button
                  type="button"
                  onClick={() => navigate("/home")}
                  className="group inline-flex items-stretch gap-1 cursor-pointer"
                >
                  <AnimatedButton>{t.openEditor}</AnimatedButton>
                </button>
              </motion.div>
            </div>
          </motion.section>

          {/* ── FAQ ── */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={ONCE_VIEWPORT}
            variants={stagger}
            id="faq"
            className="relative py-28 sm:py-36 scroll-mt-24"
            aria-labelledby="faq-heading"
          >
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <Divider />
              <div className="pt-16 sm:pt-20">
                <SectionHeader title={t.faqTitle} id="faq-heading" />

                <motion.div variants={fadeUp} className="mt-16 sm:mt-20">
                  {/* Two-column layout on large screens: sticky label + accordion */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-16">
                    <div className="lg:col-span-4 hidden lg:block">
                      {/* Decorative left column — stays sticky while scrolling FAQ */}
                      <div className="sticky top-32 flex flex-col gap-8">
                        <p className="text-sm text-white/55 leading-relaxed max-w-[28ch]">
                          {language === "en"
                            ? "Everything you need to know before getting started."
                            : "Todo lo que necesitas saber antes de empezar."}
                        </p>
                        {/* Mini accent gradient block */}
                        <div
                          className="h-px w-16"
                          style={{
                            background:
                              "linear-gradient(90deg, rgba(113,130,255,0.6), transparent)",
                          }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-8">
                      <FaqAccordion faqs={t.faqs} />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.section>
        </main>

        {/* ── FOOTER ── */}
        <motion.footer
          initial="hidden"
          whileInView="visible"
          viewport={ONCE_VIEWPORT}
          variants={stagger}
          className="relative z-10 bg-black text-white"
        >
          <div className="max-w-[1680px] mx-auto px-6 sm:px-10 pb-16 sm:pb-24 pt-24 sm:pt-32 lg:pt-40">
            {/* Top accent line */}
            <div
              className="mb-16 sm:mb-24 h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(113,130,255,0.3), rgba(36,153,49,0.2), transparent)",
              }}
              aria-hidden="true"
            />

            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24"
            >
              {/* Left: brand */}
              <div className="lg:col-span-4 flex flex-col justify-between gap-12">
                <div className="flex flex-col gap-5">
                  <a
                    href="#main-content"
                    onClick={(e) =>
                      scrollToSection(
                        e as unknown as MouseEvent<HTMLAnchorElement>,
                        "#main-content",
                      )
                    }
                    className="inline-flex items-center gap-2.5"
                  >
                    <span
                      aria-hidden="true"
                      className="block h-7 w-7 sm:h-8 sm:w-8 rounded-lg"
                      style={{ overflow: "hidden" }}
                    >
                      <AppIconWithoutLink />
                    </span>
                    <span className="text-lg font-semibold tracking-tight">
                      slides+
                    </span>
                  </a>
                  <p className="text-sm text-white/60 leading-relaxed max-w-[28ch]">
                    {t.footerTagline}
                  </p>
                </div>
                <p className="text-xs text-white/45 font-mono">{t.copyright}</p>
              </div>

              {/* Right: headline + CTA */}
              <div className="lg:col-span-8 flex flex-col justify-between gap-10">
                <div className="text-[clamp(2.25rem,5.5vw,5rem)] font-medium leading-[0.9] tracking-tight">
                  <p className="text-white">{t.footerHeadline[0]}</p>
                  <p style={{ color: "rgba(255,255,255,0.55)" }}>
                    {t.footerHeadline[1]}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="group inline-flex items-stretch gap-1 cursor-pointer"
                  >
                    <AnimatedButton>{t.footerCta}</AnimatedButton>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.footer>
      </div>
      </MotionConfig>
    </>
  );
}
