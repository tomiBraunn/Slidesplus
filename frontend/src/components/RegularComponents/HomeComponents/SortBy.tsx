import { useState, useRef, useEffect } from 'react';
import { useTranslation } from "react-i18next";

type Props = {
  selected: string;
  setSelected: (value: string) => void;
};

function SortBy({ selected, setSelected }: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
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

  const handleClick = (option: string) => setSelected(option);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setTimeout(() => setIsOpen(false), 150);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative flex items-center justify-center gap-1">
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center bg-theme-primary border border-theme-tertiary text-theme-primary hover:bg-theme-hover transition-colors duration-300 rounded-full h-full p-3 cursor-pointer select-none"
        title={t("sortBy.sortTitle")}
      >
        <span className="material-symbols-outlined">
          swap_vert
        </span>
      </button>
      <div
        className={`absolute left-0 top-full mt-2 z-10 text-theme-primary border bg-theme-primary border-theme-tertiary min-w-[150px] overflow-hidden rounded-xl
                    transition-all duration-300 ease-out
                    ${showDropdown ? 'max-h-60 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-5'}`}
      >
        <ul className="flex flex-col">
          {[t("sortBy.recent"), t("sortBy.creationDate"), t("sortBy.az")].map((option, index, arr) => (
            <li
              key={option}
              className={`flex items-center justify-between gap-2 cursor-pointer hover:bg-theme-hover px-3 py-2 ${index === arr.length - 1 && showDropdown ? 'rounded-b-xl' : ''}`}
              onClick={() => handleClick(option)}
            >
              <span>{option}</span>
              {selected === option && (
                <span className="material-symbols-outlined text-theme-primary text-sm">
                  check
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default SortBy;
