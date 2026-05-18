import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "../SEO";

function ArrowRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AnimatedButton({ children }: { children: React.ReactNode }) {
  return (
    <span className="group/cta inline-flex items-stretch gap-1">
      <span className="px-5 py-3 rounded-md bg-foreground text-background text-xs font-medium tracking-widest uppercase">{children}</span>
      <span className="relative inline-flex items-center justify-center rounded-md overflow-hidden px-3 py-3 bg-foreground text-background" aria-hidden="true">
        <span className="invisible" style={{ width: 16, height: 16 }} />
        <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover/cta:translate-x-full">
          <span className="absolute inset-0 flex items-center justify-center"><ArrowRight /></span>
          <span className="absolute inset-y-0 right-full w-full flex items-center justify-center"><ArrowRight /></span>
        </span>
      </span>
    </span>
  );
}

function DotsBg({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:36px_36px] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
    </div>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border border-foreground/[0.08] px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground/70 ${className}`}>
      {children}
    </span>
  );
}

function CornerDots() {
  return (
    <>
      {["left-0 top-0 border-l border-t group-hover:-left-1.5 group-hover:-top-1.5", "right-0 top-0 border-r border-t group-hover:-right-1.5 group-hover:-top-1.5", "bottom-0 left-0 border-b border-l group-hover:-bottom-1.5 group-hover:-left-1.5", "bottom-0 right-0 border-b border-r group-hover:-bottom-1.5 group-hover:-right-1.5"].map((pos) => (
        <span key={pos} className={`absolute h-[10px] w-[10px] border-accent-foreground/30 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:border-accent-foreground ${pos}`} aria-hidden="true" />
      ))}
    </>
  );
}

export default function AltLandingPage2() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;
    event.preventDefault();
    const target = document.querySelector(href);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <SEO
        title="Lumen — Build what matters, ship without limits."
        description="The all-in-one platform for product teams to design, deploy, and scale software products faster than ever. Plan, build, and ship from one workspace."
        canonicalUrl="https://slidesplus.com/altlanding2"
      />

      <div className="relative min-h-screen bg-background text-foreground font-sans antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background">
          Skip to main content
        </a>

        {/* NAVBAR */}
        <nav aria-label="Primary" className="fixed inset-x-0 top-0 z-50 pointer-events-none">
          <div className="mx-auto flex items-center justify-between px-6 py-4 sm:px-10 sm:py-6 max-w-[1680px]">
            <a href="#main-content" onClick={(e) => scrollToSection(e, "#main-content")} className="pointer-events-auto relative inline-flex items-center gap-3 text-xl font-medium tracking-tight rounded-lg text-white/90 hover:text-white">
              <span aria-hidden="true" className="rounded-full border-2" style={{ width: 32, height: 32, borderColor: "rgba(255,255,255,0.7)" }} />
              <span>Lumen</span>
            </a>
            <div className="pointer-events-auto">
              <div className="flex items-center gap-1 rounded-lg border border-neutral-900/[0.08] bg-white p-1.5 text-xs font-medium uppercase tracking-widest text-neutral-700">
                <a href="#product" onClick={(e) => scrollToSection(e, "#product")} className="hidden sm:inline-flex items-center px-4 py-2.5 rounded-md hover:bg-neutral-100 hover:text-neutral-900 transition-colors">Product</a>
                <a href="#solutions" onClick={(e) => scrollToSection(e, "#solutions")} className="hidden sm:inline-flex items-center px-4 py-2.5 rounded-md hover:bg-neutral-100 hover:text-neutral-900 transition-colors">Solutions</a>
                <a href="#pricing" onClick={(e) => scrollToSection(e, "#pricing")} className="hidden sm:inline-flex items-center px-4 py-2.5 rounded-md hover:bg-neutral-100 hover:text-neutral-900 transition-colors">Pricing</a>
                <a href="#get-started" onClick={(e) => scrollToSection(e, "#get-started")} className="inline-flex items-center px-4 py-2.5 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition-colors duration-200">Get Started</a>
                <button type="button" aria-label="Open menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(v => !v)} className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-neutral-100 text-neutral-900 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" /></svg>
                </button>
              </div>
            </div>
          </div>
          {mobileMenuOpen && (
            <div id="mobile-menu" className="pointer-events-auto mx-auto max-w-[1680px] px-6 sm:px-10">
              <div className="flex flex-col gap-2 rounded-lg border border-neutral-900/[0.08] bg-white p-4 text-sm font-medium">
                <a href="#product" onClick={(e) => scrollToSection(e, "#product")} className="px-4 py-2.5 rounded-md hover:bg-neutral-100 transition-colors">Product</a>
                <a href="#solutions" onClick={(e) => scrollToSection(e, "#solutions")} className="px-4 py-2.5 rounded-md hover:bg-neutral-100 transition-colors">Solutions</a>
                <a href="#pricing" onClick={(e) => scrollToSection(e, "#pricing")} className="px-4 py-2.5 rounded-md hover:bg-neutral-100 transition-colors">Pricing</a>
              </div>
            </div>
          )}
        </nav>

        <main id="main-content" className="relative z-10 flex-1 bg-background">
          {/* HERO */}
          <section className="relative w-full h-screen p-2.5">
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-3xl bg-[#3a1818]">
              <DotsBg className="rounded-3xl" />
              <div className="absolute inset-0 flex flex-col justify-between p-6 pt-40 sm:p-10 lg:p-14 xl:p-16 text-white pointer-events-none max-w-[1680px] mx-auto">
                <h1 className="max-w-[18ch] text-[clamp(2.75rem,7.75vw,7.75rem)] font-medium leading-[0.95] tracking-tight">
                  <span className="block">Build what matters,</span>
                  <span className="block">ship without limits.</span>
                </h1>
                <div className="flex items-end justify-between gap-8 flex-col sm:flex-row sm:items-end">
                  <p className="max-w-xl text-xl sm:text-2xl font-medium leading-snug tracking-tight text-white/90">
                    The all-in-one platform for modern teams to design, deploy, and scale software products faster than ever.
                  </p>
                  <button type="button" onClick={() => navigate("/signup")} className="group pointer-events-auto inline-flex items-stretch gap-1 cursor-pointer shrink-0">
                    <span className="px-5 py-3 rounded-md bg-white text-neutral-900 text-xs font-medium tracking-widest uppercase border border-neutral-900/[0.08]">Explore the Platform</span>
                    <span className="relative inline-flex items-center justify-center rounded-md overflow-hidden px-3 py-3 bg-accent text-accent-foreground" aria-hidden="true">
                      <span className="invisible" style={{ width: 16, height: 16 }} />
                      <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover:translate-x-full">
                        <span className="absolute inset-0 flex items-center justify-center"><ArrowRight /></span>
                        <span className="absolute inset-y-0 right-full w-full flex items-center justify-center"><ArrowRight /></span>
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* VALUE PROPOSITION */}
          <section className="relative py-24 sm:py-32" aria-label="Value proposition">
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <div className="flex items-end justify-between gap-8">
                <h2 className="max-w-[22ch] text-xl sm:text-2xl font-medium leading-[1.15] tracking-tight text-foreground/80">
                  A platform built for teams who&rsquo;d rather ship than orchestrate.
                </h2>
              </div>
              <div className="mt-16 sm:mt-20 space-y-16 sm:space-y-24">
                {[
                  {
                    num: "01", label: "The problem",
                    text: "Modern teams ship slower than they think. Tooling fragments, context evaporates, and momentum dies between handoffs."
                  },
                  {
                    num: "02", label: "The approach",
                    text: "Lumen unifies design, deployment, and observability into one system, so the work flows in a single, continuous direction."
                  },
                  {
                    num: "03", label: "The outcome",
                    text: "You stop managing tools and start compounding output. Every release sharper, every iteration faster, every decision clearer."
                  },
                ].map((item) => (
                  <div key={item.num} className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-8">
                    <div className="sm:col-span-3">
                      <SectionLabel>{item.num}<span className="mx-1.5 text-foreground/30">/</span>03</SectionLabel>
                      <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-foreground/40">{item.label}</p>
                    </div>
                    <p className="sm:col-span-9 text-2xl sm:text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[1.1] tracking-tight text-foreground/20">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* PRODUCT */}
          <section id="product" className="relative py-24 sm:py-32" aria-labelledby="product-heading">
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-x-10 sm:gap-y-6">
                <div className="sm:col-span-3 pt-2">
                  <SectionLabel>Our offer</SectionLabel>
                </div>
                <div className="sm:col-span-7 sm:col-start-6">
                  <h2 id="product-heading" className="text-balance text-3xl sm:text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight">
                    Everything your team needs to ship, that actually moves work forward.
                  </h2>
                  <p className="mt-8 max-w-[60ch] text-balance text-sm sm:text-base leading-relaxed text-foreground/65">
                    Lumen replaces the patchwork of trackers, docs, and chat with a single surface where work flows from intent to release. Workflows orchestrate the busywork, building blocks let your team extend the platform on its own terms, and an intelligence layer makes every decision easier than the last.
                  </p>
                  <div className="mt-10">
                    <a href="#pricing" onClick={(e) => scrollToSection(e, "#pricing")} className="group inline-flex items-stretch gap-1">
                      <span className="px-5 py-3 rounded-md bg-foreground text-background text-xs font-medium tracking-widest uppercase">Discover the platform</span>
                      <span className="relative inline-flex items-center justify-center rounded-md overflow-hidden px-3 py-3 bg-foreground text-background" aria-hidden="true">
                        <span className="invisible" style={{ width: 16, height: 16 }} />
                        <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover:translate-x-full">
                          <span className="absolute inset-0 flex items-center justify-center"><ArrowRight /></span>
                          <span className="absolute inset-y-0 right-full w-full flex items-center justify-center"><ArrowRight /></span>
                        </span>
                      </span>
                    </a>
                  </div>
                </div>
              </div>
              <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3">
                {[
                  { num: "01.", title: "Workflows", desc: "Compose flows from triggers and steps that move work forward without standups.", icon: "workflow" },
                  { num: "02.", title: "Building blocks", desc: "A library of typed primitives your team can extend without forking the platform.", icon: "blocks" },
                  { num: "03.", title: "Intelligence", desc: "Recommendations and insights surfaced inline, where the work actually happens.", icon: "intel" },
                ].map((item) => (
                  <article key={item.title} className="flex">
                    <div className="relative flex flex-1 flex-col justify-between min-h-[280px] sm:min-h-[380px] p-8 sm:p-12 bg-accent text-accent-foreground first:bg-accent [&:nth-child(2)]:bg-foreground/[0.08] [&:nth-child(2)]:text-foreground [&:nth-child(3)]:bg-foreground/[0.04] [&:nth-child(3)]:text-foreground">
                      <div className="flex items-start justify-between">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round" className="text-current opacity-70" aria-hidden="true">
                          {item.icon === "workflow" ? (
                            <>
                              <rect width="8" height="8" x="3" y="3" rx="2" /><path d="M7 11v4a2 2 0 0 0 2 2h4" /><rect width="8" height="8" x="13" y="13" rx="2" />
                            </>
                          ) : item.icon === "blocks" ? (
                            <>
                              <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" /><path d="m7 16.5-4.74-2.85" /><path d="m7 16.5 5-3" /><path d="M7 16.5v5.17" /><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" /><path d="m17 16.5-5-3" /><path d="m17 16.5 4.74-2.85" /><path d="M17 16.5v5.17" /><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" /><path d="M12 8 7.26 5.15" /><path d="m12 8 4.74-2.85" /><path d="M12 13.5V8" />
                            </>
                          ) : (
                            <>
                              <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" />
                            </>
                          )}
                        </svg>
                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-current opacity-55">{item.num}</span>
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-medium leading-tight tracking-tight">{item.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-current opacity-75">{item.desc}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* PILLARS */}
          <section className="relative py-24 sm:py-32" aria-labelledby="pillars-heading">
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-x-10 sm:gap-y-6">
                <div className="sm:col-span-3 pt-2">
                  <SectionLabel>The platform</SectionLabel>
                </div>
                <div className="sm:col-span-7 sm:col-start-6">
                  <h2 id="pillars-heading" className="text-balance text-3xl sm:text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight">
                    The Lumen platform is built on three working principles.
                  </h2>
                  <p className="mt-6 max-w-[60ch] text-balance text-lg sm:text-xl font-light leading-snug text-foreground/60">
                    Each one carries part of the workflow — turning the fragmented act of shipping software into a single, continuous motion.
                  </p>
                </div>
              </div>
              <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                {[
                  { num: "01 — focus", title: "Plan with intent", desc: "Replace scattered docs and threads with a single source of truth that turns goals into commits." },
                  { num: "02 — flow", title: "Build without friction", desc: "Branches, environments, and reviews stay in sync so the work moves at the speed of decisions." },
                  { num: "03 — fire", title: "Ship with confidence", desc: "Deploys, observability, and rollbacks live in one loop — so the team trusts every release." },
                ].map((item) => (
                  <article key={item.num} className="group relative flex">
                    <div className="relative flex flex-1 flex-col justify-between rounded-2xl p-8 min-h-[280px] sm:min-h-[360px] transition-colors duration-500 bg-accent text-accent-foreground first:bg-accent [&:nth-child(2)]:bg-foreground/[0.04] [&:nth-child(2)]:text-foreground [&:nth-child(3)]:bg-foreground/[0.04] [&:nth-child(3)]:text-foreground">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md transition-transform duration-500 group-hover:rotate-[-6deg] group-hover:scale-[1.05] bg-accent-foreground/10 text-accent-foreground [&:nth-child(2)>&]:bg-foreground/10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          {item.num.includes("focus") ? (
                            <><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /><circle cx="12" cy="12" r="10" /></>
                          ) : item.num.includes("flow") ? (
                            <><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" /><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" /><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" /></>
                          ) : (
                            <><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></>
                          )}
                        </svg>
                      </div>
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-current opacity-55">{item.num}</p>
                        <h3 className="mt-3 text-xl sm:text-2xl font-medium leading-tight tracking-tight">{item.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-current opacity-75">{item.desc}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* PARTNERS */}
          <section className="relative w-full bg-accent text-accent-foreground" aria-labelledby="partners-heading">
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10 py-20 sm:py-24">
              <SectionLabel>Our partners</SectionLabel>
              <div className="mt-6 h-px w-full bg-accent-foreground/15" />
              <div className="mt-12 sm:mt-16 grid grid-cols-12 gap-6 rounded-2xl bg-background p-3 text-foreground">
                <div className="col-span-12 sm:col-span-7 flex flex-col p-4 sm:p-7">
                  <h3 className="text-2xl sm:text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.05] tracking-tight">Northwind</h3>
                  <p className="mt-6 max-w-[42ch] text-balance text-sm sm:text-base leading-relaxed text-foreground/65">
                    Northwind has financed and partnered with platform-stage software companies since 2009, helping teams scale infrastructure and product in lockstep.
                  </p>
                  <a href="#" className="group mt-auto inline-flex items-center gap-3 self-start pt-8 sm:pt-12 font-mono text-xs uppercase tracking-[0.2em] text-foreground/80 hover:text-foreground transition-colors">
                    Visit website
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-foreground"><ArrowRight /></span>
                  </a>
                </div>
                <div className="col-span-12 sm:col-span-5 flex items-center justify-center rounded-xl bg-foreground min-h-[140px] sm:min-h-[180px] p-3">
                  <span className="text-2xl sm:text-[clamp(1.75rem,3.2vw,2.75rem)] leading-none text-background font-serif font-medium tracking-tight">Northwind</span>
                </div>
              </div>
              <div className="mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-x-6 sm:gap-x-12 gap-y-10 sm:gap-y-16">
                {["Northwind", "stripe/pay", "Halcyon", "ATLAS", "vector&co", "kindred", "Meridian", "FORGE/9", "lattice", "Quill", "OBSIDIAN", "tempo·"].map((name) => (
                  <div key={name} className="group relative flex aspect-[5/2] cursor-pointer items-center justify-center">
                    <CornerDots />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 origin-bottom scale-y-0 bg-accent-foreground/[0.08] transition-transform duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:scale-y-100" />
                    <span className="relative select-none px-3 text-center text-sm sm:text-[clamp(1rem,1.5vw,1.4rem)] leading-tight text-accent-foreground/85 transition-colors duration-300 group-hover:text-accent-foreground font-medium tracking-tight">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section id="pricing" className="relative py-24 sm:py-32" aria-labelledby="pricing-heading">
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-x-10 sm:gap-y-6">
                <div className="sm:col-span-3 pt-2">
                  <SectionLabel>Pricing</SectionLabel>
                </div>
                <div className="sm:col-span-7 sm:col-start-6">
                  <h2 id="pricing-heading" className="text-balance text-3xl sm:text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight">
                    Two plans. One simple promise, software that ships.
                  </h2>
                  <p className="mt-6 max-w-[60ch] text-balance text-lg sm:text-xl font-light leading-snug text-foreground/60">
                    Start with Pro for fast-moving product teams. Move to Enterprise when scale, security, or procurement enter the picture.
                  </p>
                </div>
              </div>
              <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Pro */}
                <article className="flex">
                  <div className="group relative flex flex-1 flex-col rounded-2xl p-8 sm:p-10 bg-foreground/[0.04] hover:bg-foreground/[0.06] transition-colors duration-500">
                    <h3 className="text-2xl sm:text-3xl font-medium leading-tight tracking-tight">Pro</h3>
                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-medium tracking-tight">$29</span>
                      <span className="text-sm text-foreground/55">/ seat / month</span>
                    </div>
                    <p className="mt-6 text-sm leading-relaxed text-foreground/60 max-w-[42ch]">For product teams shipping daily. Everything you need to plan, build, and ship from a single surface.</p>
                    <ul className="mt-10 space-y-4">
                      {["Unlimited projects & environments", "Real-time collaboration", "Branch previews & rollbacks", "GitHub, Slack, Linear integrations", "Standard support"].map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-foreground/85"><CheckIcon /><span className="leading-snug">{f}</span></li>
                      ))}
                    </ul>
                    <div className="mt-10 pt-2">
                      <button onClick={() => navigate("/signup")} className="group/cta inline-flex items-stretch gap-1 cursor-pointer">
                        <span className="px-5 py-3 rounded-md bg-foreground text-background text-xs font-medium tracking-widest uppercase">Start free trial</span>
                        <span className="relative inline-flex items-center justify-center rounded-md overflow-hidden px-3 py-3 bg-foreground text-background" aria-hidden="true">
                          <span className="invisible" style={{ width: 16, height: 16 }} />
                          <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover/cta:translate-x-full">
                            <span className="absolute inset-0 flex items-center justify-center"><ArrowRight /></span>
                            <span className="absolute inset-y-0 right-full w-full flex items-center justify-center"><ArrowRight /></span>
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
                {/* Enterprise */}
                <article className="flex">
                  <div className="group relative flex flex-1 flex-col rounded-2xl p-8 sm:p-10 bg-foreground/[0.04] hover:bg-foreground/[0.06] transition-colors duration-500">
                    <h3 className="text-2xl sm:text-3xl font-medium leading-tight tracking-tight">Enterprise</h3>
                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-medium tracking-tight">Custom</span>
                    </div>
                    <p className="mt-6 text-sm leading-relaxed text-foreground/60 max-w-[42ch]">For organizations with security, compliance, and scale requirements. Tailored to your delivery model.</p>
                    <ul className="mt-10 space-y-4">
                      {["Everything in Pro", "SSO, SCIM, audit logs", "SOC 2, HIPAA, custom DPA", "Dedicated infrastructure options", "Named CSM & 24/7 support"].map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-foreground/85"><CheckIcon /><span className="leading-snug">{f}</span></li>
                      ))}
                    </ul>
                    <div className="mt-10 pt-2">
                      <button onClick={() => navigate("/login")} className="group/cta inline-flex items-stretch gap-1 cursor-pointer">
                        <span className="px-5 py-3 rounded-md bg-foreground text-background text-xs font-medium tracking-widest uppercase">Contact sales</span>
                        <span className="relative inline-flex items-center justify-center rounded-md overflow-hidden px-3 py-3 bg-foreground text-background" aria-hidden="true">
                          <span className="invisible" style={{ width: 16, height: 16 }} />
                          <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover/cta:translate-x-full">
                            <span className="absolute inset-0 flex items-center justify-center"><ArrowRight /></span>
                            <span className="absolute inset-y-0 right-full w-full flex items-center justify-center"><ArrowRight /></span>
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="relative py-24 sm:py-32" aria-labelledby="faq-heading">
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-x-10 sm:gap-y-6">
                <div className="sm:col-span-3 pt-2">
                  <SectionLabel>FAQ</SectionLabel>
                </div>
                <div className="sm:col-span-7 sm:col-start-6">
                  <h2 id="faq-heading" className="text-balance text-3xl sm:text-[clamp(2rem,4.2vw,4rem)] font-medium leading-[0.85] tracking-tight">
                    The questions teams ask before switching to Lumen.
                  </h2>
                  <p className="mt-6 max-w-[60ch] text-balance text-lg sm:text-xl font-light leading-snug text-foreground/60">
                    Short answers to the things that come up in every procurement call. If you need more, our team replies in hours, not days.
                  </p>
                </div>
              </div>
              <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-12 gap-x-10">
                <div className="sm:col-span-10 sm:col-start-2">
                  {[
                    ["How does the free trial work?", "Every workspace starts on Pro for 14 days, no card required. You get the full feature set, unlimited projects, and real collaboration. When the trial ends you can downgrade, switch to Enterprise, or keep going on Pro."],
                    ["Can I bring my existing tools?", "Yes. Lumen connects to GitHub, GitLab, Slack, Linear, Jira, and Figma out of the box. Anything else, the public API and webhooks cover. Most teams are wired up in under an hour."],
                    ["What does pricing look like at scale?", "Pro stays at $29 per seat regardless of headcount. Enterprise pricing depends on your security model, support tier, and infrastructure footprint. We will quote a flat annual commitment, never a metered surprise."],
                    ["How is my data handled?", "Data is encrypted in transit and at rest, isolated per workspace, and stored in the region you pick at signup. Enterprise plans add SSO, SCIM, audit logs, custom DPAs, and SOC 2 Type II reports on request."],
                    ["Do you support self-hosting?", "Self-hosted deployments are available on Enterprise. You run Lumen inside your own VPC on AWS, GCP, or Azure, we handle upgrades through a managed control plane. Talk to sales for a reference architecture."],
                    ["What if I need to cancel?", "Cancel anytime from billing settings. You keep access through the end of the current period and can export every project, file, and asset as a single archive. No retention games."],
                  ].map(([q, a], i) => (
                    <details key={q} className="group border-t border-foreground/[0.08] last:border-b" open={i === 0}>
                      <summary className="flex cursor-pointer list-none items-center gap-6 px-2 py-6 sm:py-7 text-left transition-colors hover:bg-foreground/[0.03]">
                        <span className="font-mono text-xs uppercase tracking-widest text-foreground/40 tabular-nums shrink-0 w-8 sm:w-10">{String(i + 1).padStart(2, "0")}</span>
                        <span className="flex-1 text-lg sm:text-xl font-medium tracking-tight leading-snug">{q}</span>
                        <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-foreground/[0.12] text-foreground/70 transition-colors group-hover:border-foreground/30 group-hover:text-foreground">
                          <span className="flex items-center justify-center transition-transform group-open:rotate-45">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                          </span>
                        </span>
                      </summary>
                      <div className="flex gap-6 px-2 pb-6 sm:pb-8">
                        <span className="w-8 sm:w-10 shrink-0" aria-hidden="true" />
                        <p className="max-w-[68ch] text-sm sm:text-base leading-relaxed text-foreground/65 pr-8 sm:pr-12">{a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section id="get-started" className="relative" aria-labelledby="final-cta-heading">
            <div className="max-w-[1680px] mx-auto px-6 sm:px-10 pb-24 sm:pb-32">
              <div className="relative overflow-hidden rounded-3xl bg-[#3a1818] min-h-[360px] sm:min-h-[520px]">
                <DotsBg className="rounded-3xl" />
                <div className="relative h-full flex flex-col justify-between p-8 sm:p-14 min-h-[inherit] text-white">
                  <h2 id="final-cta-heading" className="max-w-[16ch] text-[clamp(2.5rem,6vw,5.5rem)] font-medium leading-[0.95] tracking-tight">
                    <span className="block">Ship the work,</span>
                    <span className="block">skip the waiting.</span>
                  </h2>
                  <div className="flex items-end justify-between gap-8 flex-col sm:flex-row sm:items-end mt-10">
                    <p className="max-w-xl text-xl sm:text-3xl font-regular tracking-tighter leading-snug text-white/75">
                      Spin up a workspace in under a minute. Pro is free for 14 days, no card, no calls, no friction.
                    </p>
                    <button type="button" onClick={() => navigate("/signup")} className="group inline-flex items-stretch gap-1 cursor-pointer shrink-0">
                      <span className="px-5 py-3 rounded-md bg-white text-neutral-900 text-xs font-medium tracking-widest uppercase border border-neutral-900/[0.08]">Get Lumen</span>
                      <span className="relative inline-flex items-center justify-center rounded-md overflow-hidden px-3 py-3 bg-white text-neutral-900" aria-hidden="true">
                        <span className="invisible" style={{ width: 16, height: 16 }} />
                        <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover:translate-x-full">
                          <span className="absolute inset-0 flex items-center justify-center"><ArrowRight /></span>
                          <span className="absolute inset-y-0 right-full w-full flex items-center justify-center"><ArrowRight /></span>
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="z-0 bg-background text-foreground flex flex-col">
          <div className="mx-auto w-full max-w-[1680px] px-6 sm:px-10 pt-20 sm:pt-24 lg:pt-32">
            <SectionLabel>Get in touch</SectionLabel>
            <div className="mt-6 text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-medium tracking-tighter leading-[0.95] max-w-5xl">
              <p className="block">Build with intent.</p>
              <p className="block text-foreground/55">Ship without limits.</p>
            </div>
            <div className="mt-8 sm:mt-12">
              <a href="mailto:hello@lumen.app" className="group inline-flex items-stretch gap-1">
                <span className="px-5 py-3 rounded-md bg-foreground text-background text-xs font-medium tracking-widest uppercase">hello@lumen.app</span>
                <span className="relative inline-flex items-center justify-center rounded-md overflow-hidden px-3 py-3 bg-foreground text-background" aria-hidden="true">
                  <span className="invisible" style={{ width: 16, height: 16 }} />
                  <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform group-hover:translate-x-full">
                    <span className="absolute inset-0 flex items-center justify-center"><ArrowRight /></span>
                    <span className="absolute inset-y-0 right-full w-full flex items-center justify-center"><ArrowRight /></span>
                  </span>
                </span>
              </a>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[1680px] px-6 sm:px-10 mt-20 sm:mt-24 lg:mt-32 py-12 sm:py-16 lg:py-20 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-8">
            <div className="col-span-2 sm:col-span-2 lg:col-span-4">
              <a href="#main-content" onClick={(e) => scrollToSection(e, "#main-content")} className="inline-flex items-center gap-3 text-xl font-medium tracking-tight">
                <span aria-hidden="true" className="h-8 w-8 rounded-full border-2 border-foreground/70" />
                Lumen
              </a>
              <p className="mt-4 text-foreground/55 max-w-xs leading-relaxed text-sm">The shared surface where teams design, deploy, and scale modern software — without the seams between tools.</p>
            </div>
            {[
              ["Product", ["Platform", "Workflows", "Integrations", "Pricing", "Changelog"]],
              ["Company", ["About", "Customers", "Careers", "Press", "Contact"]],
              ["Resources", ["Documentation", "API reference", "Status", "Security", "Trust center"]],
              ["Connect", ["X", "LinkedIn", "GitHub", "YouTube"]],
            ].map(([group, items]) => (
              <div key={group as string} className="col-span-1 lg:col-span-2">
                <h4 className="font-mono text-xs uppercase tracking-widest text-foreground/55 mb-5">{group as string}</h4>
                <ul className="space-y-3">
                  {(items as string[]).map((item) => (
                    <li key={item}>
                      <a href="#" className="text-foreground/85 hover:text-foreground transition-colors text-sm">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-auto">
            <div className="mx-auto w-full max-w-[1680px] px-6 sm:px-10 py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between text-sm text-foreground/55">
              <p>© 2026 Lumen Labs, Inc. All rights reserved.</p>
              <div className="flex items-center gap-6">
                {["Privacy", "Terms", "Cookies"].map((item) => (
                  <a key={item} href="#" className="hover:text-foreground transition-colors">{item}</a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
