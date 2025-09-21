import React from "react";
import SlidesEditor from "../SlidesEditor";

type Props = {
  doc: string;
  onChange: (d: string) => void;
};

export default function CodeEditorMode({ doc, onChange }: Props) {
  return (
    <div className="w-full h-full">
      <SlidesEditor initialDocument={doc} onChange={onChange} />
    </div>
  );
}