import React from 'react';
import AppIcon from "../MultiuseComponents/AppIcon";
import UserPicture from "../MultiuseComponents/UserPicture";
import Settings from "../MultiuseComponents/Settings";

function NavBar() {

    return (
        <>
            <nav className='flex items-center justify-between p-3 h-20 w-screen'>
                <AppIcon />
                <div className='flex items-center gap-2.5'>
                    <Settings />
                    <UserPicture />
                </div>
            </nav>
        </>
    );
}

export default NavBar;
