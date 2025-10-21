import React, { useEffect, useState } from "react";
import AppIcon from "../MultiuseComponents/AppIcon";
import UserPicture from "../MultiuseComponents/UserPicture";

export type ProjectMode = "code" | "visual" | "ai";

type Props = {
  projectId?: string;
  name: string;
  saveState: "idle" | "saving" | "saved" | "error";
  mode: ProjectMode;
  onChangeMode: (m: ProjectMode) => void;
};

type User = {
  id?: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
};

function decodeJwtPayload(token: string): Partial<User> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return { id: json.sub, username: json.username, email: json.email };
  } catch {
    return null;
  }
}

function normalizeAvatar(avatar?: string): string | undefined {
  if (!avatar) return undefined;
  if (avatar.startsWith("data:image")) return avatar;
  return `data:image/png;base64,${avatar}`;
}

export default function ProjectNavBar({ name, saveState, mode, onChangeMode }: Props) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed: User = JSON.parse(stored);
        setUser({ ...parsed, avatar: normalizeAvatar(parsed.avatar) });
        return;
      }
      const token = localStorage.getItem("token");
      if (token) {
        const basic = decodeJwtPayload(token) || {};
        const storedAvatar = localStorage.getItem("avatar") || undefined;
        setUser({ ...basic, avatar: normalizeAvatar(storedAvatar) });
      }
    } catch {
      setUser(null);
    }
  }, []);

  const displayLetter = user?.first_name?.[0] || user?.username?.[0] || user?.email?.[0] || "?";

  return (
    <nav className="flex items-center justify-between p-3 h-18 w-screen border-b border-[#2B2B2B] bg-[#121212]">
      <div className="flex items-center gap-3">
        <AppIcon />
        <span className="text-white text-sm">{name}</span>
        <span className="text-xs px-2 py-0.5 rounded-full border border-[#2B2B2B] text-[#9aa0a6]">
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : saveState === "error"
                ? "Error"
                : "Idle"}
        </span>
      </div>



      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-between gap-1 w-auto defaultStyle rounded-[20px]">
          <span
            onClick={() => onChangeMode("code")}
            className={`material-symbols-outlined cursor-pointer w-[1.5em] aspect-square flex items-center justify-center rounded-l-[20px] transition ${mode === "code"
              ? "text-white bg-gradient-to-r from-[#7182FF] to-[#3CFF52]"
              : "text-[#4B4B4B] hover:text-white"
              }`}
            title="Code"
          >
            code
          </span>
          <span
            onClick={() => onChangeMode("visual")}
            className={`material-symbols-outlined cursor-pointer w-[1.5em] aspect-square flex items-center justify-center transition ${mode === "visual"
              ? "text-white bg-gradient-to-r from-[#7182FF] to-[#3CFF52]"
              : "text-[#4B4B4B] hover:text-white"
              }`}
            title="Visual"
          >
            slide_library
          </span>
          <span
            onClick={() => onChangeMode("ai")}
            className={`material-symbols-outlined cursor-pointer w-[1.5em] aspect-square flex items-center justify-center rounded-r-[20px] transition ${mode === "ai"
              ? "text-white bg-gradient-to-r from-[#7182FF] to-[#3CFF52]"
              : "text-[#4B4B4B] hover:text-white"
              }`}
            title="AI"
          >
            wand_stars
          </span>
        </div>
        <UserPicture avatar={user?.avatar} username={user?.username} size={38} />
      </div>
    </nav>
  );
}
