import ProjectTile from "../ProjectTile";
import AppTextLogo from "../AppTextLogo";
import ProjectSearchBar from "../ProjectSearchBar";
import NavBar from "../NavBar";
import React from 'react';


function HomePage() {
    const projectName: string = "Title";
    const projectDescription: string = "description";

    return (
        <div className="bg-[#121212] w-screen h-screen flex items-center justify-start flex-col gap-5">
            <div className='flex flex-col items-center justify-start'>
                <NavBar />
                <div className='flex flex-col items-center justify-start text-white w-[60vw]'>
                    <div className='searchbar flex flex-col items-center justify-start w-full'>
                        <AppTextLogo />
                        <ProjectSearchBar />
                    </div>
                </div>
            </div>
            <main className="flex justify-center w-full">
                <div className="flex flex-wrap justify-start w-[60vw] gap-4">
                    <ProjectTile name={projectName} description={projectDescription} />
                    <ProjectTile name={projectName} description={projectDescription} />
                    <ProjectTile name={projectName} description={projectDescription} />
                </div>
            </main>
        </div>
    );
}

export default HomePage;
