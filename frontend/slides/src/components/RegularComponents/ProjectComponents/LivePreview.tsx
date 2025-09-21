import React, { useEffect, useRef } from "react"

type Props = { document: string }

export default function LivePreview({ document }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(document || "")
    doc.close()
  }, [document])

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full">
      <div className="flex items-center justify-center w-full h-full select-none aspect-video defaultStyle rounded-t-xl rounded-b-none">
        <iframe ref={iframeRef} title="Live Preview" className="w-full h-full border-none bg-white overflow-hidden rounded-t-sm" />
      </div>
      <div className="w-full flex justify-center presentationComponentsStyle rounded-none rounded-b-3xl">
        <div className="flex items-center justify-between gap-2 rounded-none rounded-b-3xl w-auto">
          <span className="material-symbols-outlined cursor-pointer w-[1.5em] aspect-square text-[#4B4B4B]">fullscreen</span>
          <span className="material-symbols-outlined cursor-pointer w-[1.5em] aspect-square text-[#4B4B4B]">chevron_left</span>
          <span className="material-symbols-outlined cursor-pointer w-[1.5em] aspect-square text-[#4B4B4B]">chevron_right</span>
          <span className="material-symbols-outlined cursor-pointer w-[1.5em] aspect-square text-[#4B4B4B]">filter_none</span>
        </div>
      </div>
    </div>
  )
}
