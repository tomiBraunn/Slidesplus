import { Spinner } from "./spinner"

export function FullscreenLoader() {
  return (
    <div className="bg-black w-screen h-screen flex items-center justify-center">
      <Spinner className="size-6 text-white/50" />
    </div>
  )
}
