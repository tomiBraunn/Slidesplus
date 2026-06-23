// i18n: inicializa react-i18next con detección de idioma del navegador y un
// toggle manual persistido en localStorage["lang"]. Idiomas: inglés (default) y
// español (voseo rioplatense). Solo traduce la INTERFAZ, no el contenido de las
// slides ni los prompts del modelo.
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import en from "./locales/en.json"
import es from "./locales/es.json"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "es"],
    nonExplicitSupportedLngs: true, // "es-AR" → "es"
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },
  })

// Mantener <html lang="..."> sincronizado para SEO/accesibilidad.
const applyHtmlLang = (lng: string) => {
  if (typeof document !== "undefined") document.documentElement.lang = lng
}
applyHtmlLang(i18n.resolvedLanguage || "en")
i18n.on("languageChanged", applyHtmlLang)

export default i18n
