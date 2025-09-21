import React, { useEffect, useState, useCallback } from "react";
import CodeEditor from "./CodeEditor";
import LivePreview from "./LivePreview";
import SlidesDrawer from "./SlidesDrawer";

type Props = {
  initialDocument: string;
  onChange: (document: string) => void;
};

export default function SlidesEditor({ initialDocument, onChange }: Props) {
  const [doc, setDoc] = useState(initialDocument);

  useEffect(() => {
    setDoc(initialDocument);
  }, [initialDocument]);

  const emitChange = useCallback(
    (next: string) => {
      setDoc(next);
      if (typeof onChange === "function") onChange(next);
    },
    [onChange]
  );

  return (
    <div className="flex items-start justify-start w-screen h-full overflow-hidden">
      <div className="flex flex-col gap-3 h-full w-1/3">
        <LivePreview document={doc} />
        <SlidesDrawer />
      </div>
      <div className="flex-1 h-full">
        <CodeEditor document={doc} setDocument={emitChange} />
      </div>
    </div>
  );
}