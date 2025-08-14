import React from 'react';

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
                        <span className="material-symbols-outlined select-none flex">
                            search
                        </span>
                    </div>
                    <div className="flex items-center justify-center bg-[#1F1F1F] text-white rounded-r-full ml-2">
                        <span className="material-symbols-outlined cursor-pointer select-none">
                            add
                        </span>
                    </div>
                </div>

                {/* view options */}
                <div className="flex items-center justify-center bg-[#1F1F1F] text-white rounded-full gap-0 h-fit">
                    <span className="material-symbols-outlined cursor-pointer select-none">
                        view_comfy_alt
                    </span>
                    <span className="w-[1px] h-7 bg-[#999999]"></span>
                    <span className="material-symbols-outlined cursor-pointer select-none">
                        dehaze
                    </span>
                </div>

                {/* sort by */}
                <div className="flex items-center justify-center bg-[#1F1F1F] text-white rounded-full gap-1 px-3 h-fit cursor-pointer select-none text-xl">
                    <p>Sort by:</p>
                    <span className="material-symbols-outlined">
                        arrow_drop_up
                    </span>
                </div>
            </div>
        </>
    );
}

export default ProjectSearchBar;
