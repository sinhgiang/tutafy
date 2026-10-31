// T-1241. Article body for /blog/spanish-tutor-online (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1610-tutafy-batch3-10-articles-plan.md, article 6 (calendar day 15 Nov 2026). Keyword: "spanish tutor online" (2,400 a month, difficulty 15, high cost per click). Written for learners.
// Step 0 (31 Oct 2026): the first page of results for "spanish tutor online how to find one" is platform and vendor pages and lists: FluentU's "best websites for online Spanish tutors", the Preply and ClassGap blogs, an italki teacher list, Mezzo Guild's "9 best sites", Wyzant's blog and a few language-school pages.
// They all say the same five things: use a platform, take a trial, read reviews, check credentials, pick an accent. None tells a learner which Spanish to ask for in the same units a tutor uses (the CEFR levels), none says how many class hours Spanish takes from an official source, and none says what a first lesson looks like minute by minute.
// On this site, no article is about Spanish. The nearest are how-to-find-an-online-tutor (T-1215, the ten checks for any subject; this article is its Spanish case), how-to-choose-a-tutoring-niche (Spanish is mentioned as a niche for tutors) and ielts-speaking-part-2-topics (an English exam, so a different language).
// Own angle: the choices a Spanish learner makes before the tutor (which Spanish, which level in CEFR terms, which exam if any, how many hours), one lesson template and a first-lesson phrase kit; and Tutafy's own gap said first (the directory lists no tutors; one public tutor page is written in Spanish and had no open times).
// Links both ways with how-to-find-an-online-tutor and how-to-choose-a-tutoring-niche (reverse links added at the end of their related lists).
//
// Sources, read on 31 Oct 2026 (a page that answered 403 is said to be a search result, not a page we opened):
//   Instituto Cervantes, FAQ (cervantes.org/es/preguntas-frecuentes) and DELE dates page (cervantes.org/es/examenes/dele), opened: the DELE is the official Spanish diploma the Instituto Cervantes awards on behalf of Spain's Ministry of Education and Vocational Training; its levels are A1, A2, B1, B2, C1 and C2, matching the CEFR;
//     the diplomas certify the level "para siempre" (for ever); registration for the 2027 exams opens on 18 November 2026; general exams at A1 to C2 are listed on fixed dates (for example Saturday 22 May 2027).
//   SIELE (siele.org/en and siele.org/conoce-siele), opened: an electronic service that certifies Spanish; four tests (reading, listening, written expression and interaction, oral expression and interaction); "you cannot fail, you always obtain a level"; results within a maximum of three weeks; over 1,000 authorised test centres in more than 85 countries;
//     created by the Instituto Cervantes, UNAM, the University of Salamanca and the University of Buenos Aires, run by Telefonica; its levels refer to the CEFR. We did not find on those pages how long a result is valid, so we give no number.
//   Council of Europe, CEFR global scale and level descriptions: the page answered 403, so this comes from the search result of coe.int: six levels A1 to C2 in three bands, Basic User (A1, A2), Independent User (B1, B2) and Proficient User (C1, C2); the levels are broad bands; C2 is called "Mastery" but is not meant to imply native-speaker competence.
//   US Department of State, Foreign Service Institute, foreign language training: the page answered 403, so this comes from the search results of state.gov. Category I languages are listed at 24 to 30 weeks of class; the pages seen disagree on the hours (600 to 750 on older ones, 552 to 690 on one) and on Spanish (24 weeks on older pages, 30 on newer ones).
//     We say "about 600 class hours" and that the pages differ. The figure is for full-time intensive classes at a government school, so it is an order of magnitude and not a forecast.
//   US Census Bureau, language use pages, from the search results (pages not opened): about 42 million people spoke Spanish at home in the US in the 2019 American Community Survey, and Spanish was about 61% of people who spoke a language other than English at home in the 2018 to 2022 five-year survey.
//   Education Endowment Foundation (UK), one to one tuition, and the platform trial rules (Preply, italki, Wyzant), US Federal Trade Commission payment advice: as read on 31 Oct 2026 for T-1215 (same pages, same caveats about 403s).
// Not read, so not written: what Spanish tutoring costs on any platform, how many hours any one learner needs, any claim that one Spanish variety is better, how many Spanish tutors any platform has, the validity period of a SIELE result, the rules of any school exam (AP, IB, GCSE) for Spanish.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: tutafy.com/tutors says "The tutor directory opens soon" and lists no tutors; it opens once at least 6 tutors are ready (src/lib/directory.ts, DIRECTORY_OPENS_AT = 6). "Find me a tutor" asks about language, level, what you are learning it for, price, time of day and trial lesson, and is closed on the same rule.
// The sitemap lists 24 public tutor pages; reading them on 31 Oct 2026 found one written in Spanish (a tutor of Spanish, level not stated, no price shown) with "no free times in the next 14 days", so there is no Spanish tutor a learner can book today. A tutor may switch on a 30-minute trial lesson at a price the tutor sets (docs/features/T-1007-standard-trial.md).
// Tutafy does not vet qualifications, run background checks or guarantee results. We name no tutor.
// All names and examples are invented and said to be. The Spanish phrases are our own plain examples.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const SPANISH_TUTOR_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'Before you look for a tutor, decide three things: which Spanish you need (Spain, Mexico, Argentina or another), which level you are at in A1 to C2 terms, and what you want to do with it by a date. A tutor can only aim at a goal that has a date.',
    'The State Department\'s pages put Spanish in its easiest group of languages for English speakers: about 24 to 30 weeks of full-time class, roughly 600 class hours. At two hours a week that is years, so judge a tutor by whether you can do more each month, not by a promise of fluency.',
    'A good Spanish lesson is mostly you speaking, with corrections you can use. Use the first lesson as a test and bring a real task.',
    'If you need an exam, DELE and SIELE are the official ones. The DELE diploma is for life; the SIELE result always gives you a level. Ask who requires which before you book.',
    'Tutafy has no Spanish tutor you can book today. Its tutor directory is not open and lists nobody, so this guide works with any platform.',
  ] },
  { type: 'p', text: `To find a good Spanish tutor online, decide which Spanish you need and what you want to do with it by a date, find your level on the A1 to C2 scale tutors use, shortlist two or three tutors who teach that exact thing, and test one in a trial lesson. Judge by what you can do after a month of lessons, not by a profile. The steps are not hard, but most lists of "best sites for Spanish tutors" skip the first three, and that is where learners lose money.` },
  { type: 'p', text: `This guide covers those steps with pages read on 31 October 2026: the Instituto Cervantes and the SIELE service for the exams, the Council of Europe for the level scale, and the US State Department for how long Spanish takes. Where we only saw a search result of a page, we say so. We make Tutafy, a tool tutors use to run their own bookings, so we say near the end what it does and does not do for a Spanish learner. We found no prices to compare, and we give none.` },
  { type: 'image', src: '/blog/inline/spanish-plaza-mayor', alt: 'A long red-painted building with rows of balconies and two slate spires around a sunlit paved square, with a few people walking and cafe parasols at the left edge.', caption: 'Illustrative photo, not a Tutafy user. Plaza Mayor in Madrid. The Spanish you learn should be the one you will use.', credit: 'Photo: Suicasmo (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Plaza_Mayor,_Madrid_20180720.jpg' },
  { type: 'h2', text: 'Step one: choose the Spanish you need' },
  { type: 'p', text: `There is not one Spanish. Spanish is spoken in Spain, across Latin America and in the US, and the differences are real, though a speaker of one is understood by a speaker of another. The right way to choose is by who you will talk to, not by a ranking. We found no source that says one variety is better, and we do not claim it.` },
  { type: 'compare', caption: 'Examples of how varieties differ. Our summary of well-known differences, not a full list.', headers: ['Area', 'In much of Spain', 'In much of Latin America', 'In some regions (for example Argentina)'], rows: [
    ['"You" for a group of friends', 'vosotros', 'ustedes', 'ustedes'],
    ['"You" for one friend', 'tú', 'tú in many countries', '"vos", with its own verb forms'],
    ['Computer', 'ordenador', 'computadora (computador in some places)', 'computadora'],
  ] },
  { type: 'p', text: `Three practical consequences follow. If your partner's family is from Bogotá, ask for a tutor who speaks Colombian Spanish, or at least one who is happy to teach the words and the pace you will hear. If you will work with clients in Spain, vosotros is worth knowing early. If you will move to Mexico City, a tutor from there will teach the phrases you will use in a market. None of this stops you from understanding other varieties later. It means the first hundred hours match your life.` },
  { type: 'p', text: `In the US, the Census Bureau counted about 42 million people who spoke Spanish at home in its 2019 American Community Survey. We saw that in a search result and did not open the page. The point is simple: you will hear Spanish from many backgrounds, so ask your tutor to point out where a word changes by place.` },
  { type: 'h3', text: 'If you grew up hearing Spanish' },
  { type: 'p', text: `A heritage learner, someone who understood Spanish at home but never studied it, needs a different lesson from a beginner. You may understand a conversation and freeze when you have to answer, or speak well and not know how to write an accent or a subjunctive. Say so when you message a tutor. Ask for a plan that starts at your real level in each skill, which may be B1 for listening and A2 for writing. A tutor who starts you on "hola, me llamo" has not listened.` },
  { type: 'h2', text: 'Step two: know your level in the units tutors use' },
  { type: 'p', text: `Tutors, exams and textbooks use the Common European Framework of Reference for Languages, the CEFR, a Council of Europe scale with six levels from A1 to C2 in three bands: Basic User (A1, A2), Independent User (B1, B2) and Proficient User (C1, C2). The DELE diploma and the SIELE service both refer to it. We could not open the Council's page: the A1, B1 and C2 lines below come from the text of its search results, and the other three paraphrase the same published scale, so check them on the Council's page.` },
  { type: 'compare', caption: 'The CEFR levels in plain words. The Council of Europe says the levels are broad bands, not exact marks.', headers: ['Level', 'In plain words', 'A Spanish example (ours)'], rows: [
    ['A1', 'Familiar everyday expressions and very basic phrases for concrete needs.', 'Introduce yourself, order a coffee, ask the price.'],
    ['A2', 'Simple exchanges about routine matters.', 'Describe your day, ask for directions, text a friend a plan.'],
    ['B1', 'The main points of clear standard speech on familiar matters at work, school and leisure.', 'Tell a story about last weekend, follow a slow news clip, explain a problem to a landlord.'],
    ['B2', 'Understand the main ideas of complex text and talk with a native speaker without strain on either side.', 'Take part in a work meeting, argue a view, read a novel with a dictionary at hand.'],
    ['C1', 'Use the language flexibly and effectively for social, academic and professional purposes.', 'Present, negotiate and write a report with few errors.'],
    ['C2', 'Express yourself spontaneously, very fluently and precisely, showing finer shades of meaning. The Council calls it "Mastery" and says it is not meant to imply native-speaker competence.', 'Understand almost everything and reply precisely and quickly.'],
  ] },
  { type: 'p', text: `You do not need an exam to find your level. A tutor can place you in one trial lesson by listening to you speak and watching you read a short text. If you want a number before you book, the exam bodies publish sample papers, and a placement test on a platform gives a rough idea. Treat the result as a starting guess and let the first lesson correct it.` },
  { type: 'p', text: `Say your level by skill. "B1 speaking, A2 writing" tells a tutor more than "intermediate", and a tutor who asks you which skill you want to fix first is already doing the job.` },
  { type: 'h2', text: 'Step three: how long Spanish takes, from an official source' },
  { type: 'p', text: `The US State Department's Foreign Service Institute, which trains diplomats, sorts languages by how hard they are for English speakers. Its pages list Spanish in Category I, the group of languages that take the least time: 24 to 30 weeks of full-time class. We could not open the page, only its search results, and the versions we saw disagree on the details. Older pages give 600 to 750 class hours, one gives 552 to 690, and Spanish is shown at 24 weeks on older pages and 30 on newer ones. So we say "about 600 class hours" and treat it as an order of magnitude.` },
  { type: 'p', text: `That figure comes from intensive, full-time classes for government staff, and the level it aims at is professional working use, which is more than most learners need. It is not a forecast for you. But the arithmetic of class hours is useful for planning, because it shows how a weekly routine turns into time.` },
  { type: 'compare', caption: 'Our arithmetic: 600 class hours divided by your weekly lesson hours. Not a prediction, and it ignores study between lessons.', headers: ['Lesson time each week', 'Weeks to reach 600 class hours', 'About'], rows: [
    ['2 hours', '300 weeks', '5.8 years'],
    ['4 hours', '150 weeks', '2.9 years'],
    ['10 hours', '60 weeks', '1.2 years'],
  ] },
  { type: 'p', text: `Read it two ways. First, nobody learns Spanish to a high level with one lesson a week, so a promise of "fluent in three months" from a tutor is a reason to look elsewhere. Second, hours of lessons are only part of it. Practice between lessons is where much of the gain is made, and we found no study that says how much a private learner needs. So set a goal you can reach: "hold a ten-minute conversation about my work by June" is better than "be fluent".` },
  { type: 'h2', text: 'Step four: where to look, and what each place does for you' },
  { type: 'p', text: `You can find a Spanish tutor in four kinds of place. The checks in our guide to finding an online tutor work in all of them; here is what changes for Spanish.` },
  { type: 'compare', caption: 'Four places to find a Spanish tutor online. Our summary, not a ranking.', headers: ['Where', 'Good for', 'Watch for'], rows: [
    ['A language marketplace such as italki or Preply', 'A wide choice of countries and accents, a trial lesson, and a platform to pay on.', 'Many profiles say "native speaker". Native is not the same as trained to teach. Read the trial and refund rules.'],
    ['A general tutoring marketplace such as Wyzant', 'Students who need Spanish for school and want help with homework or exams.', 'Fees and refund terms differ. Wyzant\'s pages describe a first-hour refund for a first lesson with a new tutor.'],
    ['A recommendation from a teacher, friend or colleague', 'Someone who has seen the tutor teach and knows your level.', 'Their goal may not be yours. Check the variety and the price.'],
    ['A tutor\'s own booking page', 'Direct contact, usually no platform share in the price, and a booking in your time zone.', 'Nobody has checked the tutor for you, so the checks below matter more.'],
  ] },
  { type: 'p', text: `On trials, the platforms differ, so read the rules before you pay. As their official pages describe them: on Preply a trial lesson is bought on the tutor's profile in a 25 or 50 minute slot, one per tutor per student, and if it does not work out you can switch tutor or be refunded; on italki the teacher sets the trial price, trials are usually around 30 minutes and a student may take one per teacher; on Wyzant a student can ask for a refund of the first hour of a first lesson with a new tutor. We saw some of these pages only as search results, because they refused our script. Read the current page on the day you pay.` },
  { type: 'p', text: `Pay by credit card where you can, and on the platform where you found the tutor. The US Federal Trade Commission says a card carries dispute rights and that anyone who says you can only pay by wire, gift card or crypto is probably a scammer. Pay one lesson at a time until the tutor has passed your review.` },
  { type: 'image', src: '/blog/inline/spanish-headphones-madrid', alt: 'A pair of black over-ear headphones hanging on a microphone stand with a pop filter in front of foam panels, lit with blue and pink light.', caption: 'Illustrative photo, not a Tutafy user. A Spanish lesson is heard, so test the sound before the first lesson.', credit: 'Photo: WillSpirit SBLN (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Headphone_Microphone_Madrid_(Unsplash).jpg' },
  { type: 'h2', text: 'What a good Spanish lesson looks like' },
  { type: 'p', text: `A lesson is a series of tasks, and you should be speaking for most of it. This template is our own, not from a study, and tutors vary it. Use it as a yardstick for the first lesson.` },
  { type: 'compare', caption: 'A 50-minute lesson shape, in our words. Adjust it to your level.', headers: ['Minutes', 'What happens', 'What you should notice'], rows: [
    ['0 to 5', 'Warm-up chat in Spanish about your week.', 'The tutor adjusts speed to you and asks open questions.'],
    ['5 to 15', 'Review of last lesson\'s homework, with corrections.', 'Errors are explained, not only fixed. You get a short list to keep.'],
    ['15 to 35', 'The main task: a dialogue, a story, a roleplay or a text, matched to your goal.', 'You speak or write more than the tutor does.'],
    ['35 to 45', 'A short listening or reading piece, or a grammar point that came up.', 'The grammar comes from your mistakes, not from the next page of a book.'],
    ['45 to 50', 'A plan for the week and a small task.', 'You can say what you did and what you will do next.'],
  ] },
  { type: 'h3', text: 'How the lesson changes by level' },
  { type: 'ul', items: [
    `A1 and A2: short sentences, a lot of repetition, pictures and role plays about daily life. A tutor may use some English to explain grammar. Expect to leave knowing a dozen new phrases you can use that day.`,
    `B1 and B2: more talk and less drilling. Stories, opinions, news items and a steady stream of corrections. This is where learners stall, so a tutor who tracks your recurring errors is worth a lot.`,
    `Exam preparation: timed tasks in the exam's format, with scoring against its criteria. A DELE or SIELE tutor should know the exam's four skills and how it marks each one.`,
  ] },
  { type: 'h3', text: 'A first-lesson phrase kit' },
  { type: 'p', text: `These phrases keep a lesson in Spanish when you feel lost. They are our plain examples, in the polite form a tutor will understand in any country. Say them aloud before the first lesson.` },
  { type: 'ul', items: [
    `"¿Puede repetir, por favor?" Can you repeat that, please?`,
    `"Más despacio, por favor." More slowly, please.`,
    `"No entiendo la palabra ..." I do not understand the word ...`,
    `"¿Cómo se dice ... en español?" How do you say ... in Spanish?`,
    `"¿Me puede corregir cuando me equivoque?" Can you correct me when I make a mistake?`,
    `"Mi objetivo es hablar con la familia de mi pareja en marzo." My goal is to talk with my partner's family in March.`,
  ] },
  { type: 'h2', text: 'Ten questions to ask before you book' },
  { type: 'p', text: `Send these in a message or use them in the trial lesson. A good tutor will answer them in a sentence or two.` },
  { type: 'compare', caption: 'Questions for a Spanish tutor and how to read the answer.', headers: ['Ask', 'A good answer', 'A worry'], rows: [
    ['Which Spanish do you teach, and where did you learn to teach it?', 'Names a variety and says how they teach it, such as courses, years or exams.', '"Native speaker" and nothing else.'],
    ['What level do you usually teach, and what level am I?', 'Names a level and can place you after you speak.', 'Says "all levels" with no detail.'],
    ['How do you correct me?', 'Explains: some corrections at once, most after you finish speaking.', 'Corrects every word and stops you speaking, or never corrects.'],
    ['How much of the lesson is in Spanish?', 'A figure that changes with your level.', 'All English at B1, or all Spanish at A1 with no support.'],
    ['What will I do in the first lesson?', 'A short plan: a level check, a sample task, a next step.', 'No plan, "we will see".'],
    ['Have you taught my exam, DELE or SIELE?', 'Says yes with an example, or says no honestly.', 'Promises a pass.'],
    ['What are the trial, cancellation and refund rules?', 'Points to written terms.', 'Vague or in a private message only.'],
    ['How do I pay?', 'On the platform, by card.', 'Wire, gift card or crypto.'],
  ] },
  { type: 'h2', text: 'If you need an exam: DELE and SIELE' },
  { type: 'p', text: `Most learners do not need an exam. If you need one, for a university place, a visa, a job or a personal goal, ask the body that asks for it which exams it accepts, because we found no source that says all of them accept both. The two official certificates are the DELE and the SIELE, and the Instituto Cervantes and SIELE pages we opened say the following.` },
  { type: 'compare', caption: 'DELE and SIELE as their official pages describe them, read on 31 Oct 2026.', headers: ['', 'DELE', 'SIELE'], rows: [
    ['What it is', 'The official Spanish diploma the Instituto Cervantes awards on behalf of Spain\'s Ministry of Education and Vocational Training.', 'An electronic certification service created by the Instituto Cervantes, UNAM, the University of Salamanca and the University of Buenos Aires, run by Telefonica.'],
    ['Levels', 'A1, A2, B1, B2, C1 and C2, matching the CEFR. You register for one level.', 'Refers to the CEFR levels. You always obtain a level: the page says you cannot fail.'],
    ['Format', 'Exams on fixed dates. The 2027 calendar lists general exams from A1 to C2, for example on Saturday 22 May 2027.', 'Four tests: reading, listening, written expression and interaction, and oral expression and interaction. Taken at an authorised centre.'],
    ['When you get it', 'See the Cervantes calendar for each exam.', 'Results within a maximum of three weeks, says the page.'],
    ['How long it lasts', 'Cervantes says the diplomas certify the level for ever.', 'Not stated on the pages we read. Other sites give five years, which we did not confirm, so check.'],
    ['Where', 'Cervantes centres and accredited centres worldwide.', 'Over 1,000 authorised test centres in more than 85 countries, the page says.'],
  ] },
  { type: 'callout', variant: 'warn', title: 'Registration opens on 18 November 2026 for the 2027 DELE', text: `The Instituto Cervantes page says registration for the 2027 exams opens on 18 November 2026, and it says it is preparing a new exams website. Dates and fees change, so read the current page before you plan. If a tutor promises a pass, remember that nobody can promise one. A good exam tutor shows you the format, scores your practice against the exam's criteria and tells you when you are ready.` },
  { type: 'p', text: `If you take no exam, the CEFR scale still helps you track progress. Ask your tutor to say your level by skill every two months and write it down. That record is your own certificate, and it is more useful than a one-off test because it shows the trend.` },
  { type: 'image', src: '/blog/inline/spanish-buenos-aires-bus', alt: 'The front of a bus in sunlit tree-lined street, its destination sign showing the number 59 and the Spanish words Constitucion, Panamericana and San Lorenzo.', caption: 'Illustrative photo, not a Tutafy user. Real signs are good lesson material: ask your tutor to read one with you.', credit: 'Photo: Dan Gold (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Buenos_Aires,_Argentina_(Unsplash_7i6nAWPiDhI).jpg' },
  { type: 'h2', text: 'Between lessons: a plan that keeps the hours working' },
  { type: 'p', text: `This part is our advice and not a finding. Lessons give you feedback; the gain comes from using Spanish on the other days. Keep it small enough to survive a busy week.` },
  { type: 'ul', items: [
    `Ten to fifteen minutes a day beats an hour on Sunday. A short daily slot is easier to keep.`,
    `Use real Spanish that fits your goal: a podcast on your job, a news clip in your tutor's variety, the signs and menus around you.`,
    `Keep a "mistake list". Write each correction your tutor gives and test yourself on the list before the next lesson.`,
  ] },
  { type: 'h2', text: 'Safety, money and children' },
  { type: 'p', text: `If a child will learn Spanish, safety matters more than level. The NSPCC, a UK child protection charity, advises asking a tutor for an up-to-date criminal records check certificate and two referees, a safeguarding policy and a code of conduct, an adult within earshot, lessons in a shared space and not a bedroom, and contact through the parent. That is UK guidance, and rules differ elsewhere, but the questions travel. Our guide to finding an online tutor lists the rest, including how to review progress after four lessons.` },
  { type: 'h2', text: 'What Tutafy can and cannot do for you' },
  { type: 'p', text: `Tutafy is a set of tools tutors use to run their own bookings: a booking page that shows free hours in the visitor's time zone, a video classroom in the browser, reminders and payment through the tutor's own account. A tutor on Tutafy is an independent person running a small business. For a Spanish learner this means the following.` },
  { type: 'ul', items: [
    `The tutor directory is not open yet. Its page says it opens once at least six tutors are ready, and it lists nobody today. There is no Spanish tutor you can find there.`,
    `We looked at the public tutor pages on 31 October 2026. One is written in Spanish, with no price shown and no free times in the next 14 days, so we cannot point you to a Spanish tutor you can book today. If a tutor you know uses Tutafy, you can book through that tutor's own link.`,
    `A tutor may offer a 30-minute trial lesson at a price the tutor sets, for a first lesson only. Look for it on the booking page.`,
    `Tutafy does not check qualifications, run background checks, vouch for a tutor or guarantee results. The checks above are yours to make on any tutor, including one who uses Tutafy.`,
  ] },
  { type: 'source', text: 'Pages used here, read on 31 Oct 2026. Pages marked as search results refused our script (403) and were not opened, so their figures come from the search result of the official page. Read the current page before you decide.', links: [
    { label: 'Instituto Cervantes: frequently asked questions (DELE)', href: 'https://cervantes.org/es/preguntas-frecuentes' },
    { label: 'Instituto Cervantes: DELE and CCSE 2027 dates', href: 'https://cervantes.org/es/examenes/dele' },
    { label: 'SIELE: international evaluation and certification for Spanish', href: 'https://siele.org/en/' },
    { label: 'SIELE: what it is (Spanish)', href: 'https://siele.org/conoce-siele' },
    { label: 'Council of Europe: the CEFR levels (search result)', href: 'https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions' },
    { label: 'US Department of State: foreign language training (search result)', href: 'https://www.state.gov/key-topics-foreign-service-institute/foreign-language-training/' },
    { label: 'US Census Bureau: language use (search result)', href: 'https://www.census.gov/topics/population/language-use.html' },
    { label: 'Education Endowment Foundation: one to one tuition', href: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/one-to-one-tuition' },
    { label: 'US Federal Trade Commission: a way to spot scams, how someone asks you to pay', href: 'https://consumer.ftc.gov/consumer-alerts/2026/07/way-spot-scams-how-someone-asks-you-pay' },
    { label: 'NSPCC: finding a tutor for your child', href: 'https://www.nspcc.org.uk/keeping-children-safe/outside-the-home/find-tutor-child/' },
    { label: 'Preply: how to book a trial lesson', href: 'https://help.preply.com/en/articles/4179487-how-to-book-a-trial-lesson' },
    { label: 'italki: what are trial lessons', href: 'https://support.italki.com/hc/en-us/articles/360022944554-What-are-trial-lessons' },
    { label: 'Wyzant: the Good Fit Guarantee', href: 'https://support.wyzant.com/students-parents/lessons/whats-the-good-fit-guarantee/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to find a good online tutor', href: '/blog/how-to-find-an-online-tutor', text: 'The ten checks for any subject, in the order you can do them.' },
    { label: 'How to choose a tutoring niche', href: '/blog/how-to-choose-a-tutoring-niche', text: 'For tutors: why "Spanish for retirees" beats "Spanish".' },
    { label: 'How to schedule tutoring lessons across time zones', href: '/blog/schedule-tutoring-lessons-across-time-zones', text: 'What to agree when your tutor is in another country.' },
    { label: 'Tutoring cancellation policies and contracts', href: '/blog/tutoring-cancellation-policy-and-contracts', text: 'What a fair cancellation rule contains.' },
    { label: 'IELTS Speaking Part 2 topics', href: '/blog/ielts-speaking-part-2-topics', text: 'The same routine for another language exam: practice cards and a tutor routine.' },
  ] },
  { type: 'faq', items: [
    { q: 'How do I find a good Spanish tutor online?', a: `Decide which Spanish you need (Spain, Mexico, Argentina or another) and what you want to do by a date, find your level on the A1 to C2 scale, shortlist two or three tutors who teach that, take a trial lesson and judge by what you can do after about a month. Read the trial and refund rules before you pay.` },
    { q: 'How long does it take to learn Spanish with a tutor?', a: `The US State Department's pages put Spanish in its easiest group for English speakers, at about 24 to 30 weeks of full-time class, roughly 600 class hours, though the pages differ. At two hours a week that is years of lessons, so set a goal with a date and judge progress by what you can do.` },
    { q: 'Do I need the DELE or SIELE exam?', a: `Only if a school, employer or visa office asks for one. The DELE is the Instituto Cervantes diploma, which its page says certifies your level for ever. SIELE is an electronic test in which you always obtain a level. Ask the body that wants it which one it accepts, and check current dates and fees.` },
    { q: 'Which Spanish should I learn, Spain or Latin America?', a: `The one you will use. Spain uses vosotros for a group of friends, much of Latin America uses ustedes and some regions use vos. Speakers understand each other across varieties, so choose by who you will talk to and ask your tutor to point out where words change.` },
    { q: 'Does Tutafy have Spanish tutors I can book today?', a: `Not today. The directory opens once at least six tutors are ready and lists none now. One public tutor page is written in Spanish, with no free times in the next 14 days when we looked on 31 October 2026. Tutafy does not vet tutors or guarantee results.` },
  ] },
  { type: 'cta', title: 'Teach? Take bookings on your own page', text: 'If you are a tutor, the Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not find you students yet.', button: 'Start free, no credit card', href: '/register' },
]
