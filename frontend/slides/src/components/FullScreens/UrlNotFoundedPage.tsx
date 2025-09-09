import React from 'react';
import { useNavigate } from 'react-router-dom';

function UrlNotFoundPage() {
    const navigate = useNavigate();

    const goBackOrHome = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/', { replace: true });
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col gap-5 items-center justify-center bg-[#121212] text-white">
            <p>page not founded</p>
            <button onClick={goBackOrHome} className="text-white rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] hover:bg-[#161616] transition-colors cursor-pointer flex items-center justify-center px-5 py-2">goback</button>
        </div>
    );
}

export default UrlNotFoundPage;
