// @ts-nocheck
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TextType from "../ThirdPartyComponents/TextType/TextType";
import RotatingText from "../ThirdPartyComponents/TextType/RotatingText";
import LogoLoop from "../ThirdPartyComponents/TextType/LogoLoop";
import homePageImage from "../../assets/homePage.png";

import {
  SiReact,
  SiTypescript,
  SiTailwindcss,
  SiVercel,
  SiSupabase,
  SiGithub,
  SiGoogle,
} from "react-icons/si";

import React, { useEffect, useState, useRef } from "react";

const menuItems = [
  { label: "Home", ariaLabel: "Go to home section", link: "#hero" },
  { label: "Features", ariaLabel: "Go to features section", link: "#features" },
  { label: "Collab", ariaLabel: "Go to AI section", link: "#ai" },
  { label: "UI Preview", ariaLabel: "Go to design section", link: "#design" },
  { label: "Get Started", ariaLabel: "Go to CTA section", link: "#start" },
];

const techLogos = [
  { node: <SiReact />, title: "React", href: "https://react.dev" },
  { node: <SiTypescript />, title: "TypeScript", href: "https://www.typescriptlang.org" },
  { node: <SiTailwindcss />, title: "Tailwind", href: "https://tailwindcss.com" },
  { node: <SiVercel />, title: "Vercel", href: "https://vercel.com" },
  { node: <SiSupabase />, title: "Supabase", href: "https://supabase.com" },
  { node: <SiGithub />, title: "GitHub", href: "https://github.com" },
  { node: <SiGoogle />, title: "Gemini (by Google)", href: "https://gemini.google.com" },
];

const GradualBlur: React.FC<{
  position?: "top" | "bottom";
  maxBlur?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ position = "bottom", maxBlur = 16, className = "", style = {} }) => {
  const [blur, setBlur] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const scrollFraction = Math.min(scrollTop / (docHeight * 0.5), 1);
      setBlur(scrollFraction * maxBlur);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [maxBlur]);

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        [position]: 0,
        left: 0,
        width: "100%",
        height: "6rem",
        pointerEvents: "none",
        backdropFilter: `blur(${blur}px)`,
        transition: "backdrop-filter 0.1s ease-out",
        zIndex: 50,
        ...style,
      }}
    />
  );
};

