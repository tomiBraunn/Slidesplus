import React from 'react';
import AppIconWithoutLink from '../RegularComponents/MultiuseComponents/AppIconWithoutLink';
import SignUpForm from '../RegularComponents/MultiuseComponents/SignUpForm';
import Threads from "../Threads/Threads";


function SignUpPage() {
  return (
    <div className=" bg-[#121212] w-screen h-screen flex flex-col items-center justify-center text-white">
      {/* <AppIconWithoutLink /> */}
      <SignUpForm />
      <div className="absolute inset-0">
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

export default SignUpPage;
