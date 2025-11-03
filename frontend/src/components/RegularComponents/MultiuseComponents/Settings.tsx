// @ts-nocheck
import React, { useState } from "react";
import { urlbackend } from "../../../config.js"

function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCleanAllProjects = async () => {
    if (!confirm("Are you sure you want to delete all projects? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${urlbackend}/projects`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data?.message || "Failed to delete projects.");
        setLoading(false);
        return;
      }

      alert("All projects deleted successfully.");
      setIsOpen(false);
    } catch (e) {
      alert("Error connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <span
        className="material-symbols-outlined flex items-center justify-center text-[#4B4B4B] text-[40px] cursor-pointer"
        style={{ fontSize: "32.5px" }}
        onClick={() => setIsOpen(true)}
      >
        settings
      </span>

      {isOpen && (
        <div className="fixed z-50 inset-0 flex items-center justify-center bg-black/40 transition-[backdrop-filter,opacity] duration-200 ease-out opacity-100 backdrop-blur-xl">
          <div className="text-white rounded-xl defaultStyle card-animate w-[70vw] max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col border border-white/10 bg-[#0b0b0bcc] transform transition-all duration-200 ease-out backdrop-bl-sm opacity-100 scale-100">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 w-full p-4">
              <div className="flex items-start flex-col">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 35 }}>
                    settings
                  </span>
                  <p className="text-white font-medium text-lg">Settings</p>
                </div>
                <p className="text-[#999999] text-sm">Options</p>
              </div>
              <button
                className="flex items-center justify-center rounded-full p-2 hover:bg-white/10 text-white"
                aria-label="Close"
                title="Close"
                onClick={() => setIsOpen(false)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                  close
                </span>
              </button>
            </div>

            {/* Body */}
            <div className="flex items-start justify-start gap-2 w-full h-full px-4 pb-2">
              <div className="text-white rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] w-full p-4 flex flex-col gap-3">
                <button className="text-left px-4 py-2 rounded hover:bg-[#222]">Profile Picture</button>
                <button className="text-left px-4 py-2 rounded hover:bg-[#222]">Change Info</button>
                <button className="text-left px-4 py-2 rounded hover:bg-[#222]">Language</button>
                <button className="text-left px-4 py-2 rounded hover:bg-[#222]">Export Data</button>
                <button
                  onClick={handleCleanAllProjects}
                  disabled={loading}
                  className="text-left px-4 py-2 rounded text-red-500 hover:bg-[#222] disabled:opacity-60"
                >
                  {loading ? "Deleting..." : "Clean all projects"}
                </button>
                <button className="text-left px-4 py-2 rounded text-red-500 hover:bg-[#222]">Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Settings;
