// Test-only module hooks: resolve the "@/..." path alias (tsconfig paths) to
// src/ so route handlers can be imported by node's built-in test runner.
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const base = path.join(SRC, specifier.slice(2))
    for (const ext of CANDIDATES) {
      const file = base + ext
      if (existsSync(file) && /\.(ts|tsx)$/.test(file)) {
        return nextResolve(pathToFileURL(file).href, context)
      }
    }
  }
  // Next ships subpath entries without an "exports" map; bundlers add the extension, node does not.
  if (/^next\/[a-z-]+$/.test(specifier)) return nextResolve(`${specifier}.js`, context)
  return nextResolve(specifier, context)
}
