// @ts-nocheck
import { motion } from "framer-motion";
import LogInForm from '../RegularComponents/MultiuseComponents/LogInForm';
import Grainient from "../ThirdPartyComponents/Grainient/Grainient";

function GrainientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
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
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <div className="absolute inset-0 bg-[#121212]/50 backdrop-blur-sm" />
    </div>
  );
}

function LogInPage() {
    return (
        <div className="bg-[#121212] w-screen h-screen flex flex-col items-center justify-center text-white overflow-y-auto overflow-x-hidden py-4 sm:py-0">
            <LogInForm />
            <GrainientBackground />
        </div>
    );
}

export default LogInPage;
