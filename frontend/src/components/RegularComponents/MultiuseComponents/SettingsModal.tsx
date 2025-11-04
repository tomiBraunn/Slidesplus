// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { urlbackend } from "../../../config.js";
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
  const [language, setLanguage] = useState("en");
  const [defaultMode, setDefaultMode] = useState<ProjectMode>("chat");

  const [showDeleteProjects, setShowDeleteProjects] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [projectCount, setProjectCount] = useState(0);

  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | "">("");

  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.add("overflow-hidden");
    requestAnimationFrame(() => setShow(true));

    // Load default mode from cookies
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
          setOriginalAvatar(data.user.avatar ?? null);
          setFirstName(data.user.first_name);
          setLastName(data.user.last_name);
          setUsername(data.user.username);
        } else {
          setStatusMessage("Failed to fetch user.");
          setStatusType("error");
          clearStatusLater();
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setStatusMessage("Error fetching user.");
        setStatusType("error");
        clearStatusLater();
      } finally {
        setIsLoading(false);
      }
    };

    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
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
  }, []);

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
      setStatusMessage("Please select an image file.");
      setStatusType("error");
      clearStatusLater();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage("File size must be less than 5MB.");
      setStatusType("error");
      clearStatusLater();
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
        setStatusMessage("Avatar uploaded.");
        setStatusType("success");
        clearStatusLater();
      } else {
        const error = await response.json();
        setStatusMessage(error.message || "Error uploading avatar.");
        setStatusType("error");
        clearStatusLater();
      }
    } catch (error) {
      console.error("Error:", error);
      setStatusMessage("Error uploading avatar.");
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
        setStatusMessage("Avatar deleted.");
        setStatusType("success");
        clearStatusLater();
      } else {
        const error = await response.json();
        setStatusMessage(error.message || "Error deleting avatar.");
        setStatusType("error");
        clearStatusLater();
      }
    } catch (error) {
      console.error("Error:", error);
      setStatusMessage("Error deleting avatar.");
      setStatusType("error");
      clearStatusLater();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDefaultModeChange = (mode: ProjectMode) => {
    setDefaultMode(mode);
    setCookie("defaultMode", mode);
    setStatusMessage(`Default mode set to ${mode === "chat" ? "AI Chat" : mode === "code" ? "Code Editor" : "Visual Editor"}.`);
    setStatusType("success");
    clearStatusLater();
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
          setStatusMessage("New passwords do not match.");
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
          setStatusMessage("Profile updated.");
          setStatusType("success");
          setIsSaving(false);
          clearStatusLater();
          return;
        }
        setStatusMessage("No changes to save.");
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
        setStatusMessage("Profile updated successfully.");
        setStatusType("success");
        clearStatusLater();
      } else {
        const error = await response.json();
        setStatusMessage(error.message || "Error updating profile.");
        setStatusType("error");
        clearStatusLater();
      }
    } catch (error) {
      console.error("Error:", error);
      setStatusMessage("Error saving profile.");
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
        setStatusMessage("All projects deleted successfully.");
        setStatusType("success");
        clearStatusLater();
      } else {
        setStatusMessage("Error deleting projects.");
        setStatusType("error");
        clearStatusLater();
      }
    } catch (error) {
      console.error("Error:", error);
      setStatusMessage("Error deleting projects.");
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
    <h2 className="text-lg font-semibold">Settings</h2>
  </div>
  {}
  <button
    onClick={handleClose}
    className="ml-auto flex items-center justify-center rounded-full p-1.5 hover:bg-theme-hover"
    aria-label="Close"
  >
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
      close
    </span>
  </button>
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
              <span className="text-sm">Profile</span>
            </button>

            <button
              onClick={() => setSection("projects")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${section === "projects" ? "bg-theme-tertiary" : "hover:bg-theme-hover"
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                folder
              </span>
              <span className="text-sm">Projects</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
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
                <h3 className="text-2xl font-semibold mb-6">Profile</h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-theme-secondary">Profile Picture</label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div
                          className="rounded-full overflow-hidden bg-theme-tertiary flex-shrink-0 relative group"
                          style={{ width: 80, height: 80 }}
                        >
                          {src ? (
                            <img src={src} alt="User" className="w-full h-full object-cover" />
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
                          Upload Photo
                        </button>
                        <button
                          onClick={handleDeleteAvatar}
                          disabled={isUploading}
                          className="px-4 py-2 rounded-lg border border-theme-tertiary hover:bg-theme-hover disabled:opacity-50 text-sm"
                        >
                          Delete Avatar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-theme-secondary">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-theme-secondary">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-theme-secondary">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                    />
                  </div>

                  <div className="border-t border-theme-tertiary pt-6">
                    <h4 className="text-lg font-semibold mb-4">Default Project Mode</h4>
                    <p className="text-sm text-theme-secondary mb-4">Choose which mode opens by default when you open a project</p>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => handleDefaultModeChange("code")}
                        className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${
                          defaultMode === "code"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-theme-tertiary hover:border-theme-secondary hover:bg-theme-hover"
                        }`}
                      >
                        <span className="material-symbols-outlined text-2xl">code</span>
                        <span className="text-sm font-medium">Code Editor</span>
                      </button>

                      <button
                        onClick={() => handleDefaultModeChange("visual")}
                        className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${
                          defaultMode === "visual"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-theme-tertiary hover:border-theme-secondary hover:bg-theme-hover"
                        }`}
                      >
                        <span className="material-symbols-outlined text-2xl">palette</span>
                        <span className="text-sm font-medium">Visual Editor</span>
                      </button>

                      <button
                        onClick={() => handleDefaultModeChange("chat")}
                        className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${
                          defaultMode === "chat"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-theme-tertiary hover:border-theme-secondary hover:bg-theme-hover"
                        }`}
                      >
                        <span className="material-symbols-outlined text-2xl">chat</span>
                        <span className="text-sm font-medium">AI Chat</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-theme-tertiary pt-6">
                    <h4 className="text-lg font-semibold mb-4">Integrations</h4>
                    <div className="bg-theme-quaternary border border-theme-tertiary rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium">Spotify</p>
                            <p className="text-sm text-theme-secondary">Connect your Spotify account</p>
                          </div>
                        </div>
                        <button className="px-4 py-2 rounded-lg bg-[#1DB954] text-white hover:bg-[#1ed760] text-sm font-medium">
                          Connect
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-theme-tertiary pt-6">
                    <h4 className="text-lg font-semibold mb-4">Change Password</h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-theme-secondary">Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-theme-secondary">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-theme-quaternary border border-theme-tertiary focus:border-theme-secondary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-theme-secondary">Confirm New Password</label>
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
                <h3 className="text-2xl font-semibold mb-6">Projects</h3>

                <div className="space-y-6">
                  <div className="bg-theme-quaternary border border-theme-tertiary rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold mb-1">Delete All Projects</h4>
                        <p className="text-sm text-theme-secondary">
                          You have {projectCount} project{projectCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-red-500" style={{ fontSize: 32 }}>
                        delete_forever
                      </span>
                    </div>
                    <p className="text-sm text-theme-secondary mb-4">
                      This action will permanently delete all your projects. This cannot be undone.
                    </p>
                    <button
                      onClick={() => setShowDeleteProjects(true)}
                      disabled={projectCount === 0}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white"
                    >
                      Delete All Projects
                    </button>
                  </div>

                  <div className="bg-theme-quaternary border border-theme-tertiary rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-2">Export Projects</h4>
                    <p className="text-sm text-theme-secondary mb-4">Download all your projects as a backup file</p>
                    <button disabled className="px-4 py-2 rounded-lg border border-theme-tertiary hover:bg-theme-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {section === "profile" && (
            <div className="border-t border-theme-tertiary p-4 flex justify-end gap-2">
              <button onClick={handleClose} className="px-4 py-2 rounded-lg border border-theme-tertiary hover:bg-theme-hover">
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-theme-inverted text-theme-inverted hover:brightness-95 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <BasicModal
        open={showDeleteProjects}
        title="Delete All Projects"
        description={`This will permanently delete all ${projectCount} projects. Type "DELETE ALL" to confirm.`}
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
              Cancel
            </button>
            <button
              onClick={handleDeleteAllProjects}
              disabled={deleteConfirmText !== "DELETE ALL"}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white"
            >
              Delete All
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
