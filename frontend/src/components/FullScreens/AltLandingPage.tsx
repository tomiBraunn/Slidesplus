import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "../SEO";
import AppIconWithoutLink from "../RegularComponents/MultiuseComponents/AppIconWithoutLink";

type Language = "en" | "es";

const content = {
  en: {
    seoTitle: "slides+ | Alternative Landing",
    seoDescription:
      "Create presentations with AI, visual editing, code control, and real-time collaboration.",
    skip: "Skip to main content",
    navItems: [
      ["Features", "#features"],
      ["Workflow", "#workflow"],
      ["Examples", "#examples"],
    ],
    login: "Log in",
    startCreating: "Start creating",
    startShort: "Start",
    home: "Home",
    heroTitle: "Presentations that move from idea to deck faster.",
    heroCta: "Get started",
    heroSecondary: "Explore features",
    heroCopy:
      "Slides+ combines AI generation, visual editing, code-level control, and sharing so your deck can grow with the way you work.",
    stats: ["AI Generator", "Live Preview", "Team Sharing"],
    modeLabel: "Mode",
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
    examplesIntroTitle:
      "founders, students, designers, teachers, and product teams.",
    examplesIntroPrefix: "Built for",
    examplesIntroCopy:
      "Use the same workspace for quick pitch decks, project updates, interactive lessons, demos, and polished client work.",
    workflows: [
      ["AI assisted", "Prompt to deck"],
      ["Visual editor", "Design controls"],
      ["Code mode", "HTML and React"],
      ["Live preview", "Instant feedback"],
      ["Sharing", "Team access"],
    ],
    showcaseTitle: "Decks you can build with Slides+",
    showcaseCopy:
      "A quick gallery of presentation formats that fit naturally inside the app.",
    showcase: [
      ["Pitch deck", "Startup funding"],
      ["Product update", "Weekly team sync"],
      ["Class project", "Interactive lesson"],
      ["Portfolio", "Creative case study"],
      ["Report", "Executive summary"],
      ["Workshop", "Facilitation deck"],
      ["Demo day", "Product launch"],
    ],
    precisionTitle: (
      <>
        Use AI,
        <br />
        edit visually,
        <br />
        <span className="text-muted-foreground">finish with precision</span>
      </>
    ),
    precisionCopy:
      "Slides+ is built for people who want speed without giving up control.",
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
    bottomCta:
      "Create your next presentation without starting from a blank slide.",
    bottomButton: "Start with Slides+",
    backToTop: "Back to top ^",
    footerGroups: ["slides+", "Create", "Account"],
    footerItems: ["Home", "Features", "Workflow", "Examples"],
    copyright: "2026 Slides+. All rights reserved.",
  },
  es: {
    seoTitle: "slides+ | Landing alternativa",
    seoDescription:
      "Crea presentaciones con IA, edicion visual, control por codigo y colaboracion en tiempo real.",
    skip: "Saltar al contenido principal",
    navItems: [
      ["Funciones", "#features"],
      ["Flujo", "#workflow"],
      ["Ejemplos", "#examples"],
    ],
    login: "Iniciar sesion",
    startCreating: "Empezar a crear",
    startShort: "Empezar",
    home: "Inicio",
    heroTitle: "Presentaciones que pasan de idea a deck mas rapido.",
    heroCta: "Empezar",
    heroSecondary: "Ver funciones",
    heroCopy:
      "Slides+ combina generacion con IA, edicion visual, control por codigo y compartir proyectos para que tu deck crezca con tu forma de trabajar.",
    stats: ["IA Generador", "Vista Previa", "Equipo Compartir"],
    modeLabel: "Modo",
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
    examplesIntroTitle:
      "founders, estudiantes, disenadores, docentes y equipos de producto.",
    examplesIntroPrefix: "Hecho para",
    examplesIntroCopy:
      "Usa el mismo workspace para pitch decks, updates de producto, clases interactivas, demos y trabajos para clientes.",
    workflows: [
      ["IA asistida", "Prompt a deck"],
      ["Editor visual", "Controles de diseno"],
      ["Modo codigo", "HTML y React"],
      ["Vista previa", "Feedback instantaneo"],
      ["Compartir", "Acceso del equipo"],
    ],
    showcaseTitle: "Decks que puedes crear con Slides+",
    showcaseCopy:
      "Una galeria rapida de formatos de presentacion que encajan naturalmente dentro de la app.",
    showcase: [
      ["Pitch deck", "Ronda de inversion"],
      ["Update de producto", "Sync semanal"],
      ["Proyecto de clase", "Leccion interactiva"],
      ["Portfolio", "Caso creativo"],
      ["Reporte", "Resumen ejecutivo"],
      ["Workshop", "Deck de facilitacion"],
      ["Demo day", "Lanzamiento"],
    ],
    precisionTitle: (
      <>
        Usa IA,
        <br />
        edita visualmente,
        <br />
        <span className="text-muted-foreground">termina con precision</span>
      </>
    ),
    precisionCopy:
      "Slides+ esta hecho para quienes quieren velocidad sin perder control.",
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
    bottomCta:
      "Crea tu proxima presentacion sin empezar desde una slide en blanco.",
    bottomButton: "Empezar con Slides+",
    backToTop: "Volver arriba ^",
    footerGroups: ["slides+", "Crear", "Cuenta"],
    footerItems: ["Inicio", "Funciones", "Flujo", "Ejemplos"],
    copyright: "2026 Slides+. Todos los derechos reservados.",
  },
} satisfies Record<
  Language,
  {
    seoTitle: string;
    seoDescription: string;
    skip: string;
    navItems: string[][];
    login: string;
    startCreating: string;
    startShort: string;
    home: string;
    heroTitle: string;
    heroCta: string;
    heroSecondary: string;
    heroCopy: string;
    stats: string[];
    modeLabel: string;
    featuresTitle: string;
    features: { title: string; copy: string }[];
    workflowTitle: string;
    steps: string[][];
    openEditor: string;
    examplesIntroTitle: string;
    examplesIntroPrefix: string;
    examplesIntroCopy: string;
    workflows: string[][];
    showcaseTitle: string;
    showcaseCopy: string;
    showcase: string[][];
    precisionTitle: ReactNode;
    precisionCopy: string;
    faqTitle: string;
    faqs: string[][];
    bottomCta: string;
    bottomButton: string;
    backToTop: string;
    footerGroups: string[];
    footerItems: string[];
    copyright: string;
  }
