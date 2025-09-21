import { createCanvas } from "canvas"

function randomColor() {
    const r = Math.floor(Math.random() * 256)
    const g = Math.floor(Math.random() * 256)
    const b = Math.floor(Math.random() * 256)
    return `rgb(${r},${g},${b})`
}

export function generateAvatarLetter(letter = "U") {
    const canvas = createCanvas(128, 128)
    const ctx = canvas.getContext("2d")

    ctx.fillStyle = randomColor()
    ctx.fillRect(0, 0, 128, 128)

    ctx.font = "bold 72px sans-serif"
    ctx.fillStyle = "white"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(letter.toUpperCase(), 64, 64)

    return canvas.toDataURL()
}
