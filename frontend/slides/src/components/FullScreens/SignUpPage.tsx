import React from 'react';
import AppIconWithoutLink from '../RegularComponents/MultiuseComponents/AppIconWithoutLink';
import SignUpForm from '../RegularComponents/MultiuseComponents/SignUpForm';

function SignUpPage() {
  return (
    <div className=" bg-[#121212] w-screen h-screen flex flex-col items-center justify-center text-white gap-4">
      <AppIconWithoutLink />
      <SignUpForm />
    </div>
  );
}

export default SignUpPage;
