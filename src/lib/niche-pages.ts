// Niche pages (T-1033, stage B of T-1006): /learn/<language>/<group>, for example /learn/english/working-professionals. A language page answers "how do I
// find a Spanish tutor?"; a niche page answers a narrower question the language page cannot ("a tutor who will work from my real emails and meetings").
//
// A page exists only when ALL of these hold, so it can never be a thin or doorway page:
//   - a guide written by hand for that exact pair (below); a pair without one gets no page, however many tutors it has;
//   - at least PAIR_MIN_TUTORS tutors who can be booked today (the directory rule, src/lib/directory.ts) teach the language AND ticked the group
//     in Settings (tutors.learning_groups, migration 029);
//   - it is one of the PAIR_MAX_PAGES pairs with the most tutors (ties by language, then group).
// Anything else is a 404 and the sitemap line goes away by itself: the pages, the sitemap and /llms-languages.txt all ask pickPairPages() and nothing
// else, so they cannot disagree. No page can exist before migration 029 is run, because no tutor can have ticked a group.
//
// Every guide is its own text (tests/niche-pages.test.ts compares every pair, as tests/language-pages.test.ts does for languages). Facts are kept to what
// is stable and checkable; nothing promises a result, a score or a price. Plain .ts with no browser, React or database imports, so the node tests can load it.
import type { DirectoryCard } from '@/lib/directory'
import { GROUP_OPTIONS, type GroupId } from '@/lib/tutor-groups'

export const PAIR_MIN_TUTORS = 3
export const PAIR_MAX_PAGES = 3

export type PairGuide = {
  /** The language as tutors write it on their profile (matches DirectoryCard.languages after cleanLanguage). */
  language: string
  languageSlug: string
  group: GroupId
  /** The whole <title>, brand included: 20 to 60 characters. */
  title: string
  /** 70 to 155 characters. */
  description: string
  /** The first one to three sentences of the page: the answer to the question this page is about. */
  answer: string
  /** Four real situations, each with a sentence a student might say or write. */
  situations: { title: string; text: string; sample: string }[]
  /** Four blocks of two weeks each. */
  plan: { weeks: string; text: string }[]
  /** What to look for in a tutor for THIS pair: four points. */
  choose: { title: string; text: string }[]
  faq: { q: string; a: string }[]
}

