//"local" <---> "prod"
const ENV = "prod"

const urls = {
  local: "http://localhost:8000",
  prod: "https://slides-plus-backend.vercel.app",
}

export const urlbackend = urls[ENV]

export const endpoints = {
  backend: urlbackend,
  gemini: `${urlbackend}/gemini`,
}
