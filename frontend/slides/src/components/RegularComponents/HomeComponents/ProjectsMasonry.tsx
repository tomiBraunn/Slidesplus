import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import ProjectTile from "./ProjectTile";

// ---- Hooks utilitarios
function useMedia(queries: string[], values: number[], def: number) {
  const get = () =>
    values[queries.findIndex((q) => matchMedia(q).matches)] ?? def;

  const [value, setValue] = useState(get);
  useEffect(() => {
    const mqls = queries.map((q) => matchMedia(q));
    const handler = () => setValue(get);
    mqls.forEach((mql) => mql.addEventListener("change", handler));
    return () => mqls.forEach((mql) => mql.removeEventListener("change", handler));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.join("|")]);
  return value;
}

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

// ---- Tipos
export type Project = { name: string; description: string; id?: string };

// Settings disponibles
export type MasonrySettings = {
  gap: number;
  animateFrom: "bottom" | "top" | "left" | "right" | "center" | "random";
  duration: number;
  stagger: number;
  hoverScale: number;
  tileHeight: number;
};

// Valores por defecto
export const defaultMasonrySettings: MasonrySettings = {
  gap: 16,
  animateFrom: "bottom",
  duration: 0.6,
  stagger: 0.05,
  hoverScale: 0.97,
  tileHeight: 140,
};

type Props = {
  items: Project[];
  onItemClick: (p: Project) => void;
  settings?: Partial<MasonrySettings>; // 👈 el usuario pasa solo lo que quiere
};

// ---- Componente
export default function ProjectsMasonry({ items, onItemClick, settings }: Props) {
  const merged = { ...defaultMasonrySettings, ...settings };
  const { gap, animateFrom, duration, stagger, hoverScale, tileHeight } = merged;

  const columns = useMedia(
    ["(min-width:1500px)", "(min-width:1200px)", "(min-width:900px)", "(min-width:600px)"],
    [4, 4, 3, 2],
    1
  );

  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const hasMounted = useRef(false);

  // IDs estables
  const normalized = useMemo(
    () => items.map((p, i) => ({ ...p, id: p.id ?? `${p.name}-${i}` })),
    [items]
  );

  // Layout del grid
  const grid = useMemo(() => {
    if (!width) return [];
    const colHeights = new Array(columns).fill(0);
    const totalGaps = (columns - 1) * gap;
    const columnWidth = (width - totalGaps) / columns;

    return normalized.map((child) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = col * (columnWidth + gap);
      const h = tileHeight;
      const y = colHeights[col];
      colHeights[col] += h + gap;
      return { ...child, x, y, w: columnWidth, h };
    });
  }, [columns, normalized, width, gap, tileHeight]);

  const containerHeight = useMemo(() => {
    if (!grid.length) return 0;
    const byCol: number[] = Array(columns).fill(0);
    grid.forEach((g) => {
      const col = Math.round(g.x / (g.w + gap));
      byCol[col] = Math.max(byCol[col], g.y + g.h);
    });
    return Math.max(...byCol);
  }, [grid, columns, gap]);

  const getInitialPosition = (item: any) => {
    let dir = animateFrom;
    if (dir === "random") {
      const dirs = ["top", "bottom", "left", "right"] as const;
      dir = dirs[Math.floor(Math.random() * dirs.length)];
    }
    switch (dir) {
      case "top": return { x: item.x, y: -200 };
      case "bottom": return { x: item.x, y: window.innerHeight + 200 };
      case "left": return { x: -200, y: item.y };
      case "right": return { x: window.innerWidth + 200, y: item.y };
      case "center": return { x: 0, y: 0 };
      default: return { x: item.x, y: item.y + 100 };
    }
  };

  // Animaciones GSAP
  useLayoutEffect(() => {
    grid.forEach((item, index) => {
      const selector = `[data-key="${item.id}"]`;
      const animProps = { x: item.x, y: item.y, width: item.w, height: item.h };

      if (!hasMounted.current) {
        const start = getInitialPosition(item);
        gsap.fromTo(
          selector,
          { opacity: 0, x: start.x, y: start.y, width: item.w, height: item.h, filter: "blur(8px)" },
          {
            opacity: 1,
            ...animProps,
            filter: "blur(0px)",
            duration: duration,
            ease: "power3.out",
            delay: index * stagger,
          }
        );
      } else {
        gsap.to(selector, { ...animProps, duration, ease: "power3.out", overwrite: "auto" });
      }
    });
    hasMounted.current = true;
  }, [grid, duration, stagger, animateFrom]);

  const handleEnter = (id: string) =>
    gsap.to(`[data-key="${id}"]`, { scale: hoverScale, duration: 0.25, ease: "power2.out" });
  const handleLeave = (id: string) =>
    gsap.to(`[data-key="${id}"]`, { scale: 1, duration: 0.25, ease: "power2.out" });

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: containerHeight }}>
      {grid.map((g) => (
        <div
          key={g.id}
          data-key={g.id}
          className="absolute box-content will-change-transform"
          onMouseEnter={() => handleEnter(g.id!)}
          onMouseLeave={() => handleLeave(g.id!)}
          onClick={() => onItemClick({ name: g.name, description: g.description, id: g.id })}
        >
          <div className="w-full h-full">
            <ProjectTile name={g.name} description={g.description} />
          </div>
        </div>
      ))}
    </div>
  );
}
