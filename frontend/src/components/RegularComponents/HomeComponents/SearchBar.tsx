import { useState } from "react";

type Props = {
  onAddClick: () => void;
  setFiltrar: (value: string) => void;
};

export default function SearchBar({ onAddClick, setFiltrar }: Props) {
  const [search, setSearch] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setFiltrar(value);
  };

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-1 items-center justify-start rounded-l-full w-fit h-fit min-h-[50px] defaultStyle defaultStyleHover px-0.5">
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={handleChange}
          className="text-white px-4 rounded-l-full focus:outline-none w-full bg-transparent"
        />
        <span className="material-symbols-outlined select-none flex w-[2em] aspect-square">
          search
        </span>
      </div>
      <button
        type="button"
        className="flex items-center justify-center rounded-xl defaultStyle defaultStyleHover rounded-r-full ml-2 cursor-pointer"
        onClick={onAddClick}
      >
        <span className="material-symbols-outlined w-[2em] aspect-square">add</span>
      </button>
    </div>
  );
}
