import SortBy from "./SortBy";
import ViewModeSwitch from "./ViewModeSwitch";
import SearchBar from "./SearchBar";

type Props = {
  onAddClick: () => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  setFiltrar: (value: string) => void;
  selected: string;
  setSelected: (value: string) => void;
};

export default function ProjectSearchBar({
  onAddClick,
  viewMode,
  setViewMode,
  setFiltrar,
  selected,
  setSelected,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-2 pt-5 w-full">
      <SearchBar onAddClick={onAddClick} setFiltrar={setFiltrar} />
      <ViewModeSwitch viewMode={viewMode} setViewMode={setViewMode} />
      <SortBy selected={selected} setSelected={setSelected} />
    </div>
  );
}
