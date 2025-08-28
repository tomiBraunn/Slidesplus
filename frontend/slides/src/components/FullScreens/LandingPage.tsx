import React from "react";

export default function Inicio() {
  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-r from-gray-900 via-black to-gray-800 text-white overflow-hidden">
      {/* Fondo animado con circulos flotantes */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse top-10 left-10"></div>
        <div className="absolute w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-ping bottom-20 right-20"></div>
      </div>

      {/* Título */}
      <h1 className="text-5xl font-bold mb-4 tracking-wide animate-fadeIn">
        Te damos la Bienvenida
      </h1>

      {/* Logo con animación */}
      <img
        src="S+ (1).png"
        alt="Logo_S+"
        className="w-32 mb-6 animate-pulse"
      />

      {/* Subtítulo */}
      <p className="text-lg text-gray-300 mb-10 animate-fadeIn animation-delay-300">
        Programa tus presentaciones
      </p>

      {/* Botón con hover animado */}
      <button className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 transition transform duration-300 shadow-lg text-lg font-semibold animate-fadeIn animation-delay-500 hover:shadow-blue-500/50">
        Iniciar
      </button>
    </div>
  );
}
