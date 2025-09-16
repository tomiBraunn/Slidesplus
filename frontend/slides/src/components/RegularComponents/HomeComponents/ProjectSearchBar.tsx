import React from "react";
import SortBy from "./SortBy";
import ViewModeSwitch from "./ViewModeSwitch";
import SearchBar from "./SearchBar";

type Props = {
    onAddClick: () => void;
    viewMode: "grid" | "list";
    setViewMode: (mode: "grid" | "list") => void;
    setFiltrar: (value:string)=> void;
};

function ProjectSearchBar({ onAddClick, viewMode, setViewMode, setFiltrar }: Props) {
    return (
        <div className="flex items-center justify-center gap-2 pt-5 w-full">
            <SearchBar onAddClick={onAddClick} setFiltrar={setFiltrar} />
            <ViewModeSwitch viewMode={viewMode} setViewMode={setViewMode} />
            <SortBy />
        </div>
    );
}

export default ProjectSearchBar;
