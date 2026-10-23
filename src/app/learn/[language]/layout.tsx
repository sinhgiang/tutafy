import '@/styles/directory-dark.css'

// The dark colour scheme of the directory (src/styles/directory-dark.css, T-0863) also covers the language pages: they use the same cards.
// It sits in a layout because a page file is loaded by the tests and a stylesheet is not.
export default function LanguageLayout({ children }: { children: React.ReactNode }) {
  return children
}
