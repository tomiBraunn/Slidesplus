// @ts-nocheck
import React, { useEffect, useState } from "react";
import AppIcon from "../MultiuseComponents/AppIcon";
import UserPicture from "../MultiuseComponents/UserPicture";
import { ActiveUsersAvatars } from "./ActiveUsers";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { SpotifyController } from "./SpotifyController";
import SettingsModal from "../MultiuseComponents/SettingsModal";
import { urlbackend } from "../../../config.js";

export type ProjectMode = "code" | "visual" | "ai";

type Props = {
  projectId?: string;
  name: string;
  saveState: "idle" | "saving" | "saved" | "error";
  mode: ProjectMode;
  onChangeMode: (m: ProjectMode) => void;
  activeUsers?: Array<{
    userId: string;
    username: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
    activity: any;
  }>;
  currentUserId?: string;
  isCollaborationConnected?: boolean;
  onShareClick?: () => void;
  useLegacyVisualEditor?: boolean;
  onToggleLegacyEditor?: () => void;
  // Edit / Tweak (shown when mode === "ai")
  showEditPanel?: boolean;
  onToggleEditPanel?: () => void;
  tweakMode?: boolean;
  onToggleTweakMode?: () => void;
  isEditingSlide?: boolean;
  hasCurrentSlide?: boolean;
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

export default function ProjectNavBar({
  projectId,
  name,
  saveState,
  mode,
  onChangeMode,
  activeUsers = [],
  currentUserId,
  isCollaborationConnected = false,
  onShareClick,
  useLegacyVisualEditor = false,
  onToggleLegacyEditor,
  showEditPanel = false,
  onToggleEditPanel,
  tweakMode = false,
  onToggleTweakMode,
  isEditingSlide = false,
  hasCurrentSlide = false,
}: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [spotifyRefreshTrigger, setSpotifyRefreshTrigger] = useState(0);
  const [spotifyColor, setSpotifyColor] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    setEditedName(name);
  }, [name]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameDoubleClick = () => {
    setIsEditingName(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (editedName.trim() === "" || editedName === name) {
      setEditedName(name);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${urlbackend}/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editedName.trim() })
      });
      if (!res.ok) {
        setEditedName(name);
        console.error("Failed to update project name");
      }
    } catch (err) {
      console.error("Error updating project name:", err);
      setEditedName(name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameBlur();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
      setEditedName(name);
    }
  };

  const navbarBgStyle = spotifyColor && spotifyColor !== ''
    ? {
      background: `linear-gradient(to left, ${spotifyColor} 0%, var(--bg-primary) 60%)`,
      backdropFilter: 'blur(20px)',
      transition: 'background .1s ease-in-out'
    }
    : {
      backgroundColor: 'var(--bg-primary)',
      transition: 'background .1s ease-in-out'
    };

  return (
    <>
      <nav className="relative h-18 w-screen z-10">
        <div
          className="absolute inset-0 border-b border-theme-tertiary"
          style={navbarBgStyle}
        />

        <div className="relative flex items-center justify-between p-3 h-full" style={{ zIndex: 20 }}>
          <div className="flex items-center gap-3">
            <AppIcon />
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={editedName}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                className="text-theme-primary text-md bg-theme-secondary border border-theme-tertiary rounded px-2 py-0.5 outline-none focus:border-blue-500"
                style={{ maxWidth: '300px' }}
              />
            ) : (
              <span
                onDoubleClick={handleNameDoubleClick}
                className="text-theme-primary text-md truncate w-max-50 cursor-text"
                title="Double-click to rename"
              >
                {name}
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full border border-theme-tertiary text-theme-primary">
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
            {currentUserId && (
              <ActiveUsersAvatars
                users={activeUsers.map((u) => ({
                  userId: u.userId || u.user_id,
                  username: u.username,
                  avatar: u.avatar,
                  firstName: u.firstName || u.first_name,
                  lastName: u.lastName || u.last_name,
                }))}
                currentUserId={currentUserId}
                isConnected={isCollaborationConnected}
              />
            )}

            <button
              onClick={() => window.open(`/v/${projectId}`, '_blank')}
              className="flex items-center gap-2 px-3 py-1.5 text-white rounded-full transition-colors text-sm font-medium appColorFade"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              <p>Present</p>
            </button>

            {onShareClick && (
              <button
                onClick={onShareClick}
                className="flex items-center justify-center w-8 h-8 p-1 bg-theme-inverted text-theme-inverted rounded-full transition-colors text-sm">
                  <span className="material-symbols-outlined text-base">group</span>
              </button>
            )}

            <button
              onClick={() => setVersionHistoryOpen(true)}
              className="flex items-center justify-center w-8 h-8 p-1 bg-theme-inverted text-theme-inverted rounded-full transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-base">history</span>
            </button>
            {/* VISUAL MODE TOGGLE - comentado temporalmente */}
            {false && mode === "visual" && onToggleLegacyEditor && (
              <button
                onClick={onToggleLegacyEditor}
                className="flex items-center justify-center w-8 h-8 p-1 bg-theme-inverted text-theme-inverted rounded-full transition-colors text-sm"
                title={useLegacyVisualEditor ? "Switch to new editor" : "Switch to legacy editor"}
              >
                <span className="material-symbols-outlined text-base">
                  {useLegacyVisualEditor ? "layers" : "grid_view"}
                </span>
              </button>
            )}
            <SpotifyController
              onOpenSettings={() => setSettingsOpen(true)}
              refreshTrigger={spotifyRefreshTrigger}
              onColorChange={setSpotifyColor}
            />
            {mode === "ai" && (
              <div className="flex items-center gap-1 bg-theme-primary border border-theme-tertiary rounded-[20px] px-1 py-1">
                <button
                  onClick={onToggleEditPanel}
                  disabled={isEditingSlide || !hasCurrentSlide}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[14px] border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${showEditPanel ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-transparent text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary"}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                  Edit
                </button>
                <button
                  onClick={onToggleTweakMode}
                  disabled={isEditingSlide || !hasCurrentSlide}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[14px] border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${tweakMode ? "border-blue-500 bg-blue-500/10 text-blue-400 animate-pulse" : "border-transparent text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary"}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>ads_click</span>
                  {tweakMode ? "Click…" : "Tweak"}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between w-auto bg-theme-primary border border-theme-tertiary text-theme-primary transition-colors duration-300 rounded-[20px]">
              <span
                onClick={() => onChangeMode("code")}
                className={`material-symbols-outlined cursor-pointer w-[1.5em] aspect-square flex items-center justify-center rounded-l-[20px] transition ${mode === "code"
                  ? "text-theme-inverted bg-theme-inverted"
                  : "text-theme-tertiary hover:text-theme-primary"
                  }`}
                title="Code"
              >
                code
              </span>
              <span
                onClick={() => onChangeMode("ai")}
                className={`material-symbols-outlined cursor-pointer w-[1.5em] aspect-square flex items-center justify-center rounded-r-[20px] transition ${mode === "ai"
                  ? "text-theme-inverted bg-theme-inverted"
                  : "text-theme-tertiary hover:text-theme-primary"
                  }`}
                title="AI"
              >
                wand_stars
              </span>
            </div>
            <UserPicture avatar={user?.avatar} username={user?.username} size={38} />
          </div>
        </div>
      </nav>

      <VersionHistoryModal
        isOpen={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        projectId={projectId || null}
      />

      {settingsOpen && (
        <SettingsModal
          onClose={() => {
            setSettingsOpen(false);
            setSpotifyRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </>
  );
}