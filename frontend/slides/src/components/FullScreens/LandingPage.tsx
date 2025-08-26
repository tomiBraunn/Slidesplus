import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Masonry from "../Masonry/Masonry";
import { gsap } from "gsap";

// --------- hooks/utils (fuera del componente) ---------

// Hook de media queries
function useMedia(
  queries: string[],
  values: number[],
  defaultValue: number
) {
  const get = () =>
    values[queries.findIndex((q) => matchMedia(q).matches)] ?? defaultValue;

  const [value, setValue] = useState<number>(get);

  useEffect(() => {
    const handler = () => setValue(get);
    const mqls = queries.map((q) => matchMedia(q));
    mqls.forEach((mql) => mql.addEventListener("change", handler));
    return () => mqls.forEach((mql) => mql.removeEventListener("change", handler));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.join("|")]);

  return value;
}

// Medir un contenedor
function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
}

// Precargar imágenes (si lo necesitás en esta pantalla)
async function preloadImages(urls: string[]) {
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        })
    )
  );
}

// ------------------------------------------------------

export default function LandingPage() {
  // Ejemplo de uso de hooks por si los necesitás acá
  const columns = useMedia(
    ["(min-width:1500px)", "(min-width:1000px)", "(min-width:600px)", "(min-width:400px)"],
    [5, 4, 3, 2],
    1
  );

  const [containerRef] = useMeasure<HTMLDivElement>();

  // Items de prueba para Masonry (ajustá al shape que usa tu Masonry)
  const items = useMemo(
    () => [
      { id: "1", img: "/img/1.jpg", url: "#", height: 400 },
      { id: "2", img: "/img/2.jpg", url: "#", height: 520 },
      { id: "3", img: "/img/3.jpg", url: "#", height: 360 },
    ],
    []
  );

  useEffect(() => {
    // Si querés precargar:
    // preloadImages(items.map(i => i.img));
  }, [items]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <h1 className="text-white text-2xl mb-4">Landing Page</h1>

      {/* Usá tu Masonry importado. No lo redefinas acá. */}
      <Masonry
        items={items}
        // props opcionales según tu implementación:
        // ease="power3.out"
        // duration={0.6}
        // stagger={0.05}
        // animateFrom="bottom"
        // scaleOnHover
        // hoverScale={0.95}
        // blurToFocus
        // colorShiftOnHover={false}
      />
    </div>
  );
}
