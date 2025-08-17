import React, { useEffect, useRef } from 'react';

interface LivePreviewProps {
    html: string;
}

const LivePreview: React.FC<LivePreviewProps> = ({ html }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(html);
                doc.close();
            }
        }
    }, [html]);

    return (
        <>
            <div className="flex flex-col items-center justify-center gap-1 w-full">
                <div className='flex items-center justify-center w-full h-full select-none aspect-video presentationComponentsStyle rounded-t-xl rounded-b-none'>
                    <iframe
                        ref={iframeRef}
                        title="Live Preview"
                        className="w-full h-full border-none bg-white user-select-none overflow-hidden"
                    />
                </div>
                <div className='presentationComponentsStyle rounded-t-none rounded-b-xl w-full gap-0 flex items-center justify-center'>
                    <div className='flex items-center justify-between m-1 w-fit'>
                        <span className="material-symbols-outlined cursor-pointer select-none w-[1.5em] aspect-square text-[#4B4B4B]">
                            fullscreen
                        </span>
                        <span className="material-symbols-outlined cursor-pointer select-none w-[1.5em] aspect-square text-[#4B4B4B]">
                            chevron_left
                        </span>
                        <span className="material-symbols-outlined cursor-pointer select-none w-[1.5em] aspect-square text-[#4B4B4B]">
                            chevron_right
                        </span>
                        <span className="material-symbols-outlined cursor-pointer select-none w-[1.5em] aspect-square text-[#4B4B4B]">
                            filter_none
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LivePreview;
