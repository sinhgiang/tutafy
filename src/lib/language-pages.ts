// Language pages (T-0875): /learn/<language>, one page of our own for each of the languages that tutors who can be booked teach the most.
//
// A page exists only when BOTH hold: the language has a guide written below, and at least NICHE_MIN_TUTORS tutors who can be booked today
// (the directory rule, src/lib/directory.ts) teach it. At most NICHE_MAX_PAGES languages get a page, the ones with the most tutors (ties by
// name). A language without enough tutors has NO page: no empty page, no thin copy. The pages, the sitemap and /llms-languages.txt all ask
// pickLanguagePages() and nothing else, so they cannot disagree.
//
// Every guide is written by hand for its language: what is hard, what to practise, how to pick a tutor and the questions people really ask
// differ, so no paragraph is shared between two languages (tests/language-pages.test.ts compares them). Facts are kept to what is stable and
// checkable; nothing promises a result or a price. Plain .ts with no browser, React or database imports, so the node tests can load it.
import type { DirectoryCard } from '@/lib/directory'

export const NICHE_MIN_TUTORS = 3
export const NICHE_MAX_PAGES = 3

export type LanguageGuide = {
  /** The name as tutors write it on their profile (matches DirectoryCard.languages after cleanLanguage). */
  name: string
  slug: string
  /** The whole <title>, brand included: 20 to 60 characters. */
  title: string
  /** 70 to 155 characters. */
  description: string
  /** The first one to three sentences of the page: the answer to "how do I find a <language> tutor?". */
  answer: string
  /** How learning this language with a tutor usually goes: two short paragraphs. */
  learn: [string, string]
  /** What to look for in a tutor of THIS language: four points. */
  choose: { title: string; text: string }[]
  /** Common reasons people learn it, shown as a short list. */
  goals: string[]
  faq: { q: string; a: string }[]
}

