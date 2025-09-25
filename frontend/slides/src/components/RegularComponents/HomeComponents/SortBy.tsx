import React, { useState, useRef, useEffect } from "react";

export type SortOption = "Recent" | "Creation date" | "A-Z";

type SortByProps = {
  onSortChange?: (option: SortOption) => void;
  initial?: SortOption;
};

const OPTIONS: SortOption[] = ["Recent", "Creation date", "A-Z"];

export default function SortBy({ onSortChange, initial = "Recent" }: SortByProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<SortOption>(initial);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggleDropdown = () => {
    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => setShowDropdown(true), 150);
    } else {
      setShowDropdown(false);
      setTimeout(() => setIsOpen(false), 150);
    }
  };

  const handleSelect = (option: SortOption) => {
    setSelected(option);
    onSortChange?.(option);
    // cerramos dropdown
    setShowDropdown(false);
    setTimeout(() => setIsOpen(false), 150);
  };

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setShowDropdown(false);
        setTimeout(() => setIsOpen(false), 150);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-48">
      {/* botón: siempre dice "Sort by" */}
      <button
        type="button"
        onClick={toggleDropdown}
        className={`flex items-center justify-center border border-[#2B2B2B] bg-[#0f0f0f] text-white gap-2 px-3 py-1 cursor-pointer select-none text-sm
          transition-all duration-200 ${isOpen ? "rounded-t-[20px]" : "rounded-full"}`}
      >
        <span>Sort by</span>
        <span className={`material-symbols-outlined transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}>
          arrow_drop_down
        </span>
      </button>

      {/* dropdown */}
      <div
        className={`absolute left-0 top-full z-10 text-white border border-[#2B2B2B] bg-[#0f0f0f] w-full overflow-hidden
          transition-all duration-200 ${showDropdown ? "max-h-60 opacity-100 translate-y-0 rounded-b-xl" : "max-h-0 opacity-0 -translate-y-3 rounded-b-none"}`}
      >
        <ul className="flex flex-col">
          {OPTIONS.map((opt, idx) => (
            <li
              key={opt}
              onClick={() => handleSelect(opt)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#333] ${idx === OPTIONS.length - 1 ? "rounded-b-xl" : ""}`}
            >
              <span className={`rounded-sm w-4 h-4 inline-block ${selected === opt ? "bg-[#3CFF52]" : "bg-[#2B2B2B]"}`} />
              <span className="text-sm">{opt}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}