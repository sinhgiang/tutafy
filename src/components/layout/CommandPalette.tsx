'use client'

// The Ctrl or Cmd K command bar (T-0820): type to jump to any page of the app or to start a common action.
// The items and the filter are in src/lib/command-items.ts; this file is the box around them.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { bookingLink, commandItems, filterCommands, isCommandShortcut, type CommandItem } from '@/lib/command-items'
import { toggleTheme } from './theme-client'

export const OPEN_COMMAND_EVENT = 'tutafy-open-command'

export function CommandPalette({ slug }: { slug?: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  const items = useMemo(() => commandItems({ slug }), [slug])
  const shown = useMemo(() => filterCommands(items, query), [items, query])

  function show() {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setQuery(''); setIndex(0); setOpen(true)
  }
  function close() {
    setOpen(false)
    returnTo.current?.focus()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isCommandShortcut(e)) { e.preventDefault(); if (open) close(); else show() }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_COMMAND_EVENT, show)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(OPEN_COMMAND_EVENT, show) }
  })

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  async function run(item: CommandItem) {
    close()
    if (item.href) { router.push(item.href); return }
    if (item.id === 'action:toggle-theme') { toggleTheme(); return }
    if (item.id === 'action:copy-booking-link' && slug) {
      try {
        await navigator.clipboard.writeText(bookingLink(window.location.origin, slug))
        toast.success('Booking link copied')
      } catch { toast.error('Could not copy the link') }
    }
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, Math.max(shown.length - 1, 0))) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && shown[index]) { e.preventDefault(); void run(shown[index]) }
  }

  if (!open) return null

  const groups: { title: string; kind: CommandItem['kind'] }[] = [{ title: 'Actions', kind: 'action' }, { title: 'Go to', kind: 'page' }]
  return (
    <div className="dash-scrim" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
      <div className="dash-cmd" role="dialog" aria-modal="true" aria-label="Command bar" data-testid="command-bar">
        <div className="dash-cmd-in">
          <Search aria-hidden="true" />
          <input
            ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setIndex(0) }} onKeyDown={onInputKey}
            placeholder="Type a page or an action" aria-label="Search pages and actions" role="combobox" aria-expanded="true"
            aria-controls="command-list" aria-activedescendant={shown[index] ? `cmd-${shown[index].id}` : undefined} autoComplete="off" spellCheck={false}
          />
        </div>
        <ul id="command-list" className="dash-cmd-list" role="listbox" aria-label="Results">
          {shown.length === 0 && <li className="dash-cmd-empty" role="presentation">Nothing matches &ldquo;{query}&rdquo;.</li>}
          {groups.map(g => {
            const rows = shown.filter(i => i.kind === g.kind)
            if (rows.length === 0) return null
            return [
              <li key={g.title} className="dash-cmd-head" role="presentation">{g.title}</li>,
              ...rows.map(item => (
                <li key={item.id} id={`cmd-${item.id}`} role="option" aria-selected={shown[index]?.id === item.id} className="dash-cmd-item"
                  onMouseEnter={() => setIndex(shown.indexOf(item))} onMouseDown={e => { e.preventDefault(); void run(item) }}>
                  {item.label}
                  {item.href && <small>{item.href}</small>}
                </li>
              )),
            ]
          })}
        </ul>
        <div className="dash-cmd-foot"><span>Up and down to move</span><span>Enter to open</span><span>Esc to close</span></div>
      </div>
    </div>
  )
}
