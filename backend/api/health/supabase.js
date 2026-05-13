import { supabase } from '../../services/supabaseService.js'

export default async function handler(req, res) {
  // simple token protection to avoid public abuse
  const token = req.headers['x-health-token'] || req.query.token
  if (!process.env.HEALTH_TOKEN) {
    console.error('HEALTH_TOKEN not configured')
    return res.status(500).json({ ok: false, message: 'Health token not configured' })
  }
  if (!token || token !== process.env.HEALTH_TOKEN) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' })
  }

  try {
    // lightweight read to generate DB activity
    const { data, error, status } = await supabase.from('projects').select('id').limit(1)
    if (error) {
      console.error('Health check supabase error:', error)
      return res.status(502).json({ ok: false, message: 'Supabase query error', detail: error.message })
    }

    return res.status(200).json({ ok: true, rows: Array.isArray(data) ? data.length : 0, status })
  } catch (err) {
    console.error('Unexpected health check error:', err)
    return res.status(500).json({ ok: false, message: 'Internal error' })
  }
}
