import React from "react";
import SortBy from "./SortBy";
import ViewModeSwitch from "./ViewModeSwitch";
import SearchBar from "./SearchBar";

type Props = {
    onAddClick: () => void;
    viewMode: "grid" | "list";
    setViewMode: (mode: "grid" | "list") => void;
};

function ProjectSearchBar({ onAddClick, viewMode, setViewMode }: Props) {
    return (
        <div className="flex items-center justify-center gap-2 pt-5 w-full">
            <SearchBar onAddClick={onAddClick} />
            <ViewModeSwitch viewMode={viewMode} setViewMode={setViewMode} />
            <SortBy />
        </div>
    );
}

export default ProjectSearchBar;
