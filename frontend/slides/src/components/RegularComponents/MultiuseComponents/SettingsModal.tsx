import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { urlbackend } from "../../../config.js";

type Props = {
  onClose: () => void;
};

function SettingsModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false);

  const handleCleanAllProjects = async () => {
    if (!confirm("Are you sure you want to delete all projects? This action cannot be undone.")) return;

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
      onClose();
    } catch (e) {
      alert("Error connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-[70vw] max-w-[600px] rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b0b0b]/90 to-[#101010]/90 shadow-2xl backdrop-blur-xl p-6 text-white"
        >
          {}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#8a8aff]" style={{ fontSize: 30 }}>
                settings
              </span>
              <div>
                <h2 className="text-xl font-semibold">Settings</h2>
                <p className="text-sm text-white/60">Program Options</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-full p-2 hover:bg-white/10 transition"
              aria-label="Close"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                close
              </span>
            </button>
          </div>

          {}
          <div className="w-full h-px bg-white/10 mb-4" />

          {}
          <div className="flex flex-col gap-2">
            {[
              { label: "Profile Picture", color: "text-white" },
              { label: "Change Info", color: "text-white" },
              { label: "Language", color: "text-white" },
              { label: "Export Data", color: "text-white" },
            ].map((item, index) => (
              <button
                key={index}
                className={`w-full text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 hover:pl-5 transition-all duration-200 ${item.color}`}
              >
                {item.label}
              </button>
            ))}

            <button
              onClick={handleCleanAllProjects}
              disabled={loading}
              className="w-full text-left px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 hover:pl-5 text-red-400 transition-all duration-200 disabled:opacity-60"
            >
              {loading ? "Deleting..." : "Clean all projects"}
            </button>
          </div>

          {}
          <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/5 shadow-[0_0_30px_#7182ff15]" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SettingsModal;
