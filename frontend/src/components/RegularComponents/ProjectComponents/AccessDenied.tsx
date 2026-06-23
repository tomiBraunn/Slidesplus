import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface AccessDeniedProps {
  projectExists: boolean
}

export default function AccessDenied({ projectExists }: AccessDeniedProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goHome = () => {
    navigate('/home', { replace: true })
  }

  return (
    <div className="w-screen h-screen bg-theme-primary flex flex-col gap-10 items-center justify-center">
      <div className='flex select-none font-extrabold gap-1 z-20 text-white'>
        <div className='flex flex-col items-end justify-center [&>*]:text-6xl text-red-800 [writing-mode:vertical-rl] rotate-90'>
          <p>{t("accessDenied.accessLine1")}</p>
          <p>{t("accessDenied.accessLine2")}</p>
        </div>
        <div className='flex flex-col items-start justify-center [&>*]:text-4xl'>
          <p>{t("accessDenied.askLine1")}</p>
          <p>{t("accessDenied.askLine2")}</p>
          <p>{t("accessDenied.askLine3")}</p>
          <p>{t("accessDenied.askLine4")}</p>
          <p>{t("accessDenied.askLine5")}</p>
          <p>{t("accessDenied.askLine6")}</p>
          <p>{t("accessDenied.askLine7")}</p>
        </div>
      </div>
      <button
        onClick={goHome}
        className="text-white rounded-xl border border-[#2B2B2B] bg-[#0f0f0f] hover:bg-[#161616] transition-colors cursor-pointer flex items-center justify-center px-5 py-2 select-none z-20">
        {t("accessDenied.homeBtn")}
      </button>
    </div>
  )
}
