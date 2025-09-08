import React, { useEffect, useState } from "react";

type Props = {
  projectId: string;
  name: string;
  saveState: "idle" | "saving" | "saved" | "error";
  onRename: (next: string) => void;
};

export default function ProjectNavBar({ name, saveState, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  useEffect(() => {
    if (!editing) setValue(name);
  }, [name, editing]);

  return (
    <nav className="flex items-center justify-between p-3 h-20 w-screen border-b border-[#181818]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#2B2B2B]" />
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => { setEditing(false); const next = value.trim(); if (next && next !== name) onRename(next); else setValue(name); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setValue(name); setEditing(false); } }}
              className="bg-transparent text-white text-sm border-b border-[#2B2B2B] outline-none"
            />
          ) : (
            <button className="text-white text-sm hover:opacity-80" onClick={() => { setValue(name); setEditing(true); }}>
              {name || "Sin título"}
            </button>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full border border-[#2B2B2B] text-[#9aa0a6]">
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Error" : "Idle"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#2B2B2B]" />
      </div>
    </nav>
  );
}
