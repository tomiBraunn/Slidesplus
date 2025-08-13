import React from 'react';

function ProjectTile() {

    return (
        <div className="flex items-center justify-center">
    <div className="flex items-start justify-center flex-col flex gap-1 bg-[#1F1F1F] text-white px-2 rounded-lg aspect-video w-50">
        <span className="material-symbols-outlined aspect-square">
            crop_landscape
        </span>
        <div class="flex items-start justify-start flex-col gap.5">
            <p id="projectName" className="text-xl">Title</p>
            <p id="projectDescription" className="text-xs text-[#999999]">description</p>
        </div>
    </div>
        </div>
    );
}

export default ProjectTile;  // Exportar para usarlo en otras partes
