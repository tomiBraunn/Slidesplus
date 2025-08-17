import React, { useState } from 'react';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';

function SlidesEditor() {
    const [html, setHtml] = useState(`<h1>Hello World</h1>\n<p>Edit me!</p>`);

    return (
        <div className="flex w-screen overflow-hidden">
            <div className="">
                <LivePreview html={html} />
            </div>
            <div className="w-100 presentationComponentsStyle rounded-xl h-auto">
                <CodeEditor html={html} setHtml={setHtml} />
            </div>
        </div>
    );
}

export default SlidesEditor;
