// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import SettingsModal from "../MultiuseComponents/SettingsModal";
import { urlbackend } from "../../../config.js";

type Props = {
  avatar?: string | null;
  size?: number;
};

type User = {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
  user_number: number;
};

function ensureDataUrl(v?: string | null): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("data:")) return v;
  if (v.startsWith("http")) return v;
  return `data:image/svg+xml;base64,${v}`;
}

export default function UserPicture({ avatar, size = 38 }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${urlbackend}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const token = localStorage.getItem("token");
      const response = await fetch(`${urlbackend}/users/me/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        const error = await response.json();
        console.error(error);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRegenerateAvatar = async () => {
    setIsUploading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${urlbackend}/users/me/avatar/regenerate`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        const error = await response.json();
        console.error(error);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const src = ensureDataUrl(avatar ?? user?.avatar ?? null);
  const username = user?.username || "Guest";
  const userNumber = user?.user_number || 0;
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User";

  const toggleDropdown = () => setIsOpen(!isOpen);
  const toggleDarkMode = () => setIsDark(!isDark);
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
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

  if (isLoading) {
    return (
      <div
        className="rounded-full overflow-hidden bg-gray-200 animate-pulse"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative inline-block">
        <div
          onClick={toggleDropdown}
          className="rounded-full overflow-hidden bg-gray-200 cursor-pointer relative"
          style={{ width: size, height: size }}
          title="User"
        >
          {src ? (
            <img src={src} alt="User" className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            </div>
          )}
        </div>

        <div
          className={`absolute right-0 mt-2 bg-[#0f0f0f] border border-[#2B2B2B] rounded-xl overflow-hidden transition-all duration-300 ease-out origin-top-right z-50 ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
            }`}
        >
          <div className="p-6 pb-0 border-b border-[#2B2B2B] flex flex-col items-center gap-2 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <svg
                style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
                preserveAspectRatio="xMidYMid slice"
                width="839"
                height="400"
                viewBox="0 0 839 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <filter id="filter0_f_user" x="-400" y="-300" width="1628" height="800" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="150" result="effect1_foregroundBlur" />
                  </filter>
                  <filter id="filter1_f_user" x="-100" y="-100" width="1000" height="500" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    <feGaussianBlur stdDeviation="80" result="effect1_foregroundBlur" />
                  </filter>
                </defs>
                <g filter="url(#filter0_f_user)">
                  <ellipse cx="420" cy="150" rx="300" ry="200" fill="#7182FF" fillOpacity="0.4" />
                </g>
                <g filter="url(#filter1_f_user)">
                  <ellipse cx="350" cy="200" rx="250" ry="150" fill="#249931" fillOpacity="0.5" />
                </g>
              </svg>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-1 pb-2">
              <div className="flex items-center gap-2">
                <div
                  className="rounded-full overflow-hidden bg-gray-200 flex-shrink-0 relative"
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
              <p className="text-sm text-gray-400 truncate">user #{userNumber}</p>
            </div>
          </div>

          <div className="[&>button]:w-full [&>button]:flex [&>button]:items-center [&>button]:gap-3 [&>button]:px-6 [&>button]:py-3 [&>button]:text-gray-200 [&>button]:hover:bg-[#1a1a1a] [&>button]:transition-colors [&>button]:text-left">
            <button onClick={toggleDarkMode} className="justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">{isDark ? "light_mode" : "dark_mode"}</span>
                <span className="text-sm font-medium">Theme</span>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors ${isDark ? "bg-[#d0d0d0]" : "bg-gray-600"}`}>
                <div className={`w-5 h-5 rounded-full bg-black mt-0.5 transition-transform ${isDark ? "translate-x-5" : "translate-x-0.5"}`} />
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

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
