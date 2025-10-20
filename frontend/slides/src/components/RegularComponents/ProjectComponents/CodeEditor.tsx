import React from "react";
import Editor from "@monaco-editor/react";

type Props = {
  code: string;
  setCode?: (val: string) => void;
  language?: string;
};

export default function CodeEditor({ code, setCode = () => { }, language = "html" }: Props) {
  return (
    <Editor
      height="100%"
      width="100%"
      theme="vs-dark"
      language={language}
      value={code}
      onChange={(v) => setCode(v || "")}
      options={{
        minimap: { enabled: true },
        automaticLayout: true,
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, "Courier New", monospace',
        fontLigatures: true,
        lineHeight: 20,
        wordWrap: "off",
        tabSize: 3,
      }}
    />
  );
}
