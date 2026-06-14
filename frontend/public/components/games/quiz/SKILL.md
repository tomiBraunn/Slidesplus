---
name: game-quiz
description: |
  Quiz — componente de juego insertable como una slide. Quiz interactivo de varias
  preguntas con opciones, marca de correcto/incorrecto, puntaje final y botón de
  reintentar. Autocontenido en una sola <section> (HTML + CSS + JS inline), listo
  para insertarse en cualquier presentación.
category: games
type: component
---

# Quiz (Game Component)

Un quiz interactivo que vive dentro de una sola `<section>`, pensado para
insertarse como una diapositiva más de una presentación de Slides Plus.

## Qué es

- Quiz de varias preguntas (por defecto 3) con 4 opciones cada una.
- Al elegir una opción: marca en verde la correcta, en rojo la incorrecta, y
  muestra un feedback explicativo.
- Avanza pregunta por pregunta con un botón "Siguiente".
- Al terminar muestra el puntaje (X / N) y un botón "Reintentar".
- Tema oscuro neutro, pensado para combinar con cualquier deck.

## Cómo está hecho

- Una `<section>` de 1920×1080 con todo inline: `<style>` scopeado bajo
  `.qz-root` + un `<script>` IIFE que renderiza preguntas y maneja el estado.
- No depende de nada externo salvo la fuente Inter (via `@import`).
- Funciona dentro del iframe aislado de cada slide.

## Cómo editarlo

Las preguntas están en un array `QUESTIONS` al inicio del `<script>`:

```js
var QUESTIONS = [
  { q: "Tu pregunta",
    a: [ {t:"Opción", ok:true}, {t:"Otra", ok:false} ],
    fb: "Explicación de la respuesta correcta." }
];
```

- `q`: el texto de la pregunta.
- `a`: array de opciones; marcá la correcta con `ok:true`.
- `fb`: explicación que se muestra tras responder.

Agregá o quitá objetos del array para tener más o menos preguntas.

## Cuándo usarlo

Para cerrar una presentación con una evaluación, hacer una dinámica
interactiva con el público, o repasar conceptos de forma lúdica.
