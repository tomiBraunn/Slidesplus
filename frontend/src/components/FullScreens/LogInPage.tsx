// @ts-nocheck
import LogInForm from '../RegularComponents/MultiuseComponents/LogInForm';
import Threads from "../ThirdPartyComponents/Threads/Threads"; 

function LogInPage() {
    return (
        <div className="bg-[#121212] w-screen h-screen flex flex-col items-center justify-center text-white overflow-y-auto overflow-x-hidden py-4 sm:py-0">
            <LogInForm />
            <div className="absolute inset-0 pointer-events-none">
                <Threads
                    color={[0.2, 0.6, 1]}
                    amplitude={1.2}
                    distance={0.1}
                    enableMouseInteraction={false}
                />
            </div>
        </div>
    );
}

export default LogInPage;
