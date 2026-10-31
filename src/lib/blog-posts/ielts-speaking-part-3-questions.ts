// T-1221. Article body for /blog/ielts-speaking-part-3-questions (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, article 10. Reader: mostly a LEARNER preparing for the test, also a tutor who teaches it.
// Step 0 (31 Oct 2026). Google results for "ielts speaking part 3" and for "question types / how to extend answers" (read as titles and addresses; no search volume available, the plan says so): the pages are
//   preparation sites (Cathoven, PrepEdu, Testglider, Keith Speaking Academy, IELTS Advantage, regional IDP pages, a British Council overview PDF and signposting worksheet). They name question types
//   (opinion, comparison, cause and effect, hypothetical, evaluation), give extension tricks and model answers. On this site: ielts-speaking-part-2-topics has one section on Part 3 (about 160 words) and
//   ielts-speaking-part-1-questions (same day) covers Part 1. Overlap: low. OWN ANGLE: sort the questions by what they ask you TO DO (state a view, explain a cause, compare, describe a change, predict,
//   imagine, judge) and give one reusable answer shape per kind, built on the four-step structure ielts.org itself suggests; deal honestly with the "general, not personal" advice, which clashes with
//   how Part 2 is answered, with one invented worked answer for each; give a practice routine in which the tutor does the stretching ("why?", "what about the other side?"). Our Part 2 guide
//   had told readers to give "an example from life or from people you know" in Part 3; the official pages read for this guide advise a general view, so that line was changed in the same pull request.
// Tutafy is NOT an authority on IELTS (the ticket says so): every fact about the test comes from an official page (ielts.org, IDP, British Council) and says so; our own advice is marked as ours.
//
// Sources, read on 31 Oct 2026:
//   Read directly: ielts.org, IELTS Academic format, Speaking: "11-14 minutes"; recorded; "Part 3 lasts 4-5 minutes"; you and the examiner "discuss issues related to the topic in Part 2" "in a more general and
//     abstract way"; four criteria: fluency and coherence, lexical resource, grammatical range and accuracy, pronunciation.
//   Read directly: ielts.org news and insights, "Three parts of IELTS Speaking, and what to look out for", published 1 Feb 2023, first published on IELTS.IDP.com, no author shown: Part 3 is a general discussion linked to Part 2
//     of 4-5 minutes with more abstract questions; no preparation time; interruptions by the examiner are normal and aim to draw out deeper answers; examiners look for depth, analysis and justified opinions; avoid repeating
//     Part 2 ideas and give a general view rather than a personal anecdote; a four-step structure (a direct answer, an explanation with reasons, an example, then an alternative or consequence); practise with friends or
//     family through discussions or mini-debates on topics like education, society and nature.
//   Read directly: IDP, "How to perform at your best in part 3 of the Speaking test": questions relate to the Part 2 topic area and move from personal to general (a Part 2 about a holiday leads to tourism and leisure time);
//     sample questions about famous people (quoted below); "It is important that you attempt to extend your responses as much as you can"; use general phrases such as "In my country most people believe that ..."; linking words
//     for sequencing, adding, comparing, giving examples and stalling; match grammar to the function (conditionals and modal verbs for predictions or suggested solutions); build mind maps of topic vocabulary; ask the examiner to
//     explain a word you do not understand; mistakes to avoid: talking about yourself and your family (the examiner will steer you back), meaningless fillers such as "um" and "er", overusing "yeah", "like" and "you know", and
//     short answers. The article states no duration.
//   Read directly: IDP (Nepal page), "Part 3 topics and questions": "usually lasts about 4-5 minutes"; broader, more abstract questions that ask you to "think deeper, discuss ideas, justify opinions, and analyse issues";
//     topic groups (advertising and media, education, family and society, culture and traditions, environment); sample questions quoted below; advice to answer in "2-3 richly detailed sentences" and not to give one-sentence
//     replies; "Don't memorise answers"; it says the topics are drawn from "past recurring trends and real candidate reports", which we could not check.
//   NOT opened (the pages timed out on 31 Oct 2026): the British Council Part 3 overview and practice PDFs, the "signposting language" worksheet (dated 2013) and the how-it-works page. What we say they advise (abstract and
//     analytical questions on the Part 2 topic, short natural phrases such as "That's an interesting question" to gain a moment, signposting phrases, comparing situations and weighing advantages and disadvantages, no memorised
//     answers, asking the examiner to repeat or clarify does not affect the score) comes from the summary of search results of those pages, and the article says so.
// Not read, so not written: any list of the questions in current tests (none is published by IELTS that we found), how often topics change, the examiner's script (not public), a band-score prediction, the text of the band descriptors,
// any official time target for one Part 3 answer (none found).
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/lib/plan-list.ts (Free: up to 10 students, booking page, built-in video classroom, email reminders; Pro $12 a month; Academy $29 a month),
// a lesson has a field for a link to a recording that the student's portal shows (src/components/RecordingEmbed.tsx); no recorder of its own and no IELTS content or scoring in src.
// All questions, answers, numbers and names in the examples are invented by us and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const IELTS_PART3_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'IELTS Speaking Part 3 is a 4 to 5 minute discussion linked to your Part 2 topic. ielts.org says it covers issues "in a more general and abstract way". There is no preparation time.',
    'Examiners look for depth, analysis and justified opinions, according to ielts.org, which also advises a general view and not a personal anecdote.',
    'The questions come in kinds we can sort by what they ask you to do: state a view, explain a cause, compare, describe a change, predict, imagine or judge. Each kind has an answer shape, below.',
    'ielts.org suggests four steps for an answer: a direct answer, reasons, an example, then an alternative or a consequence. IDP says to aim for two or three richly detailed sentences.',
    'Tutafy is not an official source on IELTS. The test facts come from IELTS, IDP and British Council pages, and our own advice is marked as ours.',
  ] },
  { type: 'p', text: `IELTS Speaking Part 3 questions are the discussion questions at the end of the speaking test. They follow the topic of your Part 2 task card, but they move away from you and your story towards people, society and the future. The examiner asks, and you give a view, explain it and defend it. For many candidates it is the hardest part, because the questions are abstract and there is no time to prepare.` },
  { type: 'p', text: `This guide is for learners preparing for the test and for tutors who teach it. It explains Part 3 using the official pages, sorts the questions into seven kinds, gives worked answers, and shows how to practise with a tutor. We are a tutoring-software company, not an IELTS authority, so we point to an official source for each fact about the test.` },
  { type: 'image', src: '/blog/inline/ielts3-cafe-conversation', alt: 'A brown ceramic mug in the foreground on a wooden table, with a woman and a man talking across a table in soft focus behind it.', caption: 'Illustrative photo, not a Tutafy user. Part 3 is closer to a discussion than to an interview.', credit: 'Photo: Matt @ PEK from Taipei, Taiwan (CC BY-SA 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Conversation_(5556628632).jpg' },
  { type: 'h2', text: 'What Part 3 is, by the official pages' },
  { type: 'p', text: `The Speaking test is a face-to-face interview, it is recorded, and ielts.org gives the time as 11 to 14 minutes in three parts. Part 3 is the last. It lasts 4 to 5 minutes, and you and the examiner discuss issues related to the Part 2 topic "in a more general and abstract way". IDP describes it as feeling more like a discussion than an interview.` },
  { type: 'compare', caption: 'What the official pages say about Part 3. Read on 31 Oct 2026.', headers: ['Question', 'What the page says', 'Source'], rows: [
    ['How long?', '4 to 5 minutes', 'ielts.org, Academic Speaking format; IDP, Part 3 topics and questions'],
    ['What is it about?', 'Issues related to the Part 2 topic, in a more general and abstract way', 'ielts.org, Academic Speaking format'],
    ['Is there preparation time?', 'No preparation time', 'ielts.org news, 1 Feb 2023'],
    ['What do examiners look for?', 'Depth, analysis and justified opinions', 'ielts.org news, 1 Feb 2023'],
    ['Whose view do they want?', 'A general view rather than a personal anecdote; avoid repeating Part 2 ideas', 'ielts.org news, 1 Feb 2023'],
    ['Will the examiner interrupt?', 'Interruptions are normal and aim to draw out deeper answers', 'ielts.org news, 1 Feb 2023'],
    ['How long should an answer be?', '"2-3 richly detailed sentences" (IDP); no official time target found', 'IDP, Part 3 topics and questions'],
  ] },
  { type: 'p', text: `Two details are worth a second look. If the examiner moves in while you are talking, ielts.org says that is normal and meant to draw out deeper answers, so do not read it as a sign that you did badly. And in Part 2 you get one minute with pencil and paper, but in Part 3 you are asked a question and you answer.` },
  { type: 'h2', text: 'What "general and abstract" means in practice' },
  { type: 'p', text: `A Part 3 question is usually about people in general, society or the future, and not about you. IDP gives the example that a Part 2 task on a holiday leads to Part 3 questions on tourism and leisure time. In the same article, IDP's sample questions after a topic on famous people include "What are the different kinds of famous people in your country?", "Why are famous people used in advertising?" and "Can celebrities be used to influence public opinion?" None of them asks what you did.` },
  { type: 'p', text: `A useful way to picture it is a ladder with four rungs. The Part 2 card is on the first rung: you and your experience. Part 3 climbs from there. This is our teaching picture, not an official one, and the example is invented.` },
  { type: 'compare', caption: 'The ladder from a Part 2 card to Part 3 questions. An invented example, our own teaching picture.', headers: ['Rung', 'What it is about', 'Example question (ours)'], rows: [
    ['1. You', 'Your own experience (this is the Part 2 card)', 'Describe a teacher who helped you.'],
    ['2. People like you', 'Groups and habits you know', 'What makes someone a good teacher?'],
    ['3. Society', 'How things work for a country or a generation', 'How has the way children are taught changed in your country?'],
    ['4. The future', 'Predictions, problems and choices', 'Will teachers still be needed when children can learn from software?'],
  ] },
  { type: 'p', text: `You will not be asked the questions in order, and the examiner may start high. The point is to practise moving up the ladder in your head: when you hear a question about a "good teacher", answer about teachers in general. If you answer with your own favourite teacher, you have dropped back to rung 1, and ielts.org and IDP both say that is the thing to avoid.` },
  { type: 'h2', text: 'Part 3 topics: what is known and what is not' },
  { type: 'p', text: `IDP's Nepal page groups Part 3 topics as advertising and media, education, family and society, culture and traditions, and environment, and lists others such as technology, travel, health, work, language and social change. Its sample questions include "Do adverts influence what people buy?", "What makes a good teacher?" and "How has the family structure changed over time?". IDP says the topics are drawn from "past recurring trends and real candidate reports".` },
  { type: 'p', text: `We found no official list of the Part 3 questions in current tests, and we could not check IDP's description of its source. So, as with Parts 1 and 2, use lists as practice material and spend your effort on the skill: saying something sensible, with a reason, about a topic you have not prepared. IDP's page says "Don't memorise answers", and the summary of the British Council's guidance says the same.` },
  { type: 'h2', text: 'Seven kinds of question and the answer shape for each' },
  { type: 'p', text: `Prep sites name question types in different ways, and IELTS does not publish a list. These seven are ours: a teaching scheme to help you hear what a question wants. In the room you only need to notice the kind, not name it.` },
  { type: 'compare', caption: 'Seven kinds of Part 3 question. Our own scheme with invented examples, not an official list.', headers: ['Kind', 'Example (ours)', 'What to do, and starter phrases (ours)'], rows: [
    ['View', 'Do you think people spend too much time online?', 'State a position and a reason. "I think ...", "In my view ..."'],
    ['Cause', 'Why do some people find it hard to learn a language?', 'Give one or two causes, with one developed. "One reason is ...", "That\'s partly because ..."'],
    ['Compare', 'How is shopping in a small shop different from shopping online?', 'Name two differences, then say which matters more. "On the one hand ... on the other ...", "The main difference is ..."'],
    ['Change', 'How has the way people travel changed?', 'Before, now, and what caused the change. "In the past ...", "These days ..."'],
    ['Prediction', 'Will people read fewer books in the future?', 'Say what you expect, why, and how sure you are. "I think we\'ll probably see ...", "It\'s likely that ..."'],
    ['Imagine', 'If every job could be done from home, what would happen to cities?', 'Use "would": a main result, then a side effect. "If that happened, I think ... would ..."'],
    ['Judge', 'Is it a good idea for schools to ban phones?', 'Weigh both sides, then decide. "There are good arguments on both sides, but overall ..."'],
  ] },
  { type: 'p', text: `The starter phrases are short and plain on purpose. The British Council's guidance, as summarised in search results, mentions signposting phrases such as "In my view, there are two main differences" and "I think we'll probably see" for comparing and for speculating. We could not open that page, and the worksheet it comes from is dated 2013, so treat our phrases as a starting point and not as a required list.` },
  { type: 'h2', text: 'The four-step answer' },
  { type: 'p', text: `ielts.org's article on the three parts gives a four-step structure for a Part 3 answer: give a direct answer, explain with reasons, provide an example, then offer an alternative or a consequence. IDP asks for two or three richly detailed sentences. Put together, and with the examples kept general as both advise, that gives a shape we can practise. The time figures below are our own, not official.` },
  { type: 'ul', items: [
    `Step 1, the direct answer. One sentence that answers the question asked: "I think it's mostly a matter of habit."`,
    `Step 2, the reason. One or two sentences saying why: "Many people check their phones without deciding to, so the time just disappears."`,
    `Step 3, an example. A general one: "In many offices, for instance, people answer messages all day and find they have done little real work."`,
    `Step 4, the alternative or the consequence. Another side, or what follows: "Of course, some people use their phones well, but the habit makes it hard to focus for long."`,
  ] },
  { type: 'p', text: `At a relaxed pace of about two words a second, which is a rough figure of ours, those four sentences take 25 to 35 seconds. You will not always need all four steps. A short question, such as "Do people use cash less now?", may need only steps 1 to 3. A bigger one, such as "Is it a good thing that people live longer?", deserves all four.` },
  { type: 'h3', text: 'Three invented worked answers' },
  { type: 'p', text: `Question (ours, a cause): Why do some people find it hard to study at home?` },
  { type: 'p', text: `Answer: "I think it's mainly distractions. At home there's always something else to do, like chores or the television, and nobody expects you to be working. For example, many students say they start studying and then find they have been tidying for an hour. That said, some people study better at home because it's quiet, so it depends on how disciplined you are and what your home is like." It answers, gives a reason, gives a general example and ends with the other side.` },
  { type: 'p', text: `Question (ours, a change): How has the way people shop changed in recent years?` },
  { type: 'p', text: `Answer: "Quite a lot. A few years ago most people bought clothes and household things in shops, but now many order online and expect delivery within days. The main reason is convenience, and in cities it's also easier to compare prices on a phone. As a result, some small shops have closed, although others have survived by offering something online can't, like advice or a personal service." Before, now, cause, consequence.` },
  { type: 'p', text: `Question (ours, a judgement): Is it a good idea for schools to ban phones?` },
  { type: 'p', text: `Answer: "There are good arguments on both sides, but overall I think a ban during lessons makes sense. Phones are distracting, and teachers say it's hard to hold attention when messages keep arriving. On the other hand, a phone can be useful for looking things up or for emergencies. So I'd say the best rule is no phones in class, but allowed at break." A balanced answer that still takes a position.` },
  { type: 'p', text: `None of the three says "in my case". They use "many people", "some people" and "in cities", which is the general voice ielts.org and IDP ask for. It is also easier to produce than a personal story.` },
  { type: 'h2', text: 'The tension with Part 2: general, not personal' },
  { type: 'p', text: `This surprises many candidates. In Part 2 you are asked for your own experience and are encouraged to use it. In Part 3, ielts.org advises a general view rather than a personal anecdote, and IDP lists "talking about yourself and your family" among the mistakes, adding that the examiner will steer you back to the general topic. A candidate who carries on in the Part 2 style looks as if they have not understood the question.` },
  { type: 'p', text: `A brief personal mention does no harm, and "I think" is, of course, personal. What matters is the centre of the answer. If you say "In my family we ...", follow at once with "and I think that's true of many people". We have corrected a line of our own. Our Part 2 guide told readers to give "an example from life or from people you know" in Part 3. The official pages we read for this guide advise a general view, so we changed the Part 2 guide in the same update.` },
  { type: 'image', src: '/blog/inline/ielts3-group-discussion', alt: 'Adults seated at small tables in a wood-panelled room, talking in groups, with a man in a pink shirt and a woman in a beige jacket in the foreground.', caption: 'Illustrative photo, not a Tutafy user. ielts.org suggests practising with friends or family through discussions or mini-debates.', credit: 'Photo: Dgurteen (CC BY-SA 3.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Small_group_conversation_at_a_Gurteen_Knowledge_Cafe.jpg' },
  { type: 'h2', text: 'How to extend an answer without padding it' },
  { type: 'p', text: `IDP says "It is important that you attempt to extend your responses as much as you can", and warns against short answers that do not explore the topic. The aim is to say more of what matters, not to talk for longer. These are the moves, from IDP's article and the British Council's guidance (summarised from search results), with our own wording.` },
  { type: 'compare', caption: 'Ways to extend an answer, with the language that fits each. Phrases are ours.', headers: ['Move', 'What it adds', 'Language'], rows: [
    ['Give a reason', 'The "because" behind your view', '"... because ...", "The main reason is ..."'],
    ['Give an example', 'A general case that shows it', '"For instance, ...", "Take ..., where ..."'],
    ['Compare', 'Two cases side by side', '"Compared with ...", "Whereas ...", "unlike ..."'],
    ['Weigh both sides', 'An advantage and a disadvantage', '"On the one hand ...", "That said, ..."'],
    ['Say what follows', 'A consequence or a result', '"As a result ...", "This means that ..."'],
    ['Predict or suggest', 'What may happen, or what should', '"I think we\'ll probably ...", "If ... then ... would ..."'],
  ] },
  { type: 'p', text: `IDP adds that grammar should match the function: conditionals and modal verbs for predictions and suggested solutions, and linking words for sequencing, adding, comparing, giving examples and stalling. You do not need to use every structure. Choose the move that fits the question and use its language once.` },
  { type: 'h2', text: 'Time, pauses and not knowing the topic' },
  { type: 'ul', items: [
    `Buy a moment, briefly. IDP lists "stalling" among the uses of linking words, and the British Council's guidance, as summarised in search results, suggests phrases such as "That's an interesting question" or "Let me think about that". Use one short phrase, not a speech.`,
    `Avoid empty noises. IDP warns against filling silences with "um" and "er", and against overusing "yeah", "like" and "you know". A short, silent pause reads better.`,
    `Ask if you do not understand. IDP says you can ask the examiner to explain a word you do not know. The summary of British Council guidance says asking for a repeat or clarification does not affect your score. Check both on the pages.`,
    `Do not worry about facts. The four criteria are all about language: fluency and coherence, lexical resource, grammatical range and accuracy, and pronunciation. We found none about how much you know, which is our reading of the criteria. A plain, sensible statement is enough.`,
    `Use a topic map. IDP recommends mind maps of vocabulary: for "education" you might list teacher, curriculum, exam pressure, online learning, tuition, discipline.`,
  ] },
  { type: 'h2', text: 'Mistakes that cost marks in Part 3' },
  { type: 'ul', items: [
    `Staying personal. Talking about yourself and your family, which IDP warns about.`,
    `One-sentence answers. IDP says they do not explore the topic.`,
    `Memorised answers. IDP says not to memorise them. A memorised answer also fails to match a question phrased differently.`,
    `Repeating Part 2. ielts.org says to avoid repeating the ideas from your task.`,
    `No reasons. A view without a "because" is a statement and not a discussion.`,
    `One side only. A judgement question usually gives you room to weigh two sides.`,
  ] },
  { type: 'image', src: '/blog/inline/ielts3-hourglass', alt: 'A small brass hourglass with white sand beside a brass Ferris wheel model on a wooden table against a green wall.', caption: 'Illustrative photo. There is no preparation time in Part 3, so a short pause has to do the work.', credit: 'Photo: Suohros (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Hourglass_1.jpg' },
  { type: 'h2', text: 'How to practise with a tutor: a 45-minute session' },
  { type: 'p', text: `A tutor is more use in Part 3 than a practice list, because the skill is being asked a follow-up and answering it. The tutor can play the examiner, interrupt as ielts.org says an examiner may, and press you for depth. This routine is our suggestion, not an official method. It works in person or on a video call.` },
  { type: 'ul', items: [
    `Minutes 0 to 8. A quick Part 2 card (one minute to prepare, about two minutes to speak) chosen at random by the tutor. This sets the topic for Part 3.`,
    `Minutes 8 to 18. Five Part 3 questions on the topic, one from each of five kinds, recorded. No help during it.`,
    `Minutes 18 to 28. Feedback on one thing, not three. Often it is "you stayed personal" or "you stopped after one sentence". Play back one answer.`,
    `Minutes 28 to 38. The stretch round: the tutor asks "Why?" or "Can you give an example?" or "What would someone who disagrees say?" after each answer, and you extend.`,
    `Minutes 38 to 45. A fresh topic ladder: from a new Part 2 card, write four Part 3 questions, one for each rung. Record one answer to each before the next lesson.`,
  ] },
  { type: 'h3', text: 'Three short drills for the stretch round' },
  { type: 'ul', items: [
    `The why ladder. Answer a view question, then answer "why?" three times in a row. By the third, you are in the reasons.`,
    `Two sides in 30 seconds. Give one advantage and one disadvantage of a topic, then your overall view.`,
    `Switch. The tutor names the opposite view, and you argue it for 20 seconds. It teaches you not to run dry on the other side.`,
  ] },
  { type: 'h3', text: 'A three-week plan' },
  { type: 'ul', items: [
    `Week 1. Read the official pages. Record one baseline of five questions. Pick one fix. Learn the seven kinds and one starter phrase for each.`,
    `Week 2. Two sessions: the stretch round and the drills. Build topic maps for education, work, technology and the environment, the groups IDP names.`,
    `Week 3. A full mock of Parts 1, 2 and 3 in 11 to 14 minutes, which is the time ielts.org gives for the whole test. Compare the recording of Part 3 with your week 1 baseline.`,
  ] },
  { type: 'p', text: `Our guides to IELTS Speaking Part 1 questions and Part 2 topics cover the other two parts. All three are one test, so practise them in order at least once before the test.` },
  { type: 'h2', text: 'If you are the tutor: teaching Part 3 honestly' },
  { type: 'ul', items: [
    `Teach from the official pages and say so. ielts.org gives the format and timings, and the band descriptors are public. Tell your student to check the current pages before sitting the test.`,
    `Do not promise a band score. No official page we read says a tutor can predict an examiner's score. Promise a method, honest feedback and a number of sessions.`,
    `Do not sell "the latest Part 3 questions". No official list exists that we could find, and the lists on prep sites rest on candidate reports we cannot check.`,
    `Keep your own opinions out of it. The point is a clear, reasoned answer, not agreement with you. Praise a well-supported view you disagree with.`,
    `Say what you are qualified for. Whether you have taught IELTS or sat the test belongs on your profile. How to write a tutor bio shows how, and Tutoring lesson packages explained covers selling a course of sessions.`,
  ] },
  { type: 'h2', text: 'What Tutafy is, and what it is not' },
  { type: 'p', text: `Tutafy is a tool for tutors who run their own business: a public booking page that shows your hours in the student's time zone, a video classroom that opens in the browser, email reminders, student records, and payment through your own PayPal or Stripe account, with 0% commission. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29 a month. A lesson can carry a link to a recording, such as a Loom or YouTube link, which the student sees in their portal.` },
  { type: 'ul', items: [
    `It is not an IELTS authority and has no IELTS materials, question lists or scoring.`,
    `It does not mark answers or predict a band. That is the tutor's job.`,
    `We found no recorder built into the lesson in its code. Use your own recording tool and attach the link.`,
    `It does not send you students. The tutor directory is not open yet.`,
  ] },
  { type: 'source', text: 'The official pages used for the facts about the test, read on 31 Oct 2026. The British Council pages timed out on that day, so what we say about their advice comes from search result summaries and should be checked on the page. Our question kinds, answer shapes and routines are our own advice and are marked as such. Check the current IELTS pages before you sit the test.', links: [
    { label: 'IELTS: Academic Speaking format', href: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking' },
    { label: 'IELTS: Three parts of IELTS Speaking, and what to look out for', href: 'https://ielts.org/news-and-insights/three-parts-of-ielts-speaking-and-what-to-look-out-for' },
    { label: 'IDP: How to perform at your best in Part 3 of the Speaking test', href: 'https://ielts.idp.com/prepare/article-ielts-speaking-test-part-3' },
    { label: 'IDP: Part 3 topics and questions', href: 'https://ielts.idp.com/nepal/prepare/speaking/part-3-topics-and-questions' },
    { label: 'British Council: IELTS Speaking Part 3 overview and practice (not opened on 31 Oct 2026)', href: 'https://takeielts.britishcouncil.org/sites/default/files/speaking_part_3_overview_and_practice.pdf' },
    { label: 'British Council: IELTS Speaking test, how it works (not opened on 31 Oct 2026)', href: 'https://takeielts.britishcouncil.org/what-is-ielts/how-it-works/test-format/speaking' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'IELTS Speaking Part 1 questions', href: '/blog/ielts-speaking-part-1-questions', text: 'Topics, answer shapes and a tutor routine for the opening interview.' },
    { label: 'IELTS Speaking Part 2 topics', href: '/blog/ielts-speaking-part-2-topics', text: 'The task card, 30 practice cards and a tutor routine.' },
    { label: 'How to teach English online', href: '/blog/how-to-teach-english-online', text: 'Qualifications, tools and lesson structure for English tutors.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'Say what you are qualified to teach.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'Sell a course of practice sessions.' },
  ] },
  { type: 'faq', items: [
    { q: 'How long is IELTS Speaking Part 3?', a: `According to ielts.org, Part 3 lasts 4 to 5 minutes. The whole Speaking test takes 11 to 14 minutes.` },
    { q: 'Is there preparation time in Part 3?', a: `No. ielts.org's article on the three parts says there is no preparation time in Part 3. The one minute of preparation belongs to Part 2.` },
    { q: 'How long should a Part 3 answer be?', a: `IDP advises two or three richly detailed sentences. We found no official time target. By our rough figure, that is about 20 to 35 seconds.` },
    { q: 'Can I use personal examples in Part 3?', a: `ielts.org advises a general view rather than a personal anecdote, and IDP lists talking about yourself and your family as a mistake. A brief personal mention is harmless, but the centre of the answer should be general.` },
    { q: 'What if I do not understand the question?', a: `IDP says you can ask the examiner to explain a word you do not understand. The summary of British Council guidance says asking for a repeat or clarification does not affect your score. Check that on the British Council page.` },
    { q: 'Are there official Part 3 questions for this year?', a: `We found no official list. IDP publishes sample questions and says the topics come from past recurring trends and real candidate reports, which we could not check. Treat any list as practice.` },
    { q: 'Can a tutor guarantee my IELTS speaking score?', a: `No. No official page we read says a tutor can predict an examiner's score. A good tutor offers practice, recorded answers and honest feedback against the four criteria, not a guarantee.` },
    { q: 'Does Tutafy have IELTS questions or score my answers?', a: `No. Tutafy is a tool for tutors to book, teach and get paid. It has no IELTS materials or scoring, and it does not record lessons itself, though a lesson can carry a link to a recording.` },
  ] },
  { type: 'cta', title: 'Teach IELTS speaking from one booking link', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy has no IELTS materials and does not send students.', button: 'Start free, no credit card', href: '/register' },
]
