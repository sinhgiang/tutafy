// T-1212. Article body for /blog/tutoring-lesson-plan-template (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, day 08/11, article 1. The planned article was "preply commission" (how much a tutor keeps on Preply).
// Step 0 (31 Oct 2026) says: do not write it. The blog already has FOUR posts on that topic (how-much-does-preply-take, marketplace-vs-independent-the-real-math, preply-alternatives-for-tutors,
// how-to-leave-preply-migration-guide) and src/lib/marketplace-rates.ts holds the one set of rates. The Google results for "preply commission" are Preply's own help page plus many tutor review sites.
// The official page (help.preply.com/en/articles/4171383-preply-commission-model) answers 403 to a script, and the third-party sites disagree on the middle tiers, so a fifth post could only repeat
// what we already say or add numbers we cannot check. The ticket's own rule for this case is "update the old post and use a reserve article", so this is the reserve article from the plan: a tutoring lesson plan template
// (plan figure: about 50 searches a month, low; not measured by us). The old post got one short paragraph about the tiers (see how-much-does-preply-take in src/lib/blog.ts).
// Nearest existing posts: ai-tools-for-tutors (a lesson-plan generator is one of its tools), how-to-teach-english-online (lesson structure for English tutors), real-hourly-rate-for-tutors (unpaid prep time),
// how-to-retain-tutoring-students. Own angle: a one-page plan for ONE student (not a 30-pupil classroom plan), built on two official sources, with four filled-in examples, an honest time budget
// and what Tutafy does and does not have for it.
//
// Sources, read on 31 Oct 2026:
//   Read directly: National Student Support Accelerator (Stanford), webinar page "Session Structure": the example structure has six parts in this order: session opening, data touchpoint, framing and objective,
//     mini lesson and model, independent practice, assessment at the end; "every program may structure its tutoring sessions differently"; the page does not give timings. Its toolkit PDF (Toolkit_Session_Structure.pdf)
//     is compressed and could not be read as text; what we say about the toolkit (a fixed flow with changing content; the objective stated aloud and kept visible; an exit ticket as the closing check) comes from the
//     search summary of that PDF and is marked "per the search summary" in the text.
//   Read directly: British Council TeachingEnglish, "Planning" article (teachingenglish.org.uk/article/planning-1): planning lets the teacher identify aims and "predict possible problems and therefore consider solutions";
//     a lesson plan is "a framework for a lesson"; new teachers may need very detailed plans, experienced ones brief notes; three stages to keep in mind, Engage, Study, Activate; aims "not too easy but not too difficult";
//     "Expect the unexpected!"; "don't let the plan dominate". No timings on the page.
//   From search results of official pages: Education Endowment Foundation (England), Teaching and Learning Toolkit, one to one tuition: up to five months of additional progress one to one (up to four in small groups);
//     the EEF page itself answered 403, and the frequency figure (sessions up to three times a week, up to an hour, over 6 to 8 weeks) is from a Durrington Research School summary of the toolkit, which also notes another
//     guide says twelve weeks. We give the five-month figure with its source and say the rest is a summary.
//   Searched, nothing official found: exit tickets. Every result was a teacher-resource or vendor page, so the text calls the exit check "a common practice" and does not cite an effect size.
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/app/(dashboard)/ai/AiToolsClient.tsx (Lesson Plan Generator, a text prompt with the placeholder "Past tense for B1 level student, 60 minutes"),
// src/lib/plans.ts (ai: 'pro'), src/app/(dashboard)/lessons/new/page.tsx and lessons/[id]/edit (fields: lesson notes, homework), src/app/portal/[token]/page.tsx (the student portal selects homework and vocabulary,
// not lesson notes). No plan template library, no plan field that carries from lesson to lesson, no exit-check feature. All students, plans, minutes and scores in the examples are invented by us and said to be.
// The minutes in the tables are OUR suggestion; neither official page gives timings.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const LESSON_PLAN_TEMPLATE_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'A tutoring lesson plan can fit on one page: one objective, a warm-up, a short teach, practice, a closing check and a line for next time. You are planning for one student, so skip the parts of a classroom plan that manage thirty.',
    'Two official sources agree on the shape. The National Student Support Accelerator lists six parts: opening, data touchpoint, objective, mini lesson, independent practice and an assessment at the end. The British Council says to engage, study and activate.',
    'Neither source gives minutes. The timings in this guide are our own suggestion for a 60-minute lesson, so change them to fit your student.',
    'Plan the time you spend planning. Prep is unpaid, so a template you reuse beats a fresh page every week.',
    'Tutafy has a lesson notes field, a homework field and a Lesson Plan Generator on Pro. It has no template library and no plan that carries from one lesson to the next, and this guide says where you need your own sheet.',
  ] },
  { type: 'p', text: `A tutoring lesson plan is a one-page sheet that says what one student should be able to do by the end of the lesson, and the steps you will use to get there: a warm-up, a short explanation, practice, a closing check and a note for next time. You write it before the lesson and fill in the last line after it.` },
  { type: 'p', text: `This guide gives you the template, shows it filled in for four lessons, and explains each part with two official sources. It is for tutors who teach one student at a time, online or in person. We are a tutoring-software company, not a teacher-training body, so advice from a source says so and advice that is ours says that instead. The students in the examples are made up.` },
  { type: 'image', src: '/blog/inline/plan-homework-1', alt: 'An adult and a child sit at a white table. The adult holds a folded sheet of paper while the child writes on the table with a marker.', caption: 'Illustrative photo, not a Tutafy user. A one-to-one lesson needs a plan, but not a long one.', credit: 'Photo: Kwameghana (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Homework_01.jpg' },
  { type: 'h2', text: 'Why a one-to-one lesson still needs a plan' },
  { type: 'p', text: `With one student you can see at once when something is not landing, so it is tempting to teach by feel. That works until the lesson drifts, the student leaves having practised nothing, and next week you cannot remember where you stopped.` },
  { type: 'p', text: `The British Council's TeachingEnglish article on planning gives the reason in one sentence: planning lets the teacher identify lesson aims and "predict possible problems and therefore consider solutions". It calls a lesson plan "a framework for a lesson" and says that new teachers may need very detailed plans, while experienced teachers may work from brief notes. For a tutor that is useful news. The plan is allowed to be short, and it gets shorter as you get to know a student.` },
  { type: 'p', text: `The same article warns against the opposite mistake: "Expect the unexpected!" and "don't let the plan dominate". A plan is there to be changed when the student does something you did not expect. Think of it as a map, and not as a script.` },
  { type: 'h3', text: 'What the research says, and what we could not check' },
  { type: 'p', text: `The Education Endowment Foundation, an English charity that summarises research for schools, reports in its Teaching and Learning Toolkit that one-to-one tuition can add up to five months of additional progress, and up to four months in small groups. We read that figure in a search result for the toolkit page, because the page itself returned an error to our script. A Durrington Research School summary of the toolkit says the biggest gains came from frequent sessions, up to three a week and up to an hour each, over six to eight weeks. Read the EEF page yourself before you quote it.` },
  { type: 'h2', text: 'The six parts of a tutoring session' },
  { type: 'p', text: `The National Student Support Accelerator (NSSA) at Stanford publishes an example structure for a tutoring session. The webinar page lists six parts in this order: session opening, data touchpoint, framing and objective, mini lesson and model, independent practice, and assessment at the end. The page adds that every program may structure sessions differently. Per the search summary of its toolkit, the structure stays the same from session to session while the content changes, so that tutors spend their preparation time on content and not on directions and pacing.` },
  { type: 'p', text: `Those names are a little formal, so here they are in a private tutor's words, next to the British Council's three stages. The minutes are ours, for a 60-minute lesson.` },
  { type: 'compare', caption: 'The six NSSA parts in a private tutor\'s words, with our suggested minutes for a 60-minute lesson (the minutes are not from NSSA or the British Council).', headers: ['NSSA part', 'In a one-to-one lesson', 'British Council stage', 'Our minutes'], rows: [
    ['Session opening', 'Greet the student, ask how the week went, settle in. Build the relationship.', 'Engage', '3 to 5'],
    ['Data touchpoint', 'Check what stuck from last time: three quick questions or one old problem.', 'Study (revise)', '5'],
    ['Framing and objective', 'Say today\'s one objective aloud, and write it where both of you can see it.', 'Engage', '2'],
    ['Mini lesson and model', 'Show one worked example, thinking aloud, then do a second one together.', 'Study', '10 to 12'],
    ['Independent practice', 'The student works problems or speaks or writes while you watch and prompt.', 'Activate', '25 to 30'],
    ['Assessment at the end', 'A short closing check on the objective, then homework and a note for next time.', 'Activate', '5 to 8'],
  ] },
  { type: 'p', text: `Look at the proportions. More than half the hour goes to the student doing the work, and the explaining takes about a fifth. That follows a point the British Council makes about language teaching, that "telling students about the language is not really enough to help them learn it", and which holds for most subjects: the student has to produce something. If your lessons are mostly you talking, the plan below will feel strange, and that is the point.` },
  { type: 'h2', text: 'The one-page template' },
  { type: 'p', text: `Copy this into a document, a notes app or the notes field of a lesson. Each line has a few words of guidance, and you should be able to fill the whole sheet in ten minutes once you know the student.` },
  { type: 'ul', items: [
    `Student and date. First name, lesson number, date. Add the term goal if you have one ("pass the algebra unit test on 14 March").`,
    `Last time. One line: what you covered, and what the student found hard. Copy it from your closing note of the last lesson.`,
    `Today's objective. One sentence that starts "By the end, the student can ..." and names something you could watch them do.`,
    `Opening (3 to 5 minutes). One question that is not about the subject, then settle in.`,
    `Check (5 minutes). Three questions or one problem from last time. Write down what you will do if the student gets them wrong.`,
    `Teach (10 to 12 minutes). The one example you will work, and the one you will do together. Name the common mistake you expect.`,
    `Practice (25 to 30 minutes). The tasks, in order from easy to hard, plus one extra if the student finishes early.`,
    `Closing check (5 minutes). The question or task that tells you whether the objective was met. Write the answer you hope to see.`,
    `Homework. Small and specific, and one that you can mark in under five minutes.`,
    `Next time. One line to start the next plan from, written after the lesson.`,
    `Plan B. What you will do if the student arrives tired, stuck or ahead of you.`,
  ] },
  { type: 'image', src: '/blog/inline/plan-over-coffee', alt: 'An open, empty lined notebook with a pencil lying across it, on a wooden table beside a cup of coffee.', caption: 'Illustrative photo. A blank page is enough: eleven lines, in the same order every time.', credit: 'Photo: Hope House Press (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Planning_over_coffee_(Unsplash).jpg' },
  { type: 'p', text: `The order matters more than the layout. By the third lesson the student knows that the first question is easy, that the example comes before the practice, and that the closing check is not a trap. A predictable structure frees their attention for the content.` },
  { type: 'h2', text: 'Write one objective, not a list' },
  { type: 'p', text: `The British Council advice on aims is that they should be "not too easy but not too difficult", and it lists what to think about: what the students already know and need to know, what happened in the previous class, and how motivated the students are. In a one-to-one lesson you know most of those answers, so the job is to pick one thing.` },
  { type: 'p', text: `A plan with four goals usually teaches one of them badly and the others not at all. Our rule of thumb is that a goal is the right size if the student could show it to you in the last five minutes. If you could not test it in five minutes, split it.` },
  { type: 'compare', caption: 'Objectives that are too big or too vague, and a version you could check in five minutes. All invented.', headers: ['Too vague or too big', 'Checkable in the last five minutes'], rows: [
    ['Understand fractions', 'Add two fractions with different denominators, and show the common denominator step.'],
    ['Improve speaking', 'Use "have" plus a past participle in five spoken sentences about the last month, without stopping to translate.'],
    ['Learn the essay', 'Write one paragraph that has a topic sentence, one piece of evidence and a sentence that links it back.'],
    ['Get better at algebra', 'Solve a one-step equation and check the answer by putting it back in.'],
    ['Prepare for the exam', 'Finish a 20-minute section of a past paper, and name the two questions that cost the most time.'],
  ] },
  { type: 'p', text: `Every checkable version contains a verb you can see: add, use, write, solve, name. "Understand" and "improve" are fine as a direction, but they give you nothing to check at the end.` },
  { type: 'h2', text: 'The time budget, including the time nobody pays for' },
  { type: 'image', src: '/blog/inline/plan-stopwatch', alt: 'An old silver stopwatch with a white face and a chain, lying on a black surface.', caption: 'Illustrative photo. The lesson is paid by the hour. The plan is not.', credit: 'Photo: Ansgar Koreng (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Stopwatch,_1810201155,_ako.jpg' },
  { type: 'p', text: `A lesson plan is unpaid work, so it belongs in your hourly rate. We wrote a separate guide on this, the real hourly rate for tutors, which counts 15 to 30 minutes of unpaid preparation per lesson in its two worked examples and shows how that lowers the number you earn. The short version is that the cost of planning is real, and that a good template is the cheapest way to cut it.` },
  { type: 'p', text: `Here is how we would budget planning time. This is our own rule of thumb, not research, and you should test it against your own week:` },
  { type: 'ul', items: [
    `A new student, first three lessons: 20 to 30 minutes each, because you are still finding out what they know.`,
    `A regular student, same subject, same level: 10 to 15 minutes, mostly choosing the practice tasks.`,
    `A lesson you have taught before to a similar student: 5 minutes, copying and adjusting last time's sheet.`,
    `After the lesson: 3 minutes to write the closing note. This is the only step people skip, and it saves the most time next week.`,
  ] },
  { type: 'p', text: `Shorter lessons use the same parts in less time. For 30 minutes, drop the separate opening: ask the check question as the greeting, teach for 6, practise for 17 and close in 4. The one part you should not cut is the closing check, because without it you never learn whether the lesson worked.` },
  { type: 'h2', text: 'Four lesson plans, filled in' },
  { type: 'p', text: `These are invented lessons for invented students. They are here to show how specific a line can be, and you should change every detail. Each uses the same parts, in the same order.` },
  { type: 'h3', text: '1. Maths: adding fractions with different denominators' },
  { type: 'p', text: `Student: Mia, age 11, lesson 6, working towards a unit test. Last time: she added fractions with the same denominator without errors, and froze when the denominators differed.` },
  { type: 'compare', caption: 'A 60-minute maths plan for one student (invented).', headers: ['Part', 'What happens'], rows: [
    ['Objective', 'By the end, Mia can add two fractions with different denominators and show the common denominator step.'],
    ['Opening (4 min)', 'Ask what she did over the weekend, then ask her to say what a denominator is in her own words.'],
    ['Check (5 min)', '1/4 + 2/4, 3/8 + 1/8, then 1/2 + 1/4 as a taste of today. If she stalls on the last one, good: that is the lesson.'],
    ['Teach (10 min)', 'Work 1/2 + 1/3 aloud with paper strips, then do 2/5 + 1/10 together. Expected mistake: adding the denominators.'],
    ['Practice (28 min)', 'Six problems from easy to hard, each with a quick strip drawing if she wants it. Extra: a word problem about pizza.'],
    ['Closing check (6 min)', 'Two new problems with no help. Hope to see: both correct, with the common denominator written down.'],
    ['Homework', 'Four problems, mark in five minutes.'],
    ['Plan B', 'If she is tired, spend the practice on the paper strips and leave the written problems for next time.'],
  ] },
  { type: 'h3', text: '2. English: present perfect against past simple, for an adult speaker' },
  { type: 'p', text: `Student: Tomas, age 34, lesson 12, preparing for a job interview in English. Last time: he used the past simple correctly but avoided the present perfect completely.` },
  { type: 'compare', caption: 'A 60-minute English speaking plan for one student (invented).', headers: ['Part', 'What happens'], rows: [
    ['Objective', 'By the end, Tomas can use "have" plus a past participle in five spoken sentences about his work experience, without stopping to translate.'],
    ['Opening (4 min)', 'Small talk about the week, in English only.'],
    ['Check (5 min)', 'Ask three questions that need the past simple ("What did you do yesterday?") to confirm what he already has.'],
    ['Teach (10 min)', 'Contrast two sentences: "I worked in Lyon in 2019" and "I have worked in logistics for six years". Ask him which one matters to an interviewer, and why.'],
    ['Practice (28 min)', 'Mock interview questions, "Tell me about your experience with ...". He answers aloud, you note each present perfect on paper and correct at the end, not mid-sentence.'],
    ['Closing check (6 min)', 'Five fresh questions. Count how many answers use the present perfect correctly.'],
    ['Homework', 'Record a 90-second answer to "Tell me about yourself" on his phone and send it before the next lesson.'],
    ['Plan B', 'If his work news takes over, use it: the practice becomes a real conversation about his job, with the same count at the end.'],
  ] },
  { type: 'h3', text: '3. Writing: a paragraph with evidence' },
  { type: 'p', text: `Student: Priya, age 16, lesson 4, writing for a school history course. Last time: her ideas were good and her paragraphs ended without a conclusion.` },
  { type: 'compare', caption: 'A 60-minute writing plan for one student (invented).', headers: ['Part', 'What happens'], rows: [
    ['Objective', 'By the end, Priya can write one paragraph with a topic sentence, one piece of evidence and a sentence that links it back.'],
    ['Opening (3 min)', 'Ask what she is reading for school.'],
    ['Check (5 min)', 'Show her last week\'s paragraph and ask her to underline the topic sentence. If she cannot find it, that is the thing to teach.'],
    ['Teach (12 min)', 'Take a model paragraph apart with three colours: claim, evidence, link. Then write a second one together on the same question with different evidence.'],
    ['Practice (28 min)', 'She writes one paragraph from a fresh question while you stay silent for ten minutes, then you read it and ask only questions.'],
    ['Closing check (6 min)', 'She colours her own paragraph in the same three colours. Any missing colour is the next lesson.'],
    ['Homework', 'Rewrite the paragraph with a stronger link sentence.'],
    ['Plan B', 'If she is blocked, give her the claim and let her write only the evidence and link.'],
  ] },
  { type: 'h3', text: '4. The first lesson, with a new student' },
  { type: 'p', text: `A first lesson has a different job. You do not yet know what the student knows, so the check and the objective are about finding that out. This plan assumes a short trial lesson of 30 minutes (invented student: Daniel, age 9, reading in English).` },
  { type: 'compare', caption: 'A 30-minute first-lesson plan (invented).', headers: ['Part', 'What happens'], rows: [
    ['Objective', 'By the end, I know three things Daniel can do, one thing he cannot, and whether he enjoyed the lesson.'],
    ['Opening (5 min)', 'Ask him to show or name something he likes. Do not rush to the subject.'],
    ['Check (6 min)', 'A short reading task at two levels, so you can see where he stops. Write down what he skipped.'],
    ['Teach (6 min)', 'Take the first word he got wrong and show one way to work it out.'],
    ['Practice (8 min)', 'Three short sentences at the level he just reached.'],
    ['Closing check (3 min)', 'Ask him to read the hardest sentence again. Note the change.'],
    ['Homework', 'None for the trial. Tell his parent what you saw and what you suggest.'],
    ['Plan B', 'If he is shy, read together and let him fill in the last word of each line.'],
  ] },
  { type: 'p', text: `That last plan is the one most worth saving, because the first lesson decides whether there is a second one. If you offer a trial lesson, our guide on lesson packages explains how a trial fits with packages.` },
  { type: 'h2', text: 'When the plan breaks' },
  { type: 'p', text: `Sooner or later a student will arrive having failed a test, or with a homework question from another subject, or too tired to think. A one-page plan helps here because it is short enough to put down. The British Council says to build in extra and alternative tasks, and to be ready to follow student interest when it creates useful language chances. That is what the Plan B line is for.` },
  { type: 'ul', items: [
    `Tired student: shorten the teach, keep the practice easy, and still do the closing check. A small win ends the lesson better than a large failure.`,
    `Student far behind: stop and go back to the last step they can do. Writing "went back to X" in the closing note is not a failure, it is information.`,
    `A different question: spend ten minutes on it if it matters to them, and then say aloud that the plan is coming back. Say how many minutes you took, so that you know what to move.`,
  ] },
  { type: 'h2', text: 'After the lesson: the three-line note' },
  { type: 'image', src: '/blog/inline/plan-taking-notes', alt: 'A hand holding a yellow pencil over a spiral notebook with pencil shavings on the page.', caption: 'Illustrative photo. Three lines, written while you still remember.', credit: 'Photo: Thought Catalog (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Taking_notes_with_a_pencil_(Unsplash).jpg' },
  { type: 'p', text: `The plan helps before the lesson. The note helps after it, and it saves more time. Write three lines when the student leaves:` },
  { type: 'ul', items: [
    `Done: what you actually covered, even if it differs from the plan.`,
    `Result: whether the objective was met, and the evidence ("4 of 5 correct on the closing check").`,
    `Next: the first thing to do next lesson.`,
  ] },
  { type: 'p', text: `The "Next" line becomes the "Last time" line of the next plan. That is the whole cycle, and it takes under three minutes. After eight weeks you also have a record to show a parent. If you work with parents, our guide to parent communication covers what to send them.` },
  { type: 'h2', text: 'Mistakes we would avoid' },
  { type: 'ul', items: [
    `Planning the explanation and not the practice. The explanation is easy to write, and the practice is where the learning is.`,
    `Planning too many objectives. One is enough.`,
    `A closing check that is really a recap by you. If you are the one summarising, the student has not been checked.`,
    `Never writing the "Next" line. Next week you will spend ten minutes working out where you were.`,
  ] },
  { type: 'h2', text: 'Using an AI tool to draft the plan' },
  { type: 'p', text: `A tool that writes a plan from a short prompt can save time on the first draft. The risk is that the output is generic: it does not know that Mia freezes at unlike denominators, or that Tomas avoids the present perfect. Everything that makes the plan a one-to-one plan, the check, the expected mistake, the Plan B, comes from you.` },
  { type: 'p', text: `A reasonable method is to write the objective and the last-time line yourself, then ask a tool for practice tasks at the right level, and read every one before the lesson. Our guide to AI tools for tutors covers where this goes wrong.` },
  { type: 'h2', text: 'What Tutafy has for lesson plans, and what it does not' },
  { type: 'p', text: `We build Tutafy, so here is what the app does and does not do for this, read from the code on 31 October 2026.` },
  { type: 'compare', caption: 'Lesson planning in Tutafy, as of 31 Oct 2026.', headers: ['What you might want', 'Tutafy', 'Plan'], rows: [
    ['A place to write notes on a lesson', 'Yes: a lesson notes field on each lesson, which you see on the lesson page', 'All plans'],
    ['A homework field the student sees', 'Yes: the homework field shows in the student portal, and the student can submit work', 'All plans'],
    ['An AI Lesson Plan Generator', 'Yes: type a topic and level, for example "Past tense for B1 level student, 60 minutes"; you edit the result', 'Pro, $12 a month'],
    ['A library of plan templates', 'No', '-'],
    ['A plan that carries over from one lesson to the next', 'No: copy your "Next" line yourself', '-'],
    ['A closing-check or exit-ticket feature', 'No', '-'],
  ] },
  { type: 'p', text: `So Tutafy gives you the places where the plan and the note live, and the homework the student sees, but it does not give you the template. Use the eleven lines above in the notes field, or in a document you keep for each student. The student portal shows the homework and vocabulary but not your lesson notes, so what you write there is for you.` },
  { type: 'source', text: 'Sources read on 31 Oct 2026. The NSSA page and the British Council article were read directly. The EEF page and the NSSA toolkit PDF could not be read by our script, so what we say about them is from search results and summaries, and is marked as such in the text.', links: [
    { label: 'NSSA: Session Structure (Stanford)', href: 'https://nssa.stanford.edu/webinars/session-structure' },
    { label: 'NSSA: Toolkit, Session Structure (PDF)', href: 'https://nssa.stanford.edu/sites/default/files/Toolkit_Session_Structure.pdf' },
    { label: 'British Council TeachingEnglish: Planning', href: 'https://www.teachingenglish.org.uk/article/planning-1' },
    { label: 'EEF Teaching and Learning Toolkit: one to one tuition', href: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/one-to-one-tuition' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'The real hourly rate for tutors', href: '/blog/real-hourly-rate-for-tutors', text: 'Count the planning time you are not paid for.' },
    { label: 'AI tools for tutors', href: '/blog/ai-tools-for-tutors', text: 'Where AI helps with preparation and where it does not.' },
    { label: 'How to teach English online', href: '/blog/how-to-teach-english-online', text: 'Lesson structure for English tutors.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'Plan a run of lessons and price a trial.' },
    { label: 'Parent communication and the parent portal', href: '/blog/parent-communication-and-parent-portal', text: 'What to send parents after a few lessons.' },
  ] },
  { type: 'faq', items: [
    { q: 'What should a tutoring lesson plan include?', a: `One objective, a short check of last time, a short explanation with an example, practice for the student, a closing check, homework, a line for next time and a Plan B. The National Student Support Accelerator lists session opening, data touchpoint, framing and objective, mini lesson, independent practice and assessment at the end.` },
    { q: 'How long should a tutoring lesson plan be?', a: `One page. The British Council says new teachers may need very detailed plans and experienced ones brief notes. For one student, one page with eleven lines is enough, and it gets shorter as you learn the student.` },
    { q: 'How much time should I spend planning a tutoring lesson?', a: `Our rule of thumb, which is not from research: 20 to 30 minutes for a new student's first lessons, 10 to 15 for a regular student, and about 5 when you adjust a plan you have used before. Add three minutes after the lesson for the closing note.` },
    { q: 'How do I split a 60-minute tutoring lesson?', a: `Our suggestion: about 4 minutes of opening, 5 of checking last time, 2 on the objective, 10 to 12 teaching, 25 to 30 for the student to practise, and 5 to 8 for a closing check. Neither the NSSA nor the British Council gives timings, so adjust to your student.` },
    { q: 'Can AI write my tutoring lesson plan?', a: `It can draft practice tasks and an outline. It does not know your student, so the check, the expected mistake and the Plan B have to come from you. Tutafy has a Lesson Plan Generator on the Pro plan, and you should edit what it writes.` },
    { q: 'Does Tutafy have lesson plan templates?', a: `No. It has a notes field and a homework field on every lesson, and an AI Lesson Plan Generator on Pro. It has no template library and no plan that carries from one lesson to the next, so keep your own sheet.` },
  ] },
  { type: 'cta', title: 'Keep your lesson notes and homework with the booking', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom, lesson notes, homework and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy has no plan template library.', button: 'Start free, no credit card', href: '/register' },
]