>;

function ArrowRight() {
  return <span aria-hidden="true">-&gt;</span>;
}

function SectionCorner() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-[7px] w-[7px] -translate-x-1/2 translate-y-1/2 border border-border bg-background"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 z-10 h-[7px] w-[7px] translate-x-1/2 translate-y-1/2 border border-border bg-background"
      />
    </>
  );
}

function GrainientBackground() {
  return (
    <div className="grainient-bg pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="grainient-noise absolute inset-0" />
      <div className="absolute inset-0 bg-background/20" />
    </div>
  );
}

function AsciiText({
  text,
  enableWaves = true,
  asciiFontSize = 12,
  textFontSize = 200,
  planeBaseHeight = 8,
  textColor = "#fdf9f3",
}: {
  text: string;
  enableWaves?: boolean;
  asciiFontSize?: number;
  textFontSize?: number;
  planeBaseHeight?: number;
  textColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext("2d");
    const sampleCanvas = document.createElement("canvas");
    const sampleCtx = sampleCanvas.getContext("2d");
    if (!ctx || !sampleCtx) return;

    const chars = "slides+/#@&%*+=-:.";
    let width = 0;
    let height = 0;
    let animationFrame = 0;

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sampleCanvas.width = Math.floor(width);
      sampleCanvas.height = Math.floor(height);
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      sampleCtx.clearRect(0, 0, width, height);

      const fontSize = Math.min(textFontSize, width / 4.8, height * 0.38);
      const font = `800 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
      sampleCtx.font = font;
      sampleCtx.textAlign = "center";
      sampleCtx.textBaseline = "middle";
      sampleCtx.fillStyle = "#fff";
      sampleCtx.fillText(text, width / 2, height / 2);

      ctx.fillStyle = textColor;
      ctx.shadowColor = textColor;
      ctx.shadowBlur = 8;
      ctx.font =
        `700 ${asciiFontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const scale = Math.max(0.75, planeBaseHeight / 8);
      const cell = Math.max(6, asciiFontSize * 0.85 * scale);
      for (let y = cell; y < height; y += cell) {
        for (let x = cell; x < width; x += cell) {
          const alpha = sampleCtx.getImageData(x, y, 1, 1).data[3];
          if (alpha < 30) continue;

          const wave = enableWaves
            ? Math.sin(x * 0.035 + y * 0.025 + time * 0.0025)
            : 0;
          const charIndex = Math.abs(
            Math.floor((x + y + time * 0.04 + wave * 8) % chars.length),
          );
          const opacity = 0.36 + (alpha / 255) * 0.58 + wave * 0.06;
          ctx.globalAlpha = Math.max(0.25, Math.min(1, opacity));
          ctx.fillText(chars[charIndex], x, y);
        }
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [text, enableWaves, asciiFontSize, textFontSize, planeBaseHeight, textColor]);

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 z-10 flex items-center justify-center"
    >
      <canvas ref={canvasRef} className="h-full w-full" aria-label={text} />
    </div>
  );
}

export default function AltLandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const t = content[language];

  const scrollToSection = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (!href.startsWith("#")) return;
    event.preventDefault();
    const target = document.querySelector(href);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
    setMenuOpen(false);
  };

  useEffect(() => {
    document.documentElement.classList.add("alt-landing-scroll");

    return () => {
      document.documentElement.classList.remove("alt-landing-scroll");
    };
  }, []);

  return (
    <>
      <SEO
        title={t.seoTitle}
        description={t.seoDescription}
        canonicalUrl="https://slidesplus.com/altlanding"
      />

      <div className="alt-landing dark min-h-screen scroll-smooth text-foreground w-full h-full">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          {t.skip}
        </a>

        <div className="mx-auto flex min-h-screen w-[calc(100%-1.5rem)] max-w-[1440px] flex-col border-x border-border sm:w-[calc(100%-2.5rem)] lg:w-[calc(100%-3rem)]">
          <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
              <a
                className="inline-flex items-center gap-2 rounded-sm font-semibold"
                href="#main-content"
                onClick={(event) => scrollToSection(event, "#main-content")}
              >
                <span
                  className="block h-10 w-10 overflow-hidden"
                  aria-hidden="true"
                >
                  <AppIconWithoutLink />
                </span>
              </a>

              <nav
                className="hidden rounded-full bg-muted px-2 py-1.5 lg:flex lg:items-center lg:gap-1"
                aria-label="Primary navigation"
              >
                {t.navItems.map(([label, href]) => (
                  <a
                    key={label}
                    className="rounded-full px-4 py-1.5 text-sm font-medium hover:text-muted-foreground"
                    href={href}
                    onClick={(event) => scrollToSection(event, href)}
                  >
                    {label}
                  </a>
                ))}
              </nav>

              <div className="hidden items-center gap-4 lg:flex">
                <div
                  className="inline-flex h-9 items-center rounded-full bg-muted p-1"
                  aria-label="Language switch"
                >
                  {(["en", "es"] as Language[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${language === option ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => setLanguage(option)}
                      aria-pressed={language === option}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button
                  className="rounded-full px-2 py-1.5 text-sm font-medium hover:text-muted-foreground"
                  onClick={() => navigate("/login")}
                >
                  {t.login}
                </button>
                <button
                  className="rounded-full bg-muted px-5 py-2.5 text-sm font-medium hover:bg-border"
                  onClick={() => navigate("/signup")}
                >
                  {t.startCreating}
                </button>
              </div>

              <div className="ml-auto flex items-center gap-2 lg:hidden">
                <div
                  className="inline-flex h-9 items-center rounded-full bg-muted p-1"
                  aria-label="Language switch"
                >
                  {(["en", "es"] as Language[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`rounded-full px-2.5 py-1.5 text-xs font-semibold uppercase transition-colors ${language === option ? "bg-foreground text-background" : "text-muted-foreground"}`}
                      onClick={() => setLanguage(option)}
                      aria-pressed={language === option}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button
                  className="rounded-full bg-muted px-4 py-2 text-sm font-medium hover:bg-border"
                  onClick={() => navigate("/signup")}
                >
                  {t.startShort}
                </button>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted"
                  aria-label="Open navigation menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((value) => !value)}
                >
                  <span className="block h-px w-5 bg-foreground shadow-[0_-6px_0_var(--foreground),0_6px_0_var(--foreground)]" />
                </button>
              </div>
            </div>

            {menuOpen && (
              <nav
                id="mobile-navigation"
                className="border-t border-border px-4 py-10 lg:hidden"
                aria-label="Mobile navigation"
              >
                <a
                  className="block rounded-lg py-2 text-4xl tracking-tighter hover:text-muted-foreground"
                  href="#main-content"
                  onClick={(event) => scrollToSection(event, "#main-content")}
                >
                  {t.home}
                </a>
                {t.navItems.map(([label, href]) => (
                  <a
                    key={label}
                    className="block rounded-lg py-2 text-4xl tracking-tighter hover:text-muted-foreground"
                    href={href}
                    onClick={(event) => scrollToSection(event, href)}
                  >
                    {label}
                  </a>
                ))}
              </nav>
            )}
          </header>

          <main id="main-content" className="flex-1">
            <section className="relative border-b border-border">
              <div className="relative grid grid-cols-1 overflow-hidden lg:grid-cols-2">
                <GrainientBackground />
                <div className="relative z-10 flex min-h-[520px] flex-col justify-center px-6 py-16 sm:px-10 lg:min-h-[640px] lg:border-r lg:border-border lg:px-14">
                  <h1 className="max-w-4xl text-4xl font-medium leading-[1.05] tracking-tighter sm:text-5xl lg:text-[4rem] xl:text-[5.5rem]">
                    {t.heroTitle}
                  </h1>
                  <div className="mt-10 flex flex-wrap items-center gap-6">
                    <button
                      onClick={() => navigate("/signup")}
                      className="rounded-full bg-foreground px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-background hover:opacity-90"
                    >
                      {t.heroCta}
                    </button>
                    <a
                      href="#features"
                      onClick={(event) => scrollToSection(event, "#features")}
                      className="inline-flex items-center gap-2 rounded-full px-2 py-3 text-xs font-semibold uppercase tracking-[0.12em] hover:text-muted-foreground"
                    >
                      {t.heroSecondary} <ArrowRight />
                    </a>
                  </div>
                </div>
                <div className="relative z-10 min-h-80 overflow-hidden lg:min-h-[640px]">
                  <AsciiText
                    text="slides plus"
                    enableWaves
                    asciiFontSize={12}
                    textFontSize={200}
                    planeBaseHeight={8}
                    textColor="#fdf9f3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 border-t border-border lg:grid-cols-2">
                <div className="border-b border-border px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-14">
                  <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                    {t.heroCopy}
                  </p>
                </div>
                <div className="grid grid-cols-3 px-6 py-10 sm:px-10 lg:px-14">
                  {t.stats.map((stat) => {
                    const [value, ...label] = stat.split(" ");
                    return (
                      <div key={stat}>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground sm:text-sm">
                          {label.join(" ") || t.modeLabel}
                        </p>
                        <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                          {value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <SectionCorner />
            </section>

            <section
              id="features"
              className="relative scroll-mt-24 border-b border-border p-6 sm:p-10 lg:p-14"
            >
              <h2 className="text-2xl font-semibold leading-[1.1] tracking-tight sm:text-3xl lg:text-[2.5rem]">
                {t.featuresTitle}
              </h2>
              <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
                {t.features.map((feature) => (
                  <article
                    key={feature.title}
                    className="group flex min-h-[260px] flex-col justify-between rounded-2xl bg-muted p-6 sm:p-8"
                  >
                    <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                      {feature.title}{" "}
                      <span className="inline-block transition-transform group-hover:translate-x-1">
                        -&gt;
                      </span>
                    </h3>
                    <p className="mt-12 max-w-[28ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {feature.copy}
                    </p>
                  </article>
                ))}
              </div>
              <SectionCorner />
            </section>

            <section
              id="workflow"
              className="relative scroll-mt-24 border-b border-border"
            >
              <div className="px-6 pt-6 sm:px-10 sm:pt-10 lg:px-14 lg:pt-14">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2.5rem]">
                  {t.workflowTitle}
                </h2>
              </div>
              <div className="mt-12 border-t border-border">
                {t.steps.map(([title, copy], index) => (
                  <div
                    key={title}
                    className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 border-b border-border px-6 py-6 sm:grid-cols-[auto_minmax(0,18rem)_minmax(0,1fr)] sm:gap-x-10 sm:px-10 lg:px-14"
                  >
                    <div className="row-span-2 grid h-10 w-10 place-items-center rounded-md border border-border font-mono text-sm sm:row-span-1">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                      {title}
                    </h3>
                    <p className="col-start-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:col-start-3 sm:text-base">
                      {copy}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6 pt-10 sm:px-10 lg:px-14">
                <button
                  onClick={() => navigate("/home")}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-background hover:opacity-90"
                >
                  {t.openEditor} <ArrowRight />
                </button>
              </div>
              <SectionCorner />
            </section>

            <section
              id="examples"
              className="relative scroll-mt-24 border-b border-border p-6 sm:p-10 lg:p-14"
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                <article className="flex min-h-[360px] flex-col justify-between rounded-2xl border border-border bg-background p-6 sm:p-8 lg:min-h-[480px]">
                  <h2 className="max-w-md text-2xl font-semibold leading-[1.15] tracking-tight sm:text-3xl">
                    <span className="text-muted-foreground">
                      {t.examplesIntroPrefix}
                    </span>{" "}
                    {t.examplesIntroTitle}
                  </h2>
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t.examplesIntroCopy}
                  </p>
                </article>
                <div className="relative min-h-[360px] overflow-hidden rounded-2xl bg-muted lg:min-h-[480px]">
                  <div className="absolute inset-0 grid grid-cols-2 place-items-center gap-4 px-16">
                    {[0, 1].map((column) => (
                      <div
                        key={column}
                        className={`flex flex-col gap-4 ${column === 0 ? "animate-[marquee-up_18s_linear_infinite]" : "animate-[marquee-down_22s_linear_infinite]"}`}
                      >
                        {t.workflows
                          .concat(t.workflows)
                          .map(([line1, line2], index) => (
                            <span
                              key={`${line1}-${index}`}
                              className="flex h-24 w-28 shrink-0 flex-col justify-center rounded-2xl bg-background px-4 text-sm shadow-sm"
                            >
                              <strong className="font-semibold">{line1}</strong>
                              <span className="mt-1 text-xs text-muted-foreground">
                                {line2}
                              </span>
                            </span>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <SectionCorner />
            </section>

            <section className="relative border-b border-border p-6 sm:p-10 lg:p-14">
              <h2 className="max-w-2xl text-2xl font-medium leading-[1.05] tracking-tighter sm:text-3xl lg:text-[2.5rem]">
                {t.showcaseTitle}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t.showcaseCopy}
              </p>
              <div className="mt-10 flex gap-6 overflow-hidden">
                {t.showcase.map(([name, type]) => (
                  <article
                    key={name}
                    className="flex aspect-[5/6] w-[300px] shrink-0 flex-col justify-end rounded-2xl border border-border bg-background p-5 sm:w-[360px]"
                  >
                    <h3 className="text-base font-medium tracking-tight">
                      {name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{type}</p>
                  </article>
                ))}
              </div>
              <SectionCorner />
            </section>

            <section className="relative border-b border-border">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="flex flex-col justify-center px-6 py-16 sm:px-10 lg:border-r lg:border-border lg:px-14">
                  <h2 className="text-4xl font-medium leading-[1.05] tracking-tighter sm:text-5xl lg:text-[3.5rem]">
                    {t.precisionTitle}
                  </h2>
                  <p className="mt-10 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t.precisionCopy}
                  </p>
                </div>
                <div className="overflow-hidden">
                  <div className="flex snap-x gap-4 overflow-x-auto px-6 py-16 sm:gap-6 sm:px-10 lg:px-14">
                    {t.workflows.map(([line1, line2], index) => (
                      <button
                        key={line1}
                        type="button"
                        className="group flex aspect-[3/4] w-[280px] shrink-0 snap-center flex-col justify-between rounded-2xl bg-muted p-6 text-left sm:w-[320px] lg:w-[360px]"
                      >
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-background/60 font-mono">
                          {index + 1}
                        </div>
                        <div className="space-y-5">
                          <h3 className="whitespace-pre-line text-xl font-medium leading-tight tracking-tight sm:text-2xl">
                            {line1}
                            {"\n"}
                            {line2}
                          </h3>
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-background/60 text-xl transition-transform group-hover:rotate-90">
                            +
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <SectionCorner />
            </section>

            <section className="relative border-b border-border p-6 sm:p-10 lg:p-14">
              <h2 className="text-3xl font-medium leading-[1.05] tracking-tighter sm:text-4xl lg:text-[3.5rem]">
                {t.faqTitle}
              </h2>
              <div className="mt-6 border-t border-border sm:mt-10">
                {t.faqs.map(([question, answer], index) => (
                  <details
                    key={question}
                    className="group border-b border-border py-6"
                    open={index === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium tracking-tight sm:text-lg">
                      {question}
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-muted transition-transform group-open:rotate-180">
                        v
                      </span>
                    </summary>
                    <p className="max-w-3xl pt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
              <SectionCorner />
            </section>
          </main>

          <section className="bg-background p-6 sm:p-10 lg:p-14">
            <div className="overflow-hidden rounded-3xl border border-border bg-neutral-950 text-neutral-50">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,420px)]">
                <div className="flex min-h-80 flex-col justify-center px-8 py-12 sm:px-12 lg:border-r lg:border-neutral-800 lg:px-14">
                  <h2 className="max-w-md text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl lg:text-[2.5rem]">
                    {t.bottomCta}
                  </h2>
                  <button
                    onClick={() => navigate("/signup")}
                    className="mt-10 inline-flex items-center gap-2 rounded-full bg-neutral-50 px-5 py-3.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-neutral-950"
                  >
                    {t.bottomButton} <ArrowRight />
                  </button>
                </div>
                <div className="relative min-h-80 p-2 lg:min-h-90">
                  <div className="relative h-full min-h-[320px] overflow-hidden rounded-2xl border border-neutral-800 bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:36px_36px]" />
                </div>
              </div>
            </div>
          </section>

          <footer className="bg-background p-3 sm:p-4 lg:p-6">
            <div className="rounded-3xl bg-neutral-950 px-5 py-8 text-neutral-100 sm:px-8 lg:px-10">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-[auto_1fr_auto] lg:gap-16">
                <a
                  href="#main-content"
                  onClick={(event) => scrollToSection(event, "#main-content")}
                  className="rounded-sm text-sm hover:text-white"
                >
                  {t.backToTop}
                </a>
                <nav
                  aria-label="Footer"
                  className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3"
                >
                  {t.footerGroups.map((group) => (
                    <div key={group}>
                      <p className="mb-5 text-sm text-neutral-500">{group}</p>
                      <ul className="space-y-3">
                        {t.footerItems.map((item, index) => (
                          <li key={item}>
                            <a
                              href={
                                index === 0
                                  ? "#main-content"
                                  : t.navItems[index - 1]?.[1] ||
                                    "#main-content"
                              }
                              onClick={(event) =>
                                scrollToSection(
                                  event,
                                  index === 0
                                    ? "#main-content"
                                    : t.navItems[index - 1]?.[1] ||
                                        "#main-content",
                                )
                              }
                              className="rounded-sm text-sm hover:text-white"
                            >
                              {item}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>
                <button
                  onClick={() => navigate("/login")}
                  className="h-fit rounded-full border border-neutral-700 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
                >
                  {t.login} <ArrowRight />
                </button>
              </div>
              <div className="mt-16 flex flex-col items-start justify-between gap-6 pt-8 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="block h-10 w-10 overflow-hidden">
                    <AppIconWithoutLink />
                  </span>
                  <span className="text-lg font-semibold tracking-tight">
                    slides+
                  </span>
                </div>
                <p className="text-sm text-neutral-500">{t.copyright}</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
