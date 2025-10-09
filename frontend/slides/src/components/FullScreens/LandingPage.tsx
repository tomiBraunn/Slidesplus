import React from "react";
import TextType from "../ThirdPartyComponents/TextType/TextType";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="font-sans text-white min-h-screen bg-gradient-to-r from-black to-neutral-800 flex flex-col">
      <header className="fixed top-0 left-0 w-full flex justify-between items-center px-10 py-6 bg-black/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 text-[#d4af37] text-3xl font-bold">
          Slides+
        </div>
        <button
          onClick={() => navigate("/login")}
          className="bg-[#d4af37] text-black px-6 py-2 rounded-full hover:bg-[#c29d2f] transition"
        >
          Login
        </button>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center text-center px-6">
        <h1 className="text-5xl md:text-6xl font-semibold mb-4">
          <TextType
            strings={[
              "Create Stunning Slides.",
              "Share Instantly.",
              "Collaborate with Your Team."
            ]}
            typeSpeed={50}
            backSpeed={30}
            loop
          />
        </h1>
        <p className="text-gray-300 mt-4 text-lg max-w-lg">
          The easiest way to build, edit, create, and present slides online.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="mt-8 bg-[#d4af37] text-black px-8 py-3 rounded-full text-lg hover:bg-[#c29d2f] transition"
        >
          Get Started
        </button>
      </main>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-10 px-14 py-24 bg-white text-black">
        <div className="text-center p-10 bg-[#fafafa] rounded-lg shadow-sm hover:-translate-y-2 transition">
          <h3 className="text-xl font-semibold mb-3">Create Slides</h3>
          <p className="text-gray-600">
            Build beautiful presentations.
          </p>
        </div>
        <div className="text-center p-10 bg-[#fafafa] rounded-lg shadow-sm hover:-translate-y-2 transition">
          <h3 className="text-xl font-semibold mb-3">Do it Instantly</h3>
        </div>
        <div className="text-center p-10 bg-[#fafafa] rounded-lg shadow-sm hover:-translate-y-2 transition">
        </div>
      </section>
    </div>
  );
}
