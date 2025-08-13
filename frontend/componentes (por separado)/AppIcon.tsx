import React from 'react';

function AppIcon() {
    const projectName: string = "Title";
    const projectDescription: string = "description";

    return (
        <div className="flex items-start justify-start flex-column">
            <span className="material-symbols-outlined">
                crop_landscape
            </span>
            <p id="projectName">{projectName}</p>
            <p id="projectDescription">{projectDescription}</p>
        </div>
    );
}

export default AppIcon;  // Exportar para usarlo en otras partes
