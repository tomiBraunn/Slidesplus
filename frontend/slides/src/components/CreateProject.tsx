import React, { useState } from 'react';
import Stepper, { Step } from './ThirdParty/Stepper';

type Props = {
    onClose?: () => void;
};

function CreateProject({ onClose }: Props) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleComplete = () => {
        console.log('Project created:', { title, description });
        if (onClose) onClose();
    };

    return (
        // <div className='presentationComponentsStyle rounded-xl'>
        //     <Stepper initialStep={1} onFinalStepCompleted={handleComplete}>
        //         {/* Step 1: Title */}
        //         <Step>
        //             <div className='flex flex-col gap-2 p-4'>
        //                 <div className='flex items-center justify-start gap-2'>
        //                     <span className="material-symbols-outlined text-white" style={{ fontSize: "35px" }}>
        //                         crop_landscape
        //                     </span>
        //                     <p className='text-white'>Create presentation: Title</p>
        //                 </div>
        //                 <input
        //                     type="text"
        //                     placeholder="Title?"
        //                     className="rounded-lg p-2 w-full text-white bg-[#1F1F1F] border-[2.5px] border-[#181818] focus:outline-none"
        //                     value={title}
        //                     onChange={(e) => setTitle(e.target.value)}
        //                 />
        //             </div>
        //         </Step>

        //         {/* Step 2: Description */}
        //         <Step>
        //             <div className='flex flex-col gap-2 p-4'>
        //                 <p className='text-white'>Description</p>
        //                 <textarea
        //                     placeholder="Add a description"
        //                     className="rounded-lg p-2 w-full text-white bg-[#1F1F1F] border-[2.5px] border-[#181818] focus:outline-none"
        //                     value={description}
        //                     onChange={(e) => setDescription(e.target.value)}
        //                 />
        //             </div>
        //         </Step>

        //         {/* Step 3: Review */}
        //         <Step>
        //             <div className='flex flex-col gap-2 p-4'>
        //                 <p className='text-white'>Review your project</p>
        //                 <p className='text-white'>Title: {title}</p>
        //                 <p className='text-white'>Description: {description}</p>
        //             </div>
        //         </Step>
        //     </Stepper>
        // </div>
        <div>
            import Stepper, {Step} from './Stepper';

            <Stepper
                initialStep={1}
                onStepChange={(step) => {
                    console.log(step);
                }}
                onFinalStepCompleted={() => console.log("All steps completed!")}
                backButtonText="Previous"
                nextButtonText="Next"
            >
                <Step>
                    <h2>Welcome to the React Bits stepper!</h2>
                    <p>Check out the next step!</p>
                </Step>
                <Step>
                    <h2>Step 2</h2>
                    <img style={{ height: '100px', width: '100%', objectFit: 'cover', objectPosition: 'center -70px', borderRadius: '15px', marginTop: '1em' }} src="https://www.purrfectcatgifts.co.uk/cdn/shop/collections/Funny_Cat_Cards_640x640.png?v=1663150894" />
                    <p>Custom step content!</p>
                </Step>
                <Step>
                    <h2>How about an input?</h2>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name?" />
                </Step>
                <Step>
                    <h2>Final Step</h2>
                    <p>You made it!</p>
                </Step>
            </Stepper>
        </div>
    );
}

export default CreateProject;
