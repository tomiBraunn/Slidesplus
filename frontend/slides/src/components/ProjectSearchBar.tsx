import React from 'react';
import SortBy from './SortBy';

function ProjectSearchBar() {
    return (
        <>
            <div className="flex items-center justify-center gap-2 pt-5 w-full">
                {/* search bar */}
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
                    <div className="flex items-center justify-center bg-[#1F1F1F] text-white rounded-r-full ml-2">
                        <span className="material-symbols-outlined cursor-pointer select-none w-[2em] aspect-square">
                            add
                        </span>
                    </div>
                </div>

                {/* view options */}
                <div className="flex items-center justify-center bg-[#1F1F1F] text-white rounded-full gap-0 h-fit">
                    <span className="material-symbols-outlined cursor-pointer select-none w-[2em] aspect-square">
                        view_comfy_alt
                    </span>
                    <span className="w-[1px] h-7 bg-[#999999]"></span>
                    <span className="material-symbols-outlined cursor-pointer select-none w-[2em] aspect-square">
                        dehaze
                    </span>
                </div>

                <SortBy />
            </div>
        </>
    );
}

export default ProjectSearchBar;