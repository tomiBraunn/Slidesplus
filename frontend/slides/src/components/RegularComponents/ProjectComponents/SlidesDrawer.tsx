import React from 'react';
import SlidesDrawerController from "./SlidesDrawerController";
import SlideTile from "./SlideTile";

function SlidesDrawer() {
    return (
        <div className="presentationComponentsStyle rounded-xl w-full h-full flex flex-col items-start justify-center">
            <div className="flex flex-col items-start justify-start relative w-full flex-1">
                <SlidesDrawerController />
                <div className="pt-5 flex flex-1 w-full overflow-y-auto">
                    <SlideTile />
                    <SlideTile />
                    <SlideTile />
                    <SlideTile />
                </div>
            </div>

            <span className="w-full h-[1px] bg-red-500" />
            <div className="w-50" />
        </div>
    );
}

export default SlidesDrawer;
