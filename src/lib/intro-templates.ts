// Starting points for a tutor's introduction (the bio field in Settings, Profile tab) (T-0765).
//
// A template is plain text with the parts the tutor must replace in [square brackets]. Nothing is stored for a template: choosing one
// only fills the same bio text box the tutor already has, and the tutor saves it like any other bio. The text is written as if the
// tutor were talking to one student, and answers three questions: who do you help, what happens in a lesson, why you.
// Plain .ts with no browser or React imports, so the node tests run it.

export type IntroTemplate = {
  id: string
  name: string
  summary: string
  text: string
}

export const INTRO_TEMPLATES: IntroTemplate[] = [
  {
    id: 'beginner',
    name: 'Beginners and nervous speakers',
    summary: 'Warm, slow, no pressure',
    text:
      "Hi, I'm [your name]. I teach [subject] to [who you teach, for example beginners], and I've been tutoring for [number] years.\n\n" +
      "If speaking feels hard, we'll go slowly: short sentences, topics you care about, and no pressure. After every lesson I send you the new words and one small thing to try before next time.\n\n" +
      "Book a trial lesson and we'll find a pace that suits you.",
  },
  {
    id: 'exam',
    name: 'Exam preparation',
    summary: 'IELTS, TOEFL, Goethe, DELE',
    text:
      "Hi, I'm [your name]. I help [who, for example busy professionals] prepare for [exam]. [One result, for example: Most of my students reach band 7 or higher.]\n\n" +
      'We start with a quick check of your level, then work from your real material. You leave every lesson with [number] things to practise before we meet again.\n\n' +
      'A good fit if you have an exam date and need a plan.',
  },
  {
    id: 'work',
    name: 'Work and career',
    summary: 'Meetings, interviews, emails',
    text:
      "Hi, I'm [your name]. I teach [subject] to people who use it at work: [for example meetings, interviews and emails]. I've done this for [number] years.\n\n" +
      'We work from your real material: your last meeting, your next presentation, the email you are afraid to send. Each lesson ends with [number] things to practise.\n\n' +
      'A good fit if you understand more than you can say at work and want honest feedback.',
  },
  {
    id: 'kids',
    name: 'Kids and teens',
    summary: 'Written for parents',
    text:
      "Hi, I'm [your name]. I teach [subject] to children and teenagers aged [age range], and I've been tutoring for [number] years.\n\n" +
      'Lessons are short and active: games, stories and small goals, so your child leaves feeling they can do it. After every lesson I send you a short note about what we did and what to practise.\n\n' +
      "Book a trial lesson and your child can meet me first. You're welcome to stay for the first one.",
  },
]

/** Every [bracketed part] still left in a text: the placeholders a tutor has not replaced yet. */
export function unfilledParts(text: unknown): string[] {
  return typeof text === 'string' ? text.match(/\[[^\[\]\n]{1,120}\]/g) ?? [] : []
}

/** Which template (if any) a text is, exactly: lets the page tell "still the template" from "the tutor's own words". */
export function templateIdOf(text: unknown): string | null {
  const t = typeof text === 'string' ? text.trim() : ''
  return INTRO_TEMPLATES.find(x => x.text === t)?.id ?? null
}
