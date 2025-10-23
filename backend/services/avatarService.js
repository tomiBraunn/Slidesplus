export function generateAvatar(letter) {
	const l = (letter || "U").toUpperCase().slice(0, 1)
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">` +
		`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
		`<stop offset="0" stop-color="#249931"/><stop offset="1" stop-color="#7182FF"/>` +
		`</linearGradient></defs>` +
		`<rect width="128" height="128" rx="64" fill="url(#g)"/>` +
		`<text x="50%" y="50%" dy=".36em" text-anchor="middle" fill="white" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="700">` +
		l +
		`</text></svg>`
	const b64 = Buffer.from(svg, "utf8").toString("base64")
	return `data:image/svg+xml;base64,${b64}`
}
