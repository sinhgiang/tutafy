import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const { Client } = pg

const client = new Client({
  host: '2600:1f18:7d97:f601:af58:e57b:73a2:e314',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  try {
    await client.connect()
    console.log('✅ Connected to Supabase!')

    const schema = readFileSync(join(__dirname, '../supabase/migrations/001_schema.sql'), 'utf8')
    const rls = readFileSync(join(__dirname, '../supabase/migrations/002_rls.sql'), 'utf8')

    console.log('Running 001_schema.sql...')
    await client.query(schema)
    console.log('✅ Schema created!')

    console.log('Running 002_rls.sql...')
    await client.query(rls)
    console.log('✅ RLS policies created!')

    console.log('\n🎉 All migrations completed successfully!')
  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await client.end()
  }
}

run()
