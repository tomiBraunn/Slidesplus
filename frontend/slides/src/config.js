//"local" <---> "prod"
const ENV = "prod";

const urls = {
  local: "http://localhost:8000",
  prod: "https://slidesplus-backend.vercel.app",
};

export const urlbackend = urls[ENV];

export const endpoints = {
  backend: urlbackend,
  gemini: `${urls[ENV]}/gemini`, 
};
