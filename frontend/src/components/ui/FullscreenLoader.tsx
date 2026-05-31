import Grainient from "../ThirdPartyComponents/Grainient/Grainient"
import { Spinner } from "./spinner"

export function FullscreenLoader() {
  return (
    <div className="bg-[#0a0a0a] w-screen h-screen flex flex-col items-center justify-center text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Grainient
          color1="#7182FF"
          color2="#249931"
          color3="#0d0d0c"
          timeSpeed={0.22}
          colorBalance={-0.08}
          warpStrength={0.85}
          warpFrequency={4.6}
          warpSpeed={1.4}
          warpAmplitude={58}
          blendAngle={18}
          blendSoftness={0.08}
          rotationAmount={360}
          noiseScale={1.8}
          grainAmount={0.08}
          grainScale={2.4}
          grainAnimated={false}
          contrast={1.25}
          gamma={1}
          saturation={1.08}
          centerX={0}
          centerY={0}
          zoom={0.90}
        />
        <div className="absolute inset-0 bg-[#0a0a0a]/75 backdrop-blur-sm" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Spinner className="size-6 text-white/60" />
      </div>
    </div>
  )
}
