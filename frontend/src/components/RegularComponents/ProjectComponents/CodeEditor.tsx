import Editor from "@monaco-editor/react";
import { useTheme } from "../../../contexts/ThemeContext";

type Props = {
  code: string;
  setCode?: (val: string) => void;
  language?: string;
};

export default function CodeEditor({ code, setCode = () => { }, language = "html" }: Props) {
  const { isDark } = useTheme();

  return (
    <Editor
      height="100%"
      width="100%"
      theme={isDark ? "vs-dark" : "vs-light"}
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