export const LANGUAGE_GUIDES: LanguageGuide[] = [
  {
    name: 'English',
    slug: 'english',
    title: 'Online English Tutors You Can Book Today | Tutafy',
    description: 'Book a 1-on-1 online English tutor with free times in the next 14 days. Compare ratings and prices, see times in your zone and pick a trial lesson.',
    answer: 'To find an English tutor, say what you need English for (work, an exam or everyday talk), choose a tutor who teaches that, and book a free time that suits your day. Every tutor below has open times in the next 14 days, so you can book now.',
    learn: [
      'English tutoring is rarely about one thing. A person preparing for IELTS needs timed writing and speaking practice; someone changing jobs needs meetings, emails and small talk; someone who understands films but freezes when speaking needs hours of low-pressure conversation. The right tutor is the one who has done your kind of lesson many times, not simply the one with the most reviews.',
      'Most progress comes from speaking and from being corrected kindly and specifically. A good lesson ends with two or three of your own sentences, fixed and said again, that you can reuse that week. If you can, book a short trial first and notice how much of the time you speak.',
    ],
    choose: [
      { title: 'Match the goal, not the accent', text: 'An exam coach, a business English tutor and a conversation partner do different work. Read the introduction for the exam or situation you have in mind.' },
      { title: 'Ask how they correct you', text: 'Some tutors interrupt every mistake, some collect them and review at the end. Pick the style that keeps you talking.' },
      { title: 'Check the level they teach', text: 'A tutor who loves advanced writing may not be the best first teacher for a beginner. Use the level filter on the tutor list.' },
      { title: 'Look at the time zone', text: 'Lessons at 6 AM or midnight do not last. Times on this page are shown in your own time zone.' },
    ],
    goals: ['Exams such as IELTS and TOEFL', 'Business English and interviews', 'Speaking with confidence', 'English for study abroad'],
    faq: [
      { q: 'How many English lessons a week do I need?', a: 'Two lessons a week with a little practice between them is a common rhythm for steady progress. One lesson a week works if you practise on your own; three or more helps before an exam or a move.' },
      { q: 'Can I prepare for IELTS or TOEFL with an online tutor?', a: 'Yes. Look for tutors who say they teach exam preparation, and ask for a trial lesson that uses a real past paper so you see how they give feedback.' },
      { q: 'Do I need a native speaker?', a: 'Not necessarily. What matters is clear speech, patience and experience with learners of your level and first language. Read the introduction and try a trial lesson.' },
      { q: 'What if I am a complete beginner?', a: 'Choose a tutor who lists the Beginner level. They will keep lessons slow and in short sentences, and many speak your first language to explain a hard point.' },
    ],
  },
  {
    name: 'Spanish',
    slug: 'spanish',
    title: 'Online Spanish Tutors You Can Book Today | Tutafy',
    description: 'Book a 1-on-1 online Spanish tutor with free times in the next 14 days. Compare ratings and prices, see times in your zone and pick a trial lesson.',
    answer: 'To find a Spanish tutor, decide whether you want everyday conversation, travel Spanish or an exam such as DELE, pick a tutor who teaches that, and book a free time. Every tutor below has open times in the next 14 days.',
    learn: [
      'Spanish is kind to beginners: spelling is regular and a few hundred common words go a long way. The hard parts arrive early, though. Verb endings change with the person and the tense, the subjunctive confuses almost everyone, and native speakers talk fast. A tutor helps most by making you produce those forms out loud until they feel normal.',
      'Accents differ a lot between Spain, Mexico, the Caribbean and the Southern Cone, in pronunciation and in some words. Choose a tutor whose Spanish matches where you will use it, then listen to others for variety once you can follow.',
    ],
    choose: [
      { title: 'Pick the variety you need', text: 'If you are moving to Madrid or travelling in Mexico, a tutor from there will teach the words and the rhythm you will hear.' },
      { title: 'Ask about verbs and the subjunctive', text: 'A good tutor has a plan for them: short drills, then conversation. Ask how they teach the past tenses.' },
      { title: 'Match the exam', text: 'If you need DELE or SIELE, choose someone who has prepared students for it and ask to see how they give feedback on speaking.' },
      { title: 'Start with a trial lesson', text: 'Many Spanish tutors offer a cheaper first lesson. Use it to hear their pace and see if you speak more than they do.' },
    ],
    goals: ['Travel and living abroad', 'Spanish for work', 'DELE and SIELE exams', 'Speaking with family'],
    faq: [
      { q: 'How long does it take to hold a basic conversation in Spanish?', a: 'It depends on your time and your first language. Many learners who practise a few times a week can handle simple everyday exchanges after a few months. A tutor helps most in the first weeks, when habits form.' },
      { q: 'Should I learn Spanish from Spain or from Latin America?', a: 'Choose the one you will meet. The grammar is the same; pronunciation and some words differ. If you are unsure, any clear, patient tutor is a good start.' },
      { q: 'Can a tutor help with the subjunctive?', a: 'Yes, and it is a common reason to book one. Ask for a tutor who gives short exercises and then uses the form with you in conversation.' },
      { q: 'Are there tutors for kids or teenagers?', a: 'Some tutors teach young learners. Read the introduction, and message the tutor before booking if you are not sure.' },
    ],
  },
  {
    name: 'French',
    slug: 'french',
    title: 'Online French Tutors You Can Book Today | Tutafy',
    description: 'Book a 1-on-1 online French tutor with free times in the next 14 days. Compare ratings and prices, see times in your zone and pick a trial lesson.',
    answer: 'A French tutor is easiest to choose by starting from the place and the test: are you heading to Paris, Montreal or Dakar, and is there a DELF date? Pick a tutor who knows that situation and book a time. Every tutor below has open times in the next 14 days.',
    learn: [
      'French spelling hides its sounds: many written letters are silent, words link together when spoken, and the nasal vowels do not exist in English. Learners often read well and still cannot follow a native speaker. A tutor fixes this by having you listen, repeat and say whole phrases at natural speed, not word by word.',
      'Grammar adds its own steps: every noun has a gender, adjectives agree, and the past tense has two common forms. Short, repeated practice beats long explanations, so look for a tutor who talks little and asks a lot.',
    ],
    choose: [
      { title: 'Listen to their pronunciation work', text: 'Ask how they teach nasal vowels and the French "r". A tutor who has a method will explain it in a minute.' },
      { title: 'Match the place', text: 'French in Quebec, France, Belgium and West Africa shares a core but differs in words and accent. Choose the one you need.' },
      { title: 'Choose by exam if you have one', text: 'DELF, DALF and TCF reward different skills. A tutor who has prepared them will use real past papers.' },
      { title: 'Ask for a trial lesson', text: 'Use it to see if you are speaking most of the time and if corrections feel useful, not discouraging.' },
    ],
    goals: ['Travel and daily life', 'DELF, DALF and TCF exams', 'Moving to a French-speaking place', 'Reading and speaking for work'],
    faq: [
      { q: 'Why is French so hard to understand when spoken?', a: 'Words are linked together and many final letters are silent, so what you hear is not what you see. Listening practice with a tutor, at natural speed, is the quickest fix.' },
      { q: 'Do I need to learn all the grammar first?', a: 'No. Start speaking early with simple sentences and add grammar as you need it. A good tutor decides the order with you.' },
      { q: 'Can I prepare for DELF with a tutor?', a: 'Yes. Pick a tutor who lists exam preparation and ask them how they would plan your weeks before the test date.' },
      { q: 'What level should I choose?', a: 'Pick the level that sounds like you: Beginner if you know a few phrases, Intermediate if you can talk about the past with mistakes, Advanced if you want polish and nuance.' },
    ],
  },
  {
    name: 'German',
    slug: 'german',
    title: 'Online German Tutors You Can Book Today | Tutafy',
    description: 'Book a 1-on-1 online German tutor with free times in the next 14 days. Compare ratings and prices, see times in your zone and pick a trial lesson.',
    answer: 'A German tutor should know your next step, whether it is a visa language test, a university place or a new job in Vienna. Read the introductions for that, and book a time that fits your week. Every tutor below has open times in the next 14 days.',
    learn: [
      'German is logical but demanding at the start. Nouns carry a gender and four cases change the articles and endings, and the verb moves to the end of some sentences. Most learners know the rules and still hesitate when speaking. A tutor helps by giving you the same structure again and again in different situations until the order of the words feels natural.',
      'Vocabulary builds fast because words are joined, so a long word is usually two or three small ones you know. Practise with real situations: a visit to the doctor, a call about a flat, small talk at work. Those are the sentences you will need first if you move.',
    ],
    choose: [
      { title: 'Match the exam or the goal', text: 'Goethe, TELC and TestDaF test different things. If you are applying for a visa or a university, ask for a tutor with that experience.' },
      { title: 'Ask how they teach cases', text: 'A good answer is short drills plus conversation, not a long table to memorise.' },
      { title: 'Choose a dialect carefully', text: 'Standard German is the safe base. Some tutors speak with a regional accent; ask if it matters for where you will live.' },
      { title: 'Check the lesson time', text: 'German courses often meet in the morning in Europe. Times here are in your time zone so you see what fits.' },
    ],
    goals: ['Moving to a German-speaking country', 'Goethe, TELC and TestDaF exams', 'German for work and study', 'Everyday conversation'],
    faq: [
      { q: 'Is German really that hard?', a: 'It asks for patience with cases and word order, but spelling is regular and the rules are consistent. Regular speaking practice makes the grammar feel automatic.' },
      { q: 'Can a tutor help me prepare for a Goethe exam?', a: 'Yes. Choose a tutor who lists exam preparation, and ask for a trial lesson with a sample speaking task.' },
      { q: 'Do I have to learn the gender of every noun?', a: 'Learn it with the noun from the start, as one unit, for example "der Tisch". A tutor can teach patterns that make many genders predictable.' },
      { q: 'How often should I have lessons?', a: 'Two lessons a week with short daily practice is a common rhythm. More helps if you have a test or a move coming.' },
    ],
  },
  {
    name: 'Japanese',
    slug: 'japanese',
    title: 'Online Japanese Tutors You Can Book Today | Tutafy',
    description: 'Book a 1-on-1 online Japanese tutor with free times in the next 14 days. Compare ratings and prices, see times in your zone and pick a trial lesson.',
    answer: 'For Japanese, the first choice is the order: talking first with kana, or reading first with kanji and a textbook. Tutors say which they teach, so read the introductions and book the one that matches. Every tutor below has open times in the next 14 days.',
    learn: [
      'Japanese has three scripts, a different word order and levels of politeness that change the verb. None is as hard as it sounds if you meet them in the right order: start with speaking and the two kana scripts, add kanji slowly, and learn polite forms before casual ones.',
      'Because the writing system takes time, learners who only study alone often can speak or read but not both. A tutor helps you keep the two moving together and corrects the small things that textbooks skip: pitch, particles and when to leave out words.',
    ],
    choose: [
      { title: 'Decide speaking or reading first', text: 'Tutors differ. Some start with conversation and kana, others with textbook and kanji. Pick the order that keeps you motivated.' },
      { title: 'Ask about the JLPT', text: 'If you want N5 to N1, choose someone who has prepared students for the level and uses past papers.' },
      { title: 'Listen for pitch and rhythm', text: 'A tutor should correct pronunciation gently and early, before habits set.' },
      { title: 'Mind the time difference', text: 'Many Japanese tutors live in Asia. Times here are shown in your own zone, so an evening lesson for you may be a morning for them.' },
    ],
    goals: ['Travel and culture', 'JLPT exams', 'Work with Japanese companies', 'Anime, games and books'],
    faq: [
      { q: 'Where do I start with Japanese?', a: 'Start speaking with simple polite sentences and learn hiragana and katakana in the first weeks. Add kanji gradually, a few each week.' },
      { q: 'Do I have to learn kanji?', a: 'To read, yes, but you can speak long before you read. A tutor can help you choose the kanji that matter most for your goal.' },
      { q: 'Can I prepare for the JLPT online?', a: 'Yes. Pick a tutor who lists JLPT preparation and ask how they split time between grammar, reading and listening.' },
      { q: 'Is polite or casual Japanese better to learn first?', a: 'Polite. It is safe in nearly every situation, and you can learn casual speech once you understand when to use it.' },
    ],
  },
  {
    name: 'Mandarin',
    slug: 'mandarin',
    title: 'Online Mandarin Tutors You Can Book Today | Tutafy',
    description: 'Book a 1-on-1 online Mandarin tutor with free times in the next 14 days. Compare ratings and prices, see times in your zone and pick a trial lesson.',
    answer: 'A Mandarin tutor is worth most in the first weeks, when tones set. Pick one who corrects them as you speak, check whether they teach simplified or traditional characters, and book a time. Every tutor below has open times in the next 14 days.',
    learn: [
      'Mandarin grammar is simple: no verb endings and no genders. The difficulty is elsewhere. There are four tones that change a word, and a character system that is learned by sight and by hand. Many learners get one without the other, so tones and characters should each get a place in every week.',
      'Tones are best learned by ear and mouth with someone who corrects you right away; recordings alone are not enough. Pinyin, the romanised sound system, is the bridge: learn it well in the first lessons and every new word becomes easier.',
    ],
    choose: [
      { title: 'Choose a tutor who is strict about tones', text: 'Early correction is a kindness. Ask how they teach tones and if they record or repeat your sentences.' },
      { title: 'Decide simplified or traditional', text: 'Mainland China uses simplified characters, Taiwan and Hong Kong traditional. Pick the one you need.' },
      { title: 'Ask about HSK', text: 'If you are preparing for HSK, ask which level the tutor has taught and how they use past papers.' },
      { title: 'Check evening times', text: 'Many tutors are in Asia. Times here are in your own zone so you see what really fits.' },
    ],
    goals: ['Speaking with family or colleagues', 'HSK exams', 'Living or working in China or Taiwan', 'Reading and writing characters'],
    faq: [
      { q: 'Is Mandarin harder than other languages?', a: 'The grammar is easier than many languages, while tones and characters take time. Steady short practice works better than long gaps.' },
      { q: 'Should I learn pinyin or characters first?', a: 'Pinyin first, so you can pronounce and look up any word. Then add characters at a pace that suits you.' },
      { q: 'Can I prepare for HSK with a tutor?', a: 'Yes. Choose a tutor who lists HSK, and agree the level and a plan for the weeks before the exam.' },
      { q: 'Will I be understood if my tones are not perfect?', a: 'Often, with context, but clear tones make you much easier to understand. A tutor can help you focus on the tones that matter most.' },
    ],
  },
  {
    name: 'Italian',
    slug: 'italian',
    title: 'Online Italian Tutors You Can Book Today | Tutafy',
    description: 'Book a 1-on-1 online Italian tutor with free times in the next 14 days. Compare ratings and prices, see times in your zone and pick a trial lesson.',
    answer: 'Tell a possible tutor what you want to do with Italian first: order dinner in Rome, talk with your grandmother, or pass the CILS. The best match is whoever has taught that lesson before. Every tutor below has open times in the next 14 days.',
    learn: [
      'Italian is spoken the way it is written, which makes pronunciation friendly from the first week. The effort goes into verbs, which change with the person and the tense, small words such as "ci" and "ne" that have no clean English match, and the rhythm of fast speech.',
      'Learners who also know Spanish or French move quickly through the vocabulary and sometimes mix the languages. A tutor helps you notice the traps, and keeps lessons about real conversation, food, family and travel, where Italian is most fun.',
    ],
    choose: [
      { title: 'Choose conversation or structure', text: 'Some tutors teach through talk and stories, others through a textbook. Read the introduction and pick the one that fits you.' },
      { title: 'Ask about the little words', text: 'Particles like "ci", "ne" and "si" confuse most learners. A good tutor has a way to teach them with examples.' },
      { title: 'Check exam experience', text: 'For CILS or CELI, ask which level they have prepared and how they use past papers.' },
      { title: 'Try a trial lesson', text: 'Hear their pace and see if you leave with sentences you can use.' },
    ],
    goals: ['Travel and food', 'Speaking with family', 'CILS and CELI exams', 'Moving to Italy'],
    faq: [
      { q: 'Is Italian easy to learn?', a: 'Pronunciation is regular and many words are familiar if you know another Romance language. Verbs and small words take practice.' },
      { q: 'I speak Spanish. Will that help?', a: 'Yes, a lot with vocabulary and structure. Ask your tutor to point out the false friends so you do not mix the two languages.' },
      { q: 'Can I prepare for an Italian exam?', a: 'Yes. Choose a tutor who lists exam preparation and agree which level and test date you are aiming for.' },
      { q: 'How many lessons do I need to speak with relatives?', a: 'Simple family conversations are possible for many learners after a few months of regular lessons and practice. Tell your tutor the situations you want to handle first.' },
    ],
  },
  {
    name: 'Portuguese',
    slug: 'portuguese',
    title: 'Online Portuguese Tutors You Can Book Today | Tutafy',
    description: 'Book a 1-on-1 online Portuguese tutor with free times in the next 14 days. Compare ratings and prices, see times in your zone and pick a trial lesson.',
    answer: 'Start with Brazil or Portugal, because the accent and some words differ, then choose a tutor who teaches that variety and book a time. Every tutor below has open times in the next 14 days.',
    learn: [
      'Portuguese has two main varieties that differ in pronunciation, some vocabulary and the way people address each other. Brazilian Portuguese is more open and sing-song, European Portuguese swallows many vowels. Both share the same core grammar, so what you learn carries across.',
      'Nasal sounds and the verb system are the usual hurdles. A tutor who makes you speak from the first lesson helps most, because listening alone does not teach you to produce the nasal vowels. Speakers of Spanish understand a lot in writing but need practice to follow speech.',
    ],
    choose: [
      { title: 'Pick Brazil or Portugal', text: 'Choose the variety you will use and ask the tutor which they teach. It changes the accent and some everyday words.' },
      { title: 'Ask about nasal sounds', text: 'A tutor should have simple ways to teach them, with your own recorded examples.' },
      { title: 'Match the reason', text: 'Moving, work, family and travel all need different words. Tell your tutor on the first day.' },
      { title: 'Compare trial lessons', text: 'Trying two tutors costs little and tells you which voice you enjoy listening to.' },
    ],
    goals: ['Moving to Brazil or Portugal', 'Work with Portuguese speakers', 'Travel', 'Speaking with family'],
    faq: [
      { q: 'Brazilian or European Portuguese?', a: 'The one you will meet. They are mutually understandable, but accent and some words differ, so learn the variety you will use most.' },
      { q: 'I know Spanish. How much will carry over?', a: 'A lot of vocabulary and grammar. Pronunciation is the main difference, so practise speaking early.' },
      { q: 'Is Portuguese hard to pronounce?', a: 'The nasal vowels and some endings take practice. A tutor can correct them quickly, which is hard to do alone.' },
      { q: 'Can I learn Portuguese for work?', a: 'Yes. Tell the tutor your field so lessons use your real emails, calls and meetings.' },
    ],
  },
]

