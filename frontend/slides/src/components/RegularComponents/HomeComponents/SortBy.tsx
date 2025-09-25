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