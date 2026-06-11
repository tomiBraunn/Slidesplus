import CodeEditor from "../CodeEditor";
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";

type Props = {
  doc: string;
  onChange: (d: string) => void;
  yText?: Y.Text | null;
  awareness?: Awareness | null;
  readOnly?: boolean;
};

export default function CodeEditorMode({ doc, onChange, yText = null, awareness = null, readOnly = false }: Props) {
  return (
    <div className="w-full h-full bg-theme-primary">
      <CodeEditor
        code={doc}
        setCode={onChange}
        language="html"
        yText={yText}
        awareness={awareness}
        readOnly={readOnly}
      />
    </div>
  );
}
