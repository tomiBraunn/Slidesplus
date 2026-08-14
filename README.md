# SlidesPlus

Generador de presentaciones con IA — hecho antes de que alternativas como Claude, ChatGPT u otras herramientas de IA pudieran armar presentaciones completas por sí solas.

## Qué es

SlidesPlus arma presentaciones completas a partir de una idea, un prompt o un documento de referencia, usando IA para generar y editar cada slide. A diferencia de un generador de PowerPoint tradicional, cada slide **se guarda como HTML** (secciones de 1920×1080), lo que permite diseños libres, animaciones, tipografía real y layouts que un motor de slides clásico no puede lograr.

## Cómo funciona

1. **Generación con IA** — un wizard hace preguntas para entender el contexto (tema, audiencia, tono) y arma la presentación sección por sección, matcheando contra ~45 templates base y generando el HTML de cada slide con el modelo elegido.
2. **Edición visual** — una vez generada, cada slide se puede editar desde un editor visual (drag, resize, estilos) sin tocar código.
3. **Edición de código directa** — para control total, se puede editar el HTML de cada slide directamente en un editor Monaco embebido.

Además hay iteración por chat sobre una presentación existente, vistas públicas de solo lectura para compartir un deck, y colaboración en tiempo real (Yjs) para editar entre varias personas a la vez.

## IAs que usa

- **Gemini** (Google)
- **ChatGPT / GPT** (OpenAI)
- **NVIDIA NIM** — Llama 4, Qwen, DeepSeek, a través de un endpoint compatible con OpenAI

El backend elige o permite elegir el modelo según el paso del flujo (wizard, generación de slides, chat).

## Autenticación

Email/password (JWT + bcrypt), login con Google y login con GitHub. Además hay integración con Spotify (no es login, es para poder incrustar música/portadas de álbumes dentro de las slides).

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind, Zustand, react-router-dom, Monaco Editor, GSAP/Framer Motion/Three.js para efectos visuales, exportación a PPTX/PDF, i18n (ES/EN).
- **Backend**: Node.js + Express, Supabase + Postgres, Passport (OAuth), Multer, Playwright para tests e2e.

## Estructura

```
frontend/   React + Vite + Tailwind SPA
backend/    Node.js + Express API (Supabase, proveedores de IA, OAuth)
```

## Levantar el proyecto

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # completar valores
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env         # completar valores
npm run dev
```

## Notas

- Cada paquete tiene su propio `package.json`, `.env.example` y `vercel.json`.
- Los archivos de entorno (`.env`, `.env.local`) están en `.gitignore` — nunca se commitean.
