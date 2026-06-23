// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { urlbackend } from "../../../config.js";
import { getAuthToken } from "../../../utils/getAuthToken";
import BasicModal from "./BasicModal";

type Props = {
  onClose: () => void;
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

type Section = "profile" | "projects";
type ProjectMode = "code" | "visual" | "chat";

function ensureDataUrl(v?: string | null): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("data:")) return v;
  if (v.startsWith("http")) return v;
  return `data:image/svg+xml;base64,${v}`;
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number = 365) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
}

export default function SettingsModal({ onClose }: Props) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.resolvedLanguage || "en").startsWith("es") ? "es" : "en";
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [section, setSection] = useState<Section>("profile");
  const [user, setUser] = useState<User | null>(null);
  const [originalAvatar, setOriginalAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [defaultMode, setDefaultMode] = useState<ProjectMode>("chat");
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [isConnectingSpotify, setIsConnectingSpotify] = useState(false);

  const [showDeleteProjects, setShowDeleteProjects] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [projectCount, setProjectCount] = useState(0);

  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | "">("");

  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.add("overflow-hidden");
    requestAnimationFrame(() => setShow(true));

    const savedMode = getCookie("defaultMode");
    if (savedMode === "code" || savedMode === "visual" || savedMode === "chat") {
      setDefaultMode(savedMode);
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.documentElement.classList.remove("overflow-hidden");
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await getAuthToken();
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
          setOriginalAvatar(data.user.avatar ?? null);
          setFirstName(data.user.first_name);
          setLastName(data.user.last_name);
          setUsername(data.user.username);
        } else {
          setStatusMessage(t("settings.failedToFetchUser"));
          setStatusType("error");
          clearStatusLater();
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setStatusMessage(t("settings.errorFetchingUser"));
        setStatusType("error");
        clearStatusLater();
      } finally {
        setIsLoading(false);
      }
    };

    const fetchProjects = async () => {
      try {
        const token = await getAuthToken();
        const response = await fetch(`${urlbackend}/projects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setProjectCount(data.length);
        } else {
          console.error("Failed to fetch projects");
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchUser();
    fetchProjects();
    checkSpotifyConnection();
  }, []);

  const checkSpotifyConnection = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const response = await fetch(`${urlbackend}/spotify/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSpotifyConnected(data.connected || false);
      }
    } catch (error) {
      console.error("Error checking Spotify connection:", error);
    }
  };

  const clearStatusLater = (ms = 4000) => {
    setTimeout(() => {
      setStatusMessage("");
      setStatusType("");
    }, ms);
  };

  const handleClose = () => {
    setShow(false);
  };

  const handleTransitionEnd = () => {
    if (!show) {
      setMounted(false);
      document.documentElement.classList.remove("overflow-hidden");
      onClose();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage(t("settings.pleaseSelectImage"));
      setStatusType("error");
      clearStatusLater();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage(t("settings.fileSizeLimit"));
      setStatusType("error");
      clearStatusLater();
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const token = await getAuthToken();
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
        setStatusMessage(t("settings.avatarUploaded"));
        setStatusType("success");
        clearStatusLater();
      } else {
        const error = await response.json();
        setStatusMessage(error.message || t("settings.errorUploadingAvatar"));
        setStatusType("error");
        clearStatusLater();
      }
    } catch (error) {
      console.error("Error:", error);
      setStatusMessage(t("settings.errorUploadingAvatar"));
      setStatusType("error");
      clearStatusLater();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAvatar = async () => {
    setIsUploading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${urlbackend}/users/me/avatar`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setStatusMessage(t("settings.avatarDeleted"));
        setStatusType("success");
        clearStatusLater();
      } else {
        const error = await response.json();
        setStatusMessage(error.message || t("settings.errorDeletingAvatar"));
        setStatusType("error");
        clearStatusLater();
      }
    } catch (error) {
      console.error("Error:", error);
      setStatusMessage(t("settings.errorDeletingAvatar"));
      setStatusType("error");
      clearStatusLater();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDefaultModeChange = (mode: ProjectMode) => {
    setDefaultMode(mode);
    setCookie("defaultMode", mode);
    setStatusMessage(t("settings.defaultModeSet", { mode: mode === "chat" ? t("settings.aiChat") : mode === "code" ? t("settings.codeEditor") : t("settings.visualEditor") }));
    setStatusType("success");
    clearStatusLater();
  };

  const handleSpotifyConnect = async () => {
    try {
      setIsConnectingSpotify(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${urlbackend}/spotify/auth-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        window.open(data.url, '_blank', 'width=500,height=700');
        const pollInterval = setInterval(async () => {
          await checkSpotifyConnection();
          const statusRes = await fetch(`${urlbackend}/spotify/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const statusData = await statusRes.json();
          if (statusData.connected) {
            clearInterval(pollInterval);
            setSpotifyConnected(true);
            setStatusMessage(t("settings.spotifyConnected"));
            setStatusType("success");
            clearStatusLater();
            setIsConnectingSpotify(false);
          }
        }, 2000);
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsConnectingSpotify(false);
        }, 60000);
      }
    } catch (error) {
      console.error("Error connecting Spotify:", error);
      setStatusMessage(t("settings.failedConnectSpotify"));
      setStatusType("error");
      clearStatusLater();
      setIsConnectingSpotify(false);
    }
  };

  const handleSpotifyDisconnect = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${urlbackend}/spotify/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSpotifyConnected(false);
        setStatusMessage(t("settings.spotifyDisconnected"));
        setStatusType("info");
        clearStatusLater();
      }
    } catch (error) {
      console.error("Error disconnecting Spotify:", error);
      setStatusMessage(t("settings.failedDisconnectSpotify"));
      setStatusType("error");
      clearStatusLater();
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");

      const updates: any = {};

      if (firstName !== user?.first_name) updates.first_name = firstName;
      if (lastName !== user?.last_name) updates.last_name = lastName;
      if (username !== user?.username) updates.username = username;

      if (newPassword && currentPassword) {
        if (newPassword !== confirmPassword) {
          setStatusMessage(t("settings.passwordsDoNotMatch"));
          setStatusType("error");
          setIsSaving(false);
          clearStatusLater();
          return;
        }
        updates.current_password = currentPassword;
        updates.new_password = newPassword;
      }

      if (Object.keys(updates).length === 0) {
        if (user?.avatar !== originalAvatar) {
          setOriginalAvatar(user?.avatar ?? null);
          setStatusMessage(t("settings.profileUpdated"));
          setStatusType("success");
          setIsSaving(false);
          clearStatusLater();
          return;
        }
        setStatusMessage(t("settings.noChangesToSave"));
        setStatusType("info");
        setIsSaving(false);
        clearStatusLater();
        return;
      }

      const response = await fetch(`${urlbackend}/users/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setOriginalAvatar(data.user.avatar ?? null);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setStatusMessage(t("settings.profileUpdatedSuccessfully"));
        setStatusType("success");
        clearStatusLater();
      } else {
        const error = await response.json();
        setStatusMessage(error.message || t("settings.errorUpdatingProfile"));
        setStatusType("error");
        clearStatusLater();
      }
    } catch (error) {
      console.error("Error:", error);
      setStatusMessage(t("settings.errorSavingProfile"));
      setStatusType("error");
      clearStatusLater();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAllProjects = async () => {
    if (deleteConfirmText !== "DELETE ALL") return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${urlbackend}/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const projects = await response.json();

        for (const project of projects) {
          await fetch(`${urlbackend}/projects/${project.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }

        setProjectCount(0);
        setShowDeleteProjects(false);
        setDeleteConfirmText("");
        setStatusMessage(t("settings.allProjectsDeleted"));
        setStatusType("success");
        clearStatusLater();
      } else {
        setStatusMessage(t("settings.errorDeletingProjects"));
        setStatusType("error");
        clearStatusLater();
      }
    } catch (error) {
      console.error("Error:", error);
      setStatusMessage(t("settings.errorDeletingProjects"));
      setStatusType("error");
      clearStatusLater();
    }
  };

  const src = ensureDataUrl(user?.avatar);
  const usernameInitial = user?.username?.charAt(0).toUpperCase() || "U";

  if (!mounted) return null;

  return (
    <div
      className={`fixed z-50 inset-0 flex items-center justify-center bg-black/40 transition-[backdrop-filter,opacity] duration-200 ease-out ${show ? "opacity-100 backdrop-blur-xl" : "opacity-0 backdrop-blur-0"
        }`}
      onMouseDown={handleClose}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={` rounded-xl w-[70vw] max-w-[900px] h-[85vh] overflow-hidden flex border border-theme-tertiary bg-theme-primary text-theme-primary transform transition-all duration-200 ease-out ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
      >
        <div className="w-64 bg-theme-quaternary border-r border-theme-tertiary flex flex-col p-4">
          <div className="flex items-center mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl animate-spin-slow">settings</span>
              <h2 className="text-lg font-semibold">{t("settings.title")}</h2>
            </div>
            { }
          </div>


          <div className="flex flex-col gap-1">
            <button
              onClick={() => setSection("profile")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${section === "profile" ? "bg-theme-tertiary" : "hover:bg-theme-hover"
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                person
              </span>
              <span className="text-sm">{t("settings.tabProfile")}</span>
            </button>

            <button
              onClick={() => setSection("projects")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${section === "projects" ? "bg-theme-tertiary" : "hover:bg-theme-hover"
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                folder
              </span>
              <span className="text-sm">{t("settings.tabProjects")}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="absolute top-3 right-5 rounded-full glassBackground">
              <button
                onClick={handleClose}
                className="flex items-center justify-center rounded-full p-1.5 hover:bg-theme-hover"
                aria-label={t("settings.close")}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  close
                </span>
              </button>
            </div>
            {statusMessage && (
              <div
                className={`mb-4 px-4 py-2 rounded text-sm ${statusType === "success"
                  ? "bg-green-700 text-white"
                  : statusType === "error"
                    ? "bg-red-700 text-white"
                    : "bg-theme-tertiary text-white"
                  }`}
              >
                {statusMessage}
              </div>
            )}

            {section === "profile" && (
              <div className="max-w-2xl">
                <h3 className="text-2xl font-semibold mb-6">{t("settings.sectionProfile")}</h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-theme-secondary">{t("settings.profilePicture")}</label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div
                          className="rounded-full overflow-hidden bg-theme-tertiary flex-shrink-0 relative group"
                          style={{ width: 80, height: 80 }}
                        >
                          {src ? (
                            <img src={src} alt={t("settings.userAvatarAlt")} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-theme-secondary font-bold text-2xl">
                              {usernameInitial}
                            </div>
                          )}
                          {isUploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-4 py-2 rounded-lg bg-theme-secondary hover:bg-theme-tertiary disabled:opacity-50 text-sm"
                        >
                          {t("settings.uploadPhoto")}
                        </button>
                        <button
                          onClick={handleDeleteAvatar}
                          disabled={isUploading}
                          className="px-4 py-2 rounded-lg border border-theme-tertiary hover:bg-theme-hover disabled:opacity-50 text-sm"
                        >
                          {t("settings.deleteAvatar")}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-theme-secondary">{t("settings.firstName")}</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-theme-secondary">{t("settings.lastName")}</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-theme-secondary">{t("settings.username")}</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                    />
                  </div>

                  <div className="border-t border-theme-tertiary pt-6">
                    <h4 className="text-lg font-semibold mb-4">{t("settings.defaultProjectMode")}</h4>
                    <p className="text-sm text-theme-secondary mb-4">{t("settings.defaultProjectModeDescription")}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleDefaultModeChange("code")}
                        className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${defaultMode === "code"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-theme-tertiary hover:border-theme-secondary hover:bg-theme-hover"
                          }`}
                      >
                        <span className="material-symbols-outlined text-2xl">code</span>
                        <span className="text-sm font-medium">{t("settings.codeEditor")}</span>
                      </button>

                      {/* VISUAL MODE - comentado temporalmente, descomentar para reactivar
                      <button
                        onClick={() => handleDefaultModeChange("visual")}
                        className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${defaultMode === "visual"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-theme-tertiary hover:border-theme-secondary hover:bg-theme-hover"
                          }`}
                      >
                        <span className="material-symbols-outlined text-2xl">palette</span>
                        <span className="text-sm font-medium">Visual Editor</span>
                      </button>
                      */}

                      <button
                        onClick={() => handleDefaultModeChange("chat")}
                        className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${defaultMode === "chat"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-theme-tertiary hover:border-theme-secondary hover:bg-theme-hover"
                          }`}
                      >
                        <span className="material-symbols-outlined text-2xl">chat</span>
                        <span className="text-sm font-medium">{t("settings.aiChat")}</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-theme-tertiary pt-6">
                    <h4 className="text-lg font-semibold mb-4">{t("settings.language")}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => i18n.changeLanguage("en")}
                        className={`flex items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${currentLang === "en"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-theme-tertiary hover:border-theme-secondary hover:bg-theme-hover"
                          }`}
                      >
                        <span className="text-sm font-medium">{t("settings.languageEnglish")}</span>
                      </button>
                      <button
                        onClick={() => i18n.changeLanguage("es")}
                        className={`flex items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${currentLang === "es"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-theme-tertiary hover:border-theme-secondary hover:bg-theme-hover"
                          }`}
                      >
                        <span className="text-sm font-medium">{t("settings.languageSpanish")}</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-theme-tertiary pt-6">
                    <h4 className="text-lg font-semibold mb-4">{t("settings.integrations")}</h4>
                    <div className="bg-theme-quaternary border border-theme-tertiary rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium">{t("settings.spotify")}</p>
                            <p className="text-sm text-theme-secondary">{t("settings.connectSpotifyAccount")}</p>
                          </div>
                        </div>
                        {spotifyConnected ? (
                          <button
                            onClick={handleSpotifyDisconnect}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
                          >
                            {t("settings.disconnect")}
                          </button>
                        ) : (
                          <button
                            onClick={handleSpotifyConnect}
                            disabled={isConnectingSpotify}
                            className="px-4 py-2 rounded-lg bg-[#1DB954] text-white hover:bg-[#1ed760] text-sm font-medium disabled:opacity-50"
                          >
                            {isConnectingSpotify ? t("settings.connecting") : t("settings.connect")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-theme-tertiary pt-6">
                    <h4 className="text-lg font-semibold mb-4">{t("settings.changePassword")}</h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-theme-secondary">{t("settings.currentPassword")}</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-theme-secondary">{t("settings.newPassword")}</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-theme-secondary">{t("settings.confirmNewPassword")}</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {section === "projects" && (
              <div className="max-w-2xl">
                <h3 className="text-2xl font-semibold mb-6">{t("settings.sectionProjects")}</h3>

                <div className="space-y-6">
                  <div className="bg-theme-quaternary border border-theme-tertiary rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold mb-1">{t("settings.deleteAllProjectsHeader")}</h4>
                        <p className="text-sm text-theme-secondary">
                          {t("settings.youHaveProjects", { count: projectCount })}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-red-500" style={{ fontSize: 32 }}>
                        delete_forever
                      </span>
                    </div>
                    <p className="text-sm text-theme-secondary mb-4">
                      {t("settings.deleteAllProjectsWarning")}
                    </p>
                    <button
                      onClick={() => setShowDeleteProjects(true)}
                      disabled={projectCount === 0}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white"
                    >
                      {t("settings.deleteAllProjectsButton")}
                    </button>
                  </div>

                  <div className="bg-theme-quaternary border border-theme-tertiary rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-2">{t("settings.exportProjectsHeader")}</h4>
                    <p className="text-sm text-theme-secondary mb-4">{t("settings.exportProjectsDescription")}</p>
                    <button disabled className="px-4 py-2 rounded-lg border border-theme-tertiary hover:bg-theme-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                      {t("settings.comingSoon")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {section === "profile" && (
            <div className="border-t border-theme-tertiary p-4 flex justify-end gap-2">
              <button onClick={handleClose} className="px-4 py-2 rounded-lg border border-theme-tertiary hover:bg-theme-hover">
                {t("settings.cancelButton")}
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-theme-inverted text-theme-inverted hover:brightness-95 disabled:opacity-50"
              >
                {isSaving ? t("settings.saving") : t("settings.saveChanges")}
              </button>
            </div>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <BasicModal
        open={showDeleteProjects}
        title={t("settings.deleteModalTitle")}
        description={t("settings.deleteModalDescription", { count: projectCount })}
        onClose={() => {
          setDeleteConfirmText("");
          setShowDeleteProjects(false);
        }}
        actions={
          <>
            <button
              onClick={() => {
                setDeleteConfirmText("");
                setShowDeleteProjects(false);
              }}
              className="px-4 py-2 rounded-lg border border-theme-tertiary hover:bg-theme-hover"
            >
              {t("settings.cancelButton")}
            </button>
            <button
              onClick={handleDeleteAllProjects}
              disabled={deleteConfirmText !== "DELETE ALL"}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white"
            >
              {t("settings.deleteAllConfirm")}
            </button>
          </>
        }
      >
        <input
          className="w-full rounded-lg bg-theme-quaternary border border-theme-tertiary px-3 py-2 text-sm"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder="DELETE ALL"
        />
      </BasicModal>
    </div>
  );
}
