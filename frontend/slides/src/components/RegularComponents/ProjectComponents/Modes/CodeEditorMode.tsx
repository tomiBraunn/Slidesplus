import CodeEditor from "../CodeEditor";

type Props = {
  doc: string;
  onChange: (d: string) => void;
};

export default function CodeEditorMode({ doc, onChange }: Props) {
  return (
    <div className="w-full h-full bg-[#0b0b0b]">
      <CodeEditor code={doc} setCode={onChange} language="html" />
    </div>
  );
}
