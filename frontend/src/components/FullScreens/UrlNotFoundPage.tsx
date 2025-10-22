import { useNavigate } from 'react-router-dom';

function UrlNotFoundPage() {
    const navigate = useNavigate();

    const goHome = () => {
        navigate('/home', { replace: true });
    };

    return (
        <div className="w-screen h-screen flex flex-col gap-5 items-center justify-center bg-black text-white">
            <div className='flex select-none font-extrabold gap-5'>
                <div className='flex flex-col items-end justify-center [&>*]:text-6xl'>
                    <p>ERROR</p>
                    <p>404</p>
                </div>
                <div className='flex flex-col items-start justify-center [&>*]:text-4xl'>
                    <p>PAGE</p>
                    <p>NOT</p>
                    <p>FOUND</p>
                </div>
            </div>
            <button 
                onClick={goHome} 
                className="text-white rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] hover:bg-[#161616] transition-colors cursor-pointer flex items-center justify-center px-5 py-2 select-none"
            >
                HOME PAGE
            </button>
        </div>
    );
}

export default UrlNotFoundPage;
