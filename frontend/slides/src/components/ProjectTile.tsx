import React from 'react';

function ProjectTile() {
    const projectName: string = "Title";
    const projectDescription: string = "description";

    return (
        <>
            <div className="flex flex-col items-start justify-start gap-1 bg-[#1F1F1F] text-white p-3 rounded-xl w-[16rem]">
                <span className="material-symbols-outlined aspect-square" style={{ fontSize: "35px" }}>
                    crop_landscape
                </span>
                <div className="flex flex-col items-start justify-start gap-2">
                    <p id="projectName" className="text-[clamp(16px,2vw,32px)]">{projectName}</p>
                    <p id="projectDescription" className="text-[clamp(10px,1.5vw,16px)] select-none text-[#999999]">{projectDescription}</p>
                </div>
            </div>
        </>
    );
}


export default ProjectTile;
