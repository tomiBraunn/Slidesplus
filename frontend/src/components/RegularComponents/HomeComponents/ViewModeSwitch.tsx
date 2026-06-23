import { useTranslation } from "react-i18next";

type Props = {
    viewMode: "grid" | "list";
    setViewMode: (mode: "grid" | "list") => void;
};

function ViewModeSwitch({ viewMode, setViewMode }: Props) {
    const { t } = useTranslation();
    const handleToggle = () => {
        const newMode = viewMode === "grid" ? "list" : "grid";
        setViewMode(newMode);
        // Save to cookies
        document.cookie = `viewMode=${newMode}; path=/; max-age=31536000`; // 1 year
    };

    return (
        <button
            onClick={handleToggle}
            className="flex items-center justify-center bg-theme-primary border border-theme-tertiary text-theme-primary transition-colors duration-300 rounded-full h-full p-3"
            title={viewMode === "grid" ? t("viewMode.switchToList") : t("viewMode.switchToGrid")}
        >
            <span className="material-symbols-outlined cursor-pointer select-none">
                {viewMode === "grid" ? "view_comfy_alt" : "dehaze"}
            </span>
        </button>
    );
}

export default ViewModeSwitch;
