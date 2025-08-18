import React, { useState } from 'react';

type Props = {
    onClose?: () => void;
};

function CreateProject({ onClose }: Props) {
    return (
        <div className='presentationComponentsStyle rounded-xl'>
            <div className='flex items-center justify-center gap-4'>
                <div className='flex flex-col items-start justify-start gap-2 p-4'>
                    <div className='flex items-center justify-start gap-2'>
                        <span className="material-symbols-outlined text-white" style={{ fontSize: "35px" }}>
                            crop_landscape
                        </span>
                        <p className='text-white'>Create presentation:</p>
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Title?"
                            className="rounded-lg p-2 w-full text-white bg-[#1F1F1F] border-[2.5px] border-[#181818] focus:outline-none"
                        />
                    </div>
                </div>
                <div className='flex flex-col items-end justify-between gap-4 h-'>
                    <span className="material-symbols-outlined text-white cursor-pointer" style={{ fontSize: "35px" }} onClick={onClose}>
                        close
                    </span>
                    <button>Next</button>
                </div>
            </div>
            
        </div>
    );
}

export default CreateProject;
