/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                background: "rgb(var(--background) / <alpha-value>)",
                foreground: "rgb(var(--foreground) / <alpha-value>)",
                border: "rgb(var(--border) / <alpha-value>)",
                muted: "rgb(var(--muted) / <alpha-value>)",
                "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
                card: "rgb(var(--card) / <alpha-value>)",
            },
            keyframes: {
                "marquee-up": {
                    "0%": { transform: "translateY(0)" },
                    "100%": { transform: "translateY(-50%)" },
                },
                "marquee-down": {
                    "0%": { transform: "translateY(-50%)" },
                    "100%": { transform: "translateY(0)" },
                },
            },
        }
    },
    plugins: [
        require('tailwind-scrollbar')({ nocompatible: true }),
    ],
}
