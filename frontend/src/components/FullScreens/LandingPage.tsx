import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TextType from "../ThirdPartyComponents/TextType/TextType";
import RotatingText from "../ThirdPartyComponents/TextType/RotatingText";
import LogoLoop from "../ThirdPartyComponents/TextType/LogoLoop";
import homePageImage from "../../assets/homePage.png";
import StaggeredMenu from "../ThirdPartyComponents/StaggredMenu/StaggredMenu";

import {
  SiReact,
  SiTypescript,
  SiTailwindcss,
  SiVercel,
  SiSupabase,
  SiGithub,
  SiGoogle,
} from "react-icons/si";

import React, { useEffect, useState } from "react";

const menuItems = [
  { label: "Home", ariaLabel: "Go to home section", link: "#hero" }, <br />,
  { label: "Features", ariaLabel: "Go to features section", link: "#features" }, <br />,
  { label: "Collab", ariaLabel: "Go to AI section", link: "#ai" }, <br />,
  { label: "UI Preview", ariaLabel: "Go to design section", link: "#design" }, <br />,
  { label: "Get Started", ariaLabel: "Go to CTA section", link: "#start" }, <br />,
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
        height: "8rem",
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

  const sectionReveal = {
    hidden: { opacity: 0, y: 80 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen w-full bg-[#121212] text-white overflow-x-hidden cursor-default relative">
      <header className="sticky top-0 w-full p-2 flex justify-between items-center z-50 bg-[#121212]/70 backdrop-blur-md">
        <h1 className="text-2xl font-bold tracking-wide text-[#7182FF]">Slides+</h1>
        <div className="flex gap-4 mr-4">
          <button
            onClick={() => navigate("/login")}
            className="p-1 px-3 rounded-md text-sm border border-[#7182FF]/60 hover:bg-[#7182FF]/10 transition cursor-pointer"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="p-1 px-3 rounded-md text-sm bg-gradient-to-r from-[#249931] to-[#7182FF] font-semibold hover:opacity-90 transition cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </header>
      <div className="h-screen fixed left-0 z-50">
  <StaggeredMenu
    position="left"
    items={menuItems}
    displaySocials={true}
    displayItemNumbering={false}
    menuButtonColor="#fff"
    openMenuButtonColor="#000"
    changeMenuColorOnOpen={true}
    colors={['#B19EEF', '#5227FF']}
    accentColor="#249931"
    onMenuOpen={() => console.log('Menu opened')}
    onMenuClose={() => console.log('Menu closed')}
  />
</div>

      <section
        id="hero"
        className="h-screen flex flex-col justify-center items-center text-center relative overflow-hidden"
      >
        <motion.h1
          className="text-5xl md:text-7xl font-extrabold mb-4 z-10 leading-tight"
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
          className="z-10 mt-2 md:mt-4"
        >
          <RotatingText
            texts={["Smarter", "Faster", "Easier", "With AI"]}
            mainClassName="px-3 py-1 text-xl md:text-2xl bg-white/10 text-[#7182FF] font-semibold rounded-lg backdrop-blur-md"
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
          className="text-white/70 text-lg max-w-xl z-10 mt-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          Everything for you to make your work and experience better.
        </motion.p>

        <motion.button
          onClick={() => navigate("/home")}
          className="mt-10 px-10 py-3 rounded-full bg-gradient-to-r from-[#249931] to-[#7182FF] font-semibold hover:opacity-90 transition z-10 shadow-lg shadow-[#7182FF]/30 cursor-pointer"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          Get Started
        </motion.button>

        <motion.div
          className="absolute bottom-8 flex flex-col items-center z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-white/60 text-2xl"
          >
            ↓
          </motion.div>
          <span className="text-xs text-white/50 mt-1">Scroll Down</span>
        </motion.div>
      </section>
      <motion.section
        id="features"
        className="py-40 px-8 md:px-20 grid grid-cols-1 md:grid-cols-3 gap-10"
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
            className="bg-[#1a1a1a] backdrop-blur-xl rounded-2xl p-8 text-center border border-[#7182FF]/20 hover:-translate-y-2 transition"
          >
            <h3 className="text-2xl font-semibold mb-3 text-[#7182FF]">{f.title}</h3>
            <p className="text-white/60">{f.desc}</p>
          </motion.div>
        ))}
      </motion.section>
      <motion.section
        id="ai"
        className="py-52 flex flex-col items-center justify-center text-center relative"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#249931]/15 to-[#7182FF]/15 blur-3xl"></div>
        <motion.h2 className="text-4xl font-bold mb-6 z-10 text-[#7182FF]">
          Collaborative Projects.
        </motion.h2>
        <motion.p className="text-white/70 max-w-2xl z-10">
          Share it with your partners. You can make projects with many users.
        </motion.p>
      </motion.section>
      <motion.section
        id="design"
        className="py-40 px-10 flex flex-col md:flex-row items-center justify-center gap-12 relative overflow-hidden"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#7182FF]/15 to-[#249931]/15 blur-3xl"></div>

        <motion.div variants={sectionReveal} className="max-w-lg z-10">
          <h2 className="text-4xl font-bold mb-4 leading-snug text-[#249931]">
            Our Home with UX/UI.
          </h2>
          <p className="text-white/70 mb-6">
            Clean design and colors. <br />
            Easy to navigate for any user.
          </p>
          <button
            onClick={() => navigate("/home")}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-[#249931] to-[#7182FF] hover:opacity-90 transition shadow-md shadow-[#249931]/40 cursor-pointer"
          >
            Try Now
          </button>
        </motion.div>

        <motion.div
          variants={sectionReveal}
          className="w-full md:w-[600px] rounded-xl overflow-hidden border border-white/10 backdrop-blur-lg flex items-center justify-center bg-[#121212]/60 shadow-lg z-10"
        >
          <img
            src={homePageImage}
            alt="Home Page"
            className="w-full h-auto object-contain"
            draggable={false}
          />
        </motion.div>
      </motion.section>
      <motion.section
        id="start"
        className="py-40 text-center bg-gradient-to-r from-[#249931]/20 via-[#7182FF]/20 to-[#121212] relative"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#7182FF]">
          Get started now
        </h2>
        <p className="text-white/70 mb-10">Craft ideas, not just slides.</p>
        <button
          onClick={() => navigate("/home")}
          className="px-10 py-3 rounded-full bg-gradient-to-r from-[#249931] to-[#7182FF] font-semibold hover:opacity-90 transition cursor-pointer"
        >
          Start For Free
        </button>

        <div className="mt-20 flex justify-center">
          <LogoLoop
            logos={techLogos}
            speed={110}
            direction="left"
            logoHeight={44}
            gap={50}
            pauseOnHover
            scaleOnHover
            fadeOut
            fadeOutColor="#121212"
            ariaLabel="Technology partners"
          />
        </div>
      </motion.section>
    </div>
  );
}
