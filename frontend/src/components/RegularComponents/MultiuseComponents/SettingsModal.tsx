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

type Section = "profile" | "projects" | "data";

function ensureDataUrl(v?: string | null): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("data:")) return v;
  if (v.startsWith("http")) return v;
  return `data:image/svg+xml;base64,${v}`;
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

  const [showDeleteProjects, setShowDeleteProjects] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [projectCount, setProjectCount] = useState(0);

  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | "">("");

  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.add("overflow-hidden");
    requestAnimationFrame(() => setShow(true));
    return () => {
      document.documentElement.classList.remove("overflow-hidden");
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
        className={`text-white rounded-xl w-[70vw] max-w-[900px] h-[85vh] overflow-hidden flex border border-white/10 bg-[#0b0b0bcc] transform transition-all duration-200 ease-out ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
      >
        <div className="w-64 bg-[#0f0f0f] border-r border-[#2B2B2B] flex flex-col p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Settings</h2>
            <button
              onClick={handleClose}
              className="flex items-center justify-center rounded-full p-1.5 hover:bg-white/10"
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${section === "profile" ? "bg-[#2B2B2B]" : "hover:bg-[#1a1a1a]"
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                person
              </span>
              <span className="text-sm">Profile</span>
            </button>

            <button
              onClick={() => setSection("projects")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${section === "projects" ? "bg-[#2B2B2B]" : "hover:bg-[#1a1a1a]"
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                folder
              </span>
              <span className="text-sm">Projects</span>
            </button>

            <button
              onClick={() => setSection("data")}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${section === "data" ? "bg-[#2B2B2B]" : "hover:bg-[#1a1a1a]"
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                database
              </span>
              <span className="text-sm">Data</span>
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
                      : "bg-gray-700 text-white"
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
                    <label className="block text-sm font-medium mb-3">Profile Picture</label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div
                          className="rounded-full overflow-hidden bg-gray-200 flex-shrink-0 relative group"
                          style={{ width: 80, height: 80 }}
                        >
                          {src ? (
                            <img src={src} alt="User" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-2xl">
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
                          className="px-4 py-2 rounded-lg bg-[#2B2B2B] hover:bg-[#3a3a3a] disabled:opacity-50 text-sm"
                        >
                          Upload Photo
                        </button>
                        <button
                          onClick={handleDeleteAvatar}
                          disabled={isUploading}
                          className="px-4 py-2 rounded-lg border border-[#2B2B2B] hover:bg-[#1a1a1a] disabled:opacity-50 text-sm"
                        >
                          Delete Avatar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-[#2B2B2B] focus:border-[#4B4B4B] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-[#2B2B2B] focus:border-[#4B4B4B] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-[#2B2B2B] focus:border-[#4B4B4B] outline-none"
                    />
                  </div>

                  <div className="border-t border-[#2B2B2B] pt-6">
                    <h4 className="text-lg font-semibold mb-4">Change Password</h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-[#2B2B2B] focus:border-[#4B4B4B] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-[#2B2B2B] focus:border-[#4B4B4B] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-[#2B2B2B] focus:border-[#4B4B4B] outline-none"
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
                  <div className="bg-[#0f0f0f] border border-[#2B2B2B] rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold mb-1">Delete All Projects</h4>
                        <p className="text-sm text-gray-400">
                          You have {projectCount} project{projectCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-red-500" style={{ fontSize: 32 }}>
                        delete_forever
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-4">
                      This action will permanently delete all your projects. This cannot be undone.
                    </p>
                    <button
                      onClick={() => setShowDeleteProjects(true)}
                      disabled={projectCount === 0}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Delete All Projects
                    </button>
                  </div>

                  <div className="bg-[#0f0f0f] border border-[#2B2B2B] rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-2">Export Projects</h4>
                    <p className="text-sm text-gray-400 mb-4">Download all your projects as a backup file</p>
                    <button disabled className="px-4 py-2 rounded-lg border border-[#2B2B2B] hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            )}

            {section === "data" && (
              <div className="max-w-2xl">
                <h3 className="text-2xl font-semibold mb-6">Data & Privacy</h3>
                <div className="bg-[#0f0f0f] border border-[#2B2B2B] rounded-lg p-6">
                  <p className="text-sm text-gray-400">Data management features coming soon.</p>
                </div>
              </div>
            )}
          </div>

          {section === "profile" && (
            <div className="border-t border-[#2B2B2B] p-4 flex justify-end gap-2">
              <button onClick={handleClose} className="px-4 py-2 rounded-lg border border-[#2B2B2B] hover:bg-[#1a1a1a]">
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-[#d0d0d0] text-black hover:brightness-95 disabled:opacity-50"
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
              className="px-4 py-2 rounded-lg border border-[#2B2B2B] hover:bg-[#1a1a1a]"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAllProjects}
              disabled={deleteConfirmText !== "DELETE ALL"}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              Delete All
            </button>
          </>
        }
      >
        <input
          className="w-full rounded-lg bg-[#0f0f0f] border border-[#2B2B2B] px-3 py-2 text-sm text-white"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder="DELETE ALL"
        />
      </BasicModal>
    </div>
  );
}
