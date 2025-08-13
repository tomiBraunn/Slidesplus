import React from 'react';

function ProjectTile() {
    const projectName: string = "Title";
    const projectDescription: string = "description";

    return (
        <>
        <div className="flex items-center justify-center">
            <div className="flex items-start justify-center flex-col flex gap-1 bg-[#1F1F1F] text-white px-2 rounded-lg aspect-video w-50">
                <span className="material-symbols-outlined aspect-square">
                    crop_landscape
                </span>
                <div className="flex items-start justify-start flex-col gap.5">
                    <p id="projectName" className="text-xl">{projectName}</p>
                    <p id="projectDescription" className="text-xs select-none text-[#999999]">{projectDescription}</p>
                </div>
            </div>
        </div>
        </>
    );
}

export default ProjectTile;
