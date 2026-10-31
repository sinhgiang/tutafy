// T-1197. Article body for /blog/esl-speaking-activities (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1315-keyword-data-sapa-tutafy.md ("esl speaking activities", 210 searches a month, KD 16; OpenSEO, US, English). Calendar day: 5 Nov 2026.
// Step 0 (31 Oct 2026): nearest posts are how-to-teach-english-online (a six-part lesson shape, conversation as a niche, no activity bank), ielts-speaking-part-2-topics (one exam task, 30 cards, a routine) and
// online-whiteboard-for-tutoring (the tool a describe-and-draw task needs). None gives a bank of activities. Own angle: 20 activities written for ONE student and one tutor (most published speaking activities are
// for pairs or classes), each with level, minutes, preparation and steps, which ones come from a named British Council page and which are ours, how to correct without stopping the talk, and a 60-minute lesson built
// from four of them. Cross-links to the three posts above plus best-video-call-tool-for-tutors and how-to-retain-tutoring-students. No overlap large enough to turn this into an update of an old post.
//
// Sources, read on 31 Oct 2026 (British Council TeachingEnglish pages, read directly unless marked):
//   "Maximising speaking opportunities in online lessons": story starters; speak for a minute (topics, preparation time, one minute each, listeners get a positive listening task); what's changed (look at each other's video,
//     videos off, change one thing, describe); personalised descriptions; puppets; debate 4 3 2 1 (two sides, 4 minutes plan, spokesperson 3 minutes, other side 3 prepare and 2 respond, 2 minutes final points, 1 minute summary);
//     polls; asynchronous: describe my room (record, prepositions of place, not to include other people without consent), an interview, modelling (teacher records, learners copy intonation and stress, record themselves,
//     compare), a short radio drama. Key phrases: "Plan a task for everyone", "Turn the audio off".
//   "Motivating speaking activities for lower levels" (CEFR A2): "Planning time has been shown to increase production in speaking tasks"; definitions lists (about ten words, define, partners guess); what were you doing
//     ("yesterday at 6 o'clock"; about five minutes planning); adjectives (a time you felt that way); information gap, order the story (cartoon with at least four vignettes cut up and split between two students); write the
//     dialogue (blank out the captions of a comic strip); what's the question (answers on labels, find the questions).
//   "Telephone role plays" (B1, adults, time shown as 40): ten situations on role cards, pairs sit back to back so they cannot see faces or gestures, rotate the cards, note mistakes and useful language for a feedback
//     discussion; teach common telephone expressions first if the cards are used as practice. The page says phone conversations are often unpredictable and hard for learners.
//   "Pros and cons of teacher talking time": "Excessive TTT limits the amount of STT (student talking time)"; "A useful guideline is a limit of 30% of a lesson, and no more than 10 minutes at one time"; allow silence;
//     it also says teacher talk has good uses (natural listening input, stories, personalised presentations) and that quality matters more than cutting it "to a bare minimum".
//   "Managing reluctant talkers to get them speaking": "Less is more."; do not fill silence, change the task or give them something to read or write first; give extra time to self-correct; keep role-plays brief with lower
//     levels because they are tiring; "Accept this and do not put pressure on shy learners to speak."; let very reluctant speakers prepare thoroughly; swap a task they particularly dislike.
//   "Error Correction 2": spoken errors are common because students have little time to process; questions before correcting (does it affect communication, is the lesson about accuracy, was it practised recently, do several
//     students make it); "Is it really wrong? Or is it my imagination?"; delayed correction after the activity; recording students so they hear their own errors; individual "hot cards" of recurring mistakes.
//   Not opened, from search results: the "Delayed correction" entry (read only through a search summary), the Teaching speaking unit 6 page (information gaps only, no steps), the Cambridge ELT blog (403).
//   Searched, nothing printed from them: skyteach.ru, eslgames.com, fluentu.com, ontesol.com and similar pages for "two truths and a lie", "devil's advocate" and "ask the expert". We call those activities ours: they are common
//   classroom games, and the steps are our own wording for a single student.
// Levels (CEFR) and minutes in this post are OUR suggestions; the British Council pages give A2 for the lower-levels page, B1 for the telephone page, and no minutes for the others (the telephone page shows 40 for a class).
// What it says about Tutafy comes from the code, read on 31 Oct 2026: the built-in classroom toolbar has microphone, camera, closed captions, screen sharing, full screen, hang up, chat, tile view and settings, no drawing tool
// (see online-whiteboard-for-tutoring); src/lib/jaas.ts sets recording off, so there is no recorder of its own; a lesson has a notes field and a field for a link to a recording that the student's portal shows
// (src/components/RecordingEmbed.tsx). We did not test the accuracy of the closed captions with learners' speech. All students and sentences in the examples are invented by us.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const ESL_SPEAKING_ACTIVITIES_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'A good one-to-one speaking activity has one clear task, a little thinking time for the student, and a job for you that is not talking. This guide gives 20, each with level, minutes, preparation and steps.',
    'Most published speaking activities are written for pairs or classes. Here each one is rewritten so that you and one student can do it, and we say which come from a British Council page and which are ours.',
    'The British Council suggests teachers keep their own talk to about 30% of a lesson and to no more than 10 minutes at a time. With one student, that leaves room for 40 minutes or more of the student speaking.',
    'Correct after the activity, not during it: write down what the student said, pick three or four items, and let them try the fix first.',
    'Levels and minutes are our suggestions. Tutafy has a built-in classroom with screen sharing and chat, and has no whiteboard and no recorder.',
  ] },
  { type: 'p', text: `ESL speaking activities for one student are short tasks that get a learner talking to you for several minutes, with a clear goal and almost no preparation from you. This guide has 20 of them, grouped by what they ask the student to do, followed by how to correct without killing the talk and a worked 60-minute lesson that combines four.` },
  { type: 'p', text: `We build tutoring software and we are not a teacher-training body, so we lean on the British Council's TeachingEnglish pages, which we read on 31 October 2026. Each activity says where it comes from. "Ours" means a common classroom game, with steps in our own words for one student.` },
  { type: 'image', src: '/blog/inline/esl-volunteer', alt: 'Three men sit at a wooden table in the shade. Two look at a sheet of paper while the man on the right holds a pen over a notebook.', caption: 'Illustrative photo, not a Tutafy user: a small English lesson shown on Wikimedia Commons. Most speaking tasks need only paper and a pen.', credit: 'Photo: Emma Taylor (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Haitian_students_learn_English_from_Canadian_volunteer.jpg' },
  { type: 'h2', text: 'What changes when there is only one student' },
  { type: 'p', text: `In a class of fifteen, every student gets only a few minutes of speaking in an hour. With one student, you could give them nearly the whole hour, and that is the main thing you are selling. The risk is the opposite one: because you are the only other person in the room, you slip into talking, filling every pause, and the student answers with one word.` },
  { type: 'p', text: `The British Council's article on teacher talking time says that "excessive TTT limits the amount of STT", meaning teacher talking time limits student talking time. It gives a guideline of "a limit of 30% of a lesson, and no more than 10 minutes at one time". The same article says teacher talk has good uses, such as telling a story or giving natural listening input, and that quality matters more than cutting it to a minimum. For a 60-minute lesson, 30% is 18 minutes.` },
  { type: 'p', text: `Three habits follow from that, and the activities below are built on them.` },
  { type: 'ul', items: [
    `Give thinking time. The British Council's page on speaking for lower levels says "planning time has been shown to increase production in speaking tasks". Two minutes of silent preparation before a task is cheap and works.`,
    `Do not fill silence. When a learner is silent, the British Council advises you to change the task or give them something to read or write first, and not to fill the silence with your own voice. Its short rule is "Less is more."`,
    `Give yourself a job other than talking: guessing, drawing, playing a character, or noting language for later.`,
  ] },
  { type: 'h2', text: 'The 20 activities at a glance' },
  { type: 'compare', caption: 'Twenty speaking activities for one student. Levels and minutes are our suggestions.', headers: ['Activity', 'Level', 'Minutes', 'Preparation'], rows: [
    ['1. Speak for a minute', 'A2 and up', '8 to 10', 'A list of topics'],
    ['2. What were you doing?', 'A2 to B1', '8', 'Three time prompts'],
    ['3. Definitions list', 'A2 to B1', '10', 'A topic'],
    ['4. What\'s changed?', 'A2 to B1', '5', 'None'],
    ['5. Two truths and a lie', 'A2 and up', '8', 'None'],
    ['6. Order the story', 'A2 to B1', '15', 'A cartoon in four parts'],
    ['7. Spot the difference', 'A2 to B1', '12', 'Two near-identical pictures'],
    ['8. Describe and draw', 'A2 to B1', '12', 'One simple picture'],
    ['9. What\'s the question?', 'A2 to B1', '10', 'Eight answers'],
    ['10. Telephone role play', 'B1', '15 to 20', 'A few situation cards'],
    ['11. Service counter', 'A2 to B1', '12', 'Two role cards'],
    ['12. Interview the tutor', 'B1 and up', '15', 'A job advert'],
    ['13. Write the dialogue', 'A2 to B1', '15', 'A comic strip'],
    ['14. Story starters', 'A2 and up', '10', 'None'],
    ['15. Three objects', 'B1', '12', 'Three objects or a photo'],
    ['16. Debate 4 3 2 1', 'B2 and up', '20', 'A topic'],
    ['17. Devil\'s advocate', 'B1 and up', '10', 'Four opinions'],
    ['18. Teach me something', 'B1 and up', '15', 'None'],
    ['19. Shadow and record', 'A2 and up', '10 at home', 'A short recording'],
    ['20. Describe my room', 'A1 to A2', '10 at home', 'None'],
  ] },
  { type: 'h2', text: 'Warm-ups: get the student talking in the first ten minutes' },
  { type: 'h3', text: '1. Speak for a minute' },
  { type: 'p', text: `Level A2 and up. About 8 to 10 minutes. Preparation: six topics typed on the shared screen. From the British Council page on speaking in online lessons, adapted for one student.` },
  { type: 'ul', items: [
    `The student picks a topic, such as "a day I enjoyed" or "my work".`,
    `Give two minutes to prepare. Notes are allowed.`,
    `The student speaks for one minute. You listen with a positive job, as the British Council suggests: note three phrases you liked.`,
    `Read the three phrases back, then ask two follow-up questions.`,
    `Repeat with a second topic, this time without notes.`,
  ] },
  { type: 'p', text: `Do not interrupt for mistakes. The task trains fluency, and the notes you keep go into the correction step at the end.` },
  { type: 'h3', text: '2. What were you doing?' },
  { type: 'p', text: `Level A2 to B1. About 8 minutes. Preparation: three time prompts such as "yesterday at 6 o'clock", "this time last year" and "last Sunday morning". From the British Council page on speaking for lower levels, shortened for one student.` },
  { type: 'ul', items: [
    `The student chooses one prompt and plans what to say for two minutes. The British Council's class version gives about five.`,
    `They tell you what they were doing at that time.`,
    `Ask two or three follow-ups: "Who was with you?", "What happened next?".`,
    `Tell them yours in four sentences, so they hear a model of the past continuous without a lecture.`,
  ] },
  { type: 'h3', text: '3. Definitions list' },
  { type: 'p', text: `Level A2 to B1. About 10 minutes. Preparation: a topic, such as the kitchen or the office. From the British Council page on speaking for lower levels, in which learners list about ten words and define them for partners to guess.` },
  { type: 'ul', items: [
    `Agree on the topic. The student writes about ten words on it.`,
    `Revise defining phrases first: "It's a thing you use for...", "It's a person who...", "It's the opposite of...".`,
    `The student defines each word without saying it. You guess.`,
    `Guess wrongly on purpose at least twice. A vague definition then has to become a clearer one.`,
    `Swap: you define three words and the student guesses.`,
  ] },
  { type: 'h3', text: '4. What\'s changed?' },
  { type: 'p', text: `Level A2 to B1. About 5 minutes. Preparation: none. From the British Council page on speaking in online lessons, where learners watch each other's video and then change something.` },
  { type: 'ul', items: [
    `You and the student look at each other on video for ten seconds.`,
    `Both switch cameras off. You change one thing: move an object, put on a hat, change your background.`,
    `Cameras on. The student says what has changed: "You've moved the lamp."`,
    `Swap, then repeat with two changes.`,
  ] },
  { type: 'h3', text: '5. Two truths and a lie' },
  { type: 'p', text: `Level A2 and up. About 8 minutes. Preparation: none. Ours: a common game, in our steps.` },
  { type: 'ul', items: [
    `The student writes three sentences about their week. Two are true and one is false.`,
    `You ask up to five questions to find the lie. Ask real questions, such as "Where did you buy it?".`,
    `Guess. The student reveals the answer.`,
    `Swap roles. You write three sentences and the student asks the questions.`,
  ] },
  { type: 'image', src: '/blog/inline/esl-flashcards', alt: 'A loose pile of white paper cards on a grey checked surface. The top card shows the word pig, and another has a short line of Chinese text.', caption: 'Illustrative photo. Paper cards cost almost nothing and a student can sort, shuffle and answer them.', credit: 'Photo: bfishadow (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Flash_cards_for_language_learning.jpg' },
  { type: 'h2', text: 'Information gaps: one of you knows what the other does not' },
  { type: 'p', text: `In an information gap, one person holds information the other lacks, so they have to ask and describe to find it. The British Council's speaking unit on information gaps describes the idea and how to set up such tasks. Most examples need two learners, so for one student you take the other half.` },
  { type: 'h3', text: '6. Order the story' },
  { type: 'p', text: `Level A2 to B1. About 15 minutes. Preparation: a cartoon with at least four pictures, cut into separate panels. From the British Council page on speaking for lower levels, in which the pictures are split between two students.` },
  { type: 'ul', items: [
    `Keep two panels and send two to the student. Both keep their panels hidden from the other.`,
    `Each describes their panels, using sequence words: "first", "then", "after that", "in the end".`,
    `Together, you work out the order of all four.`,
    `Optional: the student writes or tells the whole story afterwards.`,
  ] },
  { type: 'h3', text: '7. Spot the difference' },
  { type: 'p', text: `Level A2 to B1. About 12 minutes. Preparation: two pictures that are nearly the same, with two or three differences. The British Council describes this as practice for colours, prepositions and adjectives.` },
  { type: 'ul', items: [
    `You each hold one picture and do not show it.`,
    `Take turns to describe an area: "On the table there is a red cup."`,
    `Ask questions: "Is the cup next to the book?".`,
    `Stop when you have found all the differences, then show the pictures.`,
  ] },
  { type: 'h3', text: '8. Describe and draw' },
  { type: 'p', text: `Level A2 to B1. About 12 minutes. Preparation: one simple picture of a room or a street. Ours: a common task, in our steps.` },
  { type: 'ul', items: [
    `Send the picture to the student privately. You do not see it.`,
    `The student describes it. You draw what you hear, on paper held up to the camera or on a whiteboard you share.`,
    `Ask for clarification whenever you do not know where to put something: "Left of what?".`,
    `Compare your drawing with the picture and talk about the difference.`,
    `Swap. You describe and the student draws.`,
  ] },
  { type: 'p', text: `Tutafy's classroom has no drawing tool, so draw on paper or share your screen from a free whiteboard. Our guide to online whiteboards compares the options.` },
  { type: 'h3', text: '9. What\'s the question?' },
  { type: 'p', text: `Level A2 to B1. About 10 minutes. Preparation: eight short answers on cards, such as "On Tuesday", "My sister", "Because it was raining". From the British Council page on speaking for lower levels, in which learners write only the answer on a label and find the matching questions.` },
  { type: 'ul', items: [
    `Show one answer card at a time.`,
    `The student says a question that could produce it: "When is your piano lesson?".`,
    `If the question works, ask a follow-up of your own. If not, say why in a few words.`,
    `Then the student asks you a follow-up to the same answer.`,
  ] },
  { type: 'h2', text: 'Role plays: practise the conversations they will really have' },
  { type: 'p', text: `The British Council notes that role plays and dialogues are tiring at lower levels, so keep them brief. With one student you play the other person, which gives you control over speed and difficulty.` },
  { type: 'h3', text: '10. Telephone role play' },
  { type: 'p', text: `Level B1. About 15 to 20 minutes. Preparation: three to five situation cards. From the British Council page on telephone role plays, written for pairs sitting back to back with ten cards at B1.` },
  { type: 'ul', items: [
    `Teach a few telephone phrases first: "Could I speak to...?", "I'm calling about...", "Could you repeat that?".`,
    `Switch both cameras off, so that neither of you sees a face, as in the British Council version.`,
    `Give the student a card with their role, such as "Call a dentist to move your appointment to Friday". You play the receptionist.`,
    `After each call, swap cards and play another situation.`,
    `Write down mistakes and good phrases while you listen, and discuss them at the end.`,
  ] },
  { type: 'h3', text: '11. Service counter' },
  { type: 'p', text: `Level A2 to B1. About 12 minutes. Preparation: two role cards. Ours.` },
  { type: 'ul', items: [
    `Give the student a goal card with one complication, such as "Return a jacket that does not fit. You have lost the receipt."`,
    `You play the shop assistant, not too helpful and not too hard.`,
    `Play the scene for about four minutes.`,
    `Give the student four useful phrases from the scene, then play it again.`,
  ] },
  { type: 'p', text: `The second run is the point. Students hear what they could have said, then use it straight away.` },
  { type: 'h3', text: '12. Interview the tutor' },
  { type: 'p', text: `Level B1 and up. About 15 minutes. Preparation: a short job advert for a role your student might want. Ours.` },
  { type: 'ul', items: [
    `You are the candidate. The student is the interviewer and writes five questions in advance.`,
    `Answer honestly but briefly, and sometimes give an unclear answer, so that they have to follow up.`,
    `Afterwards, reverse the roles and let the student be the candidate.`,
  ] },
  { type: 'h3', text: '13. Write the dialogue' },
  { type: 'p', text: `Level A2 to B1. About 15 minutes. Preparation: a comic strip or cartoon with the speech bubbles blanked out. From the British Council page on speaking for lower levels.` },
  { type: 'ul', items: [
    `Ask the student what is happening in the picture.`,
    `They write a short dialogue for the characters. Give a few minutes.`,
    `Read it aloud together. You take one character and they take the other.`,
    `Change one line each, to see how the scene changes.`,
  ] },
  { type: 'h2', text: 'Longer talk: stories, objects and opinions' },
  { type: 'h3', text: '14. Story starters' },
  { type: 'p', text: `Level A2 and up. About 10 minutes. Preparation: none. From the British Council page on speaking in online lessons, where a teacher begins a story with a word that suggests how it continues.` },
  { type: 'ul', items: [
    `Begin: "Suddenly, the lights went out..."`,
    `The student adds a sentence. You add the next one.`,
    `Continue for about twelve turns, then end the story together.`,
    `Next lesson, ask the student to retell the story from memory in the past tense.`,
  ] },
  { type: 'h3', text: '15. Three objects' },
  { type: 'p', text: `Level B1. About 12 minutes. Preparation: three small objects, or a photo of a few things on a table. Ours.` },
  { type: 'ul', items: [
    `Show three objects that do not obviously belong together.`,
    `Give the student two minutes to plan a short story that includes all three.`,
    `They tell it. You listen and write down only the best three phrases.`,
    `Ask what happened before the story started.`,
  ] },
  { type: 'image', src: '/blog/inline/esl-game-pieces', alt: 'Black dice, blue star-shaped gems and yellow tokens spread on a dark wooden table, with a person’s hands in the background.', caption: 'Illustrative photo. Dice, tokens and other small objects can start a story.', credit: 'Photo: Mshuang2 (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Board_game_pieces.jpg' },
  { type: 'h3', text: '16. Debate 4 3 2 1' },
  { type: 'p', text: `Level B2 and up. About 20 minutes. Preparation: one topic where reasonable people disagree. From the British Council page on speaking in online lessons. Its version has two teams; the steps below are our one-to-one adaptation, with the same timings.` },
  { type: 'ul', items: [
    `Choose the topic and say which side each of you takes. The student gets the side they like less.`,
    `The student prepares for 4 minutes, then speaks for 3.`,
    `You prepare for 3 minutes and reply for 2.`,
    `Each of you has 2 minutes to prepare final points, then 1 minute to summarise.`,
  ] },
  { type: 'p', text: `While you listen, write down useful phrases for disagreeing and for giving reasons. Teach them after the debate.` },
  { type: 'h3', text: '17. Devil\'s advocate' },
  { type: 'p', text: `Level B1 and up. About 10 minutes. Preparation: four mild opinions, such as "Mornings are better than evenings". Ours.` },
  { type: 'ul', items: [
    `Give an opinion with a reason.`,
    `The student politely disagrees. Offer phrases if needed: "I see your point, but...", "That may be true, but...".`,
    `Push back once or twice, then agree gracefully.`,
    `Swap and let the student state the opinion.`,
  ] },
  { type: 'h3', text: '18. Teach me something' },
  { type: 'p', text: `Level B1 and up. About 15 minutes. Preparation: none. Ours.` },
  { type: 'ul', items: [
    `The student chooses something they know how to do: make a dish, set up a router, change a tyre.`,
    `They explain it to you in four to six steps. You are a beginner and ask questions: "Why do you do that first?".`,
    `They repeat the steps using the sequencing words you gave them.`,
  ] },
  { type: 'h2', text: 'Between lessons: speaking practice the student does alone' },
  { type: 'h3', text: '19. Shadow and record' },
  { type: 'p', text: `Level A2 and up. About 10 minutes at home. Preparation: a recording of you talking for 30 to 45 seconds, and its text. From the British Council page on speaking in online lessons, under modelling.` },
  { type: 'ul', items: [
    `Record yourself on a topic from the lesson and send the recording with the text.`,
    `The student listens and copies your intonation and stress.`,
    `They record themselves and compare the two recordings.`,
    `In the next lesson, play both and ask the student to name two differences.`,
  ] },
  { type: 'h3', text: '20. Describe my room' },
  { type: 'p', text: `Level A1 to A2. About 10 minutes at home. Preparation: none. From the British Council page on speaking in online lessons, in which learners record a short description of their room using prepositions of place.` },
  { type: 'ul', items: [
    `The student records one minute describing their room: "The bed is next to the window."`,
    `Audio is enough. The British Council warns that learners must not include other people in a recording without consent, and audio avoids the problem.`,
    `In the lesson, pick three things they said well and one thing to fix.`,
  ] },
  { type: 'h2', text: 'Correct without stopping the talk' },
  { type: 'p', text: `The British Council's article on correcting speaking says spoken errors are common because students have little time to process language while speaking, so you have to choose which to deal with. Its questions are a useful filter: does the error affect communication, is this lesson about accuracy, has the student recently practised this language, do several students make the same mistake? In one-to-one teaching, the last question becomes "does this student make this mistake again and again?".` },
  { type: 'p', text: `The article also warns against correcting too fast. Its own check is a good habit: "Is it really wrong? Or is it my imagination?"` },
  { type: 'h3', text: 'A simple delayed-correction routine' },
  { type: 'ul', items: [
    `Tell the student at the start that you will write things down and talk about them afterwards.`,
    `While they speak, write exactly what they said, not what you think they meant.`,
    `Choose three or four items. Pick errors that block meaning or keep coming back, plus one good phrase.`,
    `After the activity, read each sentence back and let the student try the fix before you give it.`,
    `Keep the recurring ones on a card. The British Council calls these individual notes "hot cards".`,
  ] },
  { type: 'p', text: `The British Council also mentions recording learners so that they hear their own errors, and playing the recording back with the student. Tutafy has no recorder of its own, so use your computer's voice recorder or another tool, with the student's permission, and keep it for them only.` },
  { type: 'h2', text: 'A 60-minute lesson built from four activities' },
  { type: 'p', text: `Here is how the activities combine. The student is invented: Lena, a B1 learner who works in a warehouse and wants to deal with customers on the phone. The minutes are ours.` },
  { type: 'compare', caption: 'A 60-minute lesson for one B1 student (invented).', headers: ['Minutes', 'Activity', 'Why'], rows: [
    ['0 to 8', '5. Two truths and a lie', 'Warm-up. She asks the questions.'],
    ['8 to 20', '7. Spot the difference', 'Describing and asking, with prepositions of place she needs for locating stock.'],
    ['20 to 40', '10. Telephone role play, two calls', 'The real goal of the lesson. Cameras off. Notes on her phrases.'],
    ['40 to 52', '18. Teach me something', 'Her own expertise: how she checks a delivery.'],
    ['52 to 60', 'Correction', 'Four items from your notes. She tries the fix first. Homework: activity 19.'],
  ] },
  { type: 'p', text: `Count what you do in this plan: you listen, ask questions, play one customer and note language. You talk for perhaps 12 minutes in 60, inside the 30% that the British Council suggests. Our guide to a lesson structure for English tutors covers the rest of the hour.` },
  { type: 'h2', text: 'When the student will not talk' },
  { type: 'p', text: `Some students are quiet by nature. The British Council's advice is to accept that and not to put pressure on shy learners to speak. It suggests letting very reluctant speakers prepare thoroughly before a task, giving more time to self-correct, keeping your own talk short, and swapping out a task a student particularly dislikes.` },
  { type: 'ul', items: [
    `Start with the tasks that need the least language: activity 4, 14 or 20.`,
    `Give written preparation before every speaking task and let the student keep their notes.`,
    `Use a task where you have the harder part, such as activity 12, so that they hear a model first.`,
    `If silence lasts more than a few seconds, do not answer for them. Change the question or ask them to write the answer first.`,
  ] },
  { type: 'h2', text: 'What Tutafy has for speaking lessons, and what it does not' },
  { type: 'p', text: `We build Tutafy, so here is what the app does and does not do for this, read from the code on 31 October 2026.` },
  { type: 'compare', caption: 'Speaking lessons in Tutafy, as of 31 Oct 2026.', headers: ['What you might want', 'Tutafy', 'Plan'], rows: [
    ['A built-in video classroom with screen sharing and chat', 'Yes: microphone, camera, screen sharing, full screen, chat, tile view and closed captions', 'All plans'],
    ['A place to keep your correction notes', 'Yes: a notes field on each lesson', 'All plans'],
    ['A way to show a recording to the student', 'Yes: a field for a link to a recording, which the student portal shows', 'All plans'],
    ['A whiteboard for describe-and-draw', 'No: share your screen from another whiteboard, or draw on paper', '-'],
    ['A recorder for the lesson or for the student\'s voice', 'No', '-'],
    ['A library of speaking activities', 'No', '-'],
  ] },
  { type: 'p', text: `The toolbar has a closed-captions button, but we have not tested how well it handles a learner's accent, so we would not use it for correction.` },
  { type: 'source', text: 'British Council TeachingEnglish pages read on 31 Oct 2026. The Delayed correction entry, the speaking unit on information gaps and a Cambridge blog were seen only in search results or refused our script, and nothing here depends on them.', links: [
    { label: 'Maximising speaking opportunities in online lessons', href: 'https://www.teachingenglish.org.uk/professional-development/teachers/using-digital-technologies/remote-teaching-guidance/maximising' },
    { label: 'Motivating speaking activities for lower levels', href: 'https://www.teachingenglish.org.uk/teaching-resources/teaching-secondary/activities/pre-intermediate-a2/motivating-speaking-activities' },
    { label: 'Telephone role plays', href: 'https://www.teachingenglish.org.uk/teaching-resources/teaching-adults/activities/intermediate-b1/telephone-role-plays' },
    { label: 'Pros and cons of teacher talking time', href: 'https://teachingenglish.org.uk/professional-development/teachers/managing-lesson/articles/pros-and-cons-teacher-talking-time' },
    { label: 'Managing reluctant talkers to get them speaking', href: 'https://www.teachingenglish.org.uk/comment/212013' },
    { label: 'Error Correction 2', href: 'https://www.teachingenglish.org.uk/article/error-correction-2' },
    { label: 'Teaching speaking: Unit 6, activities', href: 'https://www.teachingenglish.org.uk/professional-development/teachers/managing-lesson/teaching-speaking/teaching-speaking-unit-6' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to teach English online', href: '/blog/how-to-teach-english-online', text: 'Lesson shape, niches and pricing for English tutors.' },
    { label: 'IELTS Speaking Part 2 topics', href: '/blog/ielts-speaking-part-2-topics', text: 'One exam task, 30 practice cards and a routine.' },
    { label: 'Online whiteboard for tutoring', href: '/blog/online-whiteboard-for-tutoring', text: 'Free whiteboards for describe and draw.' },
    { label: 'The best video call tool for tutors', href: '/blog/best-video-call-tool-for-tutors', text: 'Zoom, Meet, Skype and Jitsi compared.' },
    { label: 'How to retain tutoring students', href: '/blog/how-to-retain-tutoring-students', text: 'Keep a student past the first month.' },
  ] },
  { type: 'faq', items: [
    { q: 'What are good ESL speaking activities for one student?', a: `Short tasks with one clear goal, a little thinking time and a job for the tutor other than talking: speak for a minute, spot the difference, a telephone role play, story starters, or teach me something. This guide gives 20 with steps.` },
    { q: 'How long should a speaking activity last?', a: `Between 5 and 20 minutes in our suggestions, with a lesson combining three or four. The British Council advises keeping role plays brief at lower levels because they are tiring.` },
    { q: 'How much should the tutor talk in a one-to-one lesson?', a: `The British Council gives a guideline of about 30% of the lesson and no more than 10 minutes at a time for teacher talk. In a 60-minute lesson that is 18 minutes at most, and less is usually better.` },
    { q: 'Should I correct every mistake in a speaking activity?', a: `No. Write down what the student said, choose three or four items that block meaning or keep returning, and talk about them after the activity. Let the student try the fix first.` },
    { q: 'How do I get a shy student to speak?', a: `Do not pressure them. Give written preparation time, start with tasks that need little language, and do not fill silences for them. The British Council says to accept that some learners are quiet.` },
  ] },
  { type: 'cta', title: 'Keep your lesson notes with the booking', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom with screen sharing and chat, lesson notes and homework. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy has no whiteboard and no recorder.', button: 'Start free, no credit card', href: '/register' },
]
