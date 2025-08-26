import React from "react";

type Props = {
    onAddClick: () => void;
};

function SearchBar({ onAddClick }: Props) {
    return (
        <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-1 items-center justify-start bg-[#1F1F1F] text-white rounded-l-full w-fit h-fit min-h-[48px]">
                <input
                    type="text"
                    placeholder="Search"
                    className="bg-[#1F1F1F] text-white px-4 rounded-l-full focus:outline-none w-full"
                />
                <span className="material-symbols-outlined select-none flex w-[2em] aspect-square">
                    search
                </span>
            </div>
            <div
                className="flex items-center justify-center bg-[#1F1F1F] text-white rounded-r-full ml-2 cursor-pointer"
                onClick={onAddClick}
            >
                <span className="material-symbols-outlined w-[2em] aspect-square">
                    add
                </span>
            </div>
        </div>
    );
}

export default SearchBar;
