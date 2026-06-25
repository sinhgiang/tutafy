import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabase = createClient(
  'https://dkxngropifwsqsozerxb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRreG5ncm9waWZ3c3Fzb3plcnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMwMzQ2NSwiZXhwIjoyMDk3ODc5NDY1fQ.15PJLm-Pnjt1H4vVOMxG-zCqpF5DPjx_pqBaS4d0ivQ',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Statements split one by one
const schema = readFileSync(join(__dirname, '../supabase/migrations/001_schema.sql'), 'utf8')
const rls = readFileSync(join(__dirname, '../supabase/migrations/002_rls.sql'), 'utf8')

async function execSql(sql) {
  const res = await fetch('https://dkxngropifwsqsozerxb.supabase.co/rest/v1/rpc/exec_sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRreG5ncm9waWZ3c3Fzb3plcnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMwMzQ2NSwiZXhwIjoyMDk3ODc5NDY1fQ.15PJLm-Pnjt1H4vVOMxG-zCqpF5DPjx_pqBaS4d0ivQ',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRreG5ncm9waWZ3c3Fzb3plcnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMwMzQ2NSwiZXhwIjoyMDk3ODc5NDY1fQ.15PJLm-Pnjt1H4vVOMxG-zCqpF5DPjx_pqBaS4d0ivQ',
    },
    body: JSON.stringify({ query: sql })
  })
  return { status: res.status, body: await res.text() }
}

const result = await execSql('SELECT 1 as test')
console.log('RPC test:', result)
