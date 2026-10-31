// T-1212 (reserve topic). Article body for /blog/tutor-lesson-plan-template (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, article 1 of the 08/11 day. The planned article ("preply commission") was dropped at step 0 and this reserve topic ("lesson plan template" for tutors, about 50 searches a month in the earlier data, low)
// was used, as the plan allows. Reader: a TUTOR who wants to plan one-to-one lessons.
//
// Step 0 (31 Oct 2026). Why the Preply article was dropped: /blog/how-much-does-preply-take already ranks the same phrase ("How much does Preply take from tutors? (2026 commission, explained)", published 9 Jul 2026, updated 25 Oct 2026) and is the longest article on the site on the
// subject; marketplace-vs-independent-the-real-math, preply-alternatives-for-tutors, real-hourly-rate-for-tutors and online-tutoring-jobs also carry Preply's rates. A fifth page on the same phrase would compete with our own pages. Instead that article got a dated update (T-1212, see blog.ts).
// For this reserve topic: no page on tutafy.com is about lesson plans. The nearest are how-to-retain-tutoring-students (the recap after a lesson), ai-tools-for-tutors (drafting worksheets and plans with AI), best-video-call-tool-for-tutors and online-whiteboard-for-tutoring
// (the tools in a lesson), how-to-teach-english-online (the structure of an English lesson in one paragraph). Google results are classroom lesson-plan templates (for 20 to 30 pupils, a school week) and download pages; none is written for a tutor with one student for 30 to 60 minutes.
// Own angle: a one-page plan for ONE student, with the objective written first, time blocks for 30, 45 and 60 minutes, and a note written after the lesson that becomes the start of the next; three invented worked plans (maths, English speaking, writing); honest about what a plan cannot do.
//
// Sources, read directly on 31 Oct 2026:
//   Wikipedia, "Barak Rosenshine": his 2012 article in American Educator (Spring 2012, vol. 36, no. 1), "Principles of Instruction: Research-Based Strategies That All Teachers Should Know", and its ten principles by name:
//     1 begin a lesson with a short review of prior learning; 2 present new material in small steps with student practice after each step; 3 ask a large number of questions and check the responses of all students; 4 provide models; 5 guide student practice;
//     6 check for student understanding; 7 obtain a high success rate; 8 provide scaffolds for difficult tasks; 9 require and monitor independent practice; 10 engage students in weekly and monthly review.
//   aft.org, the article's page (title, subtitle, author, journal and issue confirmed; the page links a PDF whose text could not be read by our tool, so no figure from the article text is quoted, for instance no success-rate percentage).
//   Carnegie Mellon University, Eberly Center, "Learning objectives": a good objective is student-centred ("At the end of the course, students should be able to ____"), measurable, specific, and written with action verbs;
//     vague verbs such as "understand", "obtain a working knowledge of" and "gain an appreciation for" are hard to measure; to clarify one, ask what students would do differently if they really "understood" it.
//   Carnegie Mellon University, Eberly Center, "Instructional strategies": align strategies with objectives and assessments; recitations suit checking understanding and finding misconceptions. (The page says nothing about the structure or pacing of a session; this guide does not attribute any to it.)
//   retrievalpractice.org, "Why it works": retrieval practice is bringing information to mind rather than putting it in again; "a learning strategy, not an assessment strategy"; ideas: start class by asking what they did last week, a brain dump of everything they remember, "two things" at the end.
// Not read, so not written: the text of Rosenshine's article (a PDF our tool could not read), any research on one-to-one tutoring specifically (the Education Endowment Foundation page returned 403), Bloom's taxonomy (the page we tried redirected away), any figure for how long a plan should be or how much planning improves results.
// All time splits, lesson plans, student names and numbers in this guide are written by us, are invented, and are labelled as such. What it says about Tutafy comes from the code, read 31 Oct 2026: the lesson form has "Lesson notes" (placeholder "Topics to cover, lesson plan...") and "Homework" fields,
// src/app/api/lessons/[id]/send-notes/route.ts emails the notes, homework and vocabulary with a link to the student's portal, src/app/api/ai/lesson-summary/route.ts drafts a summary on the Pro plan; there is no lesson-plan template, curriculum or sequence feature.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const TUTOR_LESSON_PLAN_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'A tutor lesson plan is one page for one student. It names what the student will be able to do at the end, what you will do in each block of the lesson, and the one question that will show whether it worked.',
    'Write the objective first. Carnegie Mellon\'s teaching centre says a good objective is student-centred, measurable and uses action verbs, and that vague verbs such as "understand" are hard to measure.',
    'Rosenshine\'s ten principles of instruction, from American Educator in 2012, fit a one-to-one lesson well: a short review at the start, small steps, questions, guided practice and weekly review.',
    'A 60-minute lesson needs about five blocks and a 30-minute lesson needs three. The time splits in this guide are our suggestion, not a research finding.',
    'Tutafy has fields for lesson notes and homework and can email them to the student. It has no lesson-plan templates or curriculum, and this guide says what that means.',
  ] },
  { type: 'p', text: `A lesson plan for a tutor is a single page that answers four questions about one student and one lesson: what will they be able to do by the end, how will you get them there in the time you have, how will you check that they got there, and what happens next. It is shorter than a classroom plan because you have one learner, and more useful than a topic list because it commits you to a way of finding out whether the lesson worked.` },
  { type: 'p', text: `This guide gives you a one-page template to copy, shows how to fill each line, splits the time for 30, 45 and 60 minutes, and walks through three invented plans for maths, English speaking and writing. It uses a small amount of research, named and linked, and says where we could not read it. We make software for tutors, so we also say what Tutafy does and does not do for planning.` },
  { type: 'image', src: '/blog/inline/plan-tutoring-physics', alt: 'Two hands over sheets of handwritten physics notes on a wooden desk, one drawing with a pen and one pointing at a formula.', caption: 'Illustrative photo, not a Tutafy user. In a one-to-one lesson the plan is usually a single sheet.', credit: 'Photo: Preply.com Images (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Tutoring_Physics.jpg' },
  { type: 'h2', text: 'What a one-to-one plan is for' },
  { type: 'p', text: `Most lesson-plan templates online are made for a classroom: twenty or thirty pupils, a fixed curriculum, a head of department who reads the plan. A tutor has none of that. You have one student whose gaps you can see, a lesson of 30 to 60 minutes, and the freedom to change direction when a question shows that you aimed at the wrong thing. A plan for that situation has three jobs.` },
  { type: 'ul', items: [
    `It stops you improvising the whole hour. Improvising feels responsive and tends to drift towards whatever the student already knows how to do.`,
    `It gives the lesson a shape, so the student leaves with one thing they can do that they could not do at the start.`,
    `It leaves a record. The notes you write afterwards are the start of next week's plan, and a parent or the student can read them.`,
  ] },
  { type: 'p', text: `It is not a script. A good plan is short enough to abandon without guilt, because the best lessons often go somewhere the plan did not expect. We come back to that below.` },
  { type: 'h2', text: 'The one-page template' },
  { type: 'p', text: `Copy these ten lines into whatever you write in: a notes app, a document or a notebook. The "what to write" column says what each line is for, and the example column uses an invented student so you can see the length. Aim for a sentence on each line, not a paragraph.` },
  { type: 'compare', caption: 'A one-page lesson plan for one student. The example is invented by us.', headers: ['Line', 'What to write', 'Example (invented)'], rows: [
    ['1. Student and date', 'Name, date, length of lesson, lesson number in the series', 'Mia, 12 Nov, 60 min, lesson 4 of 8'],
    ['2. Carried over', 'The one loose end from last lesson, from your after-lesson note', 'Still adds fractions with different denominators by guessing'],
    ['3. Objective', 'One thing the student will be able to do by the end, with a verb you can see', 'Add two fractions with different denominators, showing the common denominator'],
    ['4. Warm-up', 'A question that makes the student recall last lesson, with no notes', 'What did we do with 1/2 and 1/3 last week?'],
    ['5. New step', 'The smallest next piece, taught in two or three steps, with a worked model', 'Step 1 find a common multiple. Step 2 rewrite both. Step 3 add the tops.'],
    ['6. Practice together', 'Problems you do with the student, easiest first, with you ready to prompt', 'Four problems, each a little harder'],
    ['7. Check', 'The one question you will ask to see if it worked', 'Add 2/3 and 1/4 without my help and explain each step'],
    ['8. On their own', 'A short task or homework that matches the objective, and how they will send it', 'Six problems by Friday, photo sent'],
    ['9. After the lesson', 'Two lines written in the next five minutes: what worked, what to carry over', 'Got it with halves and thirds, slips with fifths. Carry fifths over.'],
    ['10. Next first question', 'The warm-up question for next time, taken from line 9', 'What is the common denominator of 2/5 and 1/3?'],
  ] },
  { type: 'p', text: `Lines 2 and 10 are what make this a series of lessons and not a pile of single ones. The loose end from last time goes in as line 2, and the first question for next time is written as line 10 the moment the lesson ends, when you remember best. A tutor who does just that has a lesson plan with a memory, which a classroom template does not give you.` },
  { type: 'h2', text: 'Write the objective first' },
  { type: 'p', text: `Everything else on the page depends on line 3. The Eberly Center at Carnegie Mellon University publishes guidance on learning objectives, and it says a good objective is student-centred, measurable and made of specific action verbs. It gives a stem: "At the end of the course, students should be able to ____." The same page says verbs such as "understand", "obtain a working knowledge of" and "gain an appreciation for" are hard to measure, and suggests asking what students would do differently if they really "understood" or "appreciated" the thing.` },
  { type: 'p', text: `That test is useful for a tutor because it forces you to name an action. If the student understands fractions, what will they do that they could not do before? Add two of them and say why. Once you can say that, the check at line 7 writes itself: you ask them to do it.` },
  { type: 'compare', caption: 'Weak and strong objectives for the same lessons. The examples are ours.', headers: ['Weak', 'Strong', 'What changed'], rows: [
    ['Understand fractions', 'Add two fractions with different denominators, showing the common denominator', 'A visible action and a visible method'],
    ['Practise speaking', 'Talk for two minutes about a past trip using at least four past-simple verbs', 'A time, a topic and a countable feature'],
    ['Improve essay writing', 'Write a paragraph that starts with a claim, gives one piece of evidence and explains it', 'A structure the student can be checked against'],
    ['Learn the past perfect', 'Choose between past simple and past perfect in six sentences, with at least five right', 'A task and a score'],
    ['Cover chapter 4', 'Solve two linear equations with the unknown on both sides', 'The student, not the book, is the subject'],
  ] },
  { type: 'p', text: `Write one objective per lesson. If you have two, you have two lessons. The exception is a revision session, where the objective can be a list of three small things, each with its own check.` },
  { type: 'h2', text: 'Rosenshine\'s ten principles, as a checklist for the template' },
  { type: 'p', text: `Barak Rosenshine published "Principles of Instruction: Research-Based Strategies That All Teachers Should Know" in American Educator, Spring 2012 (volume 36, number 1). It lists ten principles. We read the list as it is given on his Wikipedia entry and confirmed the title, author and issue on the American Federation of Teachers page. The PDF of the article itself did not give us text, so we do not quote its details, such as any percentage. The names of the principles are enough to build a checklist for the template.` },
  { type: 'compare', caption: 'Rosenshine\'s ten principles by name, with the line of the template where we put each (the mapping is ours).', headers: ['Principle', 'Where it sits in the template'], rows: [
    ['Begin a lesson with a short review of prior learning', 'Lines 2 and 4'],
    ['Present new material in small steps with student practice after each step', 'Lines 5 and 6'],
    ['Ask a large number of questions and check the responses of all students', 'Lines 4, 6 and 7'],
    ['Provide models', 'Line 5, the worked example'],
    ['Guide student practice', 'Line 6'],
    ['Check for student understanding', 'Line 7'],
    ['Obtain a high success rate', 'Line 6: order the problems easiest first'],
    ['Provide scaffolds for difficult tasks', 'Line 5: a sentence frame, a formula sheet, a hint you can take away'],
    ['Require and monitor independent practice', 'Line 8'],
    ['Engage students in weekly and monthly review', 'Lines 9 and 10, and the series plan below'],
  ] },
  { type: 'p', text: `With one student, the principles are easy to apply because you see every response. The classroom problem Rosenshine describes, checking what all the students understood, becomes simply: ask them, and watch them do it. The risk for a tutor is the opposite one, of doing the thinking for the student. A plan with a practice line and a check line reminds you that the student, not you, has to do the work.` },
  { type: 'h2', text: 'Start with retrieval, not with a recap' },
  { type: 'p', text: `Line 4 of the template, the warm-up, is where many tutors lose the first ten minutes to a recap: you remind the student what they did, they nod. Retrieval practice reverses this. The site retrievalpractice.org describes it as bringing information to mind rather than putting it in again, calls it "a learning strategy, not an assessment strategy", and gives three practical ideas that fit a tutor.` },
  { type: 'ul', items: [
    `Ask what they did last time. The page suggests starting class by asking students what they did last week, instead of reviewing it for them.`,
    `A brain dump. Ask the student to write down everything they remember from the last lesson, with no notes, for two minutes.`,
    `Two things. Near the end, ask them for two things they learned today. It also gives you your line 9.`,
  ] },
  { type: 'p', text: `Because retrieval is for learning and not for grading, say so. "This is not a test. I want to see what stuck" is a sentence that stops a nervous student from guessing. We did not find research on retrieval practice in one-to-one tutoring specifically on the pages we read, so we present this as a sensible adaptation, not a proven result.` },
  { type: 'h2', text: 'Splitting the time: 30, 45 and 60 minutes' },
  { type: 'p', text: `The lines of the template need minutes. The Eberly Center page on instructional strategies says nothing about how long each part of a lesson should take, and we found no source for a "right" split, so the table below is our suggestion, built from the principles above. Change it freely.` },
  { type: 'compare', caption: 'Our suggested time splits for one-to-one lessons. They are our suggestion and not a research finding.', headers: ['Block', '30 minutes', '45 minutes', '60 minutes'], rows: [
    ['Warm-up: retrieval of last lesson (line 4)', '3', '5', '5'],
    ['New step with a model (line 5)', '8', '10', '12'],
    ['Practice together (line 6)', '10', '15', '20'],
    ['Check (line 7)', '4', '5', '8'],
    ['Task, wrap-up and note of the next step (lines 8 to 10)', '5', '10', '15'],
  ] },
  { type: 'p', text: `Notice what the splits protect. The final block is not left for "if there is time", because it is where the student learns what to do before next week and where you say the first question for next time out loud. The practice block is the biggest, because in a one-to-one lesson the student's practice is the thing you cannot get any other way. In our view, a plan in which the tutor talks for most of the lesson has turned into a lecture.` },
  { type: 'image', src: '/blog/inline/plan-hourglasses', alt: 'Four small hourglasses with yellow, pink, red and blue sand on a wooden stand, lit from one side against a dark background.', caption: 'Illustrative photo, not a Tutafy user. Decide the minutes in advance, and the lesson runs to them.', credit: 'Photo: Sauvagette (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Multiple_hourglasses.jpg' },
  { type: 'h2', text: 'Three invented plans' },
  { type: 'p', text: `Here are three filled plans. The students, the numbers and the tasks are invented by us to show the length and the style. Each fits on a page, and each names its objective as an action.` },
  { type: 'h3', text: 'Maths, 60 minutes: solving equations with the unknown on both sides' },
  { type: 'compare', caption: 'Invented plan for a student called Jo, lesson 6 of 10.', headers: ['Line', 'Plan'], rows: [
    ['Carried over', 'Jo moves terms across and forgets to change the sign'],
    ['Objective', 'Solve two linear equations with the unknown on both sides and check each answer by substituting it back'],
    ['Warm-up (5)', 'Jo writes down the three steps for 3x + 2 = 11 from memory'],
    ['New step (12)', 'Model 5x - 3 = 2x + 9: subtract 2x, add 3, divide by 3. Say each move aloud and write it.'],
    ['Practice (20)', 'Four equations, easiest first. Jo says each step before writing it. I step in only when a sign slips.'],
    ['Check (8)', 'One new equation, no help, and a substitution check'],
    ['Task and wrap-up (15)', 'Five equations for the week, photo of the working. Two lines of notes. First question next week: "What do we do first if x is on both sides?"'],
  ] },
  { type: 'h3', text: 'English speaking, 45 minutes: telling a story about the past' },
  { type: 'compare', caption: 'Invented plan for an adult learner called Ana at about B1 level, lesson 3 of 8.', headers: ['Line', 'Plan'], rows: [
    ['Carried over', 'Ana says "I go" for past events. She knows the rule and slips when she speaks.'],
    ['Objective', 'Talk for two minutes about a past trip using at least four past-simple verbs correctly'],
    ['Warm-up (5)', 'Ana lists the six irregular verbs from last lesson, no notes'],
    ['New step (10)', 'Model a 30-second story about a trip. Mark the past-simple verbs. Give a three-part frame: where, what happened, how it felt.'],
    ['Practice (15)', 'Ana tells the story twice. After the first I note the slips without stopping her. After the second she corrects them.'],
    ['Check (5)', 'A new topic, two minutes, no frame. I count the correct past-simple verbs.'],
    ['Task and wrap-up (10)', 'Record a one-minute story about yesterday and send the recording. Notes: which verbs slipped. Next first question: "What did you do last weekend?"'],
  ] },
  { type: 'h3', text: 'Writing, 60 minutes: a paragraph that argues' },
  { type: 'compare', caption: 'Invented plan for a student called Sam, lesson 2 of 6.', headers: ['Line', 'Plan'], rows: [
    ['Carried over', 'Sam states opinions and gives no evidence'],
    ['Objective', 'Write one paragraph that starts with a claim, gives one piece of evidence and explains how it supports the claim'],
    ['Warm-up (5)', 'Sam tells me, from memory, what the three parts of a good paragraph were last week'],
    ['New step (12)', 'Show a weak paragraph and a strong one on the same topic. Label the claim, evidence and explanation in colour.'],
    ['Practice (20)', 'Sam rewrites the weak paragraph. We read it aloud. I ask "how does that show your claim?" after each sentence.'],
    ['Check (8)', 'Sam writes a new paragraph on a different claim in ten minutes, no help'],
    ['Task and wrap-up (15)', 'One paragraph for the week on a topic of Sam\'s choice. Notes: evidence is better, explanation is thin. Next first question: "What is the sentence that explains your evidence?"'],
  ] },
  { type: 'p', text: `Each plan is a page and none is clever. What makes them work is that the objective is a thing the student does, and that the check at the end repeats the objective with new material. If the check goes badly, you know what to teach next week.` },
  { type: 'h2', text: 'Plan the series, then plan the lesson' },
  { type: 'p', text: `A single plan answers "what do we do today". A student with a goal needs a second answer: "where are we going". Before the first lesson, write a series plan on half a page. The student's goal goes at the top, in the student's own words. Under it goes a sequence of four to eight lessons, one objective each, with a gap for a lesson that goes wrong.` },
  { type: 'compare', caption: 'A series plan for Ana, invented. Eight lessons towards the goal "tell a story about my trip without stopping".', headers: ['Lesson', 'Objective'], rows: [
    ['1', 'Introduce yourself and say where you are from in five sentences, using the present simple'],
    ['2', 'Describe your week using the present simple and time words'],
    ['3', 'Talk for two minutes about a past trip using at least four past-simple verbs'],
    ['4', 'Ask and answer five questions about a past trip'],
    ['5', 'Tell a story with a beginning, a problem and an end'],
    ['6', 'Spare: catch up on whatever slipped'],
    ['7', 'Tell the story again without notes and at normal speed'],
    ['8', 'Record the story and compare it with the lesson 1 recording'],
  ] },
  { type: 'p', text: `The spare lesson is the part most tutors leave out, and it is what stops a plan failing the first time a lesson gets cancelled. Rosenshine's last principle is review, weekly and monthly. In a series plan, that means the lesson-1 task comes back at lesson 8, so the student can see how far they have come. Our guide to lesson packages shows how to sell a series like this as a package, and the reschedule guide covers what happens to the plan when a lesson moves.` },
  { type: 'image', src: '/blog/inline/plan-tote-organizer', alt: 'A mint-green tote with sections holding pencils, glue bottles, coloured pens and markers, with a framed homework checklist leaning beside it.', caption: 'Illustrative photo, not a Tutafy user. A small kit and a short checklist are enough preparation for most lessons.', credit: 'Photo: Personal Creations (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Tote_organizer_with_glue_pens_pencils_chalk_and_checklist_(21312803141).jpg' },
  { type: 'h2', text: 'The five minutes after the lesson' },
  { type: 'p', text: `Lines 9 and 10 take five minutes and are worth more than the rest of the preparation. Write two lines about what worked and what to carry over, then write the first question for next time. If a parent or the student receives a recap, this is also the text of it. Keep the notes factual: what was done, what was got right, what is next.` },
  { type: 'ul', items: [
    `Write it straight away. By the next morning you have forgotten the detail that mattered.`,
    `Use the student's work. "Got halves and thirds, slipped with fifths" is more useful than "good progress".`,
    `Send one thing. A short recap and the task, not the whole plan.`,
    `Do not write what you cannot back up. Praise that is not tied to something the student did teaches them nothing.`,
  ] },
  { type: 'h2', text: 'When to throw the plan away' },
  { type: 'p', text: `A plan is a bet on what the student needs. Sometimes the first two minutes show you are wrong. The student turns up with a test on Thursday, homework they did not understand or a sentence they have been wanting to say for a week. Teach that. The five minutes of thought that went into the plan do not vanish when you set it aside.` },
  { type: 'p', text: `If the lesson goes somewhere else, write the new objective on line 3 as soon as you know it, teach to that, and run the check at the end. The difference between a drifting lesson and a flexible one is only that the flexible one has an objective.` },
  { type: 'h2', text: 'Mistakes that make plans useless' },
  { type: 'ul', items: [
    `Planning topics, not actions. "Past tense" is a topic. "Tell a story using four past-simple verbs" is an objective.`,
    `Planning too much. Four activities in 30 minutes means you will never reach the check. Cut the plan until the check fits.`,
    `No check. Without line 7, you find out at the next lesson that the last one did not work.`,
    `Talking for most of the lesson. If the practice block is shorter than the explanation, swap them.`,
    `Writing a perfect plan and not the note. The note after the lesson matters more.`,
  ] },
  { type: 'h2', text: 'What Tutafy has for planning, and what it lacks' },
  { type: 'p', text: `Tutafy is software for independent tutors: a booking page that shows your hours in the student's time zone, a video classroom that opens in the browser, email reminders, student records and payment through your own account, with 0% commission. For planning, here is what we found in its code on 31 October 2026.` },
  { type: 'ul', items: [
    `Each lesson has a "Lesson notes" field, with the placeholder "Topics to cover, lesson plan...", and a "Homework" field. You can paste lines 1 to 10 of the template into the notes.`,
    `The notes, the homework and a vocabulary list can be emailed to the student with a link to their portal. This is the recap in the section above.`,
    `On the Pro plan, which is $12 a month, the AI lesson summary drafts a short summary from your notes and homework. You should read and edit it before it is sent.`,
    `Tutafy has no lesson-plan template, curriculum, sequence of lessons or library of materials. The notes field is one free text box, so the template above is something you keep yourself and paste in.`,
    `It does not choose objectives, check the student's work against them, or tell you what to teach next. That is your job.`,
  ] },
  { type: 'p', text: `A notes app or a document per student is a fine place to keep the plan. A tool that sends the recap saves retyping. Our tech-stack guide helps decide what to replace, link or keep.` },
  { type: 'source', text: 'The research pages used, read on 31 Oct 2026. The template, the time splits and all the plans are ours and are not taken from any of them.', links: [
    { label: 'Wikipedia: Barak Rosenshine (the ten principles of instruction)', href: 'https://en.wikipedia.org/wiki/Barak_Rosenshine' },
    { label: 'American Educator, Spring 2012: Principles of Instruction (page; the PDF text was not readable)', href: 'https://www.aft.org/ae/spring2012/rosenshine' },
    { label: 'Carnegie Mellon Eberly Center: learning objectives', href: 'https://www.cmu.edu/teaching/designteach/design/learningobjectives.html' },
    { label: 'Carnegie Mellon Eberly Center: instructional strategies', href: 'https://www.cmu.edu/teaching/designteach/design/instructionalstrategies/index.html' },
    { label: 'retrievalpractice.org: why it works', href: 'https://www.retrievalpractice.org/why-it-works' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to retain tutoring students', href: '/blog/how-to-retain-tutoring-students', text: 'What to send after a lesson and why students stay.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'Sell a planned series as a package.' },
    { label: 'How to handle reschedule requests', href: '/blog/how-to-handle-tutoring-reschedule-requests', text: 'What happens to the plan when a lesson moves.' },
    { label: 'AI tools for tutors', href: '/blog/ai-tools-for-tutors', text: 'Drafting practice material, and where it needs a human check.' },
    { label: 'Online whiteboard for tutoring', href: '/blog/online-whiteboard-for-tutoring', text: 'Where the worked example goes.' },
    { label: 'Tools for online tutors', href: '/blog/tutoring-tech-stack-for-online-tutors', text: 'Audit what you use and what to replace.' },
    { label: 'How to teach English online', href: '/blog/how-to-teach-english-online', text: 'A structure for English lessons.' },
  ] },
  { type: 'faq', items: [
    { q: 'What should a tutor lesson plan include?', a: `One objective written as something the student will do, a short retrieval warm-up, a new step with a worked model, practice together, a check that repeats the objective, a task for the week and two lines of notes afterwards. The template above puts these on ten lines.` },
    { q: 'How long should a tutoring lesson plan be?', a: `One page, or less. We found no source that says how long a plan should be, so our advice is to cut it until the check at the end fits in the time you have.` },
    { q: 'How do I write a learning objective for one student?', a: `Use the stem from Carnegie Mellon's Eberly Center: the student should be able to do something you can see. Prefer verbs such as solve, write, explain, choose or say over "understand" or "know".` },
    { q: 'Do I need a plan for every lesson?', a: `A short one, yes. A plan can be three lines for a 30-minute lesson: objective, practice and check. Plan the series once and the individual lessons take a few minutes.` },
    { q: 'What are Rosenshine\'s principles of instruction?', a: `Ten principles from a 2012 article in American Educator, including begin with a short review, teach in small steps, ask many questions, provide models, guide practice, check understanding and review weekly and monthly. This guide maps each to a line of the template.` },
    { q: 'Should I send the plan to the student or the parent?', a: `Send the recap, not the plan: what was done, what was got right, the task and the date of the next lesson. The plan is your working document.` },
    { q: 'Does Tutafy have lesson plan templates?', a: `No. A Tutafy lesson has a free-text notes field and a homework field, and can email them to the student. There is no template library, curriculum or sequence feature, so you keep the template yourself and paste it in.` },
  ] },
  { type: 'cta', title: 'Keep the plan, the notes and the homework with the lesson', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders, and each lesson has notes and homework fields. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy has no lesson-plan templates and does not send students.', button: 'Start free, no credit card', href: '/register' },
]
