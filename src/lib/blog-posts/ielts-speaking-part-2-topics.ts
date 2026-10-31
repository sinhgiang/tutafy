// T-1194. Article body for /blog/ielts-speaking-part-2-topics (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1230-tutafy-traffic-10-articles-plan.md, article 3; keyword data: reports/chief/2026-10-31-1315-keyword-data-sapa-tutafy.md
// (OpenSEO, US, English, 31 Oct 2026: "ielts speaking part 2 topics" about 2,900 searches a month, difficulty 4). Reader: mostly a LEARNER, also a tutor who teaches IELTS.
// Step 0 (overlap with the articles on master and in the calendar branches, 31 Oct 2026): nothing on IELTS exists ("ielts" appears only as a word in a few unrelated posts). how-to-teach-english-online is the nearest
// (English tutors in general); this guide links to it, to the niche, pricing, packages and bio guides. Own angle: what Part 2 is by the official pages, an honest answer to "latest topics" (no official list found,
// so we give ourselves a practice bank and say so), a way to practise with a tutor, and what Tutafy is not (not an IELTS source, no scoring).
// Tutafy is NOT an authority on IELTS (the ticket says so): every fact about the test is from an official page (ielts.org, IDP, British Council) and says so; our own advice is marked as ours.
//
// Sources, read on 31 Oct 2026:
//   Read directly: ielts.org, IELTS Academic format, Speaking: "Time allowed: 11-14 minutes"; "a face-to-face interview between the test taker and an examiner"; recorded; Part 1 introduction and interview 4 to 5 minutes (general
//     questions on familiar topics such as home, family, work, studies or interests); Part 2 long turn "lasts 3-4 minutes, including the preparation time": a task card with points to cover and one aspect to explain, one minute to prepare
//     with pencil and paper, then about two minutes, the examiner stops you; the examiner may ask one or two questions on the same topic; Part 3 discussion 4 to 5 minutes, issues related to the Part 2 topic in a more general and abstract way;
//     scored by certificated examiners on four criteria: fluency and coherence, lexical resource, grammatical range and accuracy, pronunciation.
//   Read directly: ielts.org, sample test questions page: the Speaking test is the same for Academic and General Training; the only practice material on it is a PDF "Speaking sample tasks (PDF, 1.31 MB, 7 pages)" (we could not read the PDF text).
//   Read directly: IDP, "IELTS Speaking practice questions and sample tasks": "You will have exactly one minute to prepare and make notes before you speak"; "you should try to keep talking for the full 2 minutes"; "You can use your own experience on the topic".
//   Read directly: IDP Thailand, cue card topics: 20 "popular IELTS cue card topics" (listed in the text below, by title); the page says "These are just some examples of the many topics that can appear in the IELTS speaking test" and does not say they are
//     current exam questions; prep "one minute ... paper and pencil for notes, then speak for 1 to 2 minutes".
//   Read directly (metadata only; the PDF text is compressed): ielts.org, "IELTS Speaking Band Descriptors", created 16 Sep 2025, copyright IELTS (British Council, IDP IELTS, Cambridge University Press & Assessment).
//   From search results of official pages: the four criteria carry equal weight, 25% each (IDP); the British Council practice Part 2 card is about a possession that matters to you (1 minute to plan, 1 to 2 minutes to talk); IDP says it is okay
//     to have no personal experience of a topic (explain and speculate); the examiner's script is not public (a Cambridge-linked 2011 research report).
// Not read, so not written: any list of the CURRENT topics in live tests (none is published by IELTS that we found), a band-score prediction, the text of the band descriptors, how often topics change, Tutafy's effect on any score.
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/lib/plan-list.ts and plans.ts (plans), a lesson has a field for a link to a recording that the student's portal shows (src/components/RecordingEmbed.tsx and the lesson pages);
// no recorder of its own and no IELTS content or scoring in src. All cards, answers and numbers in the examples are invented by us and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const IELTS_PART2_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'IELTS Speaking Part 2 is a long turn. You get a task card, one minute to prepare with pencil and paper, then you talk for about two minutes. The whole part takes 3 to 4 minutes, according to ielts.org.',
    'We found no official list of current Part 2 topics. IELTS publishes sample tasks, and IDP lists 20 popular cue card topics but says they are only examples. Be careful with any list that claims to be the latest.',
    'The four scoring criteria are fluency and coherence, lexical resource, grammatical range and accuracy, and pronunciation. None of them asks whether your story is true.',
    'The best practice is to answer a card aloud, record it, and have a tutor mark it against the four criteria. This guide gives a 45-minute routine and 30 practice cards we wrote ourselves.',
    'Tutafy is not an official source on IELTS. The test facts here come from IELTS, IDP and British Council pages, and our own advice is marked as ours.',
  ] },
  { type: 'p', text: `IELTS Speaking Part 2 topics are the subjects on the task card the examiner hands you: you prepare for one minute, then talk for about two minutes. The topic is something familiar, such as a person, a place, an object or an event, and the card tells you what to cover. The test is the same for IELTS Academic and General Training, according to ielts.org.` },
  { type: 'p', text: `This guide is for learners preparing for the test and for tutors who teach it. It explains Part 2 using the official pages, says honestly what is and is not known about topics, gives you practice cards and a way to answer them, and shows how to practise with a tutor. We are a tutoring-software company, not an IELTS authority, so we point to the official source for every fact about the test.` },
  { type: 'image', src: '/blog/inline/ielts-pen-notes', alt: 'A hand holding a white pen with black stars, writing notes in a spiral notebook on a dark background.', caption: 'Illustrative photo, not a Tutafy user. You may make notes in the one minute before Part 2.', credit: 'Photo: Tookapic (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Pen-writing-notes-studying.jpg' },
  { type: 'h2', text: 'What Part 2 is, by the official pages' },
  { type: 'p', text: `The IELTS Speaking test is a face-to-face interview between you and an examiner, and it is recorded. ielts.org gives the time as 11 to 14 minutes, in three parts. Part 2 is the middle one.` },
  { type: 'compare', caption: 'The three parts of the Speaking test, from the IELTS Academic format page on ielts.org, read 31 Oct 2026.', headers: ['Part', 'Time', 'What happens'], rows: [
    ['Part 1: introduction and interview', '4 to 5 minutes', 'The examiner checks your identity and asks general questions on familiar topics such as home, family, work, studies or interests.'],
    ['Part 2: long turn', '3 to 4 minutes, including preparation', 'You get a task card with points to cover and one aspect to explain, one minute to prepare with pencil and paper, then talk for about two minutes. The examiner stops you. They may ask one or two questions on the topic.'],
    ['Part 3: discussion', '4 to 5 minutes', 'You discuss issues linked to the Part 2 topic in a more general and abstract way, sometimes in more depth.'],
  ] },
  { type: 'p', text: `Two details differ between official pages, and it helps to know. ielts.org says you talk for about two minutes. IDP and the British Council describe it as one to two minutes, and IDP advises you to keep talking for the full two. The safe plan is to prepare to fill two minutes, and not to worry if the examiner stops you.` },
  { type: 'p', text: `Part 3 follows your Part 2 topic. If your card was about a teacher who helped you, Part 3 may ask about teaching and education in general. So a good Part 2 topic is not only a story to tell. It is also a doorway into a conversation, and your vocabulary for the topic carries into the next part.` },
  { type: 'h2', text: 'Where Part 2 topics come from, and the trouble with "latest topics"' },
  { type: 'p', text: `Searches for "IELTS Speaking Part 2 topics" mostly want a list of the cards in current tests. We looked, and we found no official list. IELTS publishes sample tasks, and the ielts.org sample page links one seven-page PDF for Speaking. IDP publishes a list of 20 popular cue card topics, and says "These are just some examples of the many topics that can appear in the IELTS speaking test." It does not say they are current exam questions.` },
  { type: 'p', text: `That means a page that claims to list the latest real topics is relying on something other than IELTS, usually candidates' memories after the test. We cannot check those lists and neither can you. They can still be useful as practice. Treat them as practice, and not as a forecast, because spending your time on twenty memorised answers is a poor use of it. The skill the test rewards is speaking well about a topic you have not prepared, which is why this guide gives you a method and practice cards instead of answers to memorise.` },
  { type: 'h3', text: 'The 20 topics IDP lists as popular' },
  { type: 'p', text: `For reference, IDP's page lists these, grouped here by us. Each is phrased on the page as "Describe ...".` },
  { type: 'ul', items: [
    `People: a person who has had a significant influence on your life; a famous person from your country; a teacher who had a positive impact on you.`,
    `Places: a place you have visited and liked; a historical building or monument in your country; a famous tourist destination in your country; a memorable journey you have taken.`,
    `Events and culture: an important event in your life; a festival or celebration in your culture; a family tradition or custom; a meal you enjoyed recently.`,
    `Things you like: your favourite book or movie; your favourite hobby or leisure activity; a piece of art or music that you like; a sport or game you enjoy playing or watching; your favourite season or weather.`,
    `Everyday life and the future: a technology you use often; a product you recently purchased; a time when you had to solve a problem; an adventure you would like to have in the future.`,
  ] },
  { type: 'p', text: `The pattern is clear: the topics are personal and familiar. You do not need specialist knowledge. You need to say something clear and well organised about your own life or opinions, in good English. The British Council's practice card, per its page, asks you to describe a possession that matters to you, with prompts such as where it came from, how long you have had it, and why it matters. It fits the same pattern.` },
  { type: 'h2', text: '30 practice cards we wrote' },
  { type: 'p', text: `These are our own practice prompts. They are not exam questions, they are not copied from any test, and we do not claim they will appear. Use them for the routine below. Each one is a short version of a card: on a real card the examiner's points tell you what to cover.` },
  { type: 'ul', items: [
    `People: a neighbour you get on with; someone who makes you laugh; a relative you admire; a classmate who helped you; a person you met while travelling.`,
    `Places: a place you go to relax; a shop you enjoy visiting; a building you find interesting; a place you would like to live in; a park or garden you know well.`,
    `Objects: something you use every day; a gift you gave or received; an item of clothing you like; a book you have read more than once; a piece of furniture you could not live without.`,
    `Events: a day when everything went well; a time you were late; a celebration you attended; a time you helped someone; a decision you are glad you made.`,
    `Skills and habits: something you learned recently; a skill you would like to improve; a habit you want to change; a way you save time; a time you tried something new.`,
    `Media and ideas: a film you watched with others; a song that reminds you of a time; a website or app you find useful; a news story that interested you; a talk or lesson you remember.`,
  ] },
  { type: 'p', text: `Pick one at random so you cannot prepare for it. Ask a tutor or friend to choose, and to hide it until the minute starts.` },
  { type: 'image', src: '/blog/inline/ielts-microphone', alt: 'A pale blue condenser microphone in a metal shock mount against a dark blue background.', caption: 'Illustrative photo. A recording of your own answer shows what you cannot hear while speaking.', credit: 'Photo: Kelly Sikkema (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Blue_condenser_microphone_(Unsplash).jpg' },
  { type: 'h2', text: 'How to answer a card in two minutes' },
  { type: 'p', text: `This is our advice, not an official method, and it is built on the official facts: one minute with pencil and paper, then about two minutes.` },
  { type: 'ul', items: [
    `Use the minute for keywords, not sentences. Write four to six words: one for the opening, two or three for the points on the card, one for the "explain" part. You cannot write a speech in sixty seconds, and reading from notes sounds flat.`,
    `Open with one clear sentence that answers the card, for example "I'd like to talk about my neighbour, Mrs Tran, who has lived next door for ten years." Names and places are invented here.`,
    `Cover each point on the card in order, giving one example or one detail for each. A specific detail ("she waters my plants when I travel") beats a general one ("she is kind").`,
    `Explain why. Cards usually ask you to say why something matters or how you feel. Spend your last 30 seconds on it.`,
    `Keep talking. IDP says to try to keep talking for the full two minutes. If you run out, return to an earlier point and add a detail, or say how you feel about it now.`,
    `If you have no experience of the topic, say so, then speculate. IDP advises that it is acceptable, and it is better than silence: "I have never done this, but if I did, I would ..."`,
  ] },
  { type: 'h3', text: 'A worked card, with invented notes and answer' },
  { type: 'p', text: `Card (ours): Describe a place where you like to study. Cover where it is, when you go there, what you do there, and explain why it works for you.` },
  { type: 'p', text: `Notes written in the minute: library, quiet, mornings, ear plugs, focus.` },
  { type: 'p', text: `Answer, in about two minutes: "I'd like to talk about the small public library near my flat, where I study most mornings. It's about ten minutes' walk away, on a street with a bakery, so I sometimes buy a roll on the way. I usually arrive at eight, when it opens, and stay until noon. Mostly I do my reading and write essays, but when I'm tired I do vocabulary cards. I sit at the same long table by the window because the light is good and nobody talks there. The reason it works for me is that it separates studying from home. At home I notice dishes and messages, but in the library the only thing to do is work. I also bring ear plugs, because even a quiet room has some noise. Honestly, I think I'd get less done anywhere else." That is a plain, clear answer. It has a point, details and a reason, and it needs no rare words.` },
  { type: 'h3', text: 'A second card: a story about a past event' },
  { type: 'p', text: `Cards about events ask for a story, so the tense matters. Card (ours): Describe a time you were late. Cover when it happened, why you were late, what happened next, and explain how you felt.` },
  { type: 'p', text: `Notes: last spring, bus, exam, ran, relieved.` },
  { type: 'p', text: `Answer, in about two minutes: "I'll describe a morning last spring when I nearly missed an exam. I had set my alarm correctly, but the bus I usually take didn't come, and I only found out at the stop. I waited ten minutes, then ran to the next stop, where a different bus took me towards the college. By then I had about fifteen minutes left. I remember checking my phone every minute, which made it worse. I got to the hall two minutes before the start and sat down out of breath, with my pen in my hand. The paper was fine in the end. Looking back, I felt embarrassed first and then relieved. Since then I leave home twenty minutes earlier on exam days, and I check the bus times the night before." Notice the past tenses, the order of events, and a closing sentence that says what changed.` },
  { type: 'p', text: `The same card could ask about a person or an object, and the method does not change. For a person, give their name or relationship, what they do, one story about them and why they matter. For an object, say where it came from, what it looks like, what you use it for and why you would keep it.` },
  { type: 'h2', text: 'What the examiner scores' },
  { type: 'p', text: `ielts.org says certificated examiners assess your performance throughout the test against four criteria: fluency and coherence, lexical resource, grammatical range and accuracy, and pronunciation. IDP says the four carry equal weight, 25% each. The official band descriptors are a public PDF on ielts.org (created in September 2025) that describes each band for each criterion. We could not read its text, so we do not summarise it here. Read it, because it is the standard the examiner uses.` },
  { type: 'compare', caption: 'What a tutor can listen for under each criterion. These are our practical prompts, not the official descriptors.', headers: ['Criterion', 'Ask yourself while you listen'], rows: [
    ['Fluency and coherence', 'Did the answer flow and connect, or stop and restart? Were ideas in an order a listener could follow?'],
    ['Lexical resource', 'Was the vocabulary precise for the topic, or did the same simple words repeat? Did the speaker explain a word they could not find?'],
    ['Grammatical range and accuracy', 'Were there only short simple sentences, or a mix of structures? Which mistakes repeated?'],
    ['Pronunciation', 'Which words or sounds made the listener work? Was stress and rhythm clear?'],
  ] },
  { type: 'p', text: `Notice what is absent: none of the four criteria asks whether your story is true or interesting. In our advice, if you cannot think of a real detail, say a clear invented one instead of hesitating. Do not memorise a fixed answer: it tends to sound read out, and it fails when the card is different. Both points are our advice, and we did not find them on the official pages.` },
  { type: 'h2', text: 'Part 3: practise the follow-up questions' },
  { type: 'p', text: `Part 3 lasts 4 to 5 minutes and, per ielts.org, takes the Part 2 topic into a more general and abstract discussion. You are asked for opinions and explanations rather than a story. After our library card, a Part 3 style question might be "Why do some people find it hard to study at home?" or "How might places for studying change in the future?" (both invented by us). A good answer gives a view, a reason and an example, in about 20 to 30 seconds, then stops.` },
  { type: 'ul', items: [
    `Answer the question asked, first: "I think it's mainly because of distractions."`,
    `Give one reason, then one example from life or from people you know.`,
    `If you need time, buy it with a short natural phrase such as "That's an interesting question" and keep going. Do not pad every answer.`,
    `Compare, or consider both sides, when the question asks "how has it changed" or "will it change".`,
  ] },
  { type: 'h2', text: 'How to practise with a tutor: a 45-minute session' },
  { type: 'p', text: `Reading about speaking does not improve it. Speaking aloud, being listened to and fixing one thing at a time does. Here is a routine we suggest. It works in person or on a video call.` },
  { type: 'ul', items: [
    `Minutes 0 to 5. Warm up with a Part 1 style chat on familiar topics such as home, work and studies, as ielts.org lists them.`,
    `Minutes 5 to 10. The tutor picks a card without showing it first. One minute of notes. Then you speak for two minutes while the tutor times you and records the audio.`,
    `Minutes 10 to 20. The tutor gives feedback on only two things, not ten. Use the four criteria as the headings. Play back the recording so you hear the problem.`,
    `Minutes 20 to 30. Do the same card again, fixing the two points. Then a Part 3 style discussion: three questions linked to the topic, answered in 20 to 30 seconds each.`,
    `Minutes 30 to 40. A second, different card, to test whether the fix carries over.`,
    `Minutes 40 to 45. Write down the two things to work on. Choose one card to redo before the next lesson, recorded by you.`,
  ] },
  { type: 'p', text: `The repeat in the middle matters most. Doing the same card twice in a lesson shows you that you can improve a spoken answer within minutes, and it builds the habit of listening to yourself. Over a month, keep the recordings and compare the first with the latest.` },
  { type: 'image', src: '/blog/inline/ielts-headphones', alt: 'Black over-ear studio headphones resting on the edge of a white desk, seen from above.', caption: 'Illustrative photo. Listen to your own recording with headphones, as a tutor would.', credit: 'Photo: Alex Holyoake (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Top_view_of_headphones_hanging_from_a_desk_(Unsplash).jpg' },
  { type: 'h3', text: 'A four-week plan' },
  { type: 'ul', items: [
    `Week 1. Learn the format from the official pages, record one baseline answer on a random card, and pick two things to fix.`,
    `Week 2. Two cards per session, each repeated once. Focus on structure: opening line, one detail per point, a reason at the end.`,
    `Week 3. Add Part 3 follow-up questions and a time limit. Work on the one grammar pattern and one set of sounds that repeat in your recordings.`,
    `Week 4. Run a full Part 1, 2 and 3 mock of 11 to 14 minutes, the time ielts.org gives, and compare the recording with your week 1 baseline.`,
  ] },
  { type: 'h2', text: 'If you are the tutor: teaching Part 2 honestly' },
  { type: 'ul', items: [
    `Teach what the official pages say. The format and timings are on ielts.org, and the band descriptors are public. Cite them to your student, and tell them to check the current pages for changes.`,
    `Do not promise a band score. A tutor cannot guarantee how an examiner will score, and no page we read says otherwise. Promise a method, honest feedback and a number of practice sessions.`,
    `Do not sell "the latest topics". As above, no official list exists that we could find. Selling a list as real exam content is a risk to your students and your reputation.`,
    `Say what you are qualified for. Whether you have taught IELTS before, studied the descriptors, or taken the test yourself belongs on your profile. How to write a tutor bio shows how to put it in a few lines.`,
    `Package it. A course of ten practice sessions with recorded answers is easier to sell and easier to follow than ten single lessons. Lesson packages explained covers pricing it.`,
  ] },
  { type: 'p', text: `If you are choosing a speciality, IELTS speaking is narrow and well-defined, which makes it easy to explain and hard to be vague about. Our guide to choosing a tutoring niche helps decide whether it suits you.` },
  { type: 'h2', text: 'Mistakes that cost marks' },
  { type: 'ul', items: [
    `Memorising a speech. It tends to sound read out, and it falls apart when the card is different.`,
    `Stopping at 40 seconds. You are expected to keep going, so practise filling the time.`,
    `Writing full sentences in the minute. Keywords are quicker and sound more natural.`,
    `Ignoring the "explain" part of the card. The last point usually asks for your reason or feeling, and it carries the most language.`,
    `Practising only by reading. Speak aloud, with a timer, and record yourself.`,
    `Trusting a list of "real" topics. It may be useful practice, but it is not a promise.`,
  ] },
  { type: 'h2', text: 'What Tutafy is, and what it is not' },
  { type: 'p', text: `Tutafy is a tool for tutors who run their own business: a public booking page that shows your hours in the student's time zone, a video classroom that opens in the browser, email reminders, student records, and payment through your own PayPal or Stripe account, with 0% commission. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29 a month. A lesson can carry a link to a recording, such as a Loom or YouTube link, which the student sees in their portal.` },
  { type: 'ul', items: [
    `It is not an IELTS authority and has no IELTS materials, topic lists or scoring.`,
    `It does not mark answers or predict a band. That is the tutor's job.`,
    `We found no recorder built into the lesson in its code. Use your own recording tool and attach the link.`,
    `It does not send you students. The tutor directory is not open yet.`,
  ] },
  { type: 'source', text: 'The official pages used for the facts about the test, read on 31 Oct 2026. Our practice cards and routine are our own advice and are marked as such. Check the current IELTS pages before you sit the test.', links: [
    { label: 'IELTS: Academic Speaking format', href: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking' },
    { label: 'IELTS: sample test questions, Academic', href: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions/academic-test' },
    { label: 'IELTS: Speaking band descriptors (PDF)', href: 'https://ielts.org/cdn/ielts-guides/ielts-speaking-band-descriptors.pdf' },
    { label: 'IELTS: Speaking sample tasks (PDF)', href: 'https://ielts.org/cdn/ielts-downloadable-assets/ielts-sample-tests/ielts-speaking-sample-tasks-2023.pdf' },
    { label: 'IDP: Speaking practice questions and sample tasks', href: 'https://ielts.idp.com/prepare/article-free-speaking-practice-questions' },
    { label: 'IDP: cue card topics for the Speaking test', href: 'https://ielts.idp.com/thailand/about/news-and-articles/article-cue-card-topics-for-speaking-test' },
    { label: 'British Council: IELTS Speaking Part 2 practice', href: 'http://takeielts.britishcouncil.org/prepare-your-test/free-practice-tests/speaking-practice-test-1/speaking-part-2' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to teach English online', href: '/blog/how-to-teach-english-online', text: 'Qualifications, tools and lesson structure for English tutors.' },
    { label: 'How to choose a tutoring niche', href: '/blog/how-to-choose-a-tutoring-niche', text: 'Decide whether test preparation suits you.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'Sell a course of practice sessions.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'Say what you are qualified to teach.' },
    { label: 'How to price tutoring lessons', href: '/blog/how-to-price-tutoring-lessons', text: 'Set a rate for specialist preparation.' },
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'Which platforms hire English and test-prep tutors.' },
    { label: 'How to find a good online tutor', href: '/blog/how-to-find-an-online-tutor', text: 'Ten checks a learner can make before booking an IELTS tutor.' },
  ] },
  { type: 'faq', items: [
    { q: 'How long is IELTS Speaking Part 2?', a: `According to ielts.org, Part 2 lasts 3 to 4 minutes including preparation: one minute to prepare with pencil and paper, then about two minutes of speaking. The whole Speaking test takes 11 to 14 minutes.` },
    { q: 'Can I take notes in Part 2?', a: `Yes. ielts.org and IDP both say you have one minute to prepare with pencil and paper for notes. Write a few keywords, not full sentences.` },
    { q: 'Are there official IELTS Speaking Part 2 topics for this year?', a: `We found no official list of current topics. IELTS publishes sample tasks and IDP lists 20 popular cue card topics, but says they are only examples of the many topics that can appear.` },
    { q: 'What if I have no experience of the topic on the card?', a: `IDP advises that it is acceptable. Say that you have not had the experience, then speculate or describe something close to it. Silence costs more than an imagined answer.` },
    { q: 'What happens if I stop talking before two minutes?', a: `We found no official page that says what the examiner does then. IDP advises you to try to keep talking for the full two minutes, so practise filling the time.` },
    { q: 'How is Part 2 scored?', a: `Certificated examiners score the whole Speaking test on four criteria: fluency and coherence, lexical resource, grammatical range and accuracy, and pronunciation. IDP says they carry equal weight. The band descriptors are public on ielts.org.` },
    { q: 'Can a tutor guarantee my IELTS speaking score?', a: `No. No official page we read says a tutor can predict an examiner's score. A good tutor offers practice, recorded answers and honest feedback against the four criteria, and not a guarantee.` },
    { q: 'Does Tutafy have IELTS topics or score my answers?', a: `No. Tutafy is a tool for tutors to book, teach and get paid. It has no IELTS materials or scoring, and it does not record lessons itself, though a lesson can carry a link to a recording.` },
  ] },
  { type: 'cta', title: 'Teach IELTS speaking from one booking link', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy has no IELTS materials and does not send students.', button: 'Start free, no credit card', href: '/register' },
]
