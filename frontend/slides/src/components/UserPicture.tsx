import React from 'react';

function UserPicture() {

    return (
        <>
            <div className='flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 select-none'>
                <img src='https://via.placeholder.com/150' alt='User' className='w-full h-full rounded-full' />
            </div>
        </>
    );
}

export default UserPicture;
