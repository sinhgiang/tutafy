// T-1220. Article body for /blog/ielts-speaking-part-1-questions (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, article 9. Reader: mostly a LEARNER preparing for the test, also a tutor who teaches it.
// Step 0 (31 Oct 2026). Google results for "ielts speaking part 1" (read as a list of titles and addresses; no search volume was available, the plan says so): the first page is
//   made of preparation sites (Cathoven, IELTS Liz, Magoosh, Testglider, IELTS Podcast, regional IDP pages, a British Council worksheet) that give topic lists, sample questions and
//   sample answers. On this site the only guide on the subject is ielts-speaking-part-2-topics, which covers Part 1 in one table row and one bullet. Overlap: low; the Part 2 guide is linked both ways.
//   OWN ANGLE: Part 1 tested as a habit and not as a list. (1) what "about 12 questions in 4 to 5 minutes" means for the length of one answer (our arithmetic, said to be ours),
//   (2) an honest note on "repeated topics" (IDP says they repeat; we cannot check it, so the advice is a method), (3) eight question types with one answer shape each,
//   (4) 40 practice questions of our own, labelled ours, (5) the tutor plays the examiner and asks follow-ups, with a 40-minute routine, (6) what Tutafy is not.
// Tutafy is NOT an authority on IELTS (the ticket says so): every fact about the test comes from an official page (ielts.org, IDP, British Council) and says so; our own advice is marked as ours.
//
// Sources, read on 31 Oct 2026:
//   Read directly: ielts.org, IELTS Academic format, Speaking: "11-14 minutes", three parts, "The Speaking test is recorded", Part 1 "is 4-5 minutes long", the examiner "introduces him/herself
//     and checks your identity", then asks "general questions on some familiar topics, such as home, family, work, studies or interests"; scored on four criteria: fluency and coherence,
//     lexical resource, grammatical range and accuracy, pronunciation. (The same page was used for the Part 2 guide.)
//   Read directly: ielts.org news and insights, "Three parts of IELTS Speaking, and what to look out for", published 1 Feb 2023, first published on IELTS.IDP.com, no author shown: Part 1 warm-up questions
//     on interests, family, home life and background; examiners look for smooth speaking and a broad range of vocabulary; advice "stick to what you know" and "don't be afraid to be yourself".
//     It gives no number of questions and no target length for an answer.
//   Read directly: IDP (Bangladesh page), "Part 1 topics and questions": "About 12 simple questions on familiar everyday topics" in a "4-5-minute conversation"; "a natural friendly conversation,
//     not a test of 'perfect' English"; topic groups (work or study, home and hometown, daily routine, hobbies, food, music and films, travel and transport, weather, technology, friends and family,
//     "from clothes and shopping to pets and flowers"); example questions quoted below; sample answers of two to three sentences; no target length; it says these themes "have appeared year after year" and that
//     there is "a strong chance you'll get similar questions", which is IDP's statement and not something we could check; it advises against memorising and for a topic bank of ideas and vocabulary.
//   NOT opened (the pages timed out on 31 Oct 2026): the British Council Part 1 practice page, "Say it better" worksheet (dated 2013) and Academic Speaking preparation page. What we say they advise
//     (a reason or example in each answer, two or three sentences, no memorised answers, asking the examiner to repeat or explain does not affect the score) comes from the summary of
//     search results of those pages, and the article says so.
// Not read, so not written: any list of the questions in current tests (none is published by IELTS that we found), how often topics change, the examiner's script (not public), a band-score prediction, the text of the band descriptors.
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/lib/plan-list.ts (Free: up to 10 students, booking page, built-in video classroom, email reminders; Pro $12 a month; Academy $29 a month),
// a lesson has a field for a link to a recording that the student's portal shows (src/components/RecordingEmbed.tsx); no recorder of its own and no IELTS content or scoring in src.
// All questions, answers, numbers and names in the examples are invented by us and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const IELTS_PART1_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'IELTS Speaking Part 1 is a 4 to 5 minute interview about familiar topics such as home, family, work, studies or interests, according to ielts.org. IDP says to expect about 12 simple questions.',
    'That works out at roughly 20 to 25 seconds for each question and answer. This is our arithmetic, not an official target, but it tells you that two or three sentences is the right size.',
    'We found no official list of the questions in current tests. IDP says its topics have appeared year after year, which we cannot check. A method works better than memorised answers.',
    'A good Part 1 answer has three beats: a direct answer, a reason and one small detail. Below are 40 practice questions we wrote, eight question types and a 40-minute routine with a tutor.',
    'Tutafy is not an official source on IELTS. The test facts come from IELTS, IDP and British Council pages, and our own advice is marked as ours.',
  ] },
  { type: 'p', text: `IELTS Speaking Part 1 questions are the opening questions of the speaking test. The examiner introduces themselves, checks your identity, then asks general questions about you and your life, on familiar topics such as home, family, work, studies or interests. It is the shortest and easiest-looking part of the test, and it is where many candidates talk too little.` },
  { type: 'p', text: `This guide is for learners preparing for the test and for tutors who teach it. It explains Part 1 from the official pages, says what is and is not known about the questions, and gives you practice questions, answer shapes and a routine with a tutor playing the examiner. We are a tutoring-software company, not an IELTS authority, so we point to an official source for each fact about the test.` },
  { type: 'image', src: '/blog/inline/ielts1-young-conversation', alt: 'Three young people standing and talking outdoors in front of a stone wall, a young man in a baseball shirt listening to a smiling woman in a yellow top.', caption: 'Illustrative photo, not a Tutafy user. Part 1 is meant to feel like an ordinary conversation.', credit: 'Photo: Alexis Brown (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Young_people_in_conversation_(Unsplash).jpg' },
  { type: 'h2', text: 'What Part 1 is, by the official pages' },
  { type: 'p', text: `The Speaking test is a face-to-face interview with an examiner, it is recorded, and ielts.org gives the total time as 11 to 14 minutes. Part 1 is the first of three parts. It takes 4 to 5 minutes. The examiner introduces themselves and checks your identity, and then the questions begin.` },
  { type: 'compare', caption: 'What the official pages say about Part 1, and what they leave out. Read on 31 Oct 2026.', headers: ['Question', 'What the page says', 'Source'], rows: [
    ['How long is Part 1?', '4 to 5 minutes', 'ielts.org, Academic Speaking format'],
    ['What is it about?', 'General questions on some familiar topics, such as home, family, work, studies or interests', 'ielts.org, Academic Speaking format'],
    ['How many questions?', 'About 12 simple questions on familiar everyday topics', 'IDP, Part 1 topics and questions'],
    ['What are examiners listening for?', 'Smooth speaking and a broad range of vocabulary; "stick to what you know" and "don\'t be afraid to be yourself"', 'ielts.org news, 1 Feb 2023'],
    ['How long should one answer be?', 'No target given. IDP\'s own sample answers run to two or three sentences.', 'IDP, Part 1 topics and questions'],
    ['Are the questions published?', 'Not as a list of current exam questions. IDP says similar themes have appeared year after year.', 'IDP, Part 1 topics and questions'],
  ] },
  { type: 'p', text: `The Speaking test is the same for IELTS Academic and General Training, according to ielts.org, so Part 1 does not change with the version you sit. Certificated examiners assess you on four criteria across the test: fluency and coherence, lexical resource, grammatical range and accuracy, and pronunciation. The page we read does not give a separate score for each part. IDP describes Part 1 as "a natural friendly conversation, not a test of 'perfect' English".` },
  { type: 'p', text: `Notice what none of this says: no page we read says Part 1 counts for less than the other parts, or that a short answer is a failure. Part 1 is simply where the examiner first hears you speak, and a start of one-word answers is a poor way to begin. That is our reading, not an official statement.` },
  { type: 'h2', text: 'What "about 12 questions in 4 to 5 minutes" means for one answer' },
  { type: 'p', text: `ielts.org says Part 1 takes 4 to 5 minutes, and IDP says to expect about 12 questions. Divide one by the other. Four minutes is 240 seconds, five minutes is 300 seconds, and each divided by 12 gives 20 to 25 seconds. That time has to cover the examiner asking the question, a short pause, and your answer. This is our arithmetic. Neither organisation gives a per-question target, and the real number of questions can differ.` },
  { type: 'p', text: `The practical result is useful. An answer of one word or one short sentence takes two or three seconds and leaves the examiner with nothing to assess. An answer of eight sentences takes a minute, uses the time of several questions and may be cut off by the examiner moving on. At a relaxed pace of about two words a second (a rough figure of ours), a 15-second answer is about 30 words: two or three sentences, which matches the length of IDP's samples.` },
  { type: 'compare', caption: 'The size of a Part 1 answer, by our arithmetic. These are our practice targets, not official ones.', headers: ['Answer', 'Typical length', 'What the examiner hears'], rows: [
    ['One word or a fragment', '1 to 3 seconds', 'Almost nothing to assess for vocabulary, grammar or fluency.'],
    ['One full sentence', 'About 5 seconds', 'A correct reply, but no reason or detail, so little range.'],
    ['Two or three sentences', '10 to 20 seconds', 'A reply, a reason and a detail: enough language to assess, and the pace of a conversation.'],
    ['Five or more sentences', '30 seconds or more', 'Good language, but it eats the time of other questions and drifts off the point.'],
  ] },
  { type: 'p', text: `Treat "two or three sentences" as a habit to build, not a rule to count. A question such as "Do you work or study?" may need only a short complete answer, and "Tell me about your hometown" may deserve more. The target is a natural exchange.` },
  { type: 'h2', text: 'What topics come up, and what "repeated topics" can and cannot tell you' },
  { type: 'p', text: `ielts.org names the family of topics: home, family, work, studies or interests. IDP's page adds hometown, daily routine, hobbies, food, music and films, travel, weather, technology and friends, and says topics range "from clothes and shopping to pets and flowers". The groupings are broad.` },
  { type: 'p', text: `IDP also says these themes "have appeared year after year" and that there is "a strong chance you'll get similar questions" on test day. We could not check that claim, and we found no official list of the questions in current tests. Many websites publish lists of "latest" Part 1 questions, often with a quarter or a year in the title. They are usually built from what candidates remember after the test. Use them as extra practice if you like. Do not treat them as a forecast.` },
  { type: 'p', text: `The reason to avoid memorising is practical. IDP advises against it, and so does what we found of the British Council's guidance (we could not open those pages, so this is from the summary of search results). An examiner asking a question in your prepared topic can still phrase it in an unexpected way, and a recited answer sounds recited. What carries over from topic to topic is a topic bank: for each theme, a handful of ideas, real details and the words you need. IDP recommends exactly this.` },
  { type: 'h2', text: '40 practice questions we wrote' },
  { type: 'p', text: `These are our own practice questions. They are not exam questions, they are not copied from any test, and we do not say they will appear. They follow the themes ielts.org and IDP name. Have a tutor or friend choose at random so you cannot prepare for one.` },
  { type: 'ul', items: [
    `Work and study: What do you do, and do you enjoy it? What is the best part of your day at work or college? Is there something you would change about your job or course? Why did you choose it? What would you like to study or do in the future?`,
    `Home: Can you describe the place where you live? Which room do you spend most time in? Do you prefer a house or a flat? What would you change about your home? Who do you live with?`,
    `Hometown and area: Where are you from? What is it known for? Has it changed since you were a child? Would you recommend it to a visitor? Do you think you will live there in ten years?`,
    `Daily routine: What is a normal weekday like for you? Are you a morning or an evening person? Do you plan your day, or just see what happens? What do you do to relax in the evening? Has your routine changed in the last year?`,
    `Free time: What do you do in your free time? Is there a hobby you gave up? Do you prefer to be alone or with friends at weekends? How did you get into your main hobby? Is there something new you would like to try?`,
    `Food and shopping: What do you usually eat for breakfast? Do you cook, or do you eat out? Is there a dish from your country you would suggest to visitors? Do you enjoy shopping? Do you prefer shopping online or in shops?`,
    `Travel, weather and technology: How do you usually travel to work or college? What is the weather like in your town? Which season do you like best? How often do you use your phone? Is there an app you could not live without?`,
    `People, music and films: Who are you closest to in your family? Do you see your friends often? What kind of music do you listen to? Do you prefer films at home or at the cinema? Has your taste in music changed?`,
  ] },
  { type: 'image', src: '/blog/inline/ielts1-dictionary-page', alt: 'Close-up of an open dictionary page with the word "focus" in bold and a shallow depth of field blurring the surrounding entries.', caption: 'Illustrative photo. A topic bank is a page of ideas and words for each theme, not a script.', credit: 'Photo: Romain Vignes (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Focus_definition_(Unsplash).jpg' },
  { type: 'h2', text: 'Eight question types and the answer shape for each' },
  { type: 'p', text: `Part 1 questions look different on the surface but fall into a few types. The type tells you what a good answer needs. The names are ours, not IELTS terms, and they are a teaching tool: you do not need to name the type in the room, only to hear it. The examples are invented.` },
  { type: 'compare', caption: 'Question types for Part 1, with the shape of a good answer. Our own teaching scheme, not an official list.', headers: ['Type', 'Example (ours)', 'Shape of the answer'], rows: [
    ['Yes or no', 'Do you enjoy cooking?', 'Yes or no, a reason, one detail. Never just "yes".'],
    ['Frequency', 'How often do you visit your grandparents?', 'The frequency, what usually happens, whether it is changing.'],
    ['Preference', 'Do you prefer tea or coffee?', 'Your choice, why, and when you choose the other.'],
    ['Description', 'Can you describe your neighbourhood?', 'Two or three features in a sensible order, one example each.'],
    ['Past experience', 'Did you enjoy school?', 'Past tense: your view, one memory, how you feel now.'],
    ['Reason', 'Why did you choose your course?', 'The main reason first, then a second reason or a story.'],
    ['Change', 'Has your town changed in recent years?', 'Before, now, and one example of the difference.'],
    ['Future', 'Would you like to live abroad?', 'Your view, a reason, a condition: "if I could find ...".'],
  ] },
  { type: 'p', text: `Underneath, the shape is the same for every type: answer first, then say why, then add something small and specific. The table only adjusts the second and third beats.` },
  { type: 'h2', text: 'The three-beat answer' },
  { type: 'p', text: `Here is our simple method, built on what the official pages say about Part 1 and on IDP's two-to-three-sentence samples. It is our advice and not an official method. Answer in three beats: a direct answer, a reason, a detail. The detail is the part most candidates leave out and the part that makes you sound like a person and not a form.` },
  { type: 'ul', items: [
    `Beat 1, the answer. Say it plainly and at once: "Yes, I do", "Not really", "I'm a nurse", "It's a small town in the north." Do not begin with "That's a good question".`,
    `Beat 2, the reason. One "because" or "so": "because it gets me outside", "so I never learned to cook properly".`,
    `Beat 3, the detail. One specific thing: a person, a place, a time, a number, a small example: "My brother and I go every Sunday, if the weather is good."`,
  ] },
  { type: 'h3', text: 'Three invented examples, from thin to better' },
  { type: 'p', text: `Question (ours): Do you enjoy cooking?` },
  { type: 'p', text: `Thin: "Yes." Why it is thin: one word, nothing to assess.` },
  { type: 'p', text: `Better: "Yes, I do, mostly at weekends, because during the week I'm too tired. On Sundays I usually make a big pot of soup for the family, and my little sister helps by chopping the vegetables." Three beats, about 35 words, a tense that matches the question, a small detail.` },
  { type: 'p', text: `Question (ours): How often do you visit your grandparents?` },
  { type: 'p', text: `Thin: "Sometimes."` },
  { type: 'p', text: `Better: "About once a month, though it used to be every week when they lived nearer. We usually have lunch together, and my grandmother always sends me home with something she's baked." Frequency, a change over time and a detail.` },
  { type: 'p', text: `Question (ours): Did you enjoy school?` },
  { type: 'p', text: `Thin: "It was OK."` },
  { type: 'p', text: `Better: "Mostly, yes. I liked the subjects that let me move around, like science experiments and sport, but I found long lectures hard. I remember one chemistry teacher who let us try the demonstrations ourselves, and that's probably why I still like the subject." A past-tense answer, a contrast, a memory.` },
  { type: 'p', text: `A caution from our own teaching: an answer can be too long as well. If you find yourself on a fourth or fifth sentence, finish it and stop. A long answer uses time that the other questions need, and we found no official page that rewards one.` },
  { type: 'h2', text: 'Words and grammar that help without sounding rehearsed' },
  { type: 'p', text: `ielts.org says examiners look for smooth speaking and a broad range of vocabulary in Part 1. That does not mean difficult words. It means you can talk about everyday things without repeating the same two adjectives and without long stops to search. A few habits help, and they are our suggestions.` },
  { type: 'ul', items: [
    `Match the tense to the question. "Did you ..." gets a past tense; "Do you usually ..." gets a present; "Would you like ..." gets "I'd" or "I would". Tense errors are common when people answer a question they have prepared.`,
    `Paraphrase the question once, naturally. "Do you work or study?" becomes "I work as ..." and not "I work or study". It shows range without effort.`,
    `Keep a short list of topic words for each theme in your bank. For "home": flat, neighbourhood, landlord, spacious, cosy, a short commute. For "free time": unwind, hobby, take up, get into, a weekend routine.`,
    `Say "I'm not sure, but I think ..." when you have no experience of the topic, then speculate. A short natural guess is better than silence.`,
    `Ask for a repeat if you did not catch the question. The summary of the British Council's guidance says this does not affect your score; check that on the official page.`,
  ] },
  { type: 'p', text: `Pronunciation is the fourth criterion and Part 1 is where it first shows. In our view, being easy to follow matters more than having a particular accent, and the official band descriptors for pronunciation are the place to check. A tutor can tell you which two or three words or sounds made them work harder to understand you. That is far more useful than a general comment that your pronunciation "needs work".` },
  { type: 'h2', text: 'Mistakes that cost marks in Part 1' },
  { type: 'ul', items: [
    `One-word answers. They give the examiner nothing to assess and make the exchange feel like a quiz.`,
    `Memorised answers. IDP advises against them. They tend to sound read out, and a different question in the same topic breaks them.`,
    `Answering the topic and not the question. If asked "Do you prefer tea or coffee?" and you describe the history of tea, you have not answered.`,
    `Wrong tense. A past question answered in the present makes your grammar look weaker than it is.`,
    `Speeches. A long reply to one question uses up time that other questions need.`,
    `Pretending. Claiming a hobby you do not have means inventing details in real time. A true, modest answer is easier: "I don't have much free time, but when I do ...".`,
  ] },
  { type: 'image', src: '/blog/inline/ielts1-empty-audience', alt: 'Black chairs in the foreground and a blurred woman in a black top standing at the front of a white room, gesturing as if speaking to an audience.', caption: 'Illustrative photo, not a Tutafy user. Practising out loud, even to an empty room, is a different skill from reading answers.', credit: 'Photo: delegateconnectimages (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Speaking_To_An_Empty_Audience_-_Public_Speaking.jpg' },
  { type: 'h2', text: 'How to practise with a tutor: a 40-minute session' },
  { type: 'p', text: `Part 1 is a conversation, so it is hard to improve by reading. You improve by being asked questions you have not seen and answering aloud. A tutor can play the examiner, ask follow-ups and listen to the specific habits that cost you. This routine works in person or on a video call, and it is our suggestion rather than an official method.` },
  { type: 'ul', items: [
    `Minutes 0 to 5. Warm-up and identity check, as the examiner would do. The tutor asks your name and what you would like to be called, then two easy questions to settle your voice.`,
    `Minutes 5 to 15. A mock Part 1: three topics, four questions each, about 12 questions in 4 to 5 minutes, recorded. The tutor takes no notes during it and does not correct you.`,
    `Minutes 15 to 25. Feedback on two things only, under the four criteria. Play back one answer so you hear the problem. Typical pair: answers too short, and one tense error that repeats.`,
    `Minutes 25 to 35. Repeat the same questions, fixing the two things. Then four new questions from a theme you have not tried.`,
    `Minutes 35 to 40. Choose two topics for your topic bank, and write down three details for each: a person, a place and a small story. Record yourself on both before the next lesson.`,
  ] },
  { type: 'p', text: `Two moves make a tutor more useful than a practice list. The first is the follow-up. After an answer, the tutor asks "Why is that?" or "Can you give me an example?", which trains you to expect, and supply, the second and third beats. The second is the repeat. Asking the same question again after feedback shows you that you can improve a spoken answer in minutes.` },
  { type: 'h3', text: 'A two-week plan' },
  { type: 'ul', items: [
    `Week 1. Read the official pages for the format. Record one baseline mock of 12 questions. Choose two things to fix. Build topic banks for work or study, home, hometown and free time.`,
    `Week 2. Three sessions of 12 questions, each from different themes. Work on the two fixes, and add the remaining themes to your banks. At the end, compare the recording with your week 1 baseline.`,
  ] },
  { type: 'p', text: `Part 1 is only the first of three parts, and ielts.org describes all three as one test. After two weeks of Part 1, move on to the other parts. Our guide to IELTS Speaking Part 2 topics covers the task card, and our guide to Part 3 covers the discussion questions that follow.` },
  { type: 'h2', text: 'If you are the tutor: teaching Part 1 honestly' },
  { type: 'ul', items: [
    `Teach from the official pages and say so. The format and timings are on ielts.org, and the band descriptors are public. Tell your student to check the current pages before they sit the test.`,
    `Do not promise a band score. No official page we read says a tutor can predict how an examiner will score. Promise a method, honest feedback and a number of practice sessions.`,
    `Do not sell "the latest Part 1 questions". No official list exists that we could find. A list claiming to be real exam content is a risk to your student and your reputation.`,
    `Play the examiner properly: ask, wait, ask a follow-up. Keep feedback for afterwards and limit it to two points.`,
    `Say what you are qualified for. Whether you have taught IELTS, studied the descriptors or sat the test belongs on your profile. How to write a tutor bio shows how to say it briefly.`,
  ] },
  { type: 'p', text: `A course of practice sessions is easier to explain than ten separate lessons. Tutoring lesson packages explained covers how to price one.` },
  { type: 'h2', text: 'What Tutafy is, and what it is not' },
  { type: 'p', text: `Tutafy is a tool for tutors who run their own business: a public booking page that shows your hours in the student's time zone, a video classroom that opens in the browser, email reminders, student records, and payment through your own PayPal or Stripe account, with 0% commission. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29 a month. A lesson can carry a link to a recording, such as a Loom or YouTube link, which the student sees in their portal.` },
  { type: 'ul', items: [
    `It is not an IELTS authority and has no IELTS materials, question lists or scoring.`,
    `It does not mark answers or predict a band. That is the tutor's job.`,
    `We found no recorder built into the lesson in its code. Use your own recording tool and attach the link.`,
    `It does not send you students. The tutor directory is not open yet.`,
  ] },
  { type: 'source', text: 'The official pages used for the facts about the test, read on 31 Oct 2026. The British Council pages timed out on that day, so what we say about their advice comes from search result summaries and should be checked on the page. Our practice questions and routines are our own advice and are marked as such. Check the current IELTS pages before you sit the test.', links: [
    { label: 'IELTS: Academic Speaking format', href: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking' },
    { label: 'IELTS: Three parts of IELTS Speaking, and what to look out for', href: 'https://ielts.org/news-and-insights/three-parts-of-ielts-speaking-and-what-to-look-out-for' },
    { label: 'IDP: Part 1 topics and questions', href: 'https://ielts.idp.com/bangladesh/prepare/speaking/part-1-topics-and-questions' },
    { label: 'British Council: IELTS Academic Speaking preparation (not opened on 31 Oct 2026)', href: 'https://takeielts.britishcouncil.org/prepare/ielts-academic/speaking' },
    { label: 'British Council: Free IELTS Speaking practice, Part 1 (not opened on 31 Oct 2026)', href: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-english-practice-tests/speaking/part-1' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'IELTS Speaking Part 2 topics', href: '/blog/ielts-speaking-part-2-topics', text: 'The task card, 30 practice cards and a tutor routine.' },
    { label: 'IELTS Speaking Part 3 questions', href: '/blog/ielts-speaking-part-3-questions', text: 'Discussion question types and how to extend your answers.' },
    { label: 'How to teach English online', href: '/blog/how-to-teach-english-online', text: 'Qualifications, tools and lesson structure for English tutors.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'Say what you are qualified to teach.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'Sell a course of practice sessions.' },
  ] },
  { type: 'faq', items: [
    { q: 'How long is IELTS Speaking Part 1?', a: `According to ielts.org, Part 1 is 4 to 5 minutes long. The whole Speaking test takes 11 to 14 minutes.` },
    { q: 'How many questions are in IELTS Speaking Part 1?', a: `IDP says to expect about 12 simple questions on familiar everyday topics. ielts.org gives the time but not a number of questions, so treat 12 as a guide.` },
    { q: 'How long should my answers be in Part 1?', a: `We found no official target. IDP's sample answers run to two or three sentences. By our arithmetic, 12 questions in 4 to 5 minutes leaves about 20 to 25 seconds for each question and answer.` },
    { q: 'Is there an official list of the latest Part 1 questions?', a: `We found none. IELTS publishes sample tasks, and IDP publishes example questions, but neither says they are the current exam questions. Treat any list that claims to be the latest as practice, not as a forecast.` },
    { q: 'Should I memorise answers for Part 1?', a: `IDP advises against it. Build a topic bank of ideas, details and vocabulary instead, and practise answering aloud.` },
    { q: 'Can a tutor guarantee my IELTS speaking score?', a: `No. No official page we read says a tutor can predict an examiner's score. A good tutor offers practice, recorded answers and honest feedback against the four criteria, not a guarantee.` },
    { q: 'Does Tutafy have IELTS questions or score my answers?', a: `No. Tutafy is a tool for tutors to book, teach and get paid. It has no IELTS materials or scoring, and it does not record lessons itself, though a lesson can carry a link to a recording.` },
  ] },
  { type: 'cta', title: 'Teach IELTS speaking from one booking link', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy has no IELTS materials and does not send students.', button: 'Start free, no credit card', href: '/register' },
]
