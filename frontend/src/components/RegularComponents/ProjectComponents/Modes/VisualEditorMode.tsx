import LivePreview from "../LivePreview";

export default function VisualEditorMode({ doc }: { doc: string; onChange: (d: string) => void }) {
  return (
    <div className="w-full h-full flex items-stretch">
        <p className="text-white">visual editor</p>
    </div>
  );
}
