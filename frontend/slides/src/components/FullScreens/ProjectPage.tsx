import React from 'react';
import ProjectNavBar from '../RegularComponents/ProjectComponents/ProjectNavBar';


function ProjectPage() {
    const projectName: string = "Title";
    const projectDescription: string = "description";

    return (
        <>
            <div className="bg-[#121212] w-screen h-screen flex items-center justify-start flex-col gap-5">
                <ProjectNavBar />
            </div>

        </>
    );
}

export default ProjectPage;
