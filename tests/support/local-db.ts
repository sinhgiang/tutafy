// A throwaway Postgres in memory (PGlite) that stands in for Supabase, so the
// migration files can be tried without touching any real database.
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'

export const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'supabase', 'migrations')

/** What Supabase provides before our migrations run: roles, the auth schema and auth.uid(). */
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
}

export async function newDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { uuid_ossp } })
  await db.exec(SUPABASE_STUBS)
  return db
}

/**
 * 013 and 014 alter public.team_members, a table that no file in supabase/migrations
 * creates (it was made some other way on the real database), so they cannot run on a
 * copy built from the files. They do not touch anything 015 uses.
 */
export const FILES_THAT_NEED_TABLES_NOT_IN_THE_REPO = ['013_team_seat_limit.sql', '014_team_member_booking.sql']

/** Run every migration file that comes before `target`, in order, except the known gaps. */
export async function applyMigrationsBefore(db: PGlite, target: string): Promise<string[]> {
  const applied: string[] = []
  for (const file of migrationFiles()) {
    if (file === target) break
    if (FILES_THAT_NEED_TABLES_NOT_IN_THE_REPO.includes(file)) continue
    await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'))
    applied.push(file)
  }
  return applied
}

export function readMigration(file: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
}
