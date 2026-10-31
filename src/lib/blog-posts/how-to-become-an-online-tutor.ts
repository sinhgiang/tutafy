// T-1195. Article body for /blog/how-to-become-an-online-tutor (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1315-keyword-data-sapa-tutafy.md ("how to become an online tutor", about 480 searches a month in the US, difficulty 31, OpenSEO, 31 Oct 2026).
// Step 0, the results page (OpenSEO live Google SERP, US, English, desktop, 31 Oct 2026): an AI summary; Tutor.com's tutor application page; a result quoting a bachelor's degree as the usual requirement;
//   MyTutor's become-a-tutor page; a Reddit thread; Step Up Tutoring's volunteer application page; a Quora question. Almost all of it answers "how do I get hired", not "how do I become a tutor on my own".
// Step 0, overlap with the posts on master (31 Oct 2026): how-to-start-an-online-tutoring-business is the seven-step business set-up with a 30-day plan (niche, price, tools, booking page, first students);
//   online-tutoring-jobs (T-1192) compares who hires and what each keeps or pays; tutor-resume (T-1193) is the resume for an employer; get-your-first-tutoring-clients is the channels. None of them asks "are you ready, what does
//   anyone actually require of you, and what should the first 90 days look like when nobody is hiring you", none covers checks and safeguarding for tutors of children, and none ends in a day-90 decision.
// Own angle: the person, not the business: a requirements table from the official and platform pages, a readiness check, checks and safeguarding when you teach children, then a 90-day plan with a "done when" for each stretch
//   and a day-90 review. Links to the existing posts for the how-to of each step instead of repeating them.
//
// Sources, read on 31 Oct 2026:
//   Read directly: US Bureau of Labor Statistics, Occupational Outlook Handbook, Tutors: median pay $43,350 a year, $20.84 an hour (May 2025); typical entry education "Some college, no degree"; about 208,400 jobs in 2025;
//     outlook 0% for 2025 to 2035; 12% of tutors self-employed; most work part time and schedules vary; some employers require a bachelor's degree, high school students may tutor with strong subject knowledge, test-prep tutors usually
//     must have scored highly, some prefer teaching experience or a state teaching certification, no certification or license is listed as universally required; important qualities: communication, creativity, instructional skills,
//     organizational skills and patience.
//   Read directly: GOV.UK, Disclosure and Barring Service news, 20 Jan 2026: from 21 Jan 2026 self-employed workers and personal employees who are paid, with "private tutors offering lessons directly to children" as an example,
//     can apply for Enhanced DBS checks through a registered umbrella body; existing DBS fees apply and umbrella bodies may charge their own; eligibility criteria are unchanged; the page does not say whether a check is legally required.
//   Read directly: GOV.UK, a guide for parents and carers employing self-employed workers or personal employees (updated 17 Sep 2026): parents cannot apply for a check on behalf of an individual; the certificate belongs to the
//     individual and sharing it is their choice; the DBS Update Service; "A DBS certificate is not a pass or fail test"; it does not say a check is legally required for hiring a private tutor.
//   Read directly: NSPCC Learning, Safeguarding and child protection for tutors (last updated 2 Apr 2026): tutors "need to have" safeguarding and child protection policies before working with children; a code of conduct is
//     recommended; independent tutors should get criminal records checks (best practice to show parents an up-to-date certificate and give two referees); in England and Wales a self-employed tutor can request a basic DBS check
//     or an enhanced check through an umbrella body, in Northern Ireland basic checks are available and enhanced checks go through an organisation, in Scotland those in a "regulated role" must join the PVG scheme; one-to-one
//     and online advice; agree expectations with parents; notes of each session; training.
//   Read directly: Tutor.com, Why tutor with us (the page lists no degree requirement; "as few as 5 hours a week and as many as 29 hours a week"; "any computer with a stable, high-speed internet connection"; no pay figure).
//   Read directly: Step Up Tutoring, virtual volunteer tutor application (volunteer, at least 16, application form, virtual interview, background check, online training; other organisations' checks cannot be accepted).
//   Read directly: MyTutor, tutor application page (current student or recent graduate of a listed UK university, A grades in Maths, English or Science GCSE or A-Level, eligible to work in the UK and able to register as
//     self-employed with HMRC, a 15 minute video interview, "Take home from £13-£120/hour"; the page also says "You don't need any qualifications to join!", so it is read as inconsistent and the article tells the reader to read the list).
// Not read, so not written: any US state's rule on background checks for private tutors, the length of time a first student takes (no official figure found), how many people start and stop tutoring, what a trial lesson
//   converts to, any pay figure for a new tutor other than BLS. The invented tutor and every number in the 90-day table are invented and said to be.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: the Free plan covers up to 10 students (src/lib/site-content.ts), Pro $12 and Academy $29 (src/lib/plans.ts), a trial lesson setting
//   that starts switched off (src/app/(dashboard)/settings/page.tsx: trial_enabled, trial_price); there is no safeguarding policy, no background check or certificate storage and no student directory in the code.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const BECOME_ONLINE_TUTOR_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    `In the United States nobody has to give you a licence first. The Bureau of Labor Statistics lists the typical entry education for tutors as some college without a degree, and no certification or license as universally required. Employers and countries differ.`,
    `What you do need is proof you know the subject, a way to explain it, a way to be found and a safe way to run lessons.`,
    `In England and Wales, self-employed private tutors can apply for an Enhanced DBS check through an umbrella body since 21 January 2026. We found no GOV.UK page saying a private tutor must hold one.`,
    `Plan 90 days, not a launch weekend: build the minimum in two weeks, find and teach the first students, make lessons repeat, then decide on day 90 with your own numbers.`,
    `No official source we read says how long a first student takes. Tutafy does not find you students; the Free plan covers up to 10 once you have them.`,
  ] },
  { type: 'p', text: `To become an online tutor, pick one subject you can explain well, set up a way for students to book, pay and join a video lesson, find your first few students through people and places you already reach, and run the first 90 days as a test you review with real numbers. In the United States nobody has to give you a licence first: the Bureau of Labor Statistics (BLS) lists the typical entry education for tutors as "some college, no degree" and lists no certification or license as universally required. What matters more is whether you can show you know the subject and whether students come back for a second lesson.` },
  { type: 'p', text: `This guide is for someone who wants to tutor on their own terms, not apply for a job at a company. It covers what you need and what you do not, a readiness check, checks and safeguarding when you teach children, the week-one set-up, a plan for your first 90 days, what the money can look like and how to decide on day 90. Every official figure was read on 31 October 2026. Anything marked invented is invented. The plans are ours: a suggestion, not data about what other tutors did.` },
  { type: 'image', src: '/blog/inline/become-desk-laptop-notebook', alt: 'A silver laptop with a dark screen open on a wooden desk in front of white shelves of books.', caption: 'Illustrative photo, not a Tutafy user. The first tool is a laptop on a desk you can leave set up.', credit: 'Photo: www.Pixel.la Free Stock Photos (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Desk-laptop-notebook-table_(23697249344).jpg' },
  { type: 'h2', text: `What Google shows for this question, and what this guide adds` },
  { type: 'p', text: `On 31 October 2026 the first page of US Google results for "how to become an online tutor" was an AI summary, Tutor.com's tutor application page, a result quoting a bachelor's degree as the usual requirement, MyTutor's "become an online tutor" page, a Reddit thread, a volunteer programme's application page and a Quora question. Most of that page answers "how do I get hired", not "how do I become a tutor on my own".` },
  { type: 'p', text: `The hiring question is covered elsewhere on this site: our guide to online tutoring jobs compares which platforms hire and what each pays, and our guide to starting an online tutoring business walks through the seven set-up steps. This guide asks something different: are you ready, what does anyone actually require of you, and what should the first 90 days look like when nobody is hiring you?` },
  { type: 'h2', text: `What you need to become an online tutor, and what you do not` },
  { type: 'p', text: `Start from what the sources say, not from what blogs repeat. The first two rows are from BLS and describe the United States; the rest are individual companies and programmes, whose rules bind only the people who apply to them.` },
  { type: 'compare', caption: 'What is required to tutor, by source, read 31 October 2026. Company and programme rules are theirs alone, not law.', headers: ['Item', 'What the source says', 'Source'], rows: [
    [`Degree`, `Typical entry education is some college, no degree. Some employers require a bachelor's degree, often in education or the subject. High school students may tutor with strong subject knowledge. Test-prep tutors usually must have scored highly on the test.`, `BLS, Tutors`],
    [`Licence or certification`, `No certification or license is listed as universally required. Some employers prefer teaching experience or a state-issued teaching certification.`, `BLS, Tutors`],
    [`Company rules`, `They differ. MyTutor asks for a current student or recent graduate of a listed UK university, A grades in Maths, English or Science, and a 15 minute video interview. Tutor.com's page lists no degree.`, `MyTutor, Tutor.com`],
    [`Equipment`, `Tutor.com: "any computer with a stable, high-speed internet connection".`, `Tutor.com`],
    [`Age`, `Step Up Tutoring, a US volunteer programme, asks tutors to be at least 16. That is one programme's rule, not a law.`, `Step Up Tutoring`],
    [`Background check`, `Rules differ by country, state and programme. Step Up Tutoring requires one. See the safeguarding section below.`, `Step Up Tutoring, GOV.UK, NSPCC`],
  ] },
  { type: 'p', text: `Notice what is missing: nothing in these sources makes you buy a course before you start. A teaching certificate can help you win some students or platforms, and in a crowded subject it can be worth paying for, but the sources do not call it a gate. The gate is usually the platform or school you apply to. On your own you have fewer gates and more decisions, which is what the rest of this guide is about.` },
  { type: 'h2', text: `Are you ready? A one-evening check` },
  { type: 'p', text: `Answer these on paper before you spend money or tell anyone. They are our questions, not an official test. A "no" is information, not a verdict.` },
  { type: 'ul', items: [
    `Subject. Can you explain the one topic you want to teach in three different ways without notes? If you can only repeat the textbook, practise on a friend first.`,
    `Level. Do you know the level you will teach better than the student does?`,
    `Proof. What can you show: a grade, a score, a degree, a year of volunteering? Write the list. If it is short, say so plainly in your profile.`,
    `Hours. How many hours a week can you keep for 90 days, preparation included? BLS says most tutors work part time, so a few steady hours beat a plan to do twenty.`,
    `Evenings. Students are usually free when school or work is over. Can you teach then, in their time zone?`,
    `Temperament. BLS lists communication skills, creativity, instructional skills, organizational skills and patience as the important qualities for tutors. Can you stay calm when a student does not understand for the third time?`,
    `Children. Will you teach anyone under 18? If so, the safeguarding section is part of your set-up.`,
    `Purpose. What would make 90 days worth it: some income, experience for a CV, or a first step toward leaving a job? Decide now so you can judge it on day 90.`,
  ] },
  { type: 'p', text: `Then choose one subject, one level and one kind of student for the 90 days. "Maths" is not a choice; "GCSE maths for ages 14 to 16" is. You can widen later. Five similar students teach you more than five different ones. Our guide to choosing a tutoring niche walks through the choice.` },
  { type: 'h2', text: `If you will teach children: checks, safeguarding and what is required` },
  { type: 'p', text: `This section leans on UK sources, because the UK publishes clear public guidance. If you are in the United States, BLS lists no licence as universally required and we did not read any state's rules on background checks for private tutors, so check your state and any school or platform you work through. Whatever the law says, parents ask.` },
  { type: 'compare', caption: 'Checks for private tutors of children, from the pages named, read 31 October 2026. Guidance and law are not the same thing; the table says which is which.', headers: ['Question', 'Source says', 'Source'], rows: [
    [`Can a self-employed tutor in England or Wales get an Enhanced DBS check?`, `Yes, since 21 January 2026, through a registered umbrella body, if the role qualifies. The announcement names "private tutors offering lessons directly to children" as an example. DBS fees apply, and umbrella bodies may add their own. The eligibility rules are unchanged.`, `GOV.UK, DBS, 20 January 2026`],
    [`Can a parent run the check on you?`, `No. Parents and carers cannot apply for a DBS check on behalf of an individual. You apply yourself.`, `GOV.UK guide for parents, updated 17 September 2026`],
    [`Do you have to show the certificate?`, `No. It belongs to you and sharing it is your choice. The guide also says a certificate is not a pass or fail test and should be weighed with references and experience.`, `GOV.UK guide for parents`],
    [`Is a check legally required for a private tutor?`, `The GOV.UK pages we read do not say so, and the parents' guide treats asking to see a certificate as a choice. NSPCC says tutors need safeguarding policies before they work with children and calls criminal records checks best practice for independent tutors.`, `GOV.UK, NSPCC Learning, updated 2 April 2026`],
    [`Other UK nations`, `Northern Ireland: basic checks are available, and enhanced checks go through an organisation. Scotland: people in a "regulated role" must join the PVG scheme.`, `NSPCC Learning`],
    [`United States`, `Not covered by the sources we read, apart from BLS listing no universal licence. Programmes set their own rules: Step Up Tutoring requires a background check from its volunteers.`, `BLS, Step Up Tutoring`],
  ] },
  { type: 'p', text: `NSPCC's advice for tutors is written for the UK and is guidance, not a statute. These are its main points, in plain steps.` },
  { type: 'ul', items: [
    `Have a safeguarding and child protection policy before you start: what you will do to keep children safe and how you will respond to a concern.`,
    `Agree expectations with parents before the first lesson: what you will cover, and where the child and the parent will be during the session. Give a short update after each lesson.`,
    `Keep notes of what you cover in each session and of anything that worries you.`,
    `Online, use a neutral background and sit at a desk or table, not in a bedroom. Take inappropriate posters and confidential material out of view, and open only what the lesson needs when you share your screen.`,
    `If a child tells you something worrying, listen, keep accurate notes and report it under your policy. NSPCC is clear: "Never promise to keep what a child tells you a secret."`,
    `Get trained. NSPCC points to an introductory course and an elearning course for tutors.`,
  ] },
  { type: 'p', text: `Tutafy does not provide a safeguarding policy, run checks or store certificates. Write your own policy, keep it to a page and give it to parents.` },
  { type: 'h2', text: `Week one: the minimum set-up` },
  { type: 'p', text: `You need less than you think, and more than a video call link. Have these in place before you tell anyone you are open for students.` },
  { type: 'image', src: '/blog/inline/become-headphones-laptop', alt: 'Black over-ear headphones with a silver ear cup resting on a laptop keyboard, with a mountain wallpaper on the screen.', caption: 'Illustrative photo, not a Tutafy user. If your room echoes, a headset is the cheapest upgrade.', credit: 'Photo: Álvaro Bernal abn (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Macro_headphones_laptop_(Unsplash).jpg' },
  { type: 'ul', items: [
    `A computer with a working camera and microphone, and an internet connection you have tested for a full lesson by running a 45-minute call with a friend.`,
    `A quiet corner with a plain background.`,
    `One place where students book, pay and join: a booking page with your real availability, a payment method that reaches you and a video room or your own Zoom or Meet link.`,
    `A short written policy: when a student can cancel without paying, when you are paid and what happens if someone is very late. The numbers are yours to choose. Our guide to cancellation policies has wording.`,
    `A profile of 80 to 150 words that says who you help and what a lesson is like. Our guide to writing a tutor bio has fifteen invented examples.`,
    `A price you can defend, worked back from what you want to take home. Our guides to pricing lessons and to your real hourly rate show how, including unpaid hours.`,
    `A record of income from the first payment. Our guide on whether tutors pay taxes explains what to keep.`,
  ] },
  { type: 'p', text: `That is a day or two of work, not a month. The common mistake is spending two weeks on a logo and a website while no student can book. A booking page is enough to start. The detail of each tool is in our guide to starting an online tutoring business.` },
  { type: 'h2', text: `Your first 90 days` },
  { type: 'p', text: `This plan is ours. It is built from the sources above and from common sense, and no official source says how long any stage takes. Treat the days as a guide and the "done when" column as the real check.` },
  { type: 'compare', caption: 'The 90-day plan on one page. This is our suggested plan, not data about other tutors.', headers: ['Days', 'Focus', 'Done when'], rows: [
    [`1 to 14`, `Build the minimum and rehearse it`, `A stranger could book, pay and join a lesson without asking you a question.`],
    [`15 to 30`, `Find and teach the first students`, `You have taught real lessons and asked each student for feedback.`],
    [`31 to 60`, `Make lessons repeat`, `Some students have a weekly slot and you know your unpaid hours.`],
    [`61 to 90`, `Review and decide`, `You have a one-page review with real numbers and a written decision.`],
  ] },
  { type: 'image', src: '/blog/inline/become-planner-notes', alt: 'A hand holding a white pen over an open paper planner with yellow sticky notes, beside a book and a glass on a dark desk.', caption: 'Illustrative photo, not a Tutafy user. A paper or digital log works; what matters is that you keep one.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Young_person_writes_notes_in_planner_while_drinking_coffee_from_above.jpg' },
  { type: 'h3', text: `Days 1 to 14: build the minimum and rehearse it` },
  { type: 'p', text: `Work through week one above, then spend week two on a rehearsal. Ask two friends to book you through the real page, make a small payment, join the video room and take a 20-minute lesson on something you would teach. Time how long it takes from "I want a lesson" to "we are talking", and fix every step that confused them. If you will teach children, finish your safeguarding policy and the message to parents now.` },
  { type: 'h3', text: `Days 15 to 30: find the first students and teach them` },
  { type: 'p', text: `Tell people one at a time, not in a broadcast. List twenty people who know someone who could use what you teach, and message each with one sentence about who you help and a link. Add one community where learners ask questions, and answer questions there for two weeks before you mention your link. Our guide to getting your first ten clients has the full order. A marketplace is another door with its own rules; our guide to online tutoring jobs compares them.` },
  { type: 'callout', variant: 'info', title: 'There is no official clock for this', text: `We found no official figure for how long a first student takes. It depends on who you know and how you reach them. Plan to spend the whole month on it and judge yourself by conversations held and lessons taught, not only by payments.` },
  { type: 'p', text: `Decide how to handle the first lesson. A free or reduced-price trial lowers the risk for a student and costs you unpaid time; that is a trade you choose. Tutafy lets you switch a trial lesson on and set its price in Settings, and it starts switched off. Whatever you decide, plan the lesson. This is our 45-minute shape.` },
  { type: 'compare', caption: 'A first lesson, minute by minute. The timings are ours, not from a source.', headers: ['Minutes', 'What happens', 'Why'], rows: [
    [`0 to 5`, `Greet, check sound and screen sharing.`, `Fix technology before it eats the lesson.`],
    [`5 to 15`, `Ask what they want, what they find hard and what they have tried. Give one short task to see their level.`, `You teach from evidence, not a guess.`],
    [`15 to 32`, `Teach one thing, with one example from you and one attempt from them.`, `One thing done well beats three half done.`],
    [`32 to 40`, `They do a task alone while you watch and say little.`, `It shows whether it stuck.`],
    [`40 to 45`, `Agree one thing to practise and the time of the next lesson.`, `It turns a lesson into a habit.`],
  ] },
  { type: 'p', text: `Afterwards, send a three-line note: what you covered, the one thing to practise and the next time. Ask for one honest comment about what was clear and what was not. Write the answers down; you will use them on day 90.` },
  { type: 'h3', text: `Days 31 to 60: make lessons repeat` },
  { type: 'p', text: `A student who books once is a sale. A student who books weekly is a business. Offer a regular weekly slot to every student who is happy by the third or fourth lesson, and ask what is working. Use reminders so nobody forgets; our guides to stopping no-shows and to lesson packages show how.` },
  { type: 'p', text: `Start the log now. For every student, write the paid hours and the unpaid ones: preparing, messaging, set-up and trial lessons. You cannot judge day 90 without it.` },
  { type: 'h3', text: `Days 61 to 90: review and decide` },
  { type: 'p', text: `Spend one evening on a one-page review: students, paid hours, unpaid hours, income, what you enjoyed and what you would change. Then use the decision table below.` },
  { type: 'h2', text: `What the money can look like in the first 90 days` },
  { type: 'p', text: `BLS puts the median pay for tutors at $20.84 an hour, or $43,350 a year, in May 2025. About 208,400 people held tutor jobs in 2025, BLS projects 0% change for 2025 to 2035 and says 12% of tutors are self-employed. Most work part time. Those figures describe tutors as a group. They are not a forecast for you: your rate, your hours and your fees are your own.` },
  { type: 'p', text: `What new tutors often miss is that the hours you are paid for are only part of the hours you work. The table below is invented, for a tutor who charges $30 for each lesson hour.` },
  { type: 'compare', caption: 'An invented tutor, first 90 days, $30 a lesson hour, before tax and payment fees. "Per hour" is the amount billed divided by all hours worked, paid and unpaid. The numbers are made up to show the shape, not a typical result.', headers: ['Month', 'Paying', 'Hours, paid + unpaid', 'Billed, per hour'], rows: [
    [`Month 1`, `2 students`, `6 + 9`, `$180, $12.00`],
    [`Month 2`, `4 students`, `20 + 12`, `$600, $18.75`],
    [`Month 3`, `5 students`, `30 + 14`, `$900, $20.45`],
  ] },
  { type: 'p', text: `The pattern is the point. Early months pay little for each hour worked, because set-up and unpaid trials take time, and the figure improves as students repeat. If your month 3 looks like month 1, you want to know that on day 90. Tax and payment fees come off these totals, so set money aside from the first payment.` },
  { type: 'h2', text: `Day 90: keep going, change one thing or stop` },
  { type: 'image', src: '/blog/inline/become-planning-stationery', alt: 'An open dated diary on a wooden desk beside red and black pencils, a pair of glasses and a red bottle.', caption: 'Illustrative photo, not a Tutafy user. Put the review in the diary now, on a date.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Working_on_a_planning_session_with_stationery_items,_notebook,_and_colorful_pencils_on_a_wooden_desk.jpg' },
  { type: 'compare', caption: 'What your numbers might be telling you. These readings are ours.', headers: ['What you see', 'What it may mean', 'What to try next'], rows: [
    [`Students book more than one lesson and some have a weekly slot`, `The lessons work and the level suits`, `Raise the price for new students. Keep a waiting list if you are full.`],
    [`Students book once and do not return`, `The first lesson or the follow-up is not landing`, `Ask three of them for honest feedback, tighten the first lesson and send a clearer next step.`],
    [`Few people book at all`, `A reach or a profile problem, not a teaching one`, `Message more people one by one, rewrite your profile, try one community or one marketplace.`],
    [`You are busy but the figure per hour worked is low`, `Too many unpaid hours, or a low price`, `Reuse materials, stop free extras, raise the price for new students.`],
    [`You dread the lessons`, `The wrong subject, level or kind of student`, `Change one of the three for 30 days, or stop. Stopping is a valid result.`],
  ] },
  { type: 'p', text: `Write the decision at the bottom of your review: continue as it is, change one named thing for 30 days, or stop. Changing one named thing is often the one to try first: after 90 days you have a single set of numbers, and one change is all you can learn from.` },
  { type: 'h2', text: `Mistakes new online tutors make in the first three months` },
  { type: 'ul', items: [
    `Waiting for a perfect website before telling anyone.`,
    `Teaching everything to everyone, instead of one subject, one level and one kind of student.`,
    `Skipping the written policy, then arguing about a missed lesson with someone you like.`,
    `Not tracking unpaid hours, so the real hourly rate is a surprise.`,
    `Giving free lessons with no limit, so the trial never ends.`,
    `Teaching children with no policy, no agreement with their parents and no notes.`,
  ] },
  { type: 'h2', text: `What Tutafy does and does not do for a new tutor` },
  { type: 'p', text: `Tutafy is our product, so read this as a vendor's description. For a new independent tutor it gives you a booking page with your availability, a video classroom in the browser (or your own Zoom or Meet link), email reminders, lesson notes and homework, a trial lesson setting and a record of payments. The Free plan covers up to 10 students at 0% commission; Pro is $12 a month and Academy $29.` },
  { type: 'p', text: `It does not find you students, run background checks or store certificates, write a safeguarding policy for you, build a resume or check your qualifications. Those parts of becoming a tutor are yours.` },
  { type: 'source', text: `The official and company pages used for the figures in this guide, read on 31 Oct 2026. Rules change, so check the current page before you rely on one.`, links: [
    { label: 'US Bureau of Labor Statistics: Tutors', href: 'https://www.bls.gov/ooh/education-training-and-library/tutors.htm' },
    { label: 'GOV.UK: Enhanced DBS checks for self-employed workers', href: 'https://www.gov.uk/government/news/self-employed-workers-and-personal-employees-can-now-apply-for-enhanced-dbs-checks' },
    { label: 'GOV.UK: guide for parents employing self-employed workers', href: 'https://www.gov.uk/government/publications/dbs-guidance-leaflets/a-guide-for-parents-and-carers-employing-self-employed-workers-or-personal-employees' },
    { label: 'NSPCC Learning: safeguarding for tutors', href: 'https://learning.nspcc.org.uk/safeguarding-child-protection/tutors' },
    { label: 'Tutor.com: why tutor with us', href: 'https://www.tutor.com/apply/why-tutor-with-us' },
    { label: 'Step Up Tutoring: volunteer application', href: 'https://www.stepuptutoring.org/tutor-application' },
    { label: 'MyTutor: tutor application', href: 'https://www.mytutor.co.uk/tutors/apply/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'Which platforms hire, and what each pays.' },
    { label: 'How to start an online tutoring business', href: '/blog/how-to-start-an-online-tutoring-business', text: 'Seven set-up steps and a 30-day plan.' },
    { label: 'How to choose a tutoring niche', href: '/blog/how-to-choose-a-tutoring-niche', text: 'Pick the subject, level and student.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'The profile your students read.' },
    { label: 'How to get your first 10 tutoring clients', href: '/blog/get-your-first-tutoring-clients', text: 'Where the first students come from.' },
    { label: 'Your real hourly rate as a tutor', href: '/blog/real-hourly-rate-for-tutors', text: 'Count unpaid hours.' },
    { label: 'Do tutors have to pay taxes?', href: '/blog/do-tutors-have-to-pay-taxes', text: 'What to keep from day one.' },
  ] },
  { type: 'faq', items: [
    { q: `How do I become an online tutor with no experience?`, a: `Pick one subject and level you know well, write down your proof (a grade, a degree, volunteering), set up a booking page and a written policy, rehearse with two friends, then tell people one at a time. Be honest in your profile about what you have and have not done.` },
    { q: `Do I need a degree or a certificate to tutor online?`, a: `Not by default. BLS lists the typical entry education for tutors as some college without a degree and no certification or license as universally required. Some employers require a bachelor's degree, so check each platform or school you apply to.` },
    { q: `Do I need a DBS check to tutor online in the UK?`, a: `We found no GOV.UK page that says a private tutor must hold one. Since 21 January 2026 self-employed private tutors in England and Wales can apply for an Enhanced DBS check through an umbrella body if their role qualifies, and NSPCC calls criminal records checks best practice for independent tutors.` },
    { q: `How long does it take to get your first student?`, a: `No official source we read gives a figure. It depends on who you know and how you reach them. In our plan, days 15 to 30 are for finding and teaching the first students.` },
    { q: `How much can a new online tutor earn?`, a: `BLS puts the median pay for tutors at $20.84 an hour in May 2025, across all kinds of tutoring jobs. A new independent tutor earns what their rate and paid hours produce, less unpaid time, fees and tax.` },
    { q: `Can I become an online tutor part time?`, a: `Yes. BLS says most tutors work part time and that schedules vary.` },
    { q: `Does Tutafy find me students?`, a: `No. Tutafy gives you a booking page, a video classroom, reminders, notes and payment records for students you already have. It does not find you students or run checks.` },
  ] },
  { type: 'cta', title: 'Ready for your first student? Start with one link', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not find you students.', button: 'Start free, no credit card', href: '/register' },
]
