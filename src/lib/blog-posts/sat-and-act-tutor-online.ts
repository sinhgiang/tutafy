// T-1243. Article body for /blog/sat-and-act-tutor-online (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1610-tutafy-batch3-10-articles-plan.md, article 8 (calendar day 16 Nov 2026). Main phrases: "sat tutor online" (880 searches a month, difficulty 19) and "act tutor online" (320, difficulty 34).
// Step 0 (31 Oct 2026): the first page of results for "sat tutor online when to hire how to choose" is tutoring-company blogs (K12, Educational Connections, Method Learning, UWorld, an e-learning news site, a freelance site and a GitHub issue page), all telling parents to look for credentials, flexible slots, a free demo, reviews and progress reports.
// They say little about WHEN to hire and almost nothing about the exam itself; one says the answer can be that you should not hire anyone, and one says a tutor without homework gives about the same gain as self-study (a company claim, no study given). None sets the price of a tutor beside the registration fees, the test dates and the free official practice.
// On this site no article is about a school exam for a teenager; the nearest are ielts-speaking-part-2-topics (an exam, for adult learners) and how-to-find-an-online-tutor (the general ten checks).
// Own angle: decide in this order, with the numbers from the official pages: (1) take an official practice test, (2) use the free official practice for a few weeks, (3) hire only if a gap is specific and the date is near enough, and a tutor passes the questions; a timeline built back from the official dates; the honest limits (no official figure for the gain from tutoring; no official tutor price; ACT and SAT pages disagree on a fee and a date).
// Links both ways with how-to-find-an-online-tutor, tutoring-lesson-packages-explained, tutoring-cancellation-policy-and-contracts, schedule-tutoring-lessons-across-time-zones, ielts-speaking-part-2-topics, reading-tutor-for-your-child (T-1242, same day) and how-to-choose-a-tutoring-niche.
//
// Sources, read on 31 Oct 2026; every College Board and ACT page below opened (status 200) and none showed a "last updated" date. The College Board score-range page and the ACT versus SAT page came from search results (the score range is not on the pages we opened).
//   College Board, SAT structure (satsuite.collegeboard.org/sat/whats-on-the-test/structure): Reading and Writing 64 minutes (two 32-minute modules, 54 questions), Math 70 minutes (two 35-minute modules, 44 questions), total 2 hours and 14 minutes, 98 questions, 10-minute break;
//     second module of each section is more or less difficult based on the first. SAT home page: the digital testing application (Bluebook) supports Mac and Windows devices, iPads and school-managed Chromebooks.
//   College Board, SAT test fees (fees-refunds/test-fees, "Fees Through June 2027"): registration $68, late registration $38, change test centre $34, cancel $34 by the change deadline, late cancel $44; additional score reports $15 each, first four free if ordered within 9 days of the test; fee waiver: late registration and unlimited score reports free, one code per lifetime.
//   College Board, SAT dates and deadlines: Oct 3, Nov 7 and Dec 5, 2026; Mar 6, May 1 and Jun 5, 2027; registration deadlines Sep 18, Oct 23, Nov 20, Feb 19, Apr 16, May 21; changes and late deadlines Sep 22, Oct 27, Nov 24, Feb 23, Apr 20, May 25; 11:59 p.m. ET. The dates page says registration is open for all remaining fall 2026 dates while the SAT home page says registration for the November SAT has ended: the dates page text looks stale, so we tell readers to check.
//     Score release: Dec 5 test, scores Dec 18; Mar 6, Mar 19; May 1, May 14; Jun 5, Jun 21; "most scores from weekend tests are released 2 to 4 weeks after test day".
//   College Board, practice (practice/practice-tests and practice/khan-academy): full-length practice tests on Bluebook and downloadable paper (nonadaptive) practice tests; Official Digital SAT Prep on Khan Academy "Best of all, it's free!", three levels (Foundations, Medium, Advanced), Course Challenge to find skills to focus on.
//   College Board, score structure for K-12 educators (search result): total 400 to 1600 = two section scores of 200 to 800.
//   ACT, the ACT (act.org/content/act/en/products-and-services/the-act.html): English 35 minutes, 50 questions; Math 50 minutes, 45 questions; Reading 40 minutes, 36 questions; Science optional 40 minutes, 40 questions; Writing optional 40 minutes, 1 prompt; "the science and writing sections are optional and do not affect your Composite score". Totals are our arithmetic (125 and 165 minutes), not on the page.
//   ACT, fees: ACT $70; Science add-on $5; Writing add-on $25; all three $100; late registration $42; standby $75; change fee $49 on the fees page against $44 in a dates FAQ (we do not give a change fee). ACT, test dates: Sep 19, Oct 17, Dec 12, 2026; Feb 27, Apr 10, Jun 12, Jul 10, 2027; registration deadlines Aug 14, Sep 11, Nov 6, Jan 22, Mar 5, May 7, Jun 4; late deadlines Sep 1, Sep 29, Nov 29, Feb 9, Mar 23, May 25, Jun 22; 11:59 pm Central Time.
//     ACT scores page: online scores usually come sooner than paper; Dec 12 paper Dec 22, online Dec 17; superscore: "you can choose to send either scores from a specific test, or your superscore". ACT test prep page: students with a fee waiver get free access to the Official ACT Self-Paced Course powered by Kaplan; paid options (Kaplan courses, virtual tutoring, guides) are listed; the overview says "we offer free practice tests and quizzes".
//   ACT versus SAT (search result of act.org's own comparison page): composite is the average of English, math and reading, 1 to 36; ACT's own page, so promotional. College Board and ACT concordance (search results of the College Board PDF): a conversion is an estimate, with a standard error of about 2.26 ACT points one way and about 80 SAT points the other.
//   EEF Teaching and Learning Toolkit, one to one tuition and the NSPCC and FTC advice are as read for how-to-find-an-online-tutor on 31 Oct 2026 (about five additional months' progress on average, moderate evidence, mostly school pupils; adult within earshot, contact through the parent; pay by credit card where you can, wire, gift card and crypto are the hardest to get back).
// Not read, so not written: what an SAT or ACT tutor costs (no official survey), how many points a tutor adds (no official figure), any college's score policy or test-optional rule, how any college uses a superscore, whether Bluebook can be screen-shared in every setup, any tutor's or company's claim of average gains, any rating of any company.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: the tutor directory opens once six tutors are ready (src/lib/directory.ts, DIRECTORY_OPENS_AT = 6) and lists none today; "Find me a tutor" is closed on the same rule; a tutor may switch on a 30-minute trial lesson at a price the tutor sets, first lesson only (docs/features/T-1007-standard-trial.md); 0% commission on every plan.
// We did NOT read the tutor table (user data). We read the 24 public tutor pages listed in the sitemap on 31 Oct 2026: none mentions the SAT or ACT. So the article does not claim Tutafy has an SAT or ACT tutor, and the hand-over report to the Chief says no SAT or ACT tutor is known.
// All names, scores and examples are invented and said to be. The photos show people who are not Tutafy users.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const SAT_ACT_TUTOR_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'Take an official practice test before you hire anyone. It gives you a starting score and shows which section holds the gap. The College Board offers full-length practice tests in its Bluebook app, and its Khan Academy practice is free.',
    'Hire a tutor when a gap is specific, the test date is at least a couple of months away and free practice has stopped working. We found no official figure for how many points a tutor adds, so be wary of anyone who gives one.',
    'The digital SAT takes 2 hours and 14 minutes, with 98 questions in four adaptive modules. The ACT\'s three required sections run 125 minutes by our sum, and Science and Writing are optional. Both are on the official pages we read on 31 October 2026.',
    'Registration costs $68 for the SAT and $70 for the ACT, before any tutor. A fee waiver can cover late registration and score reports on the SAT, and gives free ACT prep.',
    'Tutafy is where tutors run their own bookings. Its tutor directory is not open yet and lists no tutors, and none of the 24 public tutor pages we read mentions the SAT or ACT, so this guide works with any platform.',
  ] },
  { type: 'p', text: `Hire an online SAT or ACT tutor when you know your starting score from an official practice test, a gap is specific, there is time to work on it, and free practice has stopped moving the score. Before that, a tutor is a costly way to find out what a free test would tell you. The decision is simpler than the marketing makes it, and most of it can be settled with numbers that the College Board and ACT publish.` },
  { type: 'p', text: `This guide is for students and parents. It sets out the two exams from their official pages, says when a tutor helps and when a free option should come first, builds a timeline back from the real test dates, and lists the questions to ask a tutor. We make Tutafy, a tool tutors use to run their own bookings, so near the end we say what it does and does not do. Figures come from pages read on 31 October 2026. Fees and dates change, so check the current page before you register.` },
  { type: 'image', src: '/blog/inline/sat-work-table', alt: 'An open blank notebook with a yellow pencil beside it on a white desk, with a closed smartphone on the left and a pair of glasses and the corner of a laptop on the right.', caption: 'Illustrative photo, not a Tutafy user. Start with a notebook and a practice test, not a tutor.', credit: 'Photo: JESHOOTS.COM (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:White_work_table_with_notes,_smartphone_and_laptop_(Unsplash).jpg' },
  { type: 'h2', text: 'The two exams in numbers' },
  { type: 'compare', caption: 'The SAT and ACT as shown on their official pages, read 31 Oct 2026. Totals marked "our sum" are our arithmetic.', headers: ['', 'Digital SAT (College Board)', 'ACT (act.org)', 'Where we read it'], rows: [
    ['Sections', 'Reading and Writing; Math', 'English; Math; Reading. Science and Writing are optional.', 'Structure and test pages'],
    ['Questions', '98: 54 Reading and Writing, 44 Math', '131 required (50 + 45 + 36), 40 more with Science; Writing is one prompt', 'Structure and test pages'],
    ['Time', '2 hours 14 minutes, plus a 10-minute break', '125 minutes for the three required sections (our sum), 165 with Science (our sum)', 'Structure and test pages'],
    ['Format', 'Four modules of 32, 32, 35 and 35 minutes; the second in each section is easier or harder depending on the first', 'Sections timed separately: 35, 50 and 40 minutes', 'Structure and test pages'],
    ['Score', 'Total 400 to 1600, two sections of 200 to 800', 'Each test 1 to 36; the Composite averages English, Math and Reading', 'Score pages (search results)'],
    ['Fee', '$68; late registration $38', '$70; Science +$5; Writing +$25; late registration $42', 'Fee pages'],
    ['Taken on', 'The Bluebook app on Mac, Windows, iPad or a school-managed Chromebook', 'Digital or paper, with Science and Writing optional', 'SAT home page, ACT home page'],
  ] },
  { type: 'h3', text: 'What the digital SAT changes for preparation' },
  { type: 'p', text: `The College Board's page says that each section has two modules and that, based on how you do on the first, the second will be more or less difficult. That makes a practice test in the same app worth more than a paper one, because you meet the same screen, timer and tools. The College Board offers full-length practice tests in Bluebook and also paper practice tests, which it describes as nonadaptive, so they do not copy the real test. Ask any tutor which one they use, and why.` },
  { type: 'h3', text: 'What the ACT changes' },
  { type: 'p', text: `ACT's page says its Science and Writing sections are optional and do not affect the Composite score. By our sum from the listed times, that makes the three required sections 125 minutes against 165 with Science. The page does not state those totals, so check them. Whether a college wants the optional sections is each college's own rule, and we did not survey any, so look at the admissions pages of the colleges on your list.` },
  { type: 'h3', text: 'Which one, then?' },
  { type: 'p', text: `Neither exam is easier in general, and ACT's own comparison page is a sales page. The honest method is to take one official practice test of each, under timed conditions, and see which feels better. The College Board and ACT publish a concordance, a table that converts scores between the two. Both treat it as an estimate: a conversion from SAT to ACT carries a standard error of about 2.26 ACT points, and from ACT to SAT about 80 SAT points, as shown in the search result of the College Board's guide. Use a conversion to compare roughly, not to predict.` },
  { type: 'h2', text: 'When to hire a tutor, and when not to' },
  { type: 'p', text: `A tutor does three things that free practice does not: finds why you get a type of question wrong, keeps you at it on a schedule, and gives feedback in real time. Those are worth paying for when they are what is missing. They are not when you have not tried the free option, and a tutor who is paid by the hour has little reason to tell you so. The table gives our view, not an official rule.` },
  { type: 'compare', caption: 'Five situations and what we would try first. Our view, not an official rule.', headers: ['Situation', 'A tutor probably helps?', 'Try first, for free'], rows: [
    ['You have not taken a full practice test', 'Not yet', 'Take one in Bluebook (SAT) or an official ACT practice test, timed. Write the score and the section.'],
    ['You are a few points below your goal and can work alone', 'Maybe not', 'Use the official Khan Academy practice for a few weeks and retest.'],
    ['One section is far behind the others, such as Math at 450 against Reading and Writing at 650', 'Yes, if a skill gap shows in your errors', 'Sort your wrong answers by skill. If most fall in two or three topics, a tutor can target them.'],
    ['You know the content but run out of time or panic', 'Possibly', 'Practise full timed sections for a few weeks. If it does not improve, a tutor can coach pacing.'],
    ['You stall: you study, the score does not move and you do not know why', 'Yes', 'Redo a practice test, then ask a teacher or tutor to read your errors with you.'],
  ] },
  { type: 'p', text: `One more consideration is evidence. We found no official figure for how many points an SAT or ACT tutor adds on average, and the tutoring companies' own pages that give a number do not show a study. What we can say comes from education research in general. The Education Endowment Foundation, a UK charity, rates one to one tuition at about five additional months' progress on average, with evidence it calls moderate, and says the tuition should be linked to what students are learning. That finding is about school pupils, not about test prep, but it supports the same idea: tutoring helps most when it is targeted.` },
  { type: 'h2', text: 'A timeline built back from the real dates' },
  { type: 'p', text: `A tutor needs time to work. Twelve weeks is our rule of thumb for a student who has a specific gap and wants to close it: two weeks of diagnosis and free practice, eight of tutoring and practice, and two of timed full tests. It is not from a study. Take the official dates read on 31 October 2026 and count back from the one you want.` },
  { type: 'compare', caption: 'Upcoming test dates, registration deadlines and score release, from the official pages read 31 Oct 2026. Check them before you register.', headers: ['Test and date', 'Register by', 'Late deadline', 'Scores'], rows: [
    ['SAT, Dec 5, 2026', 'Nov 20', 'Nov 24', 'Dec 18'],
    ['ACT, Dec 12, 2026', 'Nov 6', 'Nov 29', 'Online Dec 17, paper Dec 22'],
    ['ACT, Feb 27, 2027', 'Jan 22', 'Feb 9', 'Paper Mar 16'],
    ['SAT, Mar 6, 2027', 'Feb 19', 'Feb 23', 'Mar 19'],
    ['ACT, Apr 10, 2027', 'Mar 5', 'Mar 23', 'Online Apr 15, paper Apr 20'],
    ['SAT, May 1, 2027', 'Apr 16', 'Apr 20', 'May 14'],
    ['SAT, Jun 5, 2027', 'May 21', 'May 25', 'Jun 21'],
    ['ACT, Jun 12, 2027', 'May 7', 'May 25', 'Online Jun 17, paper Jun 23'],
  ] },
  { type: 'p', text: `Two things to know about the table. The College Board's dates page says registration is open for all the remaining fall 2026 dates, while its home page says registration for the November SAT has ended, so the dates page looks out of date and you should check before you rely on a deadline. And the College Board says most weekend scores come two to four weeks after test day, so a test close to a college deadline leaves no room to retake.` },
  { type: 'p', text: `Work back from the date. For the SAT on 6 March 2027, registration closes 19 February and twelve weeks before the test is about 12 December. That is when to take your starting practice test. If it is already January, aim for the May or June test, and use the time well.` },
  { type: 'image', src: '/blog/inline/sat-living-room-laptop', alt: 'A laptop open on a small round wooden table between two wooden chairs, under a glass pendant lamp in front of tall windows in a warm living room.', caption: 'Illustrative photo, not a Tutafy user. An online lesson needs a quiet place and a device that can run the practice test.', credit: 'Photo: Henry McIntosh (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Laptop_on_a_living_room_table_(Unsplash).jpg' },
  { type: 'h2', text: 'Free official practice to use first' },
  { type: 'p', text: `Both organisations publish practice that costs nothing, and a tutor should build on it, not replace it. For the SAT, the College Board lists full-length practice tests in Bluebook and downloadable paper tests. It also hosts Official Digital SAT Prep on Khan Academy, which it says is free, with practice at three levels, Foundations, Medium and Advanced, and a course challenge that is a short test covering all the skills, to show where to focus. After a Bluebook practice test, a button takes you to Khan Academy practice. We could not confirm how many practice tests there are, so we give no number.` },
  { type: 'p', text: `For the ACT, the official page says it offers free practice tests and quizzes, and lists paid options too, such as Kaplan courses, virtual tutoring and printed guides. Students who register with a fee waiver get free access to the Official ACT Self-Paced Course powered by Kaplan. It is the paid products that carry the sales language, so read the page before you click.` },
  { type: 'p', text: `A reasonable first month is: one timed practice test, a list of errors by skill, three or four weeks of targeted free practice, a second test. If the second score has moved enough, you may not need a tutor. If it has not, you now have what a tutor needs: two scores, a list of errors and a date.` },
  { type: 'h2', text: 'How to choose a tutor: ten questions' },
  { type: 'ul', items: [
    `1. Will you begin with an official diagnostic test? A tutor who starts teaching before measuring is guessing. Ask what test they use, and whether it is the official one.`,
    `2. How do you use my wrong answers? You want an error log sorted by skill, not a general review of the syllabus.`,
    `3. Which exam do you know best? The SAT and ACT differ in pacing and in what is tested. A tutor who knows the digital SAT's adaptive modules is not necessarily strong on ACT Science.`,
    `4. How do you teach timing? Pacing is half the test. Ask how they practise it.`,
    `5. What does a lesson look like? Expect a review of errors, one target skill, timed practice and a home task. Our sketch is in the next section.`,
    `6. How do we run a practice test online? Ask whether the student takes it in Bluebook on their own device while the tutor watches by video, and how the tutor sees the results. Setups differ and we did not check any.`,
    `7. What do you promise? The honest answer is effort and a method, not points. An official guide to your gain does not exist, so treat a promised number as a sales line.`,
    `8. Can we start with a trial lesson? A trial is the cheapest test. Read the cancellation and refund rules, and see our guides to finding an online tutor and to cancellation policies.`,
    `9. How do you handle payment? Pay by credit card where you can, on the platform. The US Federal Trade Commission says anyone who insists on a wire, gift card or crypto is probably a scammer. Our guide to lesson packages lists what to ask before you pay for ten lessons.`,
    `10. How will you keep my child safe? For a student under 18, the NSPCC advises an adult within earshot, a shared space for an online lesson and not a bedroom, and contact through the parent.`,
  ] },
  { type: 'p', text: `A tutor's own score is a claim you cannot check, and a perfect score does not make someone a good teacher. Ask how they teach, not what they scored.` },
  { type: 'h2', text: 'What a good online session looks like' },
  { type: 'p', text: `There is no standard format, so this is our sketch for a 60-minute session, a yardstick you can hold a tutor to. The student does most of the work. The tutor reads the errors, picks the target and gives feedback.` },
  { type: 'compare', caption: 'A 60-minute SAT or ACT session. Our sketch, not an official format.', headers: ['Minutes', 'What happens'], rows: [
    ['0 to 10', 'Go through the last home task. The student explains how they got each wrong answer, the tutor listens for the reason.'],
    ['10 to 30', 'One skill from the error log, taught on three or four examples, the student solving each before the tutor shows a method.'],
    ['30 to 50', 'A timed set of real questions on that skill, from an official source where possible, then a review of each error.'],
    ['50 to 60', 'Tell the student what to practise before next time and book the next lesson. Update the error log.'],
  ] },
  { type: 'p', text: `Three points are specific to learning online. First, practise on the kind of device you will test on. The College Board's home page says Bluebook supports Mac and Windows devices, iPads and school-managed Chromebooks, so ask your school or test centre what you will use and practise there. Second, agree who sees what: if the student takes a practice test on one device, the tutor needs a second window or a shared screen to read the errors. Third, if the tutor lives in another time zone, fix the lesson time in yours and check it when the clocks change.` },
  { type: 'p', text: `Every few weeks, a full timed section or test replaces a lesson. That is how you see whether the score is moving. Over the whole course you want to see the error log shrink, the timing steady and the practice scores climb. If four lessons pass and you cannot name one thing you can now do, say so to the tutor, and change tutor if nothing changes.` },
  { type: 'image', src: '/blog/inline/sat-computer-exam', alt: 'Four students seen from behind at a row of old beige computer monitors in a classroom, working on an exam on screen, with a bulletin board and wooden panelling behind them.', caption: 'Illustrative photo from 2001, not a Tutafy user. Computer exams are no longer new, but taking one is a skill to practise.', credit: 'Photo: Michael Surran (CC BY-SA 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Students_taking_computerized_exam.jpg' },
  { type: 'h2', text: 'What it costs, and fee waivers' },
  { type: 'p', text: `We found no official survey of what an SAT or ACT tutor costs, so we give no price. The sensible sum is yours: the hourly rate, times the lessons you will take in twelve weeks, plus the tests. The registration fees are published. The SAT is $68, with $38 more for late registration. The ACT is $70, plus $5 for Science and $25 for Writing, and $42 more for late registration. Changing the test centre on the SAT is $34. ACT's pages gave two different change fees, $49 and $44, so check the current one.` },
  { type: 'p', text: `If money is tight, ask about a fee waiver before anything else. The College Board's page says a waiver covers late registration and unlimited score reports, and that a code can be redeemed once per lifetime. ACT's page gives students who register with a fee waiver free access to its Official Self-Paced Course. Eligibility rules are on each organisation's fee waiver pages, which we did not read in full, so ask a school counsellor. The cheapest preparation is also the one you can start today.` },
  { type: 'h2', text: 'Warning signs in a tutor or a company' },
  { type: 'ul', items: [
    `A guaranteed score or "average gain" with no study behind it. We found none that is official.`,
    `No diagnostic, or one that ends in a pitch for a large package.`,
    `Lessons that are mostly the tutor talking and solving, while the student watches.`,
    `Only paper materials for the digital SAT, or no timed practice at all.`,
    `A rush: "only this week", "the last slots", or pay for twenty lessons before a trial.`,
    `A request to pay outside the platform, or only by wire, gift card or crypto.`,
  ] },
  { type: 'p', text: `One warning sign is not a verdict. Two or three together are a reason to try someone else.` },
  { type: 'h2', text: 'What Tutafy can and cannot do for you' },
  { type: 'p', text: `Tutafy is a set of tools that tutors use to run their own bookings: a public booking page that shows free hours in the visitor's time zone, a video classroom in the browser, reminders and payment through the tutor's own account. A tutor on Tutafy is an independent person running a small business. Here is what that means for a student or parent.` },
  { type: 'ul', items: [
    `The tutor directory is not open yet. Its page says it opens once six tutors are ready, and today it lists none. "Find me a tutor", which shows the three best fits, is closed on the same rule.`,
    `We read the 24 public tutor pages on 31 October 2026 and none mentions the SAT or ACT, so we do not claim Tutafy has an SAT or ACT tutor. If you know a tutor who uses Tutafy, you can book through that tutor's own link.`,
    `A tutor may offer a 30-minute trial lesson at a price the tutor sets, for a first lesson only. Look for it on the booking page.`,
    `Tutafy does not check qualifications, run background checks, vouch for a tutor or guarantee a score or a refund. The ten questions above are yours to ask of any tutor.`,
    `A tutor on Tutafy keeps the whole lesson fee, because Tutafy takes 0% commission. We do not promise that this makes lessons cheaper.`,
  ] },
  { type: 'p', text: `If you teach test prep and want students to find you, there are two honest routes: a marketplace, which finds students and keeps a share, or your own page with your own students.` },
  { type: 'source', text: 'Official pages used here, read on 31 Oct 2026. The College Board and ACT pages opened in full and none showed a last-updated date. The score range and the concordance error come from the search result of the official page. Read the current page before you decide.', links: [
    { label: 'College Board: the digital SAT, structure', href: 'https://satsuite.collegeboard.org/sat/whats-on-the-test/structure' },
    { label: 'College Board: SAT test fees', href: 'https://satsuite.collegeboard.org/sat/registration/fees-refunds/test-fees' },
    { label: 'College Board: SAT fee waivers', href: 'https://satsuite.collegeboard.org/sat/registration/fee-waivers' },
    { label: 'College Board: SAT dates and deadlines', href: 'https://satsuite.collegeboard.org/sat/dates-deadlines' },
    { label: 'College Board: SAT score release dates', href: 'https://satsuite.collegeboard.org/scores/score-release-dates' },
    { label: 'College Board: SAT practice tests', href: 'https://satsuite.collegeboard.org/practice/practice-tests' },
    { label: 'College Board: Official Digital SAT Prep on Khan Academy', href: 'https://satsuite.collegeboard.org/practice/khan-academy' },
    { label: 'College Board: SAT Suite score structure', href: 'https://satsuite.collegeboard.org/k12-educators/about/understand-scores-benchmarks/score-structure' },
    { label: 'ACT: the ACT test', href: 'https://www.act.org/content/act/en/products-and-services/the-act.html' },
    { label: 'ACT: fees', href: 'https://www.act.org/content/act/en/products-and-services/the-act/registration/fees.html' },
    { label: 'ACT: test dates and deadlines', href: 'https://www.act.org/content/act/en/products-and-services/the-act/registration/test-dates.html' },
    { label: 'ACT: scores', href: 'https://www.act.org/content/act/en/products-and-services/the-act/scores.html' },
    { label: 'ACT: test preparation', href: 'https://www.act.org/content/act/en/products-and-services/the-act/test-preparation.html' },
    { label: 'Education Endowment Foundation: one to one tuition', href: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/one-to-one-tuition' },
    { label: 'NSPCC: finding a tutor for your child', href: 'https://www.nspcc.org.uk/keeping-children-safe/outside-the-home/find-tutor-child/' },
    { label: 'US Federal Trade Commission: a way to spot scams, how someone asks you to pay', href: 'https://consumer.ftc.gov/consumer-alerts/2026/07/way-spot-scams-how-someone-asks-you-pay' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to find a good online tutor', href: '/blog/how-to-find-an-online-tutor', text: 'The ten checks for any subject, in the order you can do them.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'What to ask before you pay for ten lessons in advance.' },
    { label: 'Tutoring cancellation policies and contracts', href: '/blog/tutoring-cancellation-policy-and-contracts', text: 'What a fair cancellation rule contains.' },
    { label: 'How to schedule tutoring lessons across time zones', href: '/blog/schedule-tutoring-lessons-across-time-zones', text: 'Agreeing a weekly slot with a tutor in another time zone.' },
    { label: 'Reading tutor for your child', href: '/blog/reading-tutor-for-your-child', text: 'If reading is the root of the problem, the signs by age and what helps.' },
    { label: 'IELTS Speaking Part 2 topics', href: '/blog/ielts-speaking-part-2-topics', text: 'Another exam, with a practice routine to use in a lesson.' },
    { label: 'How to choose a tutoring niche', href: '/blog/how-to-choose-a-tutoring-niche', text: 'For tutors: how to decide which subject to offer.' },
  ] },
  { type: 'faq', items: [
    { q: 'When should I hire an SAT tutor?', a: `When you have an official practice score, a specific gap, at least a couple of months before the test and free practice that has stopped working. Before that, a tutor mostly finds out what a free practice test would show. We found no official figure for how many points a tutor adds.` },
    { q: 'How long is the digital SAT?', a: `The College Board's page says 2 hours and 14 minutes: 64 minutes for Reading and Writing and 70 minutes for Math, with a 10-minute break. There are 54 and 44 questions, 98 in all, in two modules for each section, and the second module is more or less difficult based on the first.` },
    { q: 'Is the ACT shorter now, and is Science required?', a: `ACT's page lists English at 35 minutes, Math at 50 and Reading at 40, and says Science and Writing are optional and do not affect the Composite. Our sum for the three required sections is 125 minutes. Whether a college wants the optional sections is the college's rule.` },
    { q: 'Should I take the SAT or the ACT?', a: `Take one official practice test of each under timed conditions and see which feels better. The College Board and ACT concordance converts scores only roughly, with a standard error of about 2.26 ACT points or about 80 SAT points depending on the direction.` },
    { q: 'Is there free official SAT or ACT practice?', a: `Yes. The College Board offers full-length practice tests in Bluebook and Official Digital SAT Prep on Khan Academy, which it says is free. ACT says it offers free practice tests and quizzes, and students who register with a fee waiver get free access to its Official Self-Paced Course.` },
    { q: 'Does Tutafy have an SAT or ACT tutor I can book today?', a: `Not through the directory. Its page says the directory opens once six tutors are ready, and today it lists none. None of the 24 public tutor pages we read on 31 October 2026 mentions the SAT or ACT. If you know a tutor who uses Tutafy, you can book through that tutor's own link.` },
  ] },
  { type: 'cta', title: 'Teach test prep? Take bookings on your own page', text: 'If you are a tutor, the Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not find you students yet.', button: 'Start free, no credit card', href: '/register' },
]
