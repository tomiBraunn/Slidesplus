import { useState, useEffect } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SEO from "../SEO";
import AppIconWithoutLink from "../RegularComponents/MultiuseComponents/AppIconWithoutLink";
import Grainient from "../ThirdPartyComponents/Grainient/Grainient";

type Language = "en" | "es";

const content = {
  en: {
    seoTitle: "slides+ | Alternative Landing 2",
    seoDescription:
      "Create presentations with AI, visual editing, code control, and real-time collaboration.",
    skip: "Skip to main content",
    navLabels: ["Features", "Workflow", "FAQ"],
    navHrefs: ["#features", "#workflow", "#faq"],
    login: "Log in",
    startCreating: "Start creating",
    startShort: "Start",
    home: "Home",
    heroTitle: "Presentations that move from idea to deck faster.",
    heroCta: "Get started",
    heroSecondary: "Explore features",
    heroCopy:
      "Slides+ combines AI generation, visual editing, code-level control, and sharing so your deck can grow with the way you work.",
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
        title: "Collaborate live",
        copy: "Invite your team, share project access, and keep everyone aligned while the presentation evolves.",
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
        "Work with your team",
        "Share the project, review changes, and keep presentation work in one place.",
      ],
      [
        "Present or export",
        "Open a clean view link for presenting, or keep iterating until the deck is ready.",
      ],
    ],
    openEditor: "Open editor",
    faqTitle: "FAQs",
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
        "Does it support collaboration?",
        "Slides+ includes project sharing and real-time project workflows so teams can work from the same source.",
      ],
      [
        "Can I present from the app?",
        "Yes. Project view pages are designed for clean viewing and sharing.",
      ],
    ],
    backToTop: "Back to top ^",
    copyright: "2026 Slides+. All rights reserved.",
  },
  es: {
    seoTitle: "slides+ | Landing alternativa 2",
    seoDescription:
      "Crea presentaciones con IA, edicion visual, control por codigo y colaboracion en tiempo real.",
    skip: "Saltar al contenido principal",
    navLabels: ["Funciones", "Flujo", "FAQ"],
    navHrefs: ["#features", "#workflow", "#faq"],
    login: "Iniciar sesion",
    startCreating: "Empezar a crear",
    startShort: "Empezar",
    home: "Inicio",
    heroTitle: "Presentaciones que pasan de idea a deck mas rapido.",
    heroCta: "Empezar",
    heroSecondary: "Ver funciones",
    heroCopy:
      "Slides+ combina generacion con IA, edicion visual, control por codigo y compartir proyectos para que tu deck crezca con tu forma de trabajar.",
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
        title: "Colabora en vivo",
        copy: "Invita a tu equipo, comparte acceso al proyecto y manten a todos alineados mientras la presentacion evoluciona.",
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
        "Trabaja con tu equipo",
        "Comparte el proyecto, revisa cambios y mantene el trabajo de presentacion en un solo lugar.",
      ],
      [
        "Presenta o comparte",
        "Abre una vista limpia para presentar, o segui iterando hasta que el deck este listo.",
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
        "Tiene colaboracion?",
        "Slides+ incluye compartir proyectos y flujos en tiempo real para que los equipos trabajen desde la misma fuente.",
      ],
      [
        "Puedo presentar desde la app?",
        "Si. Las vistas de proyecto estan pensadas para ver y compartir presentaciones de forma limpia.",
      ],
    ],
    backToTop: "Volver arriba ^",
    copyright: "2026 Slides+. Todos los derechos reservados.",
  },
} satisfies Record<
  Language,
  {
    seoTitle: string;
    seoDescription: string;
    skip: string;
    navLabels: string[];
    navHrefs: string[];
    login: string;
    startCreating: string;
    startShort: string;
    home: string;
    heroTitle: string;
    heroCta: string;
    heroSecondary: string;
    heroCopy: string;
    featuresTitle: string;
    features: { title: string; copy: string }[];
    workflowTitle: string;
    steps: string[][];
    openEditor: string;
    faqTitle: string;
    faqs: string[][];
    backToTop: string;
    copyright: string;
  }
>;

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

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-4 w-4 shrink-0 text-white/60"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
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
        className="relative inline-flex items-center justify-center rounded-md overflow-hidden px-3 py-3 bg-foreground text-background"
        aria-hidden="true"
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
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
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
        zoom={0.90}
      />
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

