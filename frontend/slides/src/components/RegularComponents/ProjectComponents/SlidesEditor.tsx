import React, { useState } from 'react';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';
import SlidesDrawer from  './SlidesDrawer';

function SlidesEditor() {
    const [html, setHtml] = useState(`<h1>Hello World</h1>\n<p>Edit me!</p>`);

    return (
        <div className="flex items-start justify-start w-screen h-full overflow-hidden">
            <div className="flex flex-col gap-3">
                <LivePreview html={html} />
                <SlidesDrawer />
            </div>
            <div className="w-100 presentationComponentsStyle rounded-xl h-full">
                <CodeEditor html={html} setHtml={setHtml} />
            </div>
        </div>
    );
}

export default SlidesEditor;
