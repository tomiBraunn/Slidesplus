import { supabase } from "./supabaseService.js"

function getRandomColor() {
	const letters = "0123456789ABCDEF"
	let color = "#"
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)]
	}
	return color
}

export async function generateAvatar(letter, userId) {
	const l = (letter || "U").toUpperCase().slice(0, 1)
	const color1 = getRandomColor()
	const color2 = getRandomColor()
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">` +
		`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
		`<stop offset="0" stop-color="${color1}"/><stop offset="1" stop-color="${color2}"/>` +
		`</linearGradient></defs>` +
		`<rect width="128" height="128" rx="64" fill="url(#g)"/>` +
		`<text x="50%" y="50%" dy=".36em" text-anchor="middle" fill="white" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="500">` +
		l +
		`</text></svg>`

	try {
		const fileName = `avatars/${userId}-${Date.now()}.svg`
		const buffer = Buffer.from(svg, "utf-8")

		const { data, error } = await supabase.storage
			.from("chat-attachments")
			.upload(fileName, buffer, {
				contentType: "image/svg+xml",
				cacheControl: "3600",
				upsert: false
			})

		if (error) {
			console.error("Error uploading avatar to Supabase:", error)
			// Fallback to base64 if upload fails
			const b64 = Buffer.from(svg, "utf8").toString("base64")
			return `data:image/svg+xml;base64,${b64}`
		}

		const { data: publicUrlData } = supabase.storage
			.from("chat-attachments")
			.getPublicUrl(fileName)

		return publicUrlData.publicUrl
	} catch (err) {
		console.error("Error in generateAvatar:", err)
		// Fallback to base64 if anything goes wrong
		const b64 = Buffer.from(svg, "utf8").toString("base64")
		return `data:image/svg+xml;base64,${b64}`
	}
}
