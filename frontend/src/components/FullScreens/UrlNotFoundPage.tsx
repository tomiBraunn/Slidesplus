import { useNavigate } from 'react-router-dom';
import PixelBlast from '../ThirdPartyComponents/PixelBlast/PixelBlast';
// import PixelTrail from '../ThirdPartyComponents/PixelTrail/PixelTrail';

function UrlNotFoundPage() {
    const navigate = useNavigate();

    const goHome = () => {
        navigate('/home', { replace: true });
    };

    return (
        <div className="w-screen h-screen flex flex-col gap-5 items-center justify-center bg-black text-white">
            <div className='h-screen w-screen absolute top-0 left-0'>
                <PixelBlast
                    variant="circle"
                    pixelSize={5}
                    color="#ff0000"
                    patternScale={1.5}
                    patternDensity={0.9}
                    pixelSizeJitter={0}
                    speed={1.5}
                    edgeFade={0.02}
                    transparent
                    enableRipples={false}
                />
            </div>
            <div className='h-screen w-screen absolute top-0 left-0 z-1'>
                {/* <PixelTrail
                    gridSize={50}
                    trailSize={0.1}
                    maxAge={250}
                    interpolate={5}
                    color="#fff"
                    gooeyFilter={{ id: "custom-goo-filter", strength: 2 }}
                /> */}
            </div>
            <div className='flex select-none font-extrabold gap-5 z-2'>
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
