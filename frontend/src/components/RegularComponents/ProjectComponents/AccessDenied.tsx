import React from 'react'
import { useNavigate } from 'react-router-dom'

interface AccessDeniedProps {
  projectExists: boolean
}

export default function AccessDenied({ projectExists }: AccessDeniedProps) {
  const navigate = useNavigate()

  const goHome = () => {
    navigate('/home', { replace: true })
  }

  return (
    <div className="w-screen h-screen bg-theme-primary flex flex-col gap-10 items-center justify-center">
      <div className='flex select-none font-extrabold gap-1 z-20 text-white'>
        <div className='flex flex-col items-end justify-center [&>*]:text-6xl text-red-800 [writing-mode:vertical-rl] rotate-90'>
          <p>ACCESS</p>
          <p>DENIED</p>
        </div>
        <div className='flex flex-col items-start justify-center [&>*]:text-4xl'>
          <p>ASK</p>
          <p>THE</p>
          <p>OWNER</p>
          <p>FOR</p>
          <p>PERMISSION</p>
          <p>TO</p>
          <p>ACCESS</p>
        </div>
      </div>
      <button
        onClick={goHome}
        className="text-white rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] hover:bg-[#161616] transition-colors cursor-pointer flex items-center justify-center px-5 py-2 select-none z-20">
        HOME PAGE
      </button>
    </div>
  )
}
