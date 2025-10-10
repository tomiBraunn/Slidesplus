import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TextType from "../ThirdPartyComponents/TextType/TextType";

export default function LandingPage() {
  const navigate = useNavigate();

  const reveal = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white overflow-x-hidden">
      {}
      <header className="fixed top-0 left-0 w-full px-10 py-6 flex justify-between items-center z-50 bg-black/20 backdrop-blur-md">
        <h1 className="text-2xl font-bold tracking-wide">S+</h1>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-[#249931] to-[#7182FF] hover:opacity-90 transition font-semibold"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-[#249931] to-[#7182FF] hover:opacity-90 transition font-semibold"
          >
            Sign Up
          </button>
        </div>
      </header>

      {}
      <section className="h-screen flex flex-col justify-center items-center text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#249931]/20 via-[#7182FF]/30 to-[#050505] animate-gradient-slow"></div>
        <motion.h1
          className="text-5xl md:text-7xl font-extrabold mb-4 max-w-3xl z-10 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
        <TextType 
  text={["Hi, welcome"]}
  typingSpeed={140}
  pauseDuration={1000}
  showCursor={true}
  cursorCharacter="|"
  loop = {true}
/>
        </motion.h1>
        <motion.h2
          className="text-6xl font-bold tracking-wide z-10 mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
        </motion.h2>
        <motion.p
          className="text-white/70 text-lg max-w-xl z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
           Everything for you to make your work and experience better.
        </motion.p>
        <motion.button
          onClick={() => navigate("/login")}
          className="mt-10 px-10 py-3 rounded-full bg-gradient-to-r from-[#249931] to-[#7182FF] font-semibold hover:opacity-90 transition z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          Get Started
        </motion.button>
      </section>

      {}
      <motion.section
        className="py-32 px-8 md:px-20 grid grid-cols-1 md:grid-cols-3 gap-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.25 }}
      >
        {[
          { title: "Fast Editor", desc: "Real-time editing." },
          { title: "Work with AI", desc: "We implemented Gemini-AI to make your work easy." },
          { title: "Cloud Based", desc: "Access anywhere, anytime." }
        ].map((f, i) => (
          <motion.div
            key={i}
            variants={reveal}
            className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/10 hover:-translate-y-2 transition"
          >
            <h3 className="text-2xl font-semibold mb-3">{f.title}</h3>
            <p className="text-white/60">{f.desc}</p>
          </motion.div>
        ))}
      </motion.section>

      {/* Preview Section */}
      <motion.section
        className="py-40 px-10 flex flex-col md:flex-row items-center justify-center gap-12 relative overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#7182FF]/15 to-[#249931]/15 blur-3xl"></div>
        <motion.div variants={reveal} className="max-w-lg z-10">
          <h2 className="text-4xl font-bold mb-4 leading-snug">
            Our Home with UX/UI.
          </h2>
          <p className="text-white/70 mb-6">
            Clean design and colors. <br></br>
             Easy to navigate for any user.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-[#249931] to-[#7182FF] hover:opacity-90 transition"
          >
            Try Now
          </button>
        </motion.div>
        <motion.div
          variants={reveal}
          className="w-full md:w-[500px] h-[300px] bg-white/5 rounded-xl border border-white/10 backdrop-blur-lg flex items-center justify-center text-white/40 z-10"
        >
          Preview Placeholder
        </motion.div>
      </motion.section>

      {}
      <motion.section
        className="py-28 text-center bg-gradient-to-r from-[#249931]/20 via-[#7182FF]/20 to-[#050505]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={reveal}
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-6">Get started now</h2>
        <p className="text-white/70 mb-10">/* Alguna descripcion si pinta */</p>
        <button
          onClick={() => navigate("/login")}
          className="px-10 py-3 rounded-full bg-gradient-to-r from-[#249931] to-[#7182FF] font-semibold hover:opacity-90 transition"
        >
          Start For Free
        </button>
      </motion.section>
    </div>
  );
}
