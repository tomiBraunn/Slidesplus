import React from 'react';
import ActionBar from "./ActionBar";

function ProjectPreview() {

    return (
        <>
            <div className="absolute z-50 w-screen h-screen glassBackground flex items-center justify-center">
                <div className='presentationComponentsStyle rounded-xl shadow-2xl border border-white/10 backdrop-blur-xl bg-[#1F1F1F]/80 card-animate w-[75vw] flex items-start justify-start flex-col gap-4'>
                    <div className='flex items-center justify-start gap-1 w-full p-4'>
                        <span className="material-symbols-outlined text-white" style={{ fontSize: "35px" }}>
                            crop_landscape
                        </span>
                        <p className="text-white font-medium">Title placeholder</p>
                    </div>
                    <div className='flex items-center justify-start gap-2 w-full h-full px-4'>
                        <div className="presentationComponentsStyleBorderLess rounded-xl w-4/5 aspect-video p-4 overflow-y-auto border-solid border-[5px] border-[#181818]">
                            <p className='text-white text-3xl'>PLACEHOLDER</p>
                        </div>
                        <div className=" rounded-xl w-1/5 h-[100%] p-4 bg-red-500">
                        </div>
                    </div>
                    <div className='flex items-center justify-end w-full p-4'>
                        <ActionBar
                            items={[
                                { icon: "delete", label: "Delete", onClick: () => console.log("") },
                                { icon: "edit", label: "Rename", onClick: () => console.log("") },
                                { icon: "share", label: "Share", onClick: () => console.log("") },
                                { icon: "smart_display", label: "Present", onClick: () => console.log("") },
                                { icon: "open_in_new", label: "Open", onClick: () => console.log("") },
                            ]}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

export default ProjectPreview;
