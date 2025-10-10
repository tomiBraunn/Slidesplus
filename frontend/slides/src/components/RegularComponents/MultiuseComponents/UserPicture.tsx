import React, { useMemo, useState, useRef, useEffect } from "react";

type Props = {
  avatar?: string | null;
  size?: number;
};

function ensureDataUrl(v?: string | null): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("data:")) return v;
  return `data:image/svg+xml;base64,${v}`;
}

export default function UserPicture({ avatar, size = 38 }: Props) {
  const localUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const raw = avatar ?? localUser?.avatar ?? null;
  const src = ensureDataUrl(raw);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setTimeout(() => setIsOpen(false), 150);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block">
      <div
        onClick={toggleDropdown}
        className={`rounded-full overflow-hidden bg-gray-200 cursor-pointer transition-all duration-300 ease-out`}
        style={{ width: size, height: size }}
        title="User"
      >
        {src ? (
          <img
            src={src}
            alt="User"
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
            ?
          </div>
        )}
      </div>

      <div
        className={`absolute right-0 -z-50 w-35 -top-1 defaultStyle overflow-hidden
          transition-all duration-x300 ease-out
          ${showDropdown ? "max-h-60 opacity-100 translate-y-1 rounded-md" : "max-h-0 opacity-0 -translate-y-5 rounded-none"}
        `}
      >
        <div className="flex">
          <span className="aspect-square w-10 bg-red"></span>
          <div className="flex flex-col justify-center g-0">
            <p>USERNAME</p>
            <p>NAME</p>
          </div>
        </div>
      </div>
    </div>
  );
}
