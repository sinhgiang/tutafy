// Test-only module hooks: resolve the "@/..." path alias (tsconfig paths) to
// src/ so route handlers can be imported by node's built-in test runner.
// It also turns a .tsx file into plain JavaScript on load (T-0675), so a server page can be rendered to HTML in a test.
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

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
  // A relative import inside src/ with no extension ('./BookingForm'): bundlers add .ts or .tsx, node does not.
  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier) && context.parentURL?.startsWith('file:')) {
    const parent = fileURLToPath(context.parentURL)
    if (parent.startsWith(SRC)) {
      const base = path.resolve(path.dirname(parent), specifier)
      for (const ext of CANDIDATES) {
        if (existsSync(base + ext) && /\.(ts|tsx)$/.test(base + ext)) return nextResolve(pathToFileURL(base + ext).href, context)
      }
    }
  }
  // Next ships subpath entries without an "exports" map; bundlers add the extension, node does not.
  if (/^next\/[a-z-]+$/.test(specifier)) return nextResolve(`${specifier}.js`, context)
  return nextResolve(specifier, context)
}

// node strips types from .ts by itself but cannot read JSX, so .tsx goes through the TypeScript compiler
// (already installed for the build). Nothing else is changed: no bundling, no extra transform.
export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.tsx')) {
    const source = await readFile(fileURLToPath(url), 'utf8')
    const { outputText } = ts.transpileModule(source, {
      fileName: fileURLToPath(url),
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    return { format: 'module', source: outputText, shortCircuit: true }
  }
  return nextLoad(url, context)
}
