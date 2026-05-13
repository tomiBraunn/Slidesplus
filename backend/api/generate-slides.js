export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, message: 'Method not allowed' })
  }

  const { topic, slideCount, tone = 'neutral', language = 'English', provider = 'groq' } = req.body ?? {}

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ ok: false, message: 'Missing or invalid "topic"' })
  }

  const count = Number(slideCount)
  if (!Number.isInteger(count) || count <= 0) {
    return res.status(400).json({ ok: false, message: 'Missing or invalid "slideCount" (positive integer expected)' })
  }

  const systemPrompt = "You are a presentation expert. Return ONLY valid JSON, no markdown, no backticks.";
  const userPrompt = `Create a ${count}-slide presentation about '${topic}' in ${tone} tone in ${language}.\nReturn a JSON array with this exact structure:\n[{ slideNumber, title, bullets: [3-5 strings], speakerNotes }]`;

  try {
    let resp
    if (provider === 'gemini') {
      if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY not configured')
        return res.status(500).json({ ok: false, message: 'Gemini API key not configured' })
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
      const body = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      }

      const doRequest = async () => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      resp = await doRequest()
      if (resp.status === 429) {
        await new Promise(r => setTimeout(r, 2000))
        resp = await doRequest()
      }

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        console.error('Gemini API error:', resp.status, text)
        return res.status(502).json({ ok: false, message: 'Gemini API error', status: resp.status, detail: text })
      }

      const json = await resp.json()
      const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!raw) {
        console.error('Gemini response missing content', json)
        return res.status(502).json({ ok: false, message: 'Invalid Gemini response format', detail: json })
      }

      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch (err) {
        console.error('Failed to parse Gemini JSON:', err, 'raw:', raw)
        return res.status(502).json({ ok: false, message: 'Gemini returned invalid JSON', detail: err.message })
      }

      if (!Array.isArray(parsed)) {
        return res.status(502).json({ ok: false, message: 'Gemini JSON is not an array' })
      }

      // basic validation
      for (const item of parsed) {
        if (typeof item !== 'object' || item === null) return res.status(502).json({ ok: false, message: 'Gemini JSON items must be objects' })
        if (!('slideNumber' in item) || !('title' in item) || !('bullets' in item) || !('speakerNotes' in item)) return res.status(502).json({ ok: false, message: 'Gemini JSON item missing required keys' })
        if (!Array.isArray(item.bullets)) return res.status(502).json({ ok: false, message: 'Gemini JSON bullets must be an array' })
      }

      return res.status(200).json(parsed)
    } else {
      // default: groq
      if (!process.env.GROQ_API_KEY) {
        console.error('GROQ_API_KEY not configured')
        return res.status(500).json({ ok: false, message: 'Groq API key not configured' })
      }

      const url = 'https://api.groq.com/openai/v1/chat/completions'
      const body = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1200
      }

      const doRequest = async () => fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify(body)
      })

      resp = await doRequest()
      if (resp.status === 429) {
        await new Promise(r => setTimeout(r, 2000))
        resp = await doRequest()
      }

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        console.error('Groq API error:', resp.status, text)
        return res.status(502).json({ ok: false, message: 'Groq API error', status: resp.status, detail: text })
      }

      const data = await resp.json()
      let raw = null
      if (Array.isArray(data.choices) && data.choices.length > 0) {
        raw = data.choices[0].message?.content || data.choices[0].message?.content?.parts?.[0] || data.choices[0].text || null
      }
      if (!raw && typeof data === 'string') raw = data

      if (!raw) {
        console.error('Groq response missing content', data)
        return res.status(502).json({ ok: false, message: 'Invalid Groq response format', detail: data })
      }

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

      for (const item of parsed) {
        if (typeof item !== 'object' || item === null) return res.status(502).json({ ok: false, message: 'Groq JSON items must be objects' })
        if (!('slideNumber' in item) || !('title' in item) || !('bullets' in item) || !('speakerNotes' in item)) return res.status(502).json({ ok: false, message: 'Groq JSON item missing required keys' })
        if (!Array.isArray(item.bullets)) return res.status(502).json({ ok: false, message: 'Groq JSON bullets must be an array' })
      }

      return res.status(200).json(parsed)
    }
  } catch (err) {
    console.error('Unexpected error in generate-slides:', err)
    return res.status(500).json({ ok: false, message: 'Internal error', detail: err.message })
  }
}
