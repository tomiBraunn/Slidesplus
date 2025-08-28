import React from 'react';
import AppIconWithoutLink from '../RegularComponents/MultiuseComponents/AppIconWithoutLink';
import LogInForm from '../RegularComponents/MultiuseComponents/LogInForm';

function LogInPage() {
    return (
        <div className=" bg-[#121212] w-screen h-screen flex flex-col items-center justify-center text-white gap-4">
            <AppIconWithoutLink />
            <LogInForm />
        </div>
    );
}

export default LogInPage;