export const PAIR_GUIDES: PairGuide[] = [
  {
    language: 'English',
    languageSlug: 'english',
    group: 'work',
    title: 'English Tutors for Working Professionals | Tutafy',
    description: 'Book a 1-on-1 online English tutor for work: meetings, emails and interviews. See free times in the next 14 days and try a trial lesson first.',
    answer: 'Look for an English tutor who has taught people in jobs like yours and who will build lessons from your own emails, meetings and interviews. Every tutor below teaches English, has ticked work and career, and has open times in the next 14 days, so you can book now.',
    situations: [
      { title: 'A weekly meeting', text: 'You follow the agenda but wait too long before you speak, and the moment passes. Your tutor plays the other people in the room while you give a status update, ask a question and disagree politely, then you do it again, faster.', sample: 'I would like to add one point before we move on.' },
      { title: 'An email you keep rewriting', text: 'Bring a real email that took you twenty minutes. Your tutor shows what sounds too blunt, too formal or simply odd, and gives you two or three patterns you can reuse every week.', sample: 'Could you let me know by Thursday if that works for you?' },
      { title: 'A job interview', text: 'You rehearse the questions that always come: tell me about yourself, a time you disagreed, why this company. The aim is a short answer with one concrete example, not a speech learned by heart.', sample: 'In my last role I cut the time we spent on weekly reports by half.' },
      { title: 'Small talk before and after', text: 'The lift, lunch, the first two minutes of a call. These moments build trust and feel hardest because nobody gives you a script. You practise asking open questions and answering with more than one word.', sample: 'How was your weekend? Did you get away anywhere?' },
    ],
    plan: [
      { weeks: 'Weeks 1 and 2', text: 'Agree your three most common situations and record a short version of each, so you can hear where you stop. Start a list of phrases you reach for and cannot find.' },
      { weeks: 'Weeks 3 and 4', text: 'Rehearse the first situation until it feels ordinary. Write your emails during the lesson and have them corrected line by line.' },
      { weeks: 'Weeks 5 and 6', text: 'Move to the harder moments: disagreeing, giving bad news, a request that may be refused. Practise speaking for a full minute without stopping.' },
      { weeks: 'Weeks 7 and 8', text: 'Run a full mock of a real event, such as a presentation or an interview, review the recording together and choose what to keep working on.' },
    ],
    choose: [
      { title: 'Ask who they have taught', text: 'A tutor who has worked with engineers, nurses or sales teams already knows your vocabulary. Ask for one example of a lesson they built for someone in your field.' },
      { title: 'Bring your own material', text: 'A good tutor works from your emails, slides and calendar, not from a textbook chapter on business. Check that they are happy to do this.' },
      { title: 'Look at the times', text: 'Lessons only work if you can keep them. Pick a tutor whose open times fall before work, at lunch or after, and check the time zone.' },
      { title: 'Use the trial lesson', text: 'Notice how much of the time you speak and how specific the corrections are. A trial lesson is the cheapest way to find out.' },
    ],
    faq: [
      { q: 'Can a tutor help me with a presentation?', a: 'Yes. Send the slides before the lesson, practise the opening and the questions you fear, and record one run-through to review together.' },
      { q: 'I read English well but freeze when I speak. Is that normal?', a: 'Very. Reading and listening grow faster than speaking, because speaking needs practice under a little pressure. A lesson gives you that in a safe place.' },
      { q: 'Do I need business English or general English?', a: 'It depends on the gap. If everyday English is shaky, start there and bring work material in slowly. If you are comfortable day to day, go straight to your work situations.' },
      { q: 'How often should I book?', a: 'Once a week is a common start, with ten minutes of review in between. Two lessons a week suit a deadline such as an interview.' },
    ],
  },
  {
    language: 'English',
    languageSlug: 'english',
    group: 'exams',
    title: 'English Exam Prep Tutors for IELTS and TOEFL | Tutafy',
    description: 'Book a 1-on-1 online English tutor for IELTS or TOEFL. Compare tutors with free times in the next 14 days, ratings and prices, and try a lesson first.',
    answer: 'Choose an English tutor who has prepared students for your exact test, ask how they mark writing and speaking, and book a time that leaves you plenty of weeks before the exam date. Every tutor below teaches English, has ticked exams, and has open times in the next 14 days.',
    situations: [
      { title: 'The essay task', text: 'You write under a timer, your tutor marks against the public criteria of your test, and you rewrite the weakest paragraph. The same few mistakes come back again and again, which is why marking by someone who knows the test matters.', sample: 'Although some people believe cities should limit cars, others argue that public transport is not yet good enough.' },
      { title: 'The speaking test', text: 'Practise the parts of the speaking test with a clock running. Your tutor interrupts the way an examiner does, so the real day already feels familiar.', sample: 'That is an interesting question. I would say it depends on the situation.' },
      { title: 'Listening and note-taking', text: 'You learn to read the questions first, guess the kind of answer and write while you listen. Errors here are usually about attention and spelling, not about vocabulary.', sample: 'Fri: library closes at eight, no entry after half past seven.' },
      { title: 'Reading against the clock', text: 'Skimming, locating and handling questions such as true, false and not given. You time each passage and learn to leave a hard question and come back to it.', sample: 'The text does not say whether the study included children, so the answer is not given.' },
    ],
    plan: [
      { weeks: 'Weeks 1 and 2', text: 'Take a full practice test under exam conditions so you start from an honest score. Your tutor sorts the mistakes into grammar, vocabulary, timing and misunderstanding the task.' },
      { weeks: 'Weeks 3 and 4', text: 'Work on your weakest skill first, with short timed drills and corrected examples you keep in a notebook.' },
      { weeks: 'Weeks 5 and 6', text: 'Complete sections under time. Rewrite essays after marking and keep a list of the errors you repeat.' },
      { weeks: 'Weeks 7 and 8', text: 'Take a second full practice test and compare it with the first. Spend the last days on rest, the route to the test centre and what to bring.' },
    ],
    choose: [
      { title: 'Ask about your exact test', text: 'IELTS Academic, IELTS General, TOEFL iBT and the Cambridge exams differ in tasks and marking. Ask which one the tutor has prepared students for recently.' },
      { title: 'Ask how they mark', text: 'A good answer names the public marking criteria and shows a corrected example, not just a number at the bottom of the page.' },
      { title: 'Count back from the date', text: 'If the exam is close, book more than one lesson a week and say so before the first one, so the plan fits the time you have.' },
      { title: 'Try a real task in the trial', text: 'Bring a past-paper essay or a speaking question and see what feedback you get. It tells you more than any profile.' },
    ],
    faq: [
      { q: 'Is IELTS or TOEFL easier?', a: 'Neither is easier for everyone. IELTS has a live speaking interview and TOEFL is taken on a computer. Check which one your university or employer accepts, then prepare for that.' },
      { q: 'Can a tutor promise my score?', a: 'No honest tutor can. A tutor can show you what the examiners mark, where you lose points and how to practise. The result on the day still depends on you.' },
      { q: 'When should I start?', a: 'As early as your date allows. Many students begin with a practice test, which shows the gap and how long it may take to close.' },
      { q: 'Do I need a tutor if I use practice books?', a: 'Books give you tasks and answers. A tutor marks your writing and speaking, the two parts you cannot check by yourself.' },
    ],
  },
  {
    language: 'Spanish',
    languageSlug: 'spanish',
    group: 'travel',
    title: 'Spanish Tutors for Travel | Tutafy',
    description: 'Book a 1-on-1 online Spanish tutor to prepare for a trip: ordering, directions and problems. See free times in the next 14 days and try a trial lesson.',
    answer: 'Pick a Spanish tutor who teaches for travel, tell them where you are going, and book a time. Every tutor below teaches Spanish, has ticked travel, and has open times in the next 14 days.',
    situations: [
      { title: 'Ordering and paying', text: 'Menus, the bill, asking what is in a dish and saying that you have an allergy. These are short, repeated exchanges, so a few lessons cover them well.', sample: 'La cuenta, por favor. ¿Se puede pagar con tarjeta?' },
      { title: 'Getting around', text: 'Asking for directions is the easy half; understanding the answer is the hard one. Your tutor speaks at a natural pace and you practise asking people to say it again, more slowly.', sample: 'Perdone, ¿cómo llego a la estación de autobuses?' },
      { title: 'Hotels and problems', text: 'Checking in, a noisy room, a missed connection. Problems are when your Spanish matters most, so you rehearse them before you go.', sample: 'Tengo una reserva para dos noches, pero la habitación es muy ruidosa.' },
      { title: 'Talking to people', text: 'Taxi drivers, shop staff, other guests. You learn to say where you are from and what you like, and to ask a question back so the conversation keeps going.', sample: 'Soy de Canadá. ¿Y usted, es de aquí?' },
    ],
    plan: [
      { weeks: 'Weeks 1 and 2', text: 'Sounds first, then the thirty phrases you will use every day: greetings, polite forms, numbers and times.' },
      { weeks: 'Weeks 3 and 4', text: 'Food and money. Menus, prices, the bill, and what to say when you do not understand.' },
      { weeks: 'Weeks 5 and 6', text: 'Directions and transport, with the replies as well as the questions, because the replies are what trip you up.' },
      { weeks: 'Weeks 7 and 8', text: 'Problems and small talk, ending with a role-play of your trip day by day, with your tutor as everyone you will meet.' },
    ],
    choose: [
      { title: 'Match the region', text: 'Spanish in Mexico, Spain and Argentina differs in accent and everyday words. Tell the tutor where you are going and ask whether they know it.' },
      { title: 'Ask for role-play', text: 'A travel tutor spends most of the lesson speaking with you as a waiter, a clerk or a stranger, not explaining grammar tables.' },
      { title: 'Plan around your date', text: 'A few weeks before the trip is enough for the basics. Book the lessons now, not the week you fly.' },
      { title: 'Check the speed in a trial', text: 'Make sure you can follow how fast they talk and that you like listening to their voice. You will hear a lot of it.' },
    ],
    faq: [
      { q: 'How much Spanish do I need for a holiday?', a: 'Less than most people think. Greetings, numbers, food, directions and a handful of problem phrases carry a short trip, and a few sentences change how people answer you.' },
      { q: 'Spanish from Spain or from Latin America?', a: 'The one for your destination. The core is shared, but some words, the way people say you and the accent differ.' },
      { q: 'Can I start from nothing?', a: 'Yes. A beginner can use travel lessons to learn a small set of phrases well, instead of a little of everything.' },
      { q: 'What if I forget everything when someone answers?', a: 'It happens to almost everyone. Your tutor practises the replies as well as the questions, and teaches you to ask people to repeat or to speak slowly.' },
    ],
  },
]

