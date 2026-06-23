import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SpotlightCard from "../MultiuseComponents/SpotlightCard";
import { getTemplateCatalog, getCachedCatalog, type Template } from "../../../utils/templateCatalog";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApplyStyle: (templateName: string) => void;
  onRegenerate: (templateName: string) => void;
  onInsertComponent: (sections: string[]) => void;
};

type SectionKey = "templates" | "games";

/* ── Templates section ─────────────────────────────────────────────── */

function TemplateCard({ template, onApplyStyle, onRegenerate }: {
  template: Template;
  onApplyStyle: (name: string) => void;
  onRegenerate: (name: string) => void;
}) {
  const { t } = useTranslation();
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

      <div className="flex items-center gap-1 pl-1">
        <p className="truncate flex-1 text-left text-sm font-medium text-theme-primary" title={displayName}>
          {displayName}
        </p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onApplyStyle(template.name); }}
            className="px-2 py-1 text-xs font-medium rounded-lg border border-theme-tertiary bg-theme-primary hover:bg-theme-hover text-theme-primary transition-colors"
          >
            {t("componentsModal.styleBtn")}
            </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRegenerate(template.name); }}
            className="px-2 py-1 text-xs font-medium rounded-lg border border-[#7182FF]/40 bg-[#7182FF]/10 hover:bg-[#7182FF]/20 text-[#7182FF] transition-colors"
          >
            {t("componentsModal.regenBtn")}
          </button>
        </div>
      </div>
    </SpotlightCard>
  );
}

function TemplatesSection({ onApplyStyle, onRegenerate, onClose }: {
  onApplyStyle: (name: string) => void;
  onRegenerate: (name: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
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

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-theme-tertiary flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-theme-primary">{t("componentsModal.templateSection")}</h3>
          <p className="text-xs text-theme-secondary mt-0.5">{t("componentsModal.templatesAvailable", { count: templates.length })}</p>
        </div>
        <input
          type="text"
          placeholder={t("componentsModal.searchPlaceholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-52 px-3 py-1.5 text-sm bg-theme-quaternary border border-theme-tertiary rounded-lg text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-[#7182FF] transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#7182FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-theme-secondary">
            {t("componentsModal.noTemplatesFound")}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-min content-start">
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
  );
}

/* ── Games section ─────────────────────────────────────────────────── */

type GameComponent = {
  key: string;
  name: string;
  description: string;
  path: string; // fetched and inserted as a new slide
};

const GAME_COMPONENTS: GameComponent[] = [
  {
    key: "quiz",
    name: "Quiz",
    description: "Quiz multi-pregunta autocontenido: opciones, feedback, puntaje y reintentar.",
    path: "/components/games/quiz/example.html",
  },
];

function GameCard({ game, onInsert, inserting }: {
  game: GameComponent;
  onInsert: (game: GameComponent) => void;
  inserting: boolean;
}) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);

  return (
    <SpotlightCard
      className="rounded-[15px] bg-theme-quaternary backdrop-blur-xl border border-theme-tertiary transition-all duration-300 w-full flex flex-col gap-2 overflow-hidden group p-1.5 hover:bg-theme-hover"
      spotlightColor="rgba(255, 255, 255, 0.15)"
    >
      <div className="w-full aspect-[16/9] overflow-hidden relative rounded-[10px] border border-theme-tertiary bg-[#0a0a0a]">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-[#7182FF] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe
          src={game.path}
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
          title={game.name}
        />
      </div>

      <div className="flex flex-col gap-1.5 px-1 pb-1">
        <p className="text-left text-sm font-medium text-theme-primary">{game.name}</p>
        <p className="text-left text-xs text-theme-secondary line-clamp-2">{game.description}</p>
        <button
          onClick={() => onInsert(game)}
          disabled={inserting}
          className="mt-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-theme-inverted text-theme-inverted hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {inserting ? t("componentsModal.inserting") : t("componentsModal.insertBtn")}
        </button>
      </div>
    </SpotlightCard>
  );
}

function GamesSection({ onInsertComponent, onClose }: {
  onInsertComponent: (sections: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [inserting, setInserting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInsert = async (game: GameComponent) => {
    setInserting(game.key);
    setError(null);
    try {
      const res = await fetch(game.path);
      if (!res.ok) throw new Error(`Failed to load component (${res.status})`);
      const html = await res.text();
      const sections = html.match(/<section[\s\S]*?<\/section>/gi);
      if (!sections || sections.length === 0) throw new Error("Component has no <section>");
      onInsertComponent(sections.map(s => s.trim()));
      onClose();
    } catch (e: any) {
      setError(e?.message || t("componentsModal.insertFailed"));
    } finally {
      setInserting(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-3 border-b border-theme-tertiary flex-shrink-0">
        <h3 className="text-sm font-semibold text-theme-primary">{t("componentsModal.gamesSection")}</h3>
        <p className="text-xs text-theme-secondary mt-0.5">{t("componentsModal.interactiveComponents")}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {error && (
          <div className="mb-4 px-3 py-2 text-xs rounded-lg border border-red-500/40 bg-red-500/10 text-red-400">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-min content-start">
          {GAME_COMPONENTS.map(g => (
            <GameCard key={g.key} game={g} onInsert={handleInsert} inserting={inserting === g.key} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Modal shell with sidebar ──────────────────────────────────────── */

const SIDEBAR_ITEMS: { key: SectionKey; label: string; tKey: string; icon: React.ReactNode }[] = [
  {
    key: "templates",
    label: "Templates",
    tKey: "componentsModal.templatesTab",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    key: "games",
    label: "Games",
    tKey: "componentsModal.gamesTab",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function ComponentsModal({ isOpen, onClose, onApplyStyle, onRegenerate, onInsertComponent }: Props) {
  const { t } = useTranslation();
  const [active, setActive] = useState<SectionKey>("templates");

  // Keep the modal mounted (preserving loaded preview iframes); just hide it.
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ display: isOpen ? "flex" : "none" }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 flex flex-col bg-theme-primary border border-theme-tertiary rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-tertiary flex-shrink-0">
          <h2 className="text-base font-semibold text-theme-primary">{t("componentsModal.title")}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <nav className="w-44 flex-shrink-0 border-r border-theme-tertiary p-3 flex flex-col gap-1">
            {SIDEBAR_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  active === item.key
                    ? "bg-theme-quaternary text-theme-primary"
                    : "text-theme-secondary hover:text-theme-primary hover:bg-theme-quaternary/60"
                }`}
              >
                {item.icon}
                {t(item.tKey)}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 min-h-0">
            {active === "templates" ? (
              <TemplatesSection onApplyStyle={onApplyStyle} onRegenerate={onRegenerate} onClose={onClose} />
            ) : (
              <GamesSection onInsertComponent={onInsertComponent} onClose={onClose} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
