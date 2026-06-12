import ReactGA from "react-ga4"

// Measurement ID de GA4 (formato G-XXXXXXXXXX). Se lee de la variable de
// entorno VITE_GA_ID (configúrala en .env localmente y en Vercel para prod).
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_ID as string | undefined

let initialized = false

export function initAnalytics() {
  if (initialized) return
  if (!GA_MEASUREMENT_ID) {
    // Sin ID configurado (p. ej. en desarrollo local) no hacemos nada.
    if (import.meta.env.DEV) {
      console.info("[analytics] VITE_GA_ID no configurado; GA4 deshabilitado.")
    }
    return
  }

  ReactGA.initialize(GA_MEASUREMENT_ID, {
    // Enviamos los page_view manualmente desde el router (SPA), así que
    // desactivamos el envío automático de la carga inicial para no duplicar.
    gtagOptions: { send_page_view: false },
  })
  initialized = true
}

export function isAnalyticsEnabled() {
  return initialized
}

/** Registra una vista de página. `path` debe incluir search/hash si aplica. */
export function trackPageView(path: string, title?: string) {
  if (!initialized) return
  ReactGA.send({ hitType: "pageview", page: path, title })
}

/** Registra un evento personalizado. */
export function trackEvent(
  name: string,
  params?: Record<string, unknown>
) {
  if (!initialized) return
  ReactGA.event(name, params)
}