function DotsBg({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:36px_36px] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
    </div>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-foreground/[0.08] px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-white/70 ${className}`}
    >
      {children}
    </span>
  );
}

function CornerDots() {
  return (
    <>
      {[
        "left-0 top-0 border-l border-t group-hover:-left-1.5 group-hover:-top-1.5",
        "right-0 top-0 border-r border-t group-hover:-right-1.5 group-hover:-top-1.5",
        "bottom-0 left-0 border-b border-l group-hover:-bottom-1.5 group-hover:-left-1.5",
        "bottom-0 right-0 border-b border-r group-hover:-bottom-1.5 group-hover:-right-1.5",
      ].map((pos) => (
        <span
          key={pos}
          className={`absolute h-[10px] w-[10px] border-accent-foreground/30 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:border-accent-foreground ${pos}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

export default function AltLandingPage2() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>("en");
  const [introDone, setIntroDone] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const t = content[language];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroDone(true);
      const t2 = setTimeout(() => setShowIntro(false), 500);
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
    const target = document.querySelector(href);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        title="slides+ | Build presentations with code, AI, and your team."
        description={t.seoDescription}
        canonicalUrl="https://slidesplus.com/altlanding2"
      />

      <div className="relative min-h-screen bg-black text-white font-sans antialiased w-full">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          {t.skip}
        </a>

        {/* NAVBAR */}
        <nav
          aria-label="Primary"
          className={`fixed inset-x-0 top-0 z-50 pointer-events-none transition-opacity duration-500 ${introDone ? "opacity-100" : "opacity-0"}`}
        >
          <div className="mx-auto flex items-center justify-between px-6 py-4 sm:px-10 sm:py-6 max-w-[1680px]">
            <a
              href="#main-content"
              onClick={(e) => scrollToSection(e, "#main-content")}
              className="pointer-events-auto relative inline-flex items-center gap-3 text-3xl font-bold tracking-tight rounded-lg text-white hover:text-white/80"
            >
              {/*
              <span aria-hidden="true" className="block h-8 w-8 overflow-hidden">
                <AppIconWithoutLink />
              </span>
              */}
              <span>slides+</span>
            </a>
            <div className="pointer-events-auto flex items-center gap-4 rounded-lg bg-white px-4 py-2 text-black shadow-sm">
              <button
                type="button"
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
              <a
                href="#get-started"
                onClick={(e) => scrollToSection(e, "#get-started")}
                className="inline-flex items-center rounded-md bg-black px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
              >
                {t.startShort}
              </a>
            </div>
          </div>
        </nav>

        <main id="main-content" className="relative z-10 flex-1">
          {/* HERO */}
          <section className="relative min-h-screen bg-black overflow-hidden">
            <div className="relative h-screen flex items-center justify-center">
              <div className="absolute inset-0 overflow-hidden">
                <GrainientBackground />
              </div>

              {showIntro && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: introDone ? 0 : 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center z-20"
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
                    className="absolute inset-0 flex flex-col justify-between p-6 pt-56 sm:p-10 lg:p-14 xl:p-16 text-white pointer-events-none max-w-[1680px] mx-auto"
                  >
                    <motion.h1
                      variants={fadeUp}
                      className="max-w-[10ch] text-[clamp(2.75rem,7.75vw,7.75rem)] font-medium leading-[0.95] tracking-tight"
                    >
                      <span className="block">{t.heroTitle}</span>
                    </motion.h1>
                    <motion.div
                      variants={fadeUp}
                      className="flex items-end justify-between gap-8 flex-col sm:flex-row sm:items-end"
                    >
                      <p className="max-w-xl text-xl sm:text-2xl font-medium leading-snug tracking-tight text-white/80">
                        {t.heroCopy}
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/signup")}
                        className="group pointer-events-auto inline-flex items-stretch gap-1 cursor-pointer shrink-0"
                      >
                        <span className="px-5 py-3 rounded-md bg-foreground text-background text-xs font-medium tracking-widest uppercase">
                          {t.heroCta}
                        </span>
                        <span
                          className="relative inline-flex items-center justify-center rounded-md overflow-hidden px-3 py-3 bg-foreground text-background"
                          aria-hidden="true"
                        >
                          <span
                            className="invisible"
                            style={{ width: 16, height: 16 }}
                          />
                          <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover:translate-x-full">
                            <span className="absolute inset-0 flex items-center justify-center">
                              <ArrowRight />
                            </span>
                            <span className="absolute inset-y-0 right-full w-full flex items-center justify-center">
                              <ArrowRight />
                            </span>
                          </span>
                        </span>
                      </button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </section>

          {/* FEATURES */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            id="features"
            className="relative py-24 sm:py-32 scroll-mt-24"
            aria-labelledby="features-heading"
          >
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <motion.div
                variants={fadeUp}
                className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-x-10 sm:gap-y-6"
              >
                <div className="sm:col-span-3 pt-2">
                  <SectionLabel>Features</SectionLabel>
                </div>
                <div className="sm:col-span-7 sm:col-start-6">
                  <h2
                    id="features-heading"
                    className="text-balance text-3xl sm:text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight"
                  >
                    {t.featuresTitle}
                  </h2>
                </div>
              </motion.div>
              <motion.div
                variants={fadeUp}
                className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5"
              >
                {t.features.map((feature, i) => (
                  <article key={feature.title} className="group relative flex">
                    <div className="relative flex flex-1 flex-col justify-between rounded-2xl p-8 min-h-[280px] sm:min-h-[360px] bg-foreground/[0.04] hover:bg-foreground/[0.06] transition-colors duration-500">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground/10 text-white">
                        <span className="font-mono text-xs tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-medium leading-tight tracking-tight">
                          {feature.title}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-white/65">
                          {feature.copy}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </motion.div>
            </div>
          </motion.section>

          {/* WORKFLOW */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            id="workflow"
            className="relative py-24 sm:py-32 scroll-mt-24"
            aria-labelledby="workflow-heading"
          >
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <motion.div
                variants={fadeUp}
                className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-x-10 sm:gap-y-6"
              >
                <div className="sm:col-span-3 pt-2">
                  <SectionLabel>Workflow</SectionLabel>
                </div>
                <div className="sm:col-span-7 sm:col-start-6">
                  <h2
                    id="workflow-heading"
                    className="text-balance text-3xl sm:text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight"
                  >
                    {t.workflowTitle}
                  </h2>
                </div>
              </motion.div>
              <motion.div
                variants={fadeUp}
                className="mt-16 sm:mt-20 space-y-4"
              >
                {t.steps.map(([title, copy], index) => (
                  <div
                    key={title}
                    className="group relative flex items-start gap-6 sm:gap-10 rounded-2xl p-8 bg-foreground/[0.03] hover:bg-foreground/[0.05] transition-colors duration-500"
                  >
                    <span className="font-mono text-xs uppercase tracking-widest text-white/40 tabular-nums shrink-0 pt-1">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-medium leading-tight tracking-tight">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/65 max-w-[60ch]">
                        {copy}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
              <motion.div variants={fadeUp} className="mt-10">
                <button
                  onClick={() => navigate("/home")}
                  className="group inline-flex items-stretch gap-1 cursor-pointer"
                >
                  <AnimatedButton>{t.openEditor}</AnimatedButton>
                </button>
              </motion.div>
            </div>
          </motion.section>

          {/* FAQ */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            id="faq"
            className="relative py-24 sm:py-32 scroll-mt-24"
            aria-labelledby="faq-heading"
          >
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <motion.div
                variants={fadeUp}
                className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-x-10 sm:gap-y-6"
              >
                <div className="sm:col-span-3 pt-2">
                  <SectionLabel>FAQ</SectionLabel>
                </div>
                <div className="sm:col-span-7 sm:col-start-6">
                  <h2
                    id="faq-heading"
                    className="text-balance text-3xl sm:text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight"
                  >
                    {t.faqTitle}
                  </h2>
                </div>
              </motion.div>
              <motion.div
                variants={fadeUp}
                className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-12 gap-x-10"
              >
                <div className="sm:col-span-10 sm:col-start-2">
                  {t.faqs.map(([question, answer], i) => (
                    <details
                      key={question}
                      className="group border-t border-foreground/[0.08] last:border-b"
                      open={i === 0}
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-6 px-2 py-6 sm:py-7 text-left transition-colors hover:bg-foreground/[0.03]">
                        <span className="font-mono text-xs uppercase tracking-widest text-white/40 tabular-nums shrink-0 w-8 sm:w-10">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 text-lg sm:text-xl font-medium tracking-tight leading-snug">
                          {question}
                        </span>
                        <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-foreground/[0.12] text-white/70 transition-colors group-hover:border-foreground/30 group-hover:text-white">
                          <span className="flex items-center justify-center transition-transform group-open:rotate-45">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14" />
                              <path d="M12 5v14" />
                            </svg>
                          </span>
                        </span>
                      </summary>
                      <div className="flex gap-6 px-2 pb-6 sm:pb-8">
                        <span
                          className="w-8 sm:w-10 shrink-0"
                          aria-hidden="true"
                        />
                        <p className="max-w-[68ch] text-sm sm:text-base leading-relaxed text-white/65 pr-8 sm:pr-12">
                          {answer}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.section>

        </main>

        {/* FOOTER */}
        <motion.footer
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="relative z-10 bg-background text-white flex flex-col"
        >
          <div className="mx-auto w-full max-w-[1680px] px-6 sm:px-10 pb-24 sm:pb-32 pt-32 sm:pt-40 lg:pt-48">
            <motion.div
              variants={fadeUp}
              className="relative overflow-hidden rounded-3xl bg-foreground/[0.04]"
            >
              <div className="relative flex flex-col gap-12 sm:gap-16 p-8 sm:p-14 lg:p-20">
                <div className="text-[clamp(2.5rem,6vw,5.5rem)] font-medium leading-[0.95] tracking-tight max-w-4xl">
                  <p>Create presentations</p>
                  <p className="text-white/55">that actually move people.</p>
                </div>
                <div className="flex flex-col gap-3 sm:gap-4">
                  <a
                    href="#main-content"
                    onClick={(e) => scrollToSection(e, "#main-content")}
                    className="inline-flex items-center gap-3 text-lg sm:text-xl font-medium tracking-tight"
                  >
                    <span
                      aria-hidden="true"
                      className="block h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-lg"
                    >
                      <AppIconWithoutLink />
                    </span>
                    <span className="font-semibold">slides+</span>
                  </a>
                  <p className="text-white/55 max-w-xs leading-relaxed text-sm">
                    Build stunning slides with code, visual editor, or AI.
                    Collaboration built right in.
                  </p>
                </div>
                <div className="text-sm text-white/55">
                  <p>{t.copyright}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.footer>
      </div>
    </>
  );
}
