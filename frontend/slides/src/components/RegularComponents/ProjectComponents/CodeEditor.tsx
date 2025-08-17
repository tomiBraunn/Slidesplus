import React from "react";
import MonacoEditor from "@monaco-editor/react";
import SlidesTabs from "./SlidesTabs";

interface CodeEditorProps {
  html: string;
  setHtml: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ html, setHtml }) => {
  const handleEditorMount = (editor: any, monaco: any) => {
    monaco.editor.defineTheme("custom-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1F1F1F",
      },
    });
    monaco.editor.setTheme("custom-dark");
  };

  return (
    <>
      <SlidesTabs />
      <MonacoEditor
        height="100%"
        width="100%"
        defaultLanguage="html"
        value={html}
        onChange={(value) => setHtml(value || "")}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          wordWrap: "on",
          fontSize: 14,
        }}
      />
    </>
  );
};

export default CodeEditor;