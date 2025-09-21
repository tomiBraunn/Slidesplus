import React from "react"
import LivePreview from "../LivePreview"
import GeminiChatbot from "../GeminiChatbot"

export default function ChatBotMode({
  doc,
  onChange,
  applySetDoc,
  projectId,
}: {
  doc: string
  onChange: (d: string) => void
  applySetDoc: (val: string | ((v: string) => string)) => void
  projectId?: string
}) {
  return (
    <div className="w-full h-full flex">
      <div className="flex flex-col w-[40vw] min-w-[420px] max-w-[720px] h-full p-3">
        <div className="flex-1 min-h-0">
          <LivePreview document={doc} />
        </div>
      </div>
      <div className="flex-1 min-w-0 h-full">
        <GeminiChatbot setCode={applySetDoc} code={doc} projectId={projectId} />
      </div>
    </div>
  )
}
