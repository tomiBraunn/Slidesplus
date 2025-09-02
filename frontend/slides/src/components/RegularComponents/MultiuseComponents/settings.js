// Cambiá este valor a "local" o "prod"
const ENV = "local"; 

const urls = {
  local: "http://localhost:8000",
  prod: "https://slidesplus-backend.vercel.app"
};

export const urlbackend = urls[ENV];
