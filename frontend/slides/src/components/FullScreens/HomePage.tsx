import ProjectTile from "../ProjectTile";
import AppTextLogo from "../AppTextLogo";
import ProjectSearchBar from "../ProjectSearchBar";
import NavBar from "../NavBar";
import CreateProject from '../CreateProject';
import React, { useState } from 'react';
import ProjectPreview from "../ProjectPreview";

function HomePage() {
    const projectName: string = "Title";
    const projectDescription: string = "description";

    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="bg-[#121212] w-screen h-screen flex items-center justify-start flex-col gap-5 relative">
            <div className='flex flex-col items-center justify-start'>
                <NavBar />
                <div className='flex flex-col items-center justify-start text-white w-[70vw]'>
                    <div className='searchbar flex flex-col items-center justify-start w-full'>
                        <AppTextLogo />
                        <ProjectSearchBar onAddClick={() => setShowCreate(true)} />
                    </div>
                </div>
            </div>
            <main className="flex justify-center w-full relative">
                <div className="flex flex-wrap justify-start w-[70vw] gap-4">
                    <ProjectTile name={projectName} description={projectDescription} />
                    <ProjectTile name={projectName} description={projectDescription} />
                    <ProjectTile name={projectName} description={projectDescription} />
                </div>
            </main>

            {showCreate && (
                <CreateProject onClose={() => setShowCreate(false)} />
            )}
        </div>
        // <ProjectPreview />

    );
}

export default HomePage;
