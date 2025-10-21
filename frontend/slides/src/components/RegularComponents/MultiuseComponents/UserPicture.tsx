import React, { useMemo, useState, useRef, useEffect } from "react";
import SettingsModal from "../MultiuseComponents/SettingsModal"; // ⚠️ ajustá esta ruta según tu estructura

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
  const username = localUser?.username || "Guest";
  const userId = localUser?.id || "0000";
  const fullName =
    `${localUser?.first_name || ""} ${localUser?.last_name || ""}`.trim() || "User";

  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const toggleDarkMode = () => setIsDark(!isDark);
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div ref={containerRef} className="relative inline-block">
        <div
          onClick={toggleDropdown}
          className="rounded-full overflow-hidden bg-gray-200 cursor-pointer"
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
              {username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/** Dropdown del usuario */}
        <div
          className={`absolute right-0 mt-2 bg-[#0f0f0f] border border-[#2B2B2B] rounded-xl overflow-hidden transition-all duration-300 ease-out origin-top-right z-50 ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="p-6 pb-0 border-b border-[#2B2B2B] flex flex-col items-center gap-2 relative">
            <div className="relative z-10 flex flex-col items-center gap-2 pb-4">
              <div className="flex items-center gap-2">
                <div
                  className="rounded-full overflow-hidden bg-gray-200 flex-shrink-0"
                  style={{ width: 56, height: 56 }}
                >
                  {src ? (
                    <img src={src} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xl">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-base font-semibold text-gray-100 truncate">{fullName}</p>
                  <p className="text-xs text-gray-400 truncate">@{username}</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 truncate">User #{userId}</p>
            </div>
          </div>

          <div className="[&>button]:w-full [&>button]:flex [&>button]:items-center [&>button]:gap-3 [&>button]:px-6 [&>button]:py-3 [&>button]:text-gray-200 [&>button]:hover:bg-[#1a1a1a] [&>button]:transition-colors [&>button]:text-left">
            <button onClick={toggleDarkMode} className="justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">
                  {isDark ? "light_mode" : "dark_mode"}
                </span>
                <span className="text-sm font-medium">Theme</span>
              </div>
              <div
                className={`w-11 h-6 rounded-full transition-colors ${
                  isDark ? "bg-[#d0d0d0]" : "bg-gray-600"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-black mt-0.5 transition-transform ${
                    isDark ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                setShowSettings(true);
              }}
            >
              <span className="material-symbols-outlined text-xl">settings</span>
              <span className="text-sm font-medium">Settings</span>
            </button>

            <button onClick={handleLogout} className="!text-red-400">
              <span className="material-symbols-outlined text-xl">logout</span>
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
