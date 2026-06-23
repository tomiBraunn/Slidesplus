/**
 * Shared persistence: slides table + projects.document in one transaction.
 */

const DOC_HEAD =
	"<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head><body>"
const DOC_TAIL = "</body></html>"

export function parseSectionsFromHtml(content) {
	if (!content || typeof content !== "string") return []
	const sections = content.match(/<section[\s\S]*?<\/section>/gi) || []
	return sections.map((html, i) => ({ html, position: i }))
}

export function normalizeSlidesInput(slides) {
	if (!Array.isArray(slides)) return []
	return slides
		.filter((s) => s && s.html)
		.map((s, i) => ({
			html: s.html,
			position: s.position !== undefined ? s.position : i,
		}))
}

export function buildDocumentFromSlides(slideRows) {
	const body = slideRows
		.sort((a, b) => a.position - b.position)
		.map((s) => s.html)
		.join("\n")
	return `${DOC_HEAD}${body}${DOC_TAIL}`
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} projectId
 * @param {string} userId
 * @param {{ content?: string, slides?: Array<{ html: string, position?: number }> }} input
 */
export async function persistProjectContent(pool, projectId, userId, input) {
	const { content, slides: rawSlides } = input

	let slides = normalizeSlidesInput(rawSlides)
	if (slides.length === 0 && content) {
		slides = parseSectionsFromHtml(content)
	}
	if (slides.length === 0) {
		throw new Error("No slides to persist")
	}

	const document = content && content.includes("<section") ? content : buildDocumentFromSlides(slides)

	const client = await pool.connect()
	try {
		await client.query("BEGIN")

		const upsertedSlides = []
		for (const slide of slides) {
			const q = await client.query(
				`INSERT INTO slides (project_id, position, html)
				VALUES ($1, $2, $3)
				ON CONFLICT (project_id, position)
				DO UPDATE SET
					html = EXCLUDED.html,
					updated_at = NOW()
				RETURNING id, project_id, position, html, created_at, updated_at`,
				[projectId, slide.position, slide.html]
			)
			upsertedSlides.push(q.rows[0])
		}

		const positions = slides.map((s) => s.position)
		if (positions.length > 0) {
			await client.query(
				`DELETE FROM slides WHERE project_id = $1 AND position NOT IN (${positions.map((_, i) => `$${i + 2}`).join(",")})`,
				[projectId, ...positions]
			)
		} else {
			await client.query(`DELETE FROM slides WHERE project_id = $1`, [projectId])
		}

		await client.query(
			`UPDATE projects
			SET document = $1, updated_at = NOW(), last_modified_by = $2, last_modified_at = NOW()
			WHERE id = $3`,
			[document, userId, projectId]
		)

		await client.query("COMMIT")

		return {
			slides: upsertedSlides.sort((a, b) => a.position - b.position),
			document,
			slideSnapshots: upsertedSlides.map((s) => ({ position: s.position, html: s.html })),
		}
	} catch (err) {
		await client.query("ROLLBACK")
		throw err
	} finally {
		client.release()
	}
}

export function slidesFingerprint(slides) {
	return JSON.stringify(
		slides.map((s) => ({ position: s.position, html: s.html }))
	)
}

const MAX_VERSIONS_PER_PROJECT = 50

/**
 * Poda solo las versiones automáticas (auto_save) más antiguas, conservando
 * las MAX_VERSIONS_PER_PROJECT más recientes. Las versiones manuales
 * (manual_save) nunca se borran aquí: son puntos de restauración que el
 * usuario nombró explícitamente.
 */
export async function pruneProjectChanges(pool, projectId) {
	await pool.query(
		`DELETE FROM project_changes
		WHERE id IN (
			SELECT id FROM project_changes
			WHERE project_id = $1 AND change_type = 'auto_save'
			ORDER BY created_at DESC, id DESC
			OFFSET $2
		)`,
		[projectId, MAX_VERSIONS_PER_PROJECT]
	)
}
