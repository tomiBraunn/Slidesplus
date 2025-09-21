import React, { useEffect, useState } from "react";
import AppIcon from "../MultiuseComponents/AppIcon";
import UserPicture from "../MultiuseComponents/UserPicture";
import Settings from "../MultiuseComponents/Settings";

export type ProjectMode = "code" | "visual" | "ai";

type Props = {
  projectId?: string;
  name: string;
  saveState: "idle" | "saving" | "saved" | "error";
  onRename: (next: string) => void;
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

function ModeButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: ProjectMode;
  active: boolean;
  onClick?: (m: ProjectMode) => void;
}) {
  return (
    <button
      onClick={() => onClick && onClick(value)}
      className={`px-3 py-1 rounded-md text-sm transition ${active ? "bg-sky-500 text-[#121212]" : "bg-transparent text-white hover:bg-[#2B2B2B]"
        }`}
    >
      {label}
    </button>
  );
}


export default function ProjectNavBar({
  name,
  saveState,
  onRename,
  mode,
  onChangeMode,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!editing) setValue(name);
  }, [name, editing]);

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

  const displayLetter =
    user?.first_name?.[0] ||
    user?.username?.[0] ||
    user?.email?.[0] ||
    "?";

  return (
    <nav className="flex items-center justify-between p-3 h-20 w-screen border-b border-[#2B2B2B] bg-[#121212]">
      <div className="flex items-center gap-3">
        <AppIcon />
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => {
                setEditing(false);
                const next = value.trim();
                if (next && next !== name) onRename(next);
                else setValue(name);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setValue(name);
                  setEditing(false);
                }
              }}
              className="bg-transparent text-white text-sm border-b border-[#2B2B2B] outline-none"
            />
          ) : (
            <button
              className="text-white text-sm hover:opacity-80"
              onClick={() => {
                setValue(name);
                setEditing(true);
              }}
              title="Rename project"
            >
              {name || ""}
            </button>
          )}
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
      </div>

      <div className="flex items-center gap-2">
        <ModeButton label="Code" value="code" active={mode === "code"} onClick={onChangeMode} />
        <ModeButton label="Visual" value="visual" active={mode === "visual"} onClick={onChangeMode} />
        <ModeButton label="AI" value="ai" active={mode === "ai"} onClick={onChangeMode} />
      </div>


      <div className="flex items-center gap-2.5">
        <Settings />
        <UserPicture avatar={user?.avatar} fallbackLetter={displayLetter} />
      </div>
    </nav>
  );
}
