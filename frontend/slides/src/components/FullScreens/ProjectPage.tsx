import React, { useEffect, useState } from "react"
import ProjectNavBar from "../RegularComponents/ProjectComponents/ProjectNavBar"
import ChatBotMode from "../RegularComponents/ProjectComponents/Modes/ChatBotMode"
import CodeEditorMode from "../RegularComponents/ProjectComponents/Modes/CodeEditorMode"
import VisualEditorMode from "../RegularComponents/ProjectComponents/Modes/VisualEditorMode"

type ProjectMode = "code" | "visual" | "ai"
type SaveState = "idle" | "saving" | "saved" | "error"

export default function ProjectPage() {
  const [mode, setMode] = useState<ProjectMode>("code")
  const [projectId, setProjectId] = useState<string | null>(null)
  const [name, setName] = useState<string>("Untitled")
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [doc, setDoc] = useState<string>("")

  useEffect(() => {
    const parts = window.location.pathname.split("/")
    const id = parts[parts.length - 1]
    if (!id) return
    setProjectId(id)

    const token = localStorage.getItem("token")
    if (!token) return

    fetch(`http://localhost:8000/projects/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.name) setName(data.name)
      })

    fetch(`http://localhost:8000/projects/${id}/slides`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.slides.length > 0) {
          setDoc(
            "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>" +
            data.slides.map((s: any) => s.html).join("\n") +
            "</body></html>"
          )
        } else {
          setDoc(
            "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body><section class='slide'><h1>Slide 1</h1></section></body></html>"
          )
        }
      })
  }, [])

  const onRename = (next: string) => {
    setName(next)
  }

  const onChangeDoc = (next: string) => {
    setDoc(next)
    setSaveState("saving")
    window.clearTimeout((onChangeDoc as any)._t)
      ; (onChangeDoc as any)._t = window.setTimeout(async () => {
        try {
          if (!projectId) return
          const token = localStorage.getItem("token")
          if (!token) return
          const slides = next
            .split("<section")
            .filter((s) => s.trim() !== "")
            .map((s, i) => ({
              html: "<section" + s,
              position: i,
            }))
          await fetch(`http://localhost:8000/projects/${projectId}/slides`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ slides }),
          })
          setSaveState("saved")
          window.setTimeout(() => setSaveState("idle"), 800)
        } catch {
          setSaveState("error")
        }
      }, 500)
  }

  return (
    <div className="w-screen h-screen flex flex-col">
      <ProjectNavBar
        name={name}
        saveState={saveState}
        onRename={onRename}
        mode={mode}
        onChangeMode={setMode}
      />
      <div className="flex-1 overflow-hidden">
        {mode === "code" && <CodeEditorMode doc={doc} onChange={onChangeDoc} />}
        {mode === "visual" && <VisualEditorMode doc={doc} onChange={onChangeDoc} />}
        {mode === "ai" && (
          <ChatBotMode
            doc={doc}
            onChange={onChangeDoc}
            applySetDoc={(val) => {
              setDoc((prev) => {
                const next =
                  typeof val === "function" ? (val as (v: string) => string)(prev) : val
                onChangeDoc(next)
                return next
              })
            }}
          />
        )}
      </div>
    </div>
  )
}