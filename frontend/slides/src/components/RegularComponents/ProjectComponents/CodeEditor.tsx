import React from "react";
import Editor from "@monaco-editor/react";

type Props = {
  code: string;
  setCode?: (val: string) => void;
};

export default function CodeEditor({ code, setCode = () => {} }: Props) {
  return (
    <Editor
      height="100%"
      width="200px"
      theme="vs-dark"
      defaultLanguage="html"
      value={code}
      onChange={v => setCode(v || "")}
    />
  );
}