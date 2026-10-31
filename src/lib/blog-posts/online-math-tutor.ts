// T-1237. Article body for /blog/online-math-tutor (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1610-tutafy-batch3-10-articles-plan.md, article 2 (calendar day 13 Nov 2026). Cluster: "math tutor" (27,100 searches a month, difficulty 30) and "math tutor online" (4,400, difficulty 30; OpenSEO, 31 Oct 2026).
// Step 0 (31 Oct 2026): the first page of results for "math tutor" and "online math tutor" is tutoring companies and franchises (Mathnasium, Cuemath, Bhanzu, Varsity-style services), marketplace landing pages, local-service price pages and "how to choose" posts by vendors.
// They all end on the vendor's own service, quote prices that disagree (about 15 to 100 dollars an hour), and say "find a tutor who teaches for understanding" without saying what that looks like in a session or what the research says about how much tutoring a child needs.
// On this site the nearest guide is how-to-find-an-online-tutor (T-1215, ten checks for ANY subject, written 9 Nov 2026) and how-to-write-a-tutor-bio. Neither is about math. This guide does not repeat the ten checks: it is the math-specific layer on top of them.
// Own angle: (1) name the kind of math problem first, because a gap in the basics, a habit of copying steps, math anxiety and exam practice each need a different tutor; (2) what the research does and does not say (EEF, a 2024 meta-analysis, the IES practice guides), with its limits;
// (3) a minute-by-minute picture of a good 45-minute online math session that a parent can check from the next room; (4) the real arithmetic of the dose the research describes at three price points; (5) what Tutafy cannot do: its directory lists no tutors and its built-in classroom has no whiteboard.
// Links both ways with how-to-find-an-online-tutor (the ten checks), tutoring-lesson-packages-explained, online-whiteboard-for-tutoring, tutoring-cancellation-policy-and-contracts, how-to-price-tutoring-lessons and how-to-write-a-tutor-bio.
//
// Sources, read on 31 Oct 2026. Most of these pages answered 403 or were reached only through a search result of the official page (not opened in a browser), so each figure says where it came from.
//   Education Endowment Foundation (UK), Teaching and Learning Toolkit, One to one tuition (search result of the official page): about five additional months' progress on average, evidence security moderate; effects in mathematics appear to be lower (about +2 months) than in literacy (about +6);
//     primary studies +6 months, secondary +4; short regular sessions of about 30 minutes, three to five times a week, over a set period of up to ten weeks seem to have the most impact; tuition should be additional to, and linked with, normal teaching. The evidence is mostly school pupils.
//   Nickow, Oreopoulos and Quan, "The Promise of Tutoring for PreK-12 Learning: A Systematic Review and Meta-Analysis of the Experimental Evidence", American Educational Research Journal 2024 (search result of the Stanford and journal listings): pooled effect 0.288 standard deviations (the 2020 working paper said 0.37), 0.268 for math and 0.290 for literacy;
//     larger when tutors are teachers or paraprofessionals, in earlier grades, at least three days a week and during the school day; math tutoring tends to show larger effects in later grades. A secondary source notes effect sizes fell as programs scaled up.
//   IES What Works Clearinghouse practice guide, Assisting Students Struggling with Mathematics: Intervention in the Elementary Grades (WWC 2021006, search result of the official page): six recommendations, each rated strong evidence: systematic instruction, mathematical language, representations, number lines, word problems, timed activities for fluency.
//     The 2009 guide for elementary and middle schools (Gersten and others, search result): explicit and systematic instruction includes modeling, thinking aloud, guided practice and corrective feedback. These are guides for students who struggle, mostly in school settings.
//   Preply, a post on choosing a trustworthy online math tutor (search result; a vendor page): ask the tutor to teach one concept your child is stuck on and watch whether they go step by step or jump to the answer, and whether they ask questions to find what the student already knows.
//   Price ranges are from vendor blogs (Cuemath, Bhanzu, Mathnasium centre pages, wise.live, myengineeringbuddy; search results): most US math tutoring about 20 to 80 dollars an hour, one guide 15 to 100; online about 10 dollars below in-person in one; online algebra 20 to 50 for college-student tutors and 50 to 90 for certified tutors in one;
//     advanced math (calculus, AP) 50 to 80 and more; SAT and ACT math 40 to 150 in one. The numbers disagree and the sellers sell tutoring, so we give them as a rough field, not a price list.
//   Khan Academy: its own blog describes its AI tutor Khanmigo at 4 dollars a month; third-party pages say its core lessons and practice stay free. We did not open Khan Academy's pricing page.
// Not read, so not written: any price for a named tutor, any score gain promised by any company, how many students a tutor can serve online at once, any figure for adults returning to math, UK, Australian or Indian prices.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: tutafy.com/tutors says "The tutor directory opens soon" and lists no tutors (src/lib/directory.ts, six tutors needed); we could not read the live tutor table, so we do not say whether any tutor on Tutafy teaches math;
// Tutafy's built-in classroom has no whiteboard (online-whiteboard-for-tutoring, read from the code); a tutor may switch on a 30-minute trial lesson at a price the tutor sets, for a first lesson only (docs/features/T-1007-standard-trial.md); 0% commission; Free plan 10 students, Pro $12 a month, Academy $29.
// All names and examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const ONLINE_MATH_TUTOR_CONTENT: PostBlock[] = [
  { type: 'p', text: `Choose an online math tutor by the problem first and the person second. A child who has lost the basics, a student who copies steps without knowing why, a learner who freezes before a test and a teenager preparing for one exam each need a different tutor. Then test the person with one lesson in which the student does most of the work. Most US online math tutoring is quoted at about $20 to $80 an hour, but the sources we found disagree, and the sellers sell tutoring.` },
  { type: 'p', text: `This guide is the math layer on top of our general guide to finding an online tutor. It covers what the research does and does not say, what a good 45-minute session looks like when you listen from the next room, what the dose the research describes would cost at three prices, and what to do when you cannot or do not want to pay for it. Evidence and prices were read on 31 October 2026, and we say where each figure came from, because several pages answered 403 to our script and came to us through search results.` },
  { type: 'takeaways', items: [
    `Name the problem first: gaps in the basics, procedures without understanding, anxiety, or exam practice.`,
    `The research on tutoring is real but modest for math: about two additional months in one UK review, with 30-minute sessions three to five times a week working best.`,
    `A good session has the student writing and speaking for most of it, and ends with a next step.`,
    `The research dose costs roughly $300 to $1,200 over ten weeks at $20 to $80 an hour. Free practice and school tutoring come first for many families.`,
  ] },
  { type: 'h2', text: 'First, name the problem' },
  { type: 'p', text: `"My child is bad at math" is not something a tutor can aim at. These five patterns are, and they lead to different choices. The table is our own sorting from how tutors describe their work, not a clinical one, and a child may show two at once.` },
  { type: 'compare', caption: 'Five common math problems and what to ask a tutor for. Our sorting, not a diagnosis.', headers: ['What you see', 'What it often is', 'What to ask for'], rows: [
    ['Slow, counts on fingers, wrong answers on simple sums', 'A gap in the basics from earlier years', 'A tutor who starts below the grade level and rebuilds in order'],
    ['Right steps on a worked example, lost on a new one', 'Procedures learned without the idea behind them', 'A tutor who asks "why" and uses pictures, number lines and different examples'],
    ['Tears, avoidance, "I hate math" before a page is opened', 'Anxiety or a bad history with the subject', 'A patient tutor, small wins early, short sessions, no timed pressure at first'],
    ['Cannot start word problems', 'Reading the problem, not the arithmetic', 'A tutor who teaches how to pull a problem apart, step by step'],
    ['A named exam in three months (SAT, GCSE, AP, an entrance test)', 'An exam-shaped task with a date', 'A tutor who has taught that exam, with past papers and a weekly plan'],
  ] },
  { type: 'p', text: `Write one sentence for the problem and one for the target: "He loses marks on fractions and word problems, and we want him comfortable at grade level by the March exam." You will use it when you read a profile, when you message a tutor and when you review progress after a month.` },
  { type: 'h2', text: 'What the research says, and what it does not' },
  { type: 'p', text: `Tutoring is one of the better-supported things in education research, and math is where the claims are most often stretched. These are the sources we read, with their limits.` },
  { type: 'ul', items: [
    `The Education Endowment Foundation, a UK charity that reviews education research, rates one to one tuition at about five additional months' progress on average, with moderate evidence. Effects in math appear to be lower, about two months, than in literacy, about six. It reports short regular sessions of about 30 minutes, three to five times a week, over up to ten weeks, as seeming to work best, and says tuition should be additional to and linked with normal teaching.`,
    `A 2024 meta-analysis of tutoring experiments for pupils from pre-school to high school, by Nickow, Oreopoulos and Quan, found an average effect of 0.288 standard deviations, 0.268 for math and 0.290 for reading. Effects were larger when the tutors were teachers or paraprofessionals, for younger pupils, at least three days a week and during the school day. A secondary summary notes that effects shrank as programs grew larger.`,
    `The US Institute of Education Sciences, in a practice guide for students who struggle in the elementary grades, lists six recommendations rated strong: systematic instruction, mathematical language, representations, number lines, word problems and timed activities for fluency. Its older guide describes explicit instruction as modeling, thinking aloud, guided practice and corrective feedback.`,
  ] },
  { type: 'p', text: `Read what these do not say. Most are studies of school programs run by trained staff in small groups, not a stranger you meet on a platform for an hour a week. The effect for math is smaller than for reading in one review and similar in another. And none says that more hours always help: both point to frequency and structure. The practical reading is that a regular short session with a structured routine beats an occasional long one, and that how a tutor teaches matters more than the label on their profile.` },
  { type: 'image', src: '/blog/inline/math-notebook-pages', alt: 'Two open pages of a spiral notebook covered in handwritten calculus notes on Fourier series, with an envelope marked Final Exam May 17, 1973 in the corner.', caption: 'Illustrative photo, a real student notebook from a 1973 university course. Notes like these are your evidence of what a session covered.', credit: 'Photo: Jonathan Schilling (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Cornell_University_notebook_and_exam_pages_for_Math_221,_Spring_1973.jpg' },
  { type: 'h2', text: 'What a good online math session looks like' },
  { type: 'p', text: `You can check a session without knowing the math. Sit in the next room, or watch the first lesson, with the shape below in mind. The timings are ours, for a 45-minute lesson. They are a pattern to look for, not a rule, and a good tutor will adjust it.` },
  { type: 'compare', caption: 'A 45-minute session, minute by minute. Our pattern, drawn from the guides above.', headers: ['Minutes', 'What happens', 'What you should see'], rows: [
    ['0 to 5', 'Check-in: what was hard this week, one homework question', 'The tutor asks, and the student answers in their own words'],
    ['5 to 15', 'The student tries a problem and says what they are thinking', 'The student talks and writes. The tutor listens and asks short questions'],
    ['15 to 30', 'The tutor teaches the missing idea with a worked example, then a similar one together', 'The tutor thinks aloud, uses a picture or number line, then hands the pen over'],
    ['30 to 40', 'The student solves two or three alone while the tutor watches', 'Silence, then a corrected mistake explained, not only fixed'],
    ['40 to 45', 'Recap in the student\'s words, a next step and a short practice set', 'A named task for next time, written down'],
  ] },
  { type: 'p', text: `The pattern follows what the IES guides describe: the tutor models the thinking, practices it with the student, then lets the student try alone while correcting mistakes. A common failure is a tutor who does the problems while the student watches. That feels productive, because the answers are right, and it teaches little. Count who is writing: after the first fifteen minutes the student should be doing most of it.` },
  { type: 'h3', text: 'Three things to listen for' },
  { type: 'ul', items: [
    `Questions that find what the student already knows. Preply's own guide for parents says to ask a tutor to teach one concept your child is stuck on and see whether they go step by step or jump to the answer, and whether they ask questions first. We would add: whether they ask the student to explain.`,
    `Mistakes treated as information. "Show me what you did here" teaches more than "no, it is seven".`,
    `Language used with care. The IES guide for the elementary grades includes clear and concise mathematical language and asking students to use it to explain their thinking, so a tutor who says "the denominator tells you how many equal parts" and gets the student to say it back is doing what it describes.`,
  ] },
  { type: 'h2', text: 'What is different online' },
  { type: 'p', text: `Math is written, and a video call by default shows faces and not writing. The most common online problem is that the tutor writes and the student watches. Before you book, ask how the two of you will write together.` },
  { type: 'ul', items: [
    `A shared writing space where both can write, such as a whiteboard in the video tool, a free whiteboard site or a shared document. Our guide to online whiteboards compares free ones, with their limits.`,
    `A tablet and stylus on the tutor's side, or a pen and paper under a second camera, so the tutor can write by hand. Typed equations are slower and some students find them harder to follow.`,
    `Something for the student to write on and show. For younger children, paper held to the camera works. For older ones, a shared board is better because the tutor can see the work as it appears.`,
    `A saved copy of the board or a photo of it at the end, so the student can use it for practice. If the tool cannot save, ask the tutor to photograph it.`,
  ] },
  { type: 'p', text: `Ask for these in the trial lesson and watch whether they work. A tutor who spends ten minutes fighting the tool is not a bad tutor, but ten minutes of a 45-minute lesson is a fifth of what you paid for.` },
  { type: 'image', src: '/blog/inline/math-tutor-whiteboard', alt: 'A person seen from behind writing the word MATHEMATICS on a whiteboard with a labelled triangle, a parabola and the quadratic formula drawn beside it.', caption: 'Illustrative photo, not a Tutafy tutor. Online, the shared writing space has to do the job of this board.', credit: 'Photo: Preply.com Images (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Maths_Tutor.jpg' },
  { type: 'h2', text: 'How to choose: seven questions to ask' },
  { type: 'p', text: `Our general guide has ten checks that apply to any subject: the full price, a time you can keep, the refund rules, how you pay and safety. Do those too. These seven are the math ones, and a message to two or three tutors before booking will answer most of them.` },
  { type: 'ul', items: [
    `"Which levels and exams do you teach?" "Math" covers counting and calculus. Look for your grade, curriculum or exam named, such as Common Core, GCSE, IB, AP, SAT or ACT, and a tutor who says what they do not teach.`,
    `"How do you find out where my child is?" A good answer is a short diagnostic or a few problems done together in the first lesson. A weak answer is "I follow the textbook".`,
    `"How do you work with a student who says they hate math?" There is no single right answer. You are listening for patience, a plan and no blame.`,
    `"What does a session look like?" Compare the answer with the table above.`,
    `"How will I know it is working?" Look for a measure tied to your sentence: a quiz score, a past paper, fewer mistakes on one topic. "You will see an improvement" is not a measure.`,
    `"How do you keep me informed?" A short note after each lesson, or a message every few weeks. Our parent communication guide has examples of what a useful one says.`,
    `"What happens if we want to stop?" Check how a cancellation, a package and a refund work before you pay.`,
  ] },
  { type: 'p', text: `Then ask for a trial lesson and give the tutor one real task, the topic your child is stuck on. Watch for the five signs in the table, and for whether the tutor leaves the student with a next step. If you are not sure, try your second choice. The cost of one more trial is small against months with the wrong match.` },
  { type: 'h2', text: 'What an online math tutor costs' },
  { type: 'p', text: `Prices are the part of this topic where the web is least reliable. The pages that rank are mostly vendors of tutoring, and their numbers disagree. Here is the field we found, with each figure's limits.` },
  { type: 'compare', caption: 'US prices per hour from vendor blogs read 31 Oct 2026 (search results). Rough ranges, not a price list. Local and tutor-set prices differ.', headers: ['Kind of help', 'Range quoted', 'Note'], rows: [
    ['Most math tutoring', 'About $20 to $80 an hour', 'One guide says $25 to $80, another $15 to $100'],
    ['Online against in person', 'About $10 an hour lower online', 'One source only'],
    ['Online algebra', '$20 to $50 (college-student tutors); $50 to $90 (certified tutors)', 'One guide, a national median of $50'],
    ['Advanced math, calculus, AP', '$50 to $80 and more', 'Parent guides'],
    ['SAT and ACT math', '$40 to $150', 'One source; usually exam-prep specialists'],
  ] },
  { type: 'p', text: `What drives the price is who the tutor is (a college student, a teacher, a specialist), what they teach, whether a company stands between you and them, and whether you buy by the hour, in a package or on a monthly plan. Our guide to lesson packages lists the terms to ask about: expiry, refunds, what happens to unused lessons. A package is a good idea only after a trial has gone well.` },
  { type: 'h3', text: 'The dose the research describes, in dollars' },
  { type: 'p', text: `The EEF figure of about 30 minutes, three to five times a week, for up to ten weeks is 30 sessions at three a week, which is 15 hours. Here is what 15 hours costs at three hourly prices, and what one hour a week for ten weeks costs. The prices are examples from the range above, not quotes.` },
  { type: 'compare', caption: 'Total cost over ten weeks. Our arithmetic on example prices.', headers: ['Plan', 'At $20 an hour', 'At $50 an hour', 'At $80 an hour'], rows: [
    ['1 hour a week, 10 weeks (10 hours)', '$200', '$500', '$800'],
    ['3 half-hour sessions a week, 10 weeks (15 hours)', '$300', '$750', '$1,200'],
  ] },
  { type: 'p', text: `Two cautions. The EEF dose describes school programs, not private lessons, so we are not saying a child needs it. And the cheapest row may buy more than the dearest one: a $20 student tutor who runs the pattern above can beat an $80 specialist who talks for the hour. Price tells you about the seller, not the teaching.` },
  { type: 'image', src: '/blog/inline/math-precise-drawing', alt: 'A hand holding a short ruler flat against a blank page of a spiral notebook, with a pen held above it.', caption: 'Illustrative photo, not a Tutafy user. A page both of you write on beats a screen of finished slides.', credit: 'Photo: Tamarcus Brown (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Precise_drawing_(Unsplash).jpg' },
  { type: 'h2', text: 'How many lessons, and when to stop' },
  { type: 'p', text: `Start with four lessons and no package. After four, look at the sentence you wrote. Can the student do a little more of it than a month ago? Use the notebook: it should show topics covered, mistakes corrected and a practice set each time. If you can point to two or three things, continue. If not, tell the tutor what you expected and ask what will change in the next two lessons.` },
  { type: 'p', text: `Plan the end at the start. A tutor who is doing the job well is working toward not being needed. Ask what the student should be able to do alone by when, and when to reduce from weekly to every two weeks. A student who needs a tutor every week for years is either studying something harder each year, which is fine, or leaning on the tutor, which is not.` },
  { type: 'h2', text: 'Free and cheaper help to try first, or alongside' },
  { type: 'ul', items: [
    `The school. Ask the math teacher what the child is missing, and whether the school offers tutoring or an intervention group. The research in this guide is mostly about school programs, and in the Nickow review effects were larger during the school day.`,
    `Free practice. Khan Academy's core lessons and practice are free, according to third-party pages, and Khan Academy's own blog describes its AI tutor, Khanmigo, at about $4 a month. We did not open its pricing page, so check it. Practice tools suit fluency and practice, but they do not notice when your child is confused in the way a person can.`,
    `A group class or a study partner for older students. Groups cost less per head. EEF found mixed evidence on one to one against groups of two or three.`,
    `A tutor for a short, defined job: four lessons on fractions before a test, rather than open-ended weekly lessons.`,
  ] },
  { type: 'h2', text: 'Warning signs' },
  { type: 'ul', items: [
    `A promised grade or score by a date, with no plan for how.`,
    `A tutor who does all the writing, or a lesson that is mostly homework answers.`,
    `No diagnostic, no notes and no next step after three lessons.`,
    `Pressure to buy a package before a trial, or a request to pay by gift card, wire or crypto. Pay by card on the platform where you found the tutor.`,
    `For a child, contact outside lessons through the child and not the parent, or objection to an adult nearby. Our find-a-tutor guide lists what the NSPCC advises.`,
  ] },
  { type: 'h2', text: 'If you teach math' },
  { type: 'p', text: `The same pages are your checklist. A profile that says "I diagnose in the first lesson, the student writes most of it and I send a note after every session" is more convincing than "friendly, experienced and patient". Say the exam and level you teach, show a sample of the note you send, and offer a short trial. Our guides on writing a bio and on pricing lessons have examples.` },
  { type: 'h2', text: 'What Tutafy can and cannot do for you' },
  { type: 'p', text: `Tutafy is a set of tools that tutors use to run their own bookings. It is not a marketplace, and we would rather say what that means than let you assume.` },
  { type: 'ul', items: [
    `The tutor directory is not open yet. Its page says it opens once six tutors are ready, and today it lists none, so we cannot point you to a math tutor on Tutafy. We could not read the live list of tutors and do not say whether any teaches math.`,
    `If a tutor you already know uses Tutafy, you can book through that tutor's link, which shows free hours in your time zone. A tutor may switch on a 30-minute trial lesson at a price the tutor sets, for a first lesson only.`,
    `Tutafy's built-in classroom has video, audio, screen sharing and chat, and no whiteboard. A math tutor on Tutafy shares a screen from a whiteboard tool or uses a Zoom or Google Meet link. Ask before the trial how you will write together.`,
    `Tutafy does not check qualifications, run background checks or guarantee results. The checks in this guide and our general one are yours to make on any tutor.`,
  ] },
  { type: 'source', text: 'Pages used here, read on 31 Oct 2026. Several answered 403 or 404 to our script, so their figures come from the search result of the official page, not the page opened in a browser. The price pages are vendors who sell tutoring. Read the current page before you decide.', links: [
    { label: 'Education Endowment Foundation: one to one tuition', href: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/one-to-one-tuition' },
    { label: 'Nickow, Oreopoulos and Quan: The Promise of Tutoring for PreK-12 Learning (AERJ 2024)', href: 'https://journals.sagepub.com/doi/10.3102/00028312231208687' },
    { label: 'IES What Works Clearinghouse: Assisting Students Struggling with Mathematics, Intervention in the Elementary Grades', href: 'https://ies.ed.gov/ncee/WWC/Docs/PracticeGuide/WWC2021006-Math-PG.pdf' },
    { label: 'Preply: how to choose a trustworthy online math tutor', href: 'https://preply.com/en/blog/choose-trustworthy-online-math-tutor/' },
    { label: 'Cuemath: how much does online math tutoring cost in the US', href: 'https://www.cuemath.com/blog/online-math-tutoring-cost/' },
    { label: 'Bhanzu: private math tutor rates', href: 'https://bhanzu.com/parents/private-math-tutor-rates' },
    { label: 'Mathnasium: how much does math tutoring cost', href: 'https://www.mathnasium.com/math-centers/johnscreek/news/math-tutoring-cost' },
    { label: 'Khan Academy blog: tutoring cost', href: 'https://blog.khanacademy.org/tag/tutoring-cost/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to find a good online tutor', href: '/blog/how-to-find-an-online-tutor', text: 'The ten checks that apply to any subject, including price, refunds and safety.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'Expiry, refunds and the terms to ask about before you buy ten lessons.' },
    { label: 'Online whiteboard for tutoring', href: '/blog/online-whiteboard-for-tutoring', text: 'Free whiteboards compared, with their limits, for writing math together.' },
    { label: 'Tutoring cancellation policies and contracts', href: '/blog/tutoring-cancellation-policy-and-contracts', text: 'What a fair cancellation rule contains.' },
    { label: 'Parent communication and the parent portal', href: '/blog/parent-communication-and-parent-portal', text: 'What a useful progress note says, from the tutor\'s side.' },
    { label: 'How to price tutoring lessons', href: '/blog/how-to-price-tutoring-lessons', text: 'For tutors: how a rate is built, with the sums.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'What a profile should say, for tutors.' },
  ] },
  { type: 'faq', items: [
    { q: 'How much does an online math tutor cost?', a: `Most US sources quote about $20 to $80 an hour, with some at $15 to $100. Online is about $10 an hour below in-person in one source, algebra with a college-student tutor $20 to $50 and with a certified tutor $50 to $90, and SAT or ACT math up to $150. The sources are vendors and disagree. Read 31 Oct 2026.` },
    { q: 'How do I choose a math tutor?', a: `Name the problem first (gaps, procedures without understanding, anxiety, word problems or an exam). Then ask which levels and exams they teach, how they find where the student is, and what a session looks like. Test with a trial lesson on one real topic, and watch who does the writing.` },
    { q: 'How often should a child see a math tutor?', a: `The Education Endowment Foundation reports that short regular sessions of about 30 minutes, three to five times a week, for up to ten weeks seem to have the most impact in school programs. For private lessons, most families start with one session a week and review after four lessons.` },
    { q: 'Does online math tutoring work?', a: `Tutoring has good evidence overall. A 2024 meta-analysis found 0.288 standard deviations on average and 0.268 for math, mostly from school programs. Effects in math look smaller than in reading in one UK review. It depends on how the tutor teaches and how often, not on the medium.` },
    { q: 'What should a first online math lesson look like?', a: `The tutor finds out where the student is with a few problems, teaches one missing idea with a worked example, lets the student try alone, explains mistakes and ends with a written next step. The student should be writing and speaking for most of it.` },
    { q: 'Do I need a whiteboard for online math tutoring?', a: `You need some shared place to write, because math is written. It can be a whiteboard in the video tool, a free whiteboard site, a shared document or paper held to a camera. Ask how you will write together before the trial.` },
    { q: 'Does Tutafy have math tutors I can book?', a: `Not through the directory. Its page says the directory opens once six tutors are ready, and today it lists none. If you know a tutor who uses Tutafy, book through that tutor's own link. Tutafy's built-in classroom has no whiteboard, and it does not vet tutors or guarantee results.` },
  ] },
  { type: 'cta', title: 'Teach math? Take bookings on your own page', text: 'If you are a tutor, the Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not find you students yet.', button: 'Start free, no credit card', href: '/register' },
]
