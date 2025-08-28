import React from "react";

export default function StartScreen() {
  return (
    <div className="w-screen h-screen bg-gradient-to-r from-gray-900 via-black to-gray-900 flex items-center justify-center relative">
      {/* Fondo */}
      <div className="absolute inset-0 bg-[url('slides\public\S+ (1).png')] bg-cover bg-center"/>
      <div className="absolute inset-0 bg-black/70" />

      {/* Contenido */}
      <div className="relative z-10 text-center">
        <div className="flex items-center flex-col">
          <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-lg">
            Te damos la bienvenida a
          </h1>
          <img src="S+ (1).png" alt="Logo_S+" className="w-35" />
        </div>
        <p className="text-gray-300 mt-4 text-lg md:text-xl">
          Programa tus presentaciones
        </p>

        <button className="mt-8 px-10 py-4 text-lg font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition transform hover:scale-120">
          Iniciar
        </button>
      </div>
    </div>
  );
}
