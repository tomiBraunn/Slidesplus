import React from "react";
import MonacoEditor from "@monaco-editor/react";

type Props = {
  document: string;
  setDocument: (v: string) => void;
};

export default function CodeEditor({ document, setDocument }: Props) {
  const handleMount = (editor: any, monaco: any) => {
    monaco.editor.defineTheme("custom-dark", { base: "vs-dark", inherit: true, rules: [], colors: { "editor.background": "#1F1F1F" } });
    monaco.editor.setTheme("custom-dark");
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2B2B2B]">
        <span className="text-xs text-[#9aa0a6]">HTML document</span>
      </div>
      <MonacoEditor
        height="100%"
        width="100%"
        language="html"
        value={document}
        onChange={(v) => setDocument(v || "")}
        onMount={handleMount}
        options={{ minimap: { enabled: false }, wordWrap: "on", fontSize: 14 }}
      />
    </div>
  );
}
