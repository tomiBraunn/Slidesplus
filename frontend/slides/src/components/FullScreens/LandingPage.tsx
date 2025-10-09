import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TextType from "../ThirdPartyComponents/TextType/TextType";

export default function LandingPage() {
  const navigate = useNavigate();

  const sectionVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="font-sans min-h-screen bg-gradient-to-b from-[#0f3d3e] to-[#1a5c8f] text-white flex flex-col">
      <header className="fixed top-0 left-0 w-full flex justify-between items-center px-10 py-6 bg-[#0f3d3e]/70 backdrop-blur-md z-50">
        <div className="text-xl md:text-2xl font-bold">S+</div>
        <button
          onClick={() => navigate("/login")}
          className="bg-[#1a5c8f] text-white px-6 py-2 rounded-full hover:bg-[#126aa1] transition"
        >
          Login
        </button>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center text-center px-6 mt-24">
        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <TextType
            strings={[
              "Create Stunning Slides.",
              "Share Instantly.",
              "Collaborate Seamlessly."
            ]}
            typeSpeed={50}
            backSpeed={30}
            loop
          />
        </motion.h1>
        <motion.p
          className="text-gray-200 text-lg max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          Build, edit, and present slides online with ease.
        </motion.p>
        <motion.button
          onClick={() => navigate("/login")}
          className="mt-8 bg-[#1a5c8f] text-white px-8 py-3 rounded-full text-lg hover:bg-[#126aa1] transition"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          Get Started
        </motion.button>
      </main>

      <motion.section
        className="grid grid-cols-1 md:grid-cols-3 gap-10 px-14 py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.2 }}
      >
        {[
          {
            title: "Create Slides",
            desc: "Build beautiful presentations effortlessly with intuitive tools.",
          },
          {
            title: "Share Instantly",
            desc: "Share your slides with anyone, anywhere, with a single link.",
          },
          {
            title: "Collaborate",
            desc: "Work together with your team in real-time and stay productive.",
          },
        ].map((item, index) => (
          <motion.div
            key={index}
            className="text-center p-10 bg-[#0f3d3e]/50 rounded-lg shadow-lg hover:-translate-y-2 transition"
            variants={sectionVariants}
          >
            <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
            <p className="text-gray-300">{item.desc}</p>
          </motion.div>
        ))}
      </motion.section>

      <footer className="text-center py-6 text-gray-400 text-sm bg-[#0f3d3e]/70">
        © 2025 S+. All rights reserved.
      </footer>
    </div>
  );
}
 