export default function LandingPage() {
  const navigate = useNavigate();
  const menuRef = useRef<any>(null);

  const sectionReveal = {
    hidden: { opacity: 0, y: 80 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, ease: "easeOut" } },
  };

  const gradientButtonStyle = {
    background: 'linear-gradient(to right, #249931, #7182FF)',
    color: 'white',
  };

  useEffect(() => {
    const handleMenuClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const menuItem = target.closest('.sm-panel-item');
      
      if (menuItem) {
        e.preventDefault();
        const link = menuItem.getAttribute('href');
        const toggleBtn = document.querySelector('.sm-toggle') as HTMLElement;
        if (toggleBtn) {
          toggleBtn.click();
        }

        if (link) {
          setTimeout(() => {
            const element = document.querySelector(link);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }, 300);
        }
      }
    };

    document.addEventListener('click', handleMenuClick);
    
    return () => {
      document.removeEventListener('click', handleMenuClick);
    };
  }, []);

  return (
    <>
      <style>{`
        /* Menu Styles - Desktop mantiene ancho fijo, Mobile/Tablet fullscreen */
        
        /* CRITICAL: Asegurar que el scope no bloquee */
        .sm-scope {
          pointer-events: none !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 60 !important;
        }
        
        /* Posicionar el botón del menú DENTRO del navbar */
        .sm-scope .staggered-menu-header {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: auto !important;
          z-index: 100 !important;
          padding: 0 !important;
          margin: 0 !important;
          background: transparent !important;
          pointer-events: none !important;
        }

        .sm-scope .sm-logo {
          display: none !important;
        }

        .sm-scope .sm-toggle {
          pointer-events: auto !important;
          position: fixed !important;
          top: 1rem !important;
          left: 1.5rem !important;
          z-index: 100 !important;
        }

        @media (min-width: 640px) {
          .sm-scope .sm-toggle {
            top: 1.25rem !important;
            left: 2rem !important;
          }
        }

        @media (min-width: 768px) {
          .sm-scope .sm-toggle {
            top: 1.5rem !important;
            left: 2.5rem !important;
          }
        }

        /* El wrapper del menú no debe bloquear cuando está cerrado */
        .sm-scope .staggered-menu-wrapper {
          pointer-events: none !important;
        }

        /* Solo cuando el menú está abierto, el panel es interactivo */
        .sm-scope .staggered-menu-wrapper[data-open] .staggered-menu-panel {
          pointer-events: auto !important;
        }

        .sm-scope .staggered-menu-panel {
          background: transparent !important;
        }

        .sm-scope .sm-panel-item {
          color: #fff !important;
          cursor: pointer !important;
          pointer-events: auto !important;
          margin-bottom: 0.5rem !important;
        }

        .sm-scope .sm-panel-list {
          gap: 0.5rem !important;
        }

        .sm-scope .sm-panel-itemLabel {
          pointer-events: auto !important;
        }

        .sm-scope .sm-panel-item:hover {
          color: var(--sm-accent, white) !important;
        }

        .sm-scope .staggered-menu-wrapper[data-open] .sm-toggle {
          color: #fff !important;
        }

        .sm-scope .sm-prelayer:last-child {
          background: linear-gradient(135deg, #B19EEF, #5227FF) !important;
        }

        .sm-scope .sm-prelayers {
          pointer-events: none !important;
        }

        /* Fullscreen solo en tablets y móviles (menos de 1024px) */
        @media (max-width: 1024px) {
          .sm-scope .staggered-menu-panel {
            width: 100vw !important;
            left: 0 !important;
            right: 0 !important;
          }

          .sm-scope .sm-prelayers {
            width: 100vw !important;
            left: 0 !important;
            right: 0 !important;
          }

          .sm-scope .sm-panel-inner {
            align-items: flex-start;
            justify-content: center;
            padding-left: 3rem;
            padding-right: 3rem;
          }

          .sm-scope .sm-panel-item {
            font-size: clamp(2.5rem, 8vw, 5rem) !important;
          }
        }

        /* Mobile específico (menos de 640px) */
        @media (max-width: 640px) {
          .sm-scope .sm-toggle {
            top: 0.75rem !important;
            left: 1rem !important;
          }

          .sm-scope .sm-panel-inner {
            padding-left: 2rem;
            padding-right: 2rem;
          }
          
          .sm-scope .sm-panel-item {
            font-size: clamp(2rem, 10vw, 3.5rem) !important;
          }
        }
      `}</style>

      <div className="min-h-screen w-full bg-[#121212] text-white overflow-x-hidden cursor-default relative">
        <header className="sticky top-0 w-full px-3 sm:px-4 md:px-6 py-3 md:py-4 flex justify-between items-center z-50 bg-[#121212]/80 backdrop-blur-md">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-wide text-white">Slides+</h1>
          <div className="flex gap-2 sm:gap-3 md:gap-4">
            <button
              onClick={() => navigate("/login")}
              className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2 rounded-md text-xs sm:text-sm md:text-base text-white border border-[#7182FF]/60 hover:bg-[#7182FF]/10 transition cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2 rounded-md text-xs sm:text-sm md:text-base text-white border border-[#7182FF]/60 hover:bg-[#7182FF]/10 transition cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </header>

        {/* ---- HERO ---- */}
        <section
          id="hero"
          className="min-h-screen h-auto py-20 sm:py-24 md:py-0 md:h-screen flex flex-col justify-center items-center text-center relative overflow-hidden px-4 sm:px-6 md:px-8"
        >
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold mb-4 z-10 leading-tight max-w-4xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <TextType
              text={["Boost your presentations with S+"]}
              typingSpeed={67}
              pauseDuration={1000}
              showCursor={true}
              cursorCharacter=""
              loop={true}
            />
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="z-10 mt-2 sm:mt-3 md:mt-4"
          >
            <RotatingText
              texts={["Smarter", "Faster", "Easier", "With AI"]}
              mainClassName="px-3 py-1 sm:px-4 sm:py-1.5 md:px-5 md:py-2 text-base sm:text-lg md:text-xl lg:text-2xl bg-white/10 text-[#7182FF] font-semibold rounded-lg backdrop-blur-md"
              staggerFrom="last"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.03}
              splitLevelClassName="overflow-hidden"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={1900}
              loop={true}
            />
          </motion.div>

          <motion.p
            className="text-white/70 text-xs sm:text-sm md:text-base lg:text-lg max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl z-10 mt-4 sm:mt-5 md:mt-6 px-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            Everything for you to make your work and experience better.
          </motion.p>

          <motion.button
            onClick={() => navigate("/home")}
            style={gradientButtonStyle}
            className="mt-8 sm:mt-9 md:mt-10 px-6 py-2.5 sm:px-8 sm:py-3 md:px-10 md:py-3 rounded-full text-sm sm:text-base md:text-lg font-semibold hover:opacity-90 transition z-10 shadow-lg shadow-[#7182FF]/30 cursor-pointer"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            Get Started
          </motion.button>

          <motion.div
            className="absolute bottom-6 sm:bottom-8 md:bottom-10 flex flex-col items-center z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-white/60 text-lg sm:text-xl md:text-2xl"
            >
              ↓
            </motion.div>
            <span className="text-[10px] sm:text-xs md:text-sm text-white/50 mt-1">Scroll Down</span>
          </motion.div>
        </section>

        {/* ---- FEATURES ---- */}
        <motion.section
          id="features"
          className="py-16 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-6 md:px-12 lg:px-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-7 md:gap-8 lg:gap-10"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          {[{ title: "Fast Editor", desc: "Real-time editing." },
          { title: "Work with AI", desc: "We implemented Gemini-AI to make your work easy." },
          { title: "Cloud Based", desc: "Access anywhere, anytime." }].map((f, i) => (
            <motion.div
              key={i}
              variants={sectionReveal}
              className="bg-[#1a1a1a] backdrop-blur-xl rounded-2xl p-5 sm:p-6 md:p-7 lg:p-8 text-center border border-[#7182FF]/20 hover:-translate-y-2 transition"
            >
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 text-[#7182FF]">{f.title}</h3>
              <p className="text-white/60 text-xs sm:text-sm md:text-base">{f.desc}</p>
            </motion.div>
          ))}
        </motion.section>

        {/* ---- COLLAB ---- */}
        <motion.section
          id="ai"
          className="py-20 sm:py-24 md:py-28 lg:py-36 px-4 sm:px-6 md:px-8 flex flex-col items-center justify-center text-center relative"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#249931]/15 to-[#7182FF]/15 blur-3xl"></div>
          <motion.h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 z-10 text-[#7182FF] px-4">
            Collaborative Projects.
          </motion.h2>
          <motion.p className="text-white/70 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl text-xs sm:text-sm md:text-base lg:text-lg z-10 px-4">
            Share it with your partners. You can make projects with many users.
          </motion.p>
        </motion.section>

        {/* ---- DESIGN ---- */}
        <motion.section
          id="design"
          className="py-16 sm:py-20 md:py-24 lg:py-28 px-4 sm:px-6 md:px-8 lg:px-12 flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-10 md:gap-12 lg:gap-16 relative overflow-hidden"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[#7182FF]/15 to-[#249931]/15 blur-3xl"></div>

          <motion.div variants={sectionReveal} className="max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl z-10 text-center md:text-left px-4 md:px-0">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-snug text-[#FFFFFF]">
              Our Home with UX/UI.
            </h2>
            <p className="text-white/70 mb-5 sm:mb-6 text-xs sm:text-sm md:text-base lg:text-lg">
              Clean design and colors. <br />
              Easy to navigate for any user.
            </p>
            <button
              onClick={() => navigate("/home")}
              style={gradientButtonStyle}
              className="px-5 py-2 sm:px-6 sm:py-2.5 md:px-8 md:py-3 rounded-full text-sm sm:text-base md:text-lg hover:opacity-90 transition shadow-md shadow-[#249931]/40 cursor-pointer"
            >
              Try Now
            </button>
          </motion.div>

          <motion.div
            variants={sectionReveal}
            className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:w-[500px] xl:w-[600px] rounded-xl overflow-hidden border border-white/10 backdrop-blur-lg flex items-center justify-center bg-[#121212]/60 shadow-lg z-10"
          >
            <img
              src={homePageImage}
              alt="Home Page"
              className="w-full h-auto object-contain"
              draggable={false}
            />
          </motion.div>
        </motion.section>

        {/* ---- CTA ---- */}
        <motion.section
          id="start"
          className="py-20 sm:py-24 md:py-28 lg:py-32 px-4 sm:px-6 md:px-8 text-center bg-gradient-to-r from-[#249931]/20 via-[#7182FF]/20 to-[#121212] relative"
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5 md:mb-6 text-[#7182FF] px-4">
            Get started now
          </h2>
          <p className="text-white/70 mb-8 sm:mb-9 md:mb-10 text-xs sm:text-sm md:text-base lg:text-lg px-4">Craft ideas, not just slides.</p>
          <button
            onClick={() => navigate("/home")}
            style={gradientButtonStyle}
            className="px-6 py-2.5 sm:px-8 sm:py-3 md:px-10 md:py-3 rounded-full font-semibold hover:opacity-90 transition text-sm sm:text-base md:text-lg cursor-pointer"
          >
            Start For Free
          </button>

          <div className="mt-10 sm:mt-12 md:mt-14 flex justify-center overflow-hidden px-4">
            <LogoLoop
              logos={techLogos}
              speed={110}
              direction="left"
              logoHeight={40}
              gap={40}
              pauseOnHover
              scaleOnHover
              fadeOut
              fadeOutColor="#121212"
              ariaLabel="Technology partners"
            />
          </div>
        </motion.section>
      </div>
    </>
  );
}