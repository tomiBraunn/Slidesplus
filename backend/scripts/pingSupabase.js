const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

;(async () => {
  try {
    console.log('Pinging Supabase to keep it awake...')
    // Lightweight read query against a commonly-available table in this project
    const { data, error, status } = await supabase.from('projects').select('id').limit(1)
    if (error) {
      console.error('Supabase query error:', error)
      process.exit(1)
    }
    console.log('Ping successful — status:', status, 'rows:', Array.isArray(data) ? data.length : 0)
    process.exit(0)
  } catch (err) {
    console.error('Unexpected error while pinging Supabase:', err)
    process.exit(1)
  }
})()
