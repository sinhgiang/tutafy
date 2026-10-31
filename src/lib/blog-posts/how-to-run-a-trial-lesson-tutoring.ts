// T-1217. Article body for /blog/how-to-run-a-trial-lesson-tutoring (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, article 6 (day 10 Nov 2026); owner approved in W-3852. Main phrase: "trial lesson tutoring".
// Step 0 (31 Oct 2026). The search results for "how to run a trial lesson tutoring turn into regular students" are almost all platform help pages for their own tutors (Tutopiya, Preply, italki, Tutorful, TutorGo,
// Cafetalk, ClassDojo, Abridge Academy) and student-side FAQs; none is a complete script for an independent tutor, and none gives follow-up wording.
// Overlap on this site: get-your-first-tutoring-clients and how-to-price-tutoring-lessons have a short "free trial or paid trial?" section (a principle: keep it short, make it a real lesson), and how-to-teach-english-online
// has "Step 5: run a trial lesson that converts" (a paragraph for English tutors). how-to-retain-tutoring-students starts AFTER the student has booked. Not a rewrite of any: this post is the trial lesson itself, minute by
// minute, with the message before, the close, the message after, the objections and a way to count your own results. Its own angle: what the platforms' help pages tell their tutors to do (and where two Preply pages disagree),
// turned into a script an independent tutor can run. Links both ways with the platform-comparison post of the same day (T-1216, preply-vs-italki-vs-wyzant-for-tutors).
//
// EVERY platform statement was read on 31 Oct 2026; the help pages answered 403 to a script, so each comes from the search result of that official page (said in the source note):
//   Preply "What can I expect from my trial lesson" and "How to book a trial lesson": a trial includes introductions, a talk about goals, a short level check, a sample activity and a suggested learning plan.
//   Preply tutor guidance (how to become a successful tutor): a six-part breakdown (greeting, introductions, an evaluation test, presenting the plan, converting the trial into a package); message the student about 15 minutes before;
//     an evaluation test of no more than 15 to 20 minutes; explain the result and highlight strengths; be upfront about how many lessons you think the student needs and suggest a package; schedule the next lesson before the
//     student leaves ("students retain 5 times more if they have their next lesson planned in advance", Preply's own data, not checkable here); if time is left do not end early, start the next lesson and give homework.
//   Preply commission model page: the trial lesson is 100% commission and it recommends spending no more than 10 minutes actually teaching, the main tasks being to understand level and goals, outline a basic study plan and agree a routine.
//     Preply "How to retain students" says tutors should teach in the first lesson because students expect value. The two pages differ, and the post says so.
//   Preply Super Tutor material: a goal that at least 50% of a Super Tutor's trial students subscribe, and that starting on time raises conversion. It is a goal for a status, not an average; no platform average was found.
//   italki "How do I gain loyal students from the first lesson", trial class settings and "Why didn't my student book another lesson": message before the lesson to ask about goals and level; a short message after booking that thanks the
//     student, asks objectives, past experience and preferred lesson style, and agrees a backup video platform; a trial agenda with a demonstration of a regular class and a final summary with next steps; word the trial as "what a class with me
//     is like", not a level assessment; common reasons students leave are no preparation, no customisation, lateness and rescheduling; discounted packages as a reason to continue; many students do not answer pre-lesson questions.
//   italki trial lessons: lowest price $5 in italki Credits, no free trial, 0% commission, a student has 3 trial chances with 3 different teachers (marketplace-rates.ts and the article "What are trial lessons").
//   Wyzant "May I give a free first lesson or meeting with a student?": it is up to the tutor; a card must still be on file; to keep it free do not submit the lesson. Student pages: the first hour is covered by its Good Fit guarantee.
//   Tutopiya tutor knowledge base (a tutoring company's own help for its tutors): offer two or three time slots so booking the first regular class is easy; keep availability current.
// Not read, so not written: any average trial-to-regular conversion rate, any survey of why students do not continue, the number of lessons a typical student needs, what any school or parent group expects.
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/lib/trial.ts and docs/features/T-1007-standard-trial.md (a trial lesson is always 30 minutes, for a first lesson only, switched on in Settings at a price above zero),
// src/lib/plans.ts (Free $0 for up to 10 students, Pro $12/mo with packages, Academy $29/mo), the lesson page (lesson notes and homework fields, student homework submissions), the Messages page; `grep` for follow-up/rebook in src found no automatic message after a trial.
// All names, prices and messages in the examples are invented and say so. No real email address or phone number is used.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const TRIAL_LESSON_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'A trial lesson has three jobs: show the student you can help, learn what they want and agree the next step before the call ends. The teaching is the smallest part of the job.',
    'Platform help pages give tutors a similar shape: a message before, a short level check, a plan, and a next lesson booked in the call. Preply\'s own pages disagree on how much to teach, from 10 minutes to "teach from the start".',
    'Most trials that fail are lost in the last five minutes or the 24 hours after, not in the middle. Close with a plan, a number of lessons and two or three real times.',
    'We found no published average for how many trials turn into regular students, so we give no benchmark. Count your own, with the simple log in this guide.',
    'Tutafy runs a 30-minute trial for a first lesson only, at a price you set. It does not send the follow-up for you or measure conversion, so the messages in this guide are yours to send.',
  ] },
  { type: 'p', text: `A trial lesson is the one hour in a tutor's week that decides whether the other hours exist. A student who has never met you decides in thirty minutes whether you are the person who will help, and most of what you do in those minutes is not teaching. This guide sets out a complete way to run one, from the message the day before to the message the day after, with wording you can adapt. We read what Preply, italki, Wyzant and a tutoring company tell their own tutors about trials on 31 October 2026, and say where those pages disagree. We make Tutafy, a tool for tutors who run their own business, and near the end we say what it does and does not do for a trial.` },
  { type: 'image', src: '/blog/inline/trial-stopwatch', alt: 'The dial of an old stopwatch with a black second hand, numbers from 5 to 60 and the Russian words for made in the USSR.', caption: 'Illustrative photo. A thirty-minute trial is short, and a clock on the dial helps.', credit: 'Photo: Liilia Moroz (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Stopwatch_made_in_USSR.jpg' },
  { type: 'h2', text: 'What a trial lesson has to do' },
  { type: 'p', text: `Whatever its price or length, a trial has three jobs, and a trial that does two of them often fails.` },
  { type: 'ul', items: [
    `Show that you can help. The student leaves with one thing they did not have before: a corrected habit, a method that worked on a real problem, a sentence they can now say.`,
    `Learn what they want. Their goal, their deadline, what they have already tried and how they like to learn. You cannot propose a plan without it.`,
    `Agree the next step. Not "let me know", but a specific lesson at a specific time, or a decision to stop.`,
  ] },
  { type: 'p', text: `Notice that none of these is "teach as much as you can". Preply's commission page tells tutors to spend no more than 10 minutes actually teaching in a trial, with the main tasks being to understand the student's level and goals, outline a basic study plan and agree a routine. Its guidance on retaining students says the opposite emphasis: tutors should teach in the first lesson, because students expect value from it. Both can be right if you teach one thing well. That is the approach this guide takes: one clear win, inside a lesson that is mostly about the student.` },
  { type: 'h2', text: 'Free, discounted or full price: decide before you book anyone' },
  { type: 'p', text: `The price of a trial changes who books it, so decide it before you promote it. The platforms already differ, and the differences tell you what each choice costs.` },
  { type: 'compare', caption: 'What each platform\'s pages said about a first lesson on 31 Oct 2026, and the choice on your own link. "Not confirmed" means we could not read it.', headers: ['Where', 'First lesson rule', 'What it means for you'], rows: [
    ['Preply', 'The student\'s first lesson with you is a trial, and Preply keeps 100% of it. Trial hours still count toward your teaching hours.', 'You earn nothing from the trial, so converting it is the only way it pays.'],
    ['italki', 'Trial lessons carry 0% commission. The lowest price you can set is $5 in italki Credits, so a free trial is not allowed. A student has 3 trial chances, each with a different teacher.', 'You are paid, but the student can try three teachers, so expect them to compare.'],
    ['Wyzant', 'You decide whether to offer a free first lesson. A card must still be on file. To keep it free you do not submit the lesson. Its student pages cover the first hour with a Good Fit guarantee.', 'The choice is yours, and so is the risk of unpaid time.'],
    ['Your own link', 'You choose: free, discounted or full price. On Tutafy the trial lesson is always 30 minutes, for a first lesson only, and you set a price above zero.', 'You keep what the student pays. You also bring the student.'],
  ] },
  { type: 'p', text: `A free trial lowers the barrier and attracts people who were never going to pay. A full-price trial filters for students who are serious but asks more of a stranger. A short paid or discounted first lesson sits between them, and our guide to your first ten clients calls a discounted first paid lesson the sweet spot. Whatever you choose, say it on the booking page in one line: how long it is, what it costs and what happens at the end.` },
  { type: 'callout', variant: 'info', title: 'Start on time', text: 'Preply\'s Super Tutor material says that starting on time raises conversion. Punctuality costs nothing, even on a trial a platform keeps.' },
  { type: 'h2', text: 'Before the lesson: the message and the plan' },
  { type: 'p', text: `Good trials start the day before. italki's help pages say teachers who message the student before the first lesson to ask about their goals and level stand out, and that students tend to rebook with teachers who arrive already understanding their needs. Their suggested follow-up after a booking has three parts: thank the student, ask about objectives, past experience and preferred lesson style, and agree a backup video platform in case the call fails. Preply's tutor guidance adds a short reminder about 15 minutes before the call.` },
  { type: 'p', text: `Here is a message you can adapt. The name and details are invented.` },
  { type: 'callout', variant: 'tip', title: 'Template: after the booking', text: '"Hi Maya, thank you for booking a trial on Thursday at 6:00 pm. To make the half hour useful, could you tell me three things: what you want to be able to do in four months, what you have tried already, and how you like to learn (talking, writing, practice problems)? If our video link fails, we will switch to a call on [backup tool]. See you Thursday."' },
  { type: 'p', text: `Many students will not reply. Teachers commenting on italki's help pages say so, and some suggest declining a request when key information is missing. We would not decline a student for silence. Use the first five minutes of the trial to ask the same questions, and send nothing more than a reminder.` },
  { type: 'h3', text: 'Prepare a one-page plan, not a lesson' },
  { type: 'p', text: `Because you will not know the student's level, prepare three things instead of a full lesson. First, a short check of 10 to 15 minutes at most; Preply's guidance says its evaluation test should not run beyond 15 to 20 minutes. Second, two or three example tasks at different levels, so you can start at the right one. Third, a sketch of what a first month with you would look like for each likely goal. You will fill the sketch in during the call.` },
  { type: 'image', src: '/blog/inline/trial-student-home', alt: 'A woman with long curly dark hair sits at a white desk with an open laptop, a notebook, a phone, a croissant and a glass of orange juice, holding an open book and looking away.', caption: 'Illustrative photo, not a Tutafy user. Ask the student to join from a quiet place with a notebook.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Young_woman_studying_at_home_with_a_laptop_and_breakfast_on_the_table.jpg' },
  { type: 'h2', text: 'The lesson, minute by minute' },
  { type: 'p', text: `Preply's tutor guidance describes the trial as a sequence: greeting, introductions, an evaluation test, presenting the lesson plan and converting the trial into a package. italki's trial class settings let a teacher share an agenda in advance that includes a demonstration of what a regular class is like and a closing summary with next steps. Put together, and fitted to 30 minutes, they look like this.` },
  { type: 'compare', caption: 'A 30-minute trial. Move the times if your trial is 45 or 60 minutes, and keep the order.', headers: ['Minutes', 'What you do', 'What you say, roughly'], rows: [
    ['0 to 3', 'Start on time. Greet the student and check the sound and screen. A little small talk.', '"Can you hear me clearly? Good. Today is half an hour: I will ask a few questions, we will try one real task, and in the last five minutes we decide what comes next."'],
    ['3 to 8', 'Learn the goal. Ask the questions you sent. Listen. Write down their words.', '"What would success look like by the end of the year? What is the hardest part right now?"'],
    ['8 to 15', 'A short level check, using a real task from their goal, not a test.', '"Let us try one together. I will not mark it, I want to see how you think."'],
    ['15 to 24', 'Teach one thing that fixes the biggest problem you saw. Let them try it twice.', '"The pattern I notice is... here is a method. Now you try, and I will step back."'],
    ['24 to 30', 'Close. Say where they are, what the plan is, how many lessons it might take, and offer times.', '"Here is where you are. Here is what we would work on. I would expect about [n] lessons for this goal. I have Tuesday at 6 or Thursday at 7. Which is easier?"'],
  ] },
  { type: 'p', text: `Two details matter more than the clock. First, use their words. When they say they want to "stop freezing in meetings" or "get a grade 6 in maths", come back to those words in the plan. Second, let them do most of the talking and trying. A student who has practised once in your lesson has a reason to come back, and one who has watched you explain has less of one.` },
  { type: 'h3', text: 'Learn first, impress later' },
  { type: 'p', text: `italki's help pages note that students often say they left because a teacher never asked about their needs, and that wording a trial as "what a class with me is like", not a level assessment, reduces worry about being judged. Say it aloud: "this is not a test" changes how a nervous student talks.` },
  { type: 'h3', text: 'One useful win beats ten fixes' },
  { type: 'p', text: `A trial that fixes everything it notices leaves the student overwhelmed and you with no reason to continue. Pick the one problem that is both most costly to them and fixable in ten minutes. A few examples, all invented:` },
  { type: 'ul', items: [
    `English conversation: the student answers in short, safe sentences. Teach one linking phrase and ask them to use it in three answers. They hear the difference.`,
    `Maths: the student can do the method but loses marks setting out. Show a two-line layout and have them redo one question in it.`,
    `Writing: the introduction takes up half the essay. Cut it to two sentences with them, live.`,
    `Exam preparation: the student runs out of time on one question type. Practise a two-minute plan for that type once, timed.`,
  ] },
  { type: 'p', text: `Notice what each has in common: one method, tried twice, with a visible result. The student can describe it to a parent or friend afterwards, and describing it is a step toward booking.` },
  { type: 'h2', text: 'The last five minutes: how to close without pressure' },
  { type: 'p', text: `This is where most trials are won or lost, and the part tutors like least. The platform pages are consistent about it. Preply's guidance says to be upfront about how many lessons you think the student will need and to suggest a package, and to schedule the next lesson before the student leaves; it quotes its own data that students retain five times more when the next lesson is planned in advance, which we cannot check. A tutoring company's help page for its own tutors gives the same advice in other words: offer two or three time slots, so that booking the first regular lesson is effortless, and keep your availability up to date.` },
  { type: 'p', text: `Closing is not selling. It is telling the truth about what the student's goal needs and making the next step easy. A close has four parts.` },
  { type: 'ul', items: [
    `Where they are. One honest sentence: "You can do X well, and Y is what is holding you back."`,
    `The plan. Two or three things you would work on, in order, in their words.`,
    `A number. How many lessons you think it needs, with a range and a reason. Never promise a result such as a grade or a score, since you do not control it.`,
    `Two or three real times. Not "when are you free?" but "Tuesday at 6 or Thursday at 7?" and, if they agree, book it before the call ends.`,
  ] },
  { type: 'p', text: `If time is left, Preply's advice is not to end early: start the next lesson and give homework. That also works for an independent tutor, and it tells the student that the trial is the first of many, not a sample that has ended.` },
  { type: 'h3', text: 'Offer a package without making it a hard sell' },
  { type: 'p', text: `A block of lessons gives a student a reason to commit to a goal and gives you a calendar. italki's pages list discounted packages as a financial reason for a student to continue. Describe it as a way to keep the plan going, and say what happens if the student wants to stop: our guide to lesson packages covers the terms. Offer a single next lesson to anyone who hesitates, because the aim is to make the next step small.` },
  { type: 'h2', text: 'After the lesson: the message that books the second one' },
  { type: 'p', text: `Send it within a few hours, while the student remembers the lesson. Keep it short and put the next step in the first lines. Here are three, for the three things that happen. Names and details are invented.` },
  { type: 'callout', variant: 'tip', title: 'Template: they booked the next lesson', text: '"Thank you for today, Maya. Your next lesson is Tuesday at 6:00 pm. Before then, please try the linking phrase in two conversations and write down one place it felt awkward. We will start there."' },
  { type: 'callout', variant: 'tip', title: 'Template: they said they would think about it', text: '"Thank you for today, Daniel. To keep it simple, here is what I suggested: four lessons on [the goal], starting with [the first topic]. I have Tuesday at 6 or Thursday at 7 free. If neither works, tell me what does and I will look. Either way, here is the one exercise from today to keep practising."' },
  { type: 'callout', variant: 'tip', title: 'Template: they did not reply after two days', text: '"Hi Sofia, a quick note on the trial. My Thursday slots fill up, so I wanted to check whether you would like one. If it is not the right time, no problem at all, and you are welcome to message me later."' },
  { type: 'p', text: `Send that last one once and stop. A second reminder after it is pressure, and a student who goes quiet has usually decided. Tutopiya's tutor help pages tell tutors to reply fast and keep slots open, and that is as far as the evidence goes. We found no study of how often to follow up, so we give you no rule except to be polite, brief and to stop.` },
  { type: 'h2', text: 'Objections, and honest answers' },
  { type: 'compare', caption: 'Common objections after a trial. Invented wording, to adapt.', headers: ['The student says...', 'What is usually behind it', 'A straight answer'], rows: [
    ['"I will think about it."', 'They are unsure of the price, the fit or the time, and cannot say which.', '"Of course. Is it the price, the schedule or whether I am the right fit? Any of them is fine to tell me."'],
    ['"It is more than I expected."', 'They did not know your price, or they compare you with a cheaper tutor.', '"I can offer a smaller start: two lessons, then we review. Or we can go every two weeks."'],
    ['"I need to ask my parents."', 'A child or teenager is not the buyer.', '"Of course. I will send a short summary you can show them, with the plan and the price."'],
    ['"I am trying a few tutors."', 'italki, for one, gives each student three trial chances with three teachers, so comparing is normal.', '"Sensible. Here is what I would do with you, so you can compare. Tell me what you decide."'],
  ] },
  { type: 'p', text: `Do not argue with any of these. If the student is not ready, a polite message and an open door cost you nothing, and some will return.` },
  { type: 'h2', text: 'When the trial should not become regular lessons' },
  { type: 'p', text: `Not every trial should convert, and saying so protects your reviews and your time. Say no, kindly, when:` },
  { type: 'ul', items: [
    `The goal is outside what you teach, such as a business English exam you do not prepare for, or a maths level above yours. Suggest a better fit.`,
    `The schedule cannot work. A student who can only meet at a time you cannot offer will cancel often.`,
    `They expect a result you cannot promise, such as a set score by a set date.`,
    `They want lessons to do their homework or an assignment for them. Wyzant's academic honesty policy exists for this, and saying no early is easier than later.`,
  ] },
  { type: 'p', text: `Offer a pointer to another resource or tutor, and keep the tone friendly. A student you decline politely is more likely to recommend you than one you took on and disappointed.` },
  { type: 'h2', text: 'Count your own conversion' },
  { type: 'p', text: `Platforms give tutors targets, and we looked for averages. Preply's Super Tutor material lists a goal that at least 50% of a Super Tutor's trial students subscribe, and says that starting on time raises conversion. That is a goal for a status, not an average for all tutors, and we found no platform that publishes an average. So we give no benchmark, and the useful figure is your own.` },
  { type: 'compare', caption: 'A simple trial log. The figures are invented, to show the sums.', headers: ['Month', 'Trials taught', 'Booked a second lesson', 'Became regular (four or more lessons)', 'Share booking a second lesson'], rows: [
    ['March', '10', '6', '3', '6 of 10 is 60%'],
    ['April', '12', '5', '3', '5 of 12 is about 42%'],
    ['May', '8', '5', '4', '5 of 8 is about 63%'],
  ] },
  { type: 'p', text: `Count two numbers: the students who book a second lesson and the students who reach four or more. The first tells you whether the trial and the close are working. The second tells you whether the teaching is. When the first is low, work on the last five minutes and the follow-up. When the first is fine and the second is low, look at the lessons themselves. Keep the log for three months before you change anything, since ten trials is a small sample.` },
  { type: 'h2', text: 'Trial lessons on a platform and on your own' },
  { type: 'p', text: `The same trial plays differently on each. On Preply it earns nothing, so conversion is the only way it pays. On italki you are paid, but a student can try three teachers, so be clear in the first five minutes about what makes you different. On Wyzant a free first lesson is your choice, and the unpaid time is your cost.` },
  { type: 'p', text: `On your own link you keep what the student pays and set the price, but you also bring the student, and a stranger who finds your page cold is a harder sell than one who searched for a tutor. That is why many tutors use a platform to meet students and their own link to keep those who want to continue, within each platform's rules on contacting students. Our comparison of Preply, italki and Wyzant for tutors covers those rules.` },
  { type: 'image', src: '/blog/inline/trial-handshake', alt: 'Two people in dark jackets shake hands across a wooden table with a glass of coffee, a phone and a teal cup, in a cafe by a window.', caption: 'Illustrative photo, not a Tutafy user. The close is an agreement about the next step.', credit: 'Photo: rawpixel.com (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Business_agreement_handshake_at_coffee_shop.jpg' },
  { type: 'h2', text: 'What Tutafy does for a trial, and what it does not' },
  { type: 'p', text: `Tutafy is a tool for tutors who run their own business: a public booking page that shows your hours in the student's time zone, a video classroom that opens in the browser, email reminders, student records, and payment through your own PayPal or Stripe account. It takes 0% commission on every plan. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29 a month. For a trial specifically:` },
  { type: 'ul', items: [
    `A trial lesson is a setting. You switch it on in Settings and set a price above zero. It is always 30 minutes and for a first lesson only, and the booking page says so. A student who already has a lesson with you books a regular one.`,
    `You can keep a note on each lesson, set homework, and message a student from the Messages page. Packages are on the Pro plan.`,
    `It does not send a follow-up after the trial, so the messages above are yours to send, and it does not measure how many trials become regulars.`,
    `It does not send you students. Its tutor directory had not opened on 31 October 2026.`,
  ] },
  { type: 'p', text: `If you have students, or will find them, Tutafy removes the admin around the trial: booking, reminder, video and payment. Our Tutafy review is the honest overview.` },
  { type: 'source', text: 'Official pages used here, read on 31 Oct 2026. Our script could not read the Preply, italki, Wyzant and Tutopiya help pages (each answered 403), so their statements come from the search results of those official pages. Terms change often: read the current page before you rely on it.', links: [
    { label: 'Preply: trial lesson expectations', href: 'https://help.preply.com/en/articles/5707752-what-can-i-expect-from-my-trial-lesson' },
    { label: 'Preply: successful tutors', href: 'https://help.preply.com/en/articles/4179084-how-to-become-a-successful-tutor' },
    { label: 'Preply: retaining students', href: 'https://help.preply.com/en/articles/4179179-how-to-retain-students' },
    { label: 'Preply: commission', href: 'https://help.preply.com/en/articles/4171383-preply-commission-model' },
    { label: 'Preply: Super Tutor', href: 'https://help.preply.com/en/articles/11105977-how-to-become-a-super-tutor' },
    { label: 'italki: loyal students', href: 'https://support.italki.com/hc/en-us/articles/360038981654-How-do-I-gain-loyal-students-from-the-first-lesson' },
    { label: 'italki: trial class settings', href: 'https://support.italki.com/hc/en-us/articles/14987952117657-Using-the-Trial-Class-settings-to-gain-more-students' },
    { label: 'italki: no second lesson', href: 'https://support.italki.com/hc/en-us/articles/900001913883-Why-didn-t-my-student-book-another-lesson' },
    { label: 'italki: trial lessons', href: 'https://support.italki.com/hc/en-us/articles/206351548-Offering-Trial-Lessons' },
    { label: 'Wyzant: free first lesson', href: 'https://support.wyzant.com/tutors/lessons/may-i-give-a-free-first-lesson-or-meeting-with-a-student/' },
    { label: 'Tutopiya: trial leads', href: 'https://www.tutopiya.com/tools/knowledge-base/for-tutors/how-to-convert-a-trial-lead' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'Preply vs italki vs Wyzant for tutors', href: '/blog/preply-vs-italki-vs-wyzant-for-tutors', text: 'What each platform does with a first lesson.' },
    { label: 'How to get your first 10 tutoring clients', href: '/blog/get-your-first-tutoring-clients', text: 'Where trial students come from.' },
    { label: 'How to price your tutoring lessons', href: '/blog/how-to-price-tutoring-lessons', text: 'Free, discounted or full-price trials.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'Offering a block of lessons after the trial.' },
    { label: 'How to retain tutoring students', href: '/blog/how-to-retain-tutoring-students', text: 'What to do once the student has booked.' },
  ] },
  { type: 'faq', items: [
    { q: 'How long should a trial lesson be?', a: `The pages we read set no length. Tutafy\'s trial is always 30 minutes, enough to learn the goal, run one task and agree the next step. A trial of 45 or 60 minutes lets you teach more. Keep the order of the parts.` },
    { q: 'Should a trial lesson be free?', a: `On your own link it is your choice. A free trial lowers the barrier and attracts people who may never pay, and a short paid or discounted one filters for serious students. On italki the lowest trial price is $5 in italki Credits, and on Wyzant a free first lesson is up to the tutor.` },
    { q: 'How do I turn a trial into regular students?', a: `Close in the lesson. Say where they are, what you would work on and how many lessons it might take, offer two or three times, then send a short message within a few hours. Preply and a tutoring company's help page both advise booking the next lesson before the student leaves.` },
    { q: 'What if the student does not reply after the trial?', a: `Send one polite reminder after a couple of days, with one slot, and then stop. We found no study of the best number of follow-ups.` },
    { q: 'What percentage of trial lessons turn into regular students?', a: `We could not find a published average, so we give none. Preply\'s Super Tutor material sets a goal of at least 50% of trial students subscribing, but that is a goal for a status. Keep a log of your own trials for three months.` },
    { q: 'Does Tutafy have a trial lesson feature?', a: `Yes. You switch on a trial lesson in Settings and set a price above zero. It is always 30 minutes, for a first lesson only. Tutafy does not send the follow-up message or measure how many trials become regular students, and it does not send you students.` },
  ] },
  { type: 'cta', title: 'Offer a trial lesson on your own booking page', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start, cancel anytime. Tutafy does not send students.', button: 'Start free, no credit card', href: '/register' },
]
