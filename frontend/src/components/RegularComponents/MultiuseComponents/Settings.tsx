// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { urlbackend } from "../../../config.js"

const ADMIN_MODELS = [
  { id: "gpt-4o", label: "GPT-4o", color: "#249931" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", color: "#249931" },
]

function Settings() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem("selectedModel") || "gpt-4o");
  const lang = i18n.resolvedLanguage === "es" ? "es" : "en";
  const setLang = (l: string) => i18n.changeLanguage(l);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${urlbackend}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data?.user?.is_admin) setIsAdmin(true) })
      .catch(() => {});
  }, []);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem("selectedModel", modelId);
  };

  const handleCleanAllProjects = async () => {
    if (!confirm(t("settings.confirmCleanAll"))) {
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
        alert(data?.message || t("settings.cleanAllFailed"));
        setLoading(false);
        return;
      }

      alert(t("settings.cleanAllSuccess"));
      setIsOpen(false);
    } catch (e) {
      alert(t("settings.serverError"));
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
          <div className="text-white rounded-xl bg-theme-primary border border-theme-tertiary text-theme-primary transition-colors duration-300 card-animate w-[70vw] max-w-[1100px] max-h-[85vh] overflow-hidden flex flex-col border border-white/10 bg-[#0b0b0bcc] transform transition-all duration-200 ease-out backdrop-bl-sm opacity-100 scale-100">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 w-full p-4">
              <div className="flex items-start flex-col">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 35 }}>
                    settings
                  </span>
                  <p className="text-white font-medium text-lg">{t("settings.title")}</p>
                </div>
                <p className="text-[#999999] text-sm">{t("settings.subtitle")}</p>
              </div>
              <button
                className="flex items-center justify-center rounded-full p-2 hover:bg-white/10 text-white"
                aria-label={t("common.close")}
                title={t("common.close")}
                onClick={() => setIsOpen(false)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                  close
                </span>
              </button>
            </div>
            <div className="flex items-start justify-start gap-2 w-full h-full px-4 pb-2">
              <div className="text-white rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] w-full p-4 flex flex-col gap-3">
                <button className="text-left px-4 py-2 rounded hover:bg-[#222]">{t("settings.profilePicture")}</button>
                <button className="text-left px-4 py-2 rounded hover:bg-[#222]">{t("settings.changeInfo")}</button>

                {/* Language toggle */}
                <div className="px-4 py-2">
                  <p className="text-sm text-[#999999] mb-2">{t("settings.language")}</p>
                  <div className="inline-flex rounded-lg border border-[#2B2B2B] overflow-hidden">
                    {([
                      ["en", t("settings.languageEnglish")],
                      ["es", t("settings.languageSpanish")],
                    ] as const).map(([code, label]) => (
                      <button
                        key={code}
                        onClick={() => setLang(code)}
                        className={`px-4 py-1.5 text-sm transition-colors ${lang === code ? "bg-white text-black font-medium" : "text-[#999] hover:bg-[#222]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <div className="px-4 py-2">
                    <p className="text-sm text-[#999999] mb-1">{t("settings.aiModel")}</p>
                    <p className="text-xs text-[#666] mb-2">{t("settings.aiModelAdmin")}</p>
                    <div className="flex gap-2 flex-wrap">
                      {ADMIN_MODELS.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleModelChange(m.id)}
                          className={`px-4 py-2 rounded transition-colors text-sm ${
                            selectedModel === m.id
                              ? "text-white"
                              : "bg-[#222] text-[#999] hover:bg-[#333]"
                          }`}
                          style={selectedModel === m.id ? { backgroundColor: m.color } : {}}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button className="text-left px-4 py-2 rounded hover:bg-[#222]">{t("settings.exportData")}</button>
                <button
                  onClick={handleCleanAllProjects}
                  disabled={loading}
                  className="text-left px-4 py-2 rounded text-red-500 hover:bg-[#222] disabled:opacity-60"
                >
                  {loading ? t("settings.deleting") : t("settings.cleanAllProjects")}
                </button>
                <button className="text-left px-4 py-2 rounded text-red-500 hover:bg-[#222]">{t("common.signOut")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Settings;