const BY_SLUG = new Map(LANGUAGE_GUIDES.map(g => [g.slug, g]))
const BY_NAME = new Map(LANGUAGE_GUIDES.map(g => [g.name.toLowerCase(), g]))

export const guideFor = (slug: string): LanguageGuide | undefined => BY_SLUG.get(slug)
/** The guide for a language name as a card carries it ("Spanish"), in any letter case. */
export const guideByName = (name: string): LanguageGuide | undefined => BY_NAME.get(name.toLowerCase())

export type NichePage = { guide: LanguageGuide; count: number }

/** How many tutors in `cards` teach each language that has a guide. */
export function guideCounts(cards: DirectoryCard[]): NichePage[] {
  const counts = new Map<string, number>()
  for (const c of cards) for (const l of new Set(c.languages.map(x => x.toLowerCase()))) if (BY_NAME.has(l)) counts.set(l, (counts.get(l) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ guide: BY_NAME.get(name)!, count }))
}

/**
 * The languages that get a page right now: has a guide, at least NICHE_MIN_TUTORS tutors who can be booked, the NICHE_MAX_PAGES with the most
 * tutors (ties by name). Empty while the directory has no card.
 */
export function pickLanguagePages(cards: DirectoryCard[]): NichePage[] {
  return guideCounts(cards)
    .filter(p => p.count >= NICHE_MIN_TUTORS)
    .sort((a, b) => b.count - a.count || a.guide.name.localeCompare(b.guide.name))
    .slice(0, NICHE_MAX_PAGES)
}

/** The tutors of one language, in the order they came (the directory's "Recommended" order). */
export const tutorsOf = (cards: DirectoryCard[], guide: LanguageGuide): DirectoryCard[] => cards.filter(c => c.languages.some(l => l.toLowerCase() === guide.name.toLowerCase()))

export const languagePagePath = (slug: string) => `/learn/${slug}`
