// @ts-nocheck
import React, { useEffect, useState } from "react";
import AppIcon from "../MultiuseComponents/AppIcon";
import UserPicture from "../MultiuseComponents/UserPicture";
import { ActiveUsersAvatars } from "./ActiveUsers";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { SpotifyController } from "./SpotifyController";
import SettingsModal from "../MultiuseComponents/SettingsModal";

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
  onShareClick?: () => void;
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
  onShareClick
}: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [spotifyRefreshTrigger, setSpotifyRefreshTrigger] = useState(0);
  const [spotifyColor, setSpotifyColor] = useState<string>('');

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

  const navbarBgStyle = spotifyColor && spotifyColor !== ''
    ? {
      background: `linear-gradient(to left, ${spotifyColor} 0%, var(--bg-primary) 60%)`,
      backdropFilter: 'blur(20px)',
      transition: 'background 3s ease-in-out'
    }
    : {
      backgroundColor: 'var(--bg-primary)',
      transition: 'background 3s ease-in-out'
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
            <span className="text-theme-primary text-md truncate w-max-50">{name}</span>
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
            {currentUserId && activeUsers.length > 0 && (
              <ActiveUsersAvatars
                users={activeUsers}
                currentUserId={currentUserId}
                isConnected={true}
              />
            )}

            <button
              onClick={() => window.open(`/v/${projectId}`, '_blank')}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              Present
            </button>

            {onShareClick && (
              <button
                onClick={onShareClick}
                className="flex items-center gap-2 px-3 py-1.5 bg-theme-secondary hover:bg-theme-hover text-white rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            )}

            <button
              onClick={() => setVersionHistoryOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-theme-secondary hover:bg-theme-hover text-white rounded-lg transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-base">history</span>
            </button>
            <SpotifyController
              onOpenSettings={() => setSettingsOpen(true)}
              refreshTrigger={spotifyRefreshTrigger}
              onColorChange={setSpotifyColor}
            />
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
                onClick={() => onChangeMode("visual")}
                className={`material-symbols-outlined cursor-pointer w-[1.5em] aspect-square flex items-center justify-center transition ${mode === "visual"
                  ? "text-theme-inverted bg-theme-inverted"
                  : "text-theme-tertiary hover:text-theme-primary"
                  }`}
                title="Visual"
              >
                slide_library
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