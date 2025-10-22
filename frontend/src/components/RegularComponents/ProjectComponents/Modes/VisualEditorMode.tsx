import LivePreview from "../LivePreview";

export default function VisualEditorMode({ doc }: { doc: string; onChange: (d: string) => void }) {
  return (
    <div className="w-full h-full flex items-stretch">
      <div className="flex-1 p-3">
        <LivePreview document={doc} />
      </div>
      <div className="w-[320px] border-l border-[#2B2B2B] p-3 text-white/70">
        Visual editor coming soon
      </div>
    </div>
  );
}
