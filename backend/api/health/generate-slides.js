export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, message: 'Method not allowed' })
  }

  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY not configured')
    return res.status(500).json({ ok: false, message: 'Groq API key not configured' })
  }

  const { topic, slideCount, tone = 'neutral', language = 'English' } = req.body ?? {}

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ ok: false, message: 'Missing or invalid "topic"' })
  }

  const count = Number(slideCount)
  if (!Number.isInteger(count) || count <= 0) {
    return res.status(400).json({ ok: false, message: 'Missing or invalid "slideCount" (positive integer expected)' })
  }

  const systemPrompt = "You are a presentation expert. Return ONLY valid JSON, no markdown, no backticks.";
  const userPrompt = `Create a ${count}-slide presentation about '${topic}' in ${tone} tone in ${language}.\nReturn a JSON array with this exact structure:\n[{ slideNumber, title, bullets: [3-5 strings], speakerNotes }]`;

  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 1200
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions'

  const doRequest = async () => {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(body)
    })
    return resp
  }

  try {
    let resp = await doRequest()
    if (resp.status === 429) {
      // retry once with exponential backoff (2s)
      await new Promise(r => setTimeout(r, 2000))
      resp = await doRequest()
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      console.error('Groq API error:', resp.status, text)
      return res.status(502).json({ ok: false, message: 'Groq API error', status: resp.status, detail: text })
    }

    const data = await resp.json()

    // Extract text from typical chat/completions shape
    let raw = null
    if (Array.isArray(data.choices) && data.choices.length > 0) {
      raw = data.choices[0].message?.content || data.choices[0].message?.content?.parts?.[0] || data.choices[0].text || null
    }
    if (!raw && typeof data === 'string') raw = data

    if (!raw) {
      console.error('Groq response missing content', data)
      return res.status(502).json({ ok: false, message: 'Invalid Groq response format', detail: data })
    }

    // Strict parse: must be valid JSON array of objects with required keys
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      console.error('Failed to parse Groq JSON:', err, 'raw:', raw)
      return res.status(502).json({ ok: false, message: 'Groq returned invalid JSON', detail: err.message })
    }

    if (!Array.isArray(parsed)) {
      return res.status(502).json({ ok: false, message: 'Groq JSON is not an array' })
    }

    // Basic validation of shape
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) {
        return res.status(502).json({ ok: false, message: 'Groq JSON items must be objects' })
      }
      if (!('slideNumber' in item) || !('title' in item) || !('bullets' in item) || !('speakerNotes' in item)) {
        return res.status(502).json({ ok: false, message: 'Groq JSON item missing required keys' })
      }
      if (!Array.isArray(item.bullets)) {
        return res.status(502).json({ ok: false, message: 'Groq JSON bullets must be an array' })
      }
    }

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Unexpected error in generate-slides:', err)
    return res.status(500).json({ ok: false, message: 'Internal error', detail: err.message })
  }
}
