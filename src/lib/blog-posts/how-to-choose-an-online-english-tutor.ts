// T-1219. Article body for /blog/how-to-choose-an-online-english-tutor (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, article 8 (calendar day 11 Nov 2026).
// Step 0 (31 Oct 2026). Search results for "online english tutor adult learner how to choose" (the search tool is not Google itself) were almost all marketplace and school pages
// (Preply, italki, Ostado, Engoo, AmazingTalker, QQEnglish) and their blog posts, which are sales pages for their own tutors. The pages on our own blog that touch the subject:
//   how-to-teach-english-online: written for the TUTOR (qualifications, tools, lesson structure, earnings), not the learner. ielts-speaking-part-2-topics: one exam task, for tutors.
//   No Tutafy article speaks to an adult who is choosing a tutor, so the audience is new and the overlap is low. The marketplace-comparison posts are about what tutors keep, not what learners pay.
// Own angle: a CHOOSING PROCESS written for the learner, not a list of tutors or platforms: write a brief first (goal, deadline, level, hours, budget), check your level, shortlist three,
// run the same 30-minute trial with each and score it, ask the money questions before you pay, know the red flags, and check progress after a month. It says plainly that Tutafy's tutor directory
// is not open yet (it opens when 6 tutors are ready), so the article does not pretend to be a directory. It links to how-to-teach-english-online for readers who teach, and that post links back.
//
// Sources, read directly on 31 Oct 2026:
//   Cambridge English, CEFR page: the Common European Framework of Reference for Languages is "an international standard for language ability", a six-point scale from A1 (beginners) to C2 (mastered the language),
//     used so teachers, learners, employers and institutions can compare qualifications. The page has no level descriptors in text (a diagram is an image); the Council of Europe page answered 403.
//   Cambridge English, Test your English: a quick free level check ("Take a short test to see your English level and explore your study options"); four versions (General English, Schools, Business, Young learners);
//     "this is not an official exam. Your score is only a guide and not proof of language ability."
//   Cambridge English, CELTA: "a qualification for teaching English as a foreign language"; at least 120 hours of study; teaching practice with groups of learners observed by a trainer; for new teachers with no experience, experienced
//     teachers, first-language and non-first-language speakers, and teachers who want to travel. Level and entry requirements are not stated on the page.
//   IELTS (ielts.org, test types): Academic is for study in an English-speaking country and professional registration; General Training for migration to Australia, Canada, New Zealand or the UK and for training or study below degree level;
//     IELTS for UKVI (Life Skills) for UK visa applications, a government-approved Secure English Language Test assessing only speaking and listening.
//   US Consumer Financial Protection Bureau, what is a chargeback: contact the seller first, then the card company; a charge can be a billing error when you did not receive what you ordered; send the billing error notice within 60 days
//     of the charge appearing on a credit card statement. (US credit cards; rules in other countries were not read.)
// Not read, so not written: any price or fee of any marketplace or tutor, how many tutors any platform has, any research on native versus non-native teachers, any study on trial lessons, TOEFL and Aptis pages (the first failed to load, the second timed out),
// the EU withdrawal-right pages (the page fetched had only links), what any platform's refund policy says.
// Tutafy facts from the code on 31 Oct 2026: the directory opens when 6 tutors are ready and "Find me a tutor" is closed under 6 (src/lib/directory.ts, docs/features/T-0897-find-a-tutor.md); a tutor ticks the levels they teach
// (Beginner A1 to A2, Intermediate B1 to B2, Advanced C1 to C2: src/lib/tutor-levels.ts); a tutor profile has languages, an introduction, a price and times shown in the visitor's time zone; the standard 30-minute trial is switched on and priced
// by the tutor (docs/features/T-1007-standard-trial.md); the code has no credential check, placement test or guarantee (grep finds none). All names, prices and hours in the examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const CHOOSE_ENGLISH_TUTOR_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'Write a brief before you look at any tutor: your goal, your deadline, your level, the hours a week you can give and what you can spend. A tutor can only be right or wrong against something.',
    'A free level check is a guide, not proof. Cambridge English says its own online test is "not an official exam". The first lesson is the real check.',
    'Shortlist three tutors, run the same 30-minute trial with each and score them on the same questions. Do not choose on friendliness alone.',
    'Pay for one month first. A promise of a guaranteed score or level in a set number of weeks is a red flag.',
    'Tutafy does not have a tutor directory for learners open yet, does not check certificates and does not run placement tests. We say where it fits in the last section.',
  ] },
  { type: 'p', text: `To choose an online English tutor as an adult, write a short brief first (your goal, deadline, level, hours a week and budget), shortlist three tutors whose profiles match it, book a trial lesson with each and score them against the same questions, and pay for only one month until you have seen progress. Most adults who pick the wrong tutor skipped the brief and chose on a photo, a price or a star rating.` },
  { type: 'p', text: `This guide walks through that process. It covers how to write the brief, how to check your level, what different goals need, what a certificate does and does not prove, where to look, what to read in a profile, a trial-lesson scorecard, the questions to ask before you pay, red flags and a month-one checkpoint. We run a platform for tutors, so we are not neutral, and we say what we do not have.` },
  { type: 'image', src: '/blog/inline/english-tutor-and-student', alt: 'Two women seated at a wooden table with an open book in front of them, one in a black and yellow ice hockey jersey and one in a pale blue top, both looking at the camera, with a water bottle at the left edge.', caption: 'Illustrative photo, not a Tutafy user. A good first lesson tells you whether you and the tutor can work together.', credit: 'Photo: morrillmemoriallibrary (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:A_tutor_and_student.jpg' },
  { type: 'h2', text: 'Start with a brief, not a tutor' },
  { type: 'p', text: `A brief is five lines you write before you open a single profile. It stops you drifting towards whoever has the nicest photo, and it gives a tutor something to answer. Write the goal as something you could check: "give a ten-minute presentation to my team without notes" is a goal, "improve my English" is a wish.` },
  { type: 'compare', caption: 'Three invented briefs. The names, goals and numbers are made up.', headers: ['Line', 'Marta, an engineer', 'Ken, applying to a university', 'Lucía, a traveller'], rows: [
    ['Goal', 'Present project updates in meetings without reading from slides', 'Reach the speaking and writing level the university asks for', 'Talk with local people on a three-month stay'],
    ['Deadline', 'A review meeting in 10 weeks', 'The application deadline, 5 months away', 'Departure in 8 weeks'],
    ['Level now', 'Reads well, speaks slowly', 'Reads and writes well, nervous speaking', 'Knows basic phrases'],
    ['Hours a week', '2 lessons plus 1 hour of practice', '2 lessons plus 3 hours of practice', '1 lesson plus short daily practice'],
    ['Budget', 'A monthly figure she can keep up for 3 months', 'A monthly figure, plus the exam fee', 'A low monthly figure, no packages'],
  ] },
  { type: 'p', text: `Do not skip the deadline and the hours. Two lessons a week cannot be turned into twenty by a better tutor, and a tutor who says they can is describing something that cannot be checked. The budget line should be what you can keep paying, not the most you could spend this week.` },
  { type: 'h2', text: 'Know your level before you shop' },
  { type: 'p', text: `Tutors and exams use the CEFR, the Common European Framework of Reference for Languages. Cambridge English describes it as an international standard for language ability, a six-point scale from A1 for beginners to C2 for those who have mastered a language, which lets teachers, learners, employers and institutions compare qualifications. Many tutor profiles state a level or a range in these letters. On Tutafy a tutor ticks Beginner (A1 to A2), Intermediate (B1 to B2) or Advanced (C1 to C2).` },
  { type: 'p', text: `A free check can give you a starting guess. Cambridge English has an online Test your English with four versions (General English, Schools, Business and Young learners), and says plainly that it is not an official exam and the score is only a guide. We could not read the Council of Europe's own level descriptions, so the table below is our plain-language reading, not their wording.` },
  { type: 'compare', caption: 'A rough self-check in our own words, not official descriptors. Be honest, and treat it as a guess.', headers: ['If this sounds like you', 'Roughly'], rows: [
    ['You manage simple everyday exchanges and need people to speak slowly', 'A1 to A2'],
    ['You can deal with most travel and work basics, and talk about familiar topics, with pauses and mistakes', 'B1'],
    ['You can follow a normal conversation and a meeting, and explain your view, but search for words and make errors under pressure', 'B2'],
    ['You are fluent in most settings and want precision, style or an accent that is easier to follow', 'C1 to C2'],
  ] },
  { type: 'image', src: '/blog/inline/english-video-call', alt: 'A smiling woman with long dark hair gesturing with one hand as she talks to a laptop on a wooden table, in a room with wooden walls and bookshelves behind her.', caption: 'Illustrative photo, not a Tutafy user. Many online lessons are a video call from home.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Woman_smiling_and_using_laptop_during_video_call_in_cozy_wooden_room.jpg' },
  { type: 'p', text: `A good tutor will test your level in the first lesson anyway, so do not worry about being exact. Use your guess to filter: a tutor who says they teach advanced learners may not be right for a true beginner, and the reverse.` },
  { type: 'h2', text: 'What your goal changes' },
  { type: 'p', text: `"Online English tutor" covers very different jobs. The same person is rarely best at all of them, so match the tutor to the goal.` },
  { type: 'compare', caption: 'What to look for by goal. Our own advice, not a ranking.', headers: ['Goal', 'What to look for', 'A question to ask'], rows: [
    ['Speaking with confidence', 'A tutor who makes you talk most of the lesson, corrects after you finish a thought, and gives you things to say again', 'How much of a lesson will I speak, and how do you give feedback?'],
    ['English for work', 'Experience with your field, real material such as your emails and slides, role-play of meetings', 'Can we work on my own documents and a real meeting?'],
    ['An exam', 'A tutor who knows the exact test and its marking, and sets timed practice', 'Which test do you teach, and how do you check my practice answers?'],
    ['Travel or living abroad', 'Practical phrases, listening to real speech, the accent where you are going', 'Can we practise the situations I will meet?'],
    ['Pronunciation or accent', 'A tutor who records you, shows the difference and drills it', 'Will you record me and show me what to change?'],
    ['Writing', 'Corrections with reasons, a plan for repeated mistakes', 'How do you mark my writing and how fast do I get it back?'],
  ] },
  { type: 'p', text: `If your goal is an exam, check which one you need before you pick a tutor. According to ielts.org, IELTS Academic is for study in an English-speaking country and professional registration, IELTS General Training is for migration to Australia, Canada, New Zealand or the UK and for study or training below degree level, and IELTS for UKVI is for UK visa applications. Ask the university, employer or immigration office which test and score they accept. We did not read the TOEFL or Aptis pages for this guide. No official page we read says a tutor can guarantee your score.` },
  { type: 'h2', text: 'Certificates and experience: what they show and do not' },
  { type: 'p', text: `A certificate shows that someone completed a course. Experience shows that they have taught people like you. Neither shows that they can teach you. Cambridge English describes CELTA as a qualification for teaching English as a foreign language, with at least 120 hours of study and teaching practice with groups of learners observed by a trainer. It lists new teachers, experienced teachers, first-language and non-first-language speakers among those it is for. That tells you CELTA is not limited to native speakers, and not that every CELTA holder is good.` },
  { type: 'compare', caption: 'What common evidence tells you. Our reading, not a rule.', headers: ['Evidence', 'What it tells you', 'What it does not'], rows: [
    ['A teaching certificate (such as CELTA)', 'They trained, and were observed teaching', 'That they suit your goal or your level'],
    ['Years of experience', 'They have stayed in the work', 'That they taught adults, or your goal'],
    ['A degree in English or another subject', 'Subject knowledge', 'That they can explain it to a learner'],
    ['Being a native speaker', 'Natural use of the language', 'That they can explain why, or teach a learner in your position'],
    ['Reviews from adult learners', 'What others felt, if the reviews are real and recent', 'That their goal was yours'],
    ['A friendly profile video', 'How they sound and come across', 'How they teach'],
  ] },
  { type: 'p', text: `The question of native and non-native tutors is argued everywhere, and the search summaries we saw disagree. Some say native tutors suit accent and idiom, others that non-native tutors who learned English themselves can explain grammar and the learner's difficulties well. We found no study we could check, so we do not take a side. Judge by the trial lesson.` },
  { type: 'h2', text: 'Where to look' },
  { type: 'p', text: `There are four routes, and they trade price, choice and protection differently. We did not read any platform's current fees or policies for this guide, so we describe the shape, not the numbers.` },
  { type: 'compare', caption: 'Four routes to a tutor. Our own judgement of the trade-offs.', headers: ['Route', 'Strength', 'Watch for'], rows: [
    ['A marketplace of tutors', 'Large choice, filters, built-in booking and payment', 'The platform keeps a share, so the price includes it; profiles are written to sell'],
    ['A tutor with their own page', 'You deal with one person and often pay them directly', 'You check everything yourself, and there is no platform between you'],
    ['A language school or company programme', 'Structure, a curriculum, sometimes a certificate', 'Less choice of tutor, often fixed groups and schedules'],
    ['A friend, colleague or a recommendation', 'A real person vouches for them', 'Their goal may not match yours'],
  ] },
  { type: 'h2', text: 'Build a shortlist of three' },
  { type: 'p', text: `Open profiles with your brief beside you and cross out any that fail a basic test. Then keep three. Read for these things:` },
  { type: 'ul', items: [
    `Does it say they teach adults, and your kind of goal? "All ages and levels" is a warning sign.`,
    `Is the level range one you fit inside?`,
    `Is the introduction specific about what a lesson is like, in good English with few mistakes?`,
    `Do the free times fit your week, shown in your time zone? Our guide to scheduling across time zones explains why that matters when you and the tutor live in different places.`,
    `Is there a trial, and what does it cost and how long is it?`,
    `Is the cancellation rule written down?`,
    `Does the tutor answer a short message within a day? Write one and see.`,
  ] },
  { type: 'p', text: `Three is enough. Fewer gives you no comparison, and more makes you choose by fatigue. If all three fail the trial, write a new shortlist rather than lowering your standard.` },
  { type: 'h2', text: 'The trial lesson: score all three the same way' },
  { type: 'p', text: `A trial is not a favour, it is the test. Book the three within a week so your memory of each is fresh, and use the same plan every time. A 30-minute structure that works: five minutes on your goal and deadline, ten minutes of you speaking on a topic you choose, ten minutes of feedback and one fix, five minutes on a plan for the next four lessons.` },
  { type: 'compare', caption: 'A trial-lesson scorecard. Score each line from 0 to 2 for each tutor and add up the totals.', headers: ['Question', 'Good looks like'], rows: [
    ['Did they ask about my goal and deadline?', 'Yes, before they started teaching'],
    ['Did I speak most of the time?', 'About two thirds or more was me'],
    ['Did they correct me in a way I understood?', 'They showed the mistake, the fix and why'],
    ['Could I follow them?', 'They adjusted to my level without talking down'],
    ['Did I leave with one thing to practise?', 'A specific task, not "keep practising"'],
    ['Was there a plan for the next few lessons?', 'Yes, tied to my goal'],
    ['Was the technology fine?', 'Audio and video worked and they handled problems calmly'],
    ['Would I be happy to do this twice a week?', 'Yes, and I can describe why'],
  ] },
  { type: 'p', text: `Add the scores, then look at the two or three lines that matter most to you. A tutor with a lower total who nailed your goal can beat a charming one who never asked about it. If a tutor takes your trial as a sales pitch for a large package, that is information too.` },
  { type: 'h2', text: 'Questions to ask before you pay' },
  { type: 'ul', items: [
    `What happens if I need to cancel or move a lesson, and how much notice do you need?`,
    `What happens if you cancel or miss a lesson? Do I get it back or my money back?`,
    `How is a lesson paid, and who do I pay? Is there a receipt?`,
    `Do you give materials and homework, and are they included?`,
    `How will we check my progress, and when?`,
    `May I record a lesson for my own practice? Always ask first.`,
    `If I stop after a month, is anything left to pay?`,
    `Is there any package, and what does it cost per lesson against paying lesson by lesson?`,
  ] },
  { type: 'p', text: `Ask in writing and keep the answers. A tutor who is clear before you pay is usually clear afterwards. Our guide to tutoring cancellation policies shows what a fair written rule looks like, and our guide to lesson packages explains how prepaid bundles work and when they are worth it.` },
  { type: 'h2', text: 'Price, packages and paying safely' },
  { type: 'p', text: `We did not read any tutor's or platform's prices, and rates vary widely by country, experience and subject, so we give no range. What we can give is arithmetic. Say lessons cost 30 dollars and you take two a week for twelve weeks. That is 24 lessons and 720 dollars. A package that offers 10 percent off is 648 dollars, but you pay it all before you know whether the tutor suits you. The figures are invented, and the sums are the point.` },
  { type: 'p', text: `Pay for one month, then decide. A tutor who values you will not mind. If you buy a package, ask what happens to unused lessons if you stop or if the tutor leaves. If you pay by card in the United States and something goes wrong, the Consumer Financial Protection Bureau says to contact the seller first, then your card company, and that a charge can count as a billing error when you did not receive what you ordered. For a credit card the notice should go within 60 days of the charge appearing on your statement. Rules in other countries differ and we did not read them.` },
  { type: 'p', text: `Be careful with payments outside a platform or a tutor's published payment method, such as a bank transfer to a stranger, because it is harder to recover.` },
  { type: 'h2', text: 'Red flags' },
  { type: 'ul', items: [
    `A guarantee of a score, a level or a number of weeks. No official page we read says a tutor can predict results.`,
    `Pressure to pay for many lessons before a trial, or a "today only" price.`,
    `No trial, or a trial used only to sell a package.`,
    `Refusing to say what they have taught or trained in.`,
    `Lessons that are mostly the tutor talking.`,
    `A conversation-goal tutor who only sets grammar worksheets, or an exam tutor with no timed practice.`,
    `Repeated late starts, cancellations or "technical problems" in the first month.`,
    `Asking you to pay in a way you cannot trace.`,
    `A profile written in poor English from a tutor who says they teach advanced writing. It is not proof, but ask for a writing sample.`,
  ] },
  { type: 'h2', text: 'One-to-one or a group?' },
  { type: 'p', text: `Group classes cost less per hour, and some learners enjoy hearing others. The cost is speaking time. In a one-hour class of six people where everyone gets an equal share, you speak for about ten minutes, and that is before the tutor explains anything. The same hour one-to-one can give you most of the hour. This is simple arithmetic with invented numbers, not a finding about any school. If your goal is to speak, one-to-one usually gives you more practice for each lesson you pay for, and a small group can be a good addition once you are confident.` },
  { type: 'h2', text: 'Make the lessons count between lessons' },
  { type: 'p', text: `A tutor sees you for a small part of your week, and what you do in the rest decides how fast you move. Keep a list of the mistakes your tutor corrects and re-read it before each lesson. Redo any corrected writing from memory a day later. Ask for homework sized to the hours you really have, because a tutor who sets two hours of tasks for a learner with thirty minutes is not listening. And say what you did and did not do at the start of the next lesson, since a tutor can only adjust to what they know.` },
  { type: 'h2', text: 'Check progress after a month' },
  { type: 'p', text: `At the first lesson, record yourself speaking for two minutes on a topic and keep it, with the tutor's permission if they are present. After four weeks, record again on a similar topic. Listen to both. Ask yourself whether you paused less, used words you could not before, and made fewer of the same mistakes. Then ask the tutor to tell you honestly what has changed and what has not.` },
  { type: 'compare', caption: 'A month-one checkpoint. Our own questions, not a standard.', headers: ['Sign', 'If yes', 'If no'], rows: [
    ['You can name what you worked on and why', 'Keep going', 'Ask for a written plan'],
    ['Your second recording is better in at least one way you can describe', 'Keep going', 'Ask what to change, then give it two more weeks'],
    ['The tutor adjusts when something is not working', 'Keep going', 'Consider a second trial with another tutor'],
    ['You look forward to the lessons most weeks', 'Keep going', 'Say so, and change if nothing shifts'],
  ] },
  { type: 'p', text: `Changing tutor is normal, and a good tutor will not take it as an insult. Keep your recordings and your list of mistakes and take them to the next tutor, so you do not start from zero.` },
  { type: 'image', src: '/blog/inline/english-oxford-dictionary', alt: 'A large printed English dictionary lying open on a patterned rug, showing two pages of very small text arranged in six columns each.', caption: 'Illustrative photo. A dictionary shows words; a good lesson makes you use them.', credit: 'Photo: Cullen328 (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Compact_Oxford_English_Dictionary_2.jpg' },
  { type: 'h2', text: 'Where Tutafy fits, and where it does not' },
  { type: 'p', text: `Tutafy is a tool for tutors to book, teach and get paid, with a public page for each tutor. It also has a directory and a "Find me a tutor" page for learners, but they open only when 6 tutors are ready, so for now you reach a Tutafy tutor through their own link, not through a search. Be honest with yourself about that: today this is a small place, not a marketplace.` },
  { type: 'ul', items: [
    `A tutor page shows the languages they teach, an introduction, a price and free times in your own time zone.`,
    `A tutor can tick the levels they teach, in three groups with the CEFR range shown, and can switch on a standard 30-minute trial lesson and set its price.`,
    `Tutafy does not check certificates or identities, does not run a placement test and does not guarantee any result.`,
    `You pay the tutor through the payment method they set up, so use the questions and red flags above.`,
    `If you teach English yourself, our guide to teaching English online is written for you.`,
  ] },
  { type: 'source', text: 'The official pages used for the facts about levels, exams, qualifications and card disputes, read on 31 Oct 2026. Our tables, scorecard and checkpoint are our own advice and every name, price and number in the examples is invented. The CFPB page describes US credit cards; check the rules where you live.', links: [
    { label: 'Cambridge English: the CEFR', href: 'https://www.cambridgeenglish.org/exams-and-tests/cefr/' },
    { label: 'Cambridge English: Test your English', href: 'https://www.cambridgeenglish.org/test-your-english/' },
    { label: 'Cambridge English: CELTA', href: 'https://www.cambridgeenglish.org/teaching-english/teaching-qualifications/celta/' },
    { label: 'IELTS: test types', href: 'https://ielts.org/take-a-test/test-types' },
    { label: 'US Consumer Financial Protection Bureau: what is a chargeback', href: 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-chargeback-en-1969/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to teach English online', href: '/blog/how-to-teach-english-online', text: 'The same subject from the tutor side.' },
    { label: 'IELTS Speaking Part 2 topics', href: '/blog/ielts-speaking-part-2-topics', text: 'How one speaking task works, and how a tutor can practise it with you.' },
    { label: 'Schedule lessons across time zones', href: '/blog/schedule-tutoring-lessons-across-time-zones', text: 'When you and your tutor live in different places.' },
    { label: 'Tutoring cancellation policy and contracts', href: '/blog/tutoring-cancellation-policy-and-contracts', text: 'What a fair written rule looks like.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'How prepaid bundles work and when they pay off.' },
  ] },
  { type: 'faq', items: [
    { q: 'How do I choose an online English tutor as an adult?', a: `Write a brief with your goal, deadline, level, hours a week and budget. Shortlist three tutors who say they teach adults with your kind of goal, book a trial with each, score them on the same questions and pay for one month first.` },
    { q: 'How do I find out my English level?', a: `A free online check such as Cambridge English's Test your English gives a guide, though Cambridge says it is not an official exam and not proof of ability. Your first lesson with a tutor is a better check. Levels are usually given on the CEFR scale, from A1 for beginners to C2.` },
    { q: 'Should I choose a native speaker?', a: `The sources we read disagree and we found no study we could check. CELTA, for example, is open to first-language and non-first-language speakers. Judge by the trial lesson: whether the tutor explains clearly, makes you speak and fits your goal.` },
    { q: 'Do I need a tutor with a teaching certificate?', a: `A certificate shows training, not that someone suits you. CELTA from Cambridge has at least 120 hours of study and observed teaching practice. It helps, but experience with adults, and your goal, matter as much. Ask what they have taught.` },
    { q: 'Is a free trial lesson worth it?', a: `Yes. A trial is the best test you have, so book three and score them on the same questions. A tutor who gives no trial or uses it to push a large package is a warning sign.` },
    { q: 'Can a tutor guarantee my IELTS score or level?', a: `No. No official page we read says a tutor can guarantee a result. A good tutor offers practice, feedback and a plan. Check with the university or employer which IELTS type they accept before you start.` },
    { q: 'Is it safe to pay an online tutor directly?', a: `It can be, with care. Pay one month first, keep receipts and avoid payments you cannot trace. In the United States, the CFPB says to contact the seller first and then your card company, with a billing error notice within 60 days for a credit card. Other countries differ.` },
    { q: 'Can I find an English tutor on Tutafy?', a: `Tutafy has public pages for tutors, but its directory and finder open only when 6 tutors are ready, so for now you reach a tutor through their own link. Tutafy does not check certificates or guarantee results.` },
  ] },
  { type: 'cta', title: 'Teach English? Run it from one booking link', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not send you students.', button: 'Start free, no credit card', href: '/register' },
]
