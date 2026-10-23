// The head of a Settings section (T-0844): its name as a real heading and one sentence about what it holds, so each section says what
// it is before its first field. The page title is the h1; each section is an h2.
export function SectionHead({ title, text }: { title: string; text: string }) {
  return (
    <header className="set-section-head" data-testid="settings-section-head">
      <h2>{title}</h2>
      <p>{text}</p>
    </header>
  )
}
