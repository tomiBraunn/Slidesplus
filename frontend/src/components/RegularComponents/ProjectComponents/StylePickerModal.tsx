import React, { useEffect, useState } from "react";
import SpotlightCard from "../MultiuseComponents/SpotlightCard";
import { getTemplateCatalog, getCachedCatalog, type Template } from "../../../utils/templateCatalog";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApplyStyle: (templateName: string) => void;
  onRegenerate: (templateName: string) => void;
};

function TemplateCard({ template, onApplyStyle, onRegenerate }: {
  template: Template;
  onApplyStyle: (name: string) => void;
  onRegenerate: (name: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);

  const displayName = template.name
    .replace(/^html-ppt-zhangzara-|^html-ppt-|^kami-|^open-design-|^ib-/, "")
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <SpotlightCard
      className="rounded-[15px] bg-theme-quaternary backdrop-blur-xl border border-theme-tertiary transition-all duration-300 w-full cursor-pointer flex flex-col gap-2 overflow-hidden group p-1.5 hover:bg-theme-hover"
      spotlightColor="rgba(255, 255, 255, 0.15)"
    >
      {/* Preview */}
      <div className="w-full aspect-[16/9] overflow-hidden relative rounded-[10px] border border-theme-tertiary bg-[#0a0a0a]">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-[#7182FF] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe
          src={`/templates/${template.name}/example.html`}
          style={{
            transform: "scale(0.25)",
            transformOrigin: "top left",
            width: "400%",
            height: "400%",
            border: "none",
            pointerEvents: "none",
            position: "absolute",
            top: 0,
            left: 0,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.3s",
          }}
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
          title={template.name}
        />
      </div>

      {/* Name + actions */}
      <div className="flex items-center gap-1 pl-1">
        <p className="truncate flex-1 text-left text-sm font-medium text-theme-primary" title={displayName}>
          {displayName}
        </p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onApplyStyle(template.name); }}
            className="px-2 py-1 text-xs font-medium rounded-lg border border-theme-tertiary bg-theme-primary hover:bg-theme-hover text-theme-primary transition-colors"
          >
            Style
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRegenerate(template.name); }}
            className="px-2 py-1 text-xs font-medium rounded-lg border border-[#7182FF]/40 bg-[#7182FF]/10 hover:bg-[#7182FF]/20 text-[#7182FF] transition-colors"
          >
            Regen
          </button>
        </div>
      </div>
    </SpotlightCard>
  );
}

export default function StylePickerModal({ isOpen, onClose, onApplyStyle, onRegenerate }: Props) {
  // Seed from the shared cache so reopening is instant.
  const [templates, setTemplates] = useState<Template[]>(() => getCachedCatalog() ?? []);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (templates.length > 0) return;
    setLoading(true);
    getTemplateCatalog()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [templates.length]);

  const filtered = templates.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.includes(q) || t.description.toLowerCase().includes(q);
  });

  // Keep the modal (and its loaded preview iframes) mounted; just hide it.
  // Re-opening then shows already-rendered previews instead of reloading them.
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ display: isOpen ? "flex" : "none" }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 flex flex-col bg-theme-primary border border-theme-tertiary rounded-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-tertiary">
          <div>
            <h2 className="text-base font-semibold text-theme-primary">Style Picker</h2>
            <p className="text-xs text-theme-secondary mt-0.5">{templates.length} templates available</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search styles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-52 px-3 py-1.5 text-sm bg-theme-quaternary border border-theme-tertiary rounded-lg text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-[#7182FF] transition-colors"
            />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#7182FF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-theme-secondary">
              No templates found
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(t => (
                <TemplateCard
                  key={t.name}
                  template={t}
                  onApplyStyle={name => { onApplyStyle(name); onClose(); }}
                  onRegenerate={name => { onRegenerate(name); onClose(); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