export const pairPath = (languageSlug: string, groupSlug: string) => `/learn/${languageSlug}/${groupSlug}`
const groupSlugOf = (id: GroupId): string => GROUP_OPTIONS.find(o => o.id === id)!.slug
export const groupLabelOf = (id: GroupId): string => GROUP_OPTIONS.find(o => o.id === id)!.label
/** The address of a guide's page. */
export const pairGuidePath = (g: Pick<PairGuide, 'languageSlug' | 'group'>) => pairPath(g.languageSlug, groupSlugOf(g.group))

/** The guide for the two last parts of an address, or undefined. */
export function pairGuideFor(languageSlug: string, groupSlug: string): PairGuide | undefined {
  return PAIR_GUIDES.find(g => g.languageSlug === languageSlug && groupSlugOf(g.group) === groupSlug)
}

export type PairPage = { guide: PairGuide; count: number }

/** The tutors of one pair, in the order they came (the directory's "Recommended" order): they teach the language AND ticked the group. */
export const tutorsOfPair = (cards: DirectoryCard[], guide: PairGuide): DirectoryCard[] =>
  cards.filter(c => c.groups.includes(guide.group) && c.languages.some(l => l.toLowerCase() === guide.language.toLowerCase()))

/** The pairs that get a page right now. Empty while the directory has no card or no tutor has ticked a group. */
export function pickPairPages(cards: DirectoryCard[]): PairPage[] {
  return PAIR_GUIDES
    .map(guide => ({ guide, count: tutorsOfPair(cards, guide).length }))
    .filter(p => p.count >= PAIR_MIN_TUTORS)
    .sort((a, b) => b.count - a.count || a.guide.language.localeCompare(b.guide.language) || a.guide.group.localeCompare(b.guide.group))
    .slice(0, PAIR_MAX_PAGES)
}
