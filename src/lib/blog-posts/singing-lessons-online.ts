// T-1239. Article body for /blog/singing-lessons-online (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1610-tutafy-batch3-10-articles-plan.md, article 4 (calendar day 14 Nov 2026).
// Keyword (OpenSEO, US, English, 31 Oct 2026, from the plan): "singing lessons online" about 6,600 searches a month, difficulty 20. Reader: a LEARNER (an adult, or a parent of a child), also a singing teacher who wants to teach online.
// Step 0 (31 Oct 2026): the first page of Google results for "singing lessons online" is provider pages (Sage Music, MusicTeacher.com, Music to Your Home, Sirius, Wiingy), "best online singing lessons" lists with affiliate links
// (Hello Music Theory, SkillScouter, Hip Hop Makers) and a few explainers ("How do online singing lessons work?", "Is online voice coaching effective?"). Almost none of them says what an official source says about voice health,
// what a teacher association does and does not certify, or why two people cannot sing in time over a video call. On this site, nothing covers singing: blog.ts has no post that mentions singing or voice lessons, and src/ has no singing page,
// so there is no overlap to rewrite. Nearest pieces: how-to-find-an-online-tutor (any subject, ten checks), tutoring-lesson-packages-explained, schedule-tutoring-lessons-across-time-zones, how-to-write-a-tutor-bio. Links both ways with the first.
// Own angle: an honest lesson outline, the one thing video cannot do (sing in time together) and what to do about it, a voice-health table from official pages with their dates, what the teacher association's pages say
// (and do not say) about qualifications, exam grades as a level guide, and 12 questions to put to a teacher. Tutafy is not a singing authority: every health or exam fact is from an official page and says so; our own advice is marked as ours.
// Tutafy data check (31 Oct 2026): is any singing teacher on Tutafy? The tutor directory lists nobody (src/lib/directory.ts DIRECTORY_OPENS_AT = 6; the live page tutafy.com/tutors says "The tutor directory opens soon"), there is no singing or voice niche page in src/, and we did not query production
// data. So: no singing teacher is listed on Tutafy today, and the article does not promise to find one. Reported to the Chief: no singing tutor listed.
//
// Sources, read on 31 Oct 2026:
//   Read directly: NATS (nats.org), Find-A-Teacher: "locate singing teachers in your area who are members of National Association of Teachers of Singing"; the page does not say listed teachers are certified, vetted or endorsed by NATS.
//   Read directly: NATS, Membership types: "Membership is open to teachers of singing, collaborative pianists, and other voice professionals"; Professional members are "Individuals with training and experience teaching singing, collaborative pianists, or other voice professionals";
//     Emerging Professional "New members just beginning their career". NATS membership page: "around 7,000 members in more than 35 countries". None of the pages we read says membership licenses, certifies or accredits a teacher.
//   Read directly: NATS Code of Ethics: I.1 "Members shall present themselves honestly, in a dignified and professional manner, and with documented qualifications."; I.2 "Members shall strive to teach with competence by demonstrating knowledge of voice pedagogy,
//     musicianship, familiarity with a variety of vocal repertoire, as well as performance skills." The code text we read has nothing on vocal health, children's voices, fees or online teaching. We found no NATS page on choosing a teacher or on online teaching.
//   Read directly: NIDCD, "What Is Hoarseness?" (Last Updated 6 March 2017): see a doctor if hoarse for more than three weeks, especially without a cold or flu; also for coughing up blood, trouble swallowing, a lump in the neck, pain when speaking or swallowing, trouble breathing,
//     or losing the voice completely for more than a few days; vocal nodules are "sometimes called 'singer's nodes'"; rest, less voice use and plenty of water. NIDCD, "Taking Care of Your Voice" (Last Updated 11 June 2025): questions such as "Have you lost your ability to hit some high notes when singing?";
//     drink plenty of water, "vocal naps", humidity, avoid the extremes of your vocal range such as screaming or whispering, avoid singing when hoarse or tired, support the voice with breath.
//   Read directly: The Voice Foundation, voice disorder diagnosis and prevention pages (no page date): symptoms that persist two or three weeks after a cold or flu should be seen by an ENT doctor; vocal hygiene includes "Voice warm-ups before use" and "Voice training on proper technique".
//   Read directly: NHS, Laryngitis (page last reviewed 17 January 2024): usually goes away in 1 to 2 weeks; see a GP if symptoms do not improve after 2 weeks; do not whisper or talk loudly. (Not a page about singers.)
//   Read directly: Oxford Brookes University, Digital Education Support, "Improving audibility of speech in lectures over Zoom" (updated 22 February 2023): by default Zoom uses noise suppression that "can interfere with the audio and even cut it out completely"; set Audio Profile to "Original sound for musicians"; a toggle button turns suppression off.
//   Read directly: Trinity College London: singing grades Initial to Grade 8, "available both in digital and face-to-face formats", 2023 syllabus with no end date, backing and demo tracks for the 12 songs at each grade; Rock & Pop digital grades are recorded "at a place and time of their choice" and uploaded.
//     RSL Awards / Rockschool: vocals Debut and Grades 1 to 8, recorded and live-streamed digital exams "can take place at the student's home"; its two pages disagree on whether a recorded exam can be a graded exam or only a performance certificate, so we say to check. No age limit on any page.
//   Not read: ABRSM (its site answered 403 to our script), Zoom's own help pages (they did not load for our script), any primary source for the size of video-call delay. From search results only (pages not opened): writers on music technology put the delay of an ordinary video call at about half a second,
//     and give under about 100 milliseconds as what group singing needs; we do not rely on a number. One provider, Music to Your Home, lists one-to-one singing lessons from $50 for 30 minutes to $102 for 90 minutes (search result, page not opened); we show it as one example and not as a market price.
// Not read, so not written: what lessons cost on average, how many lessons it takes to improve, any claim that online lessons are as good as in-person ones, the law on who may teach singing in any country, ABRSM rules.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: src/lib/plans.ts (Free $0, Pro $12/mo, Academy $29/mo; the Free plan allows 10 students), 0% commission with payment through the tutor's own Stripe or PayPal account,
// a browser video classroom that we have not tested for singing. All names and sums in the examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const SINGING_LESSONS_ONLINE_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'An online singing lesson is a video call where the teacher listens, corrects and sets practice. You cannot sing in time together over video, because the delay breaks it, so lessons run in turns: the teacher plays or demonstrates, then you sing.',
    'A good audio set-up is cheap: headphones, a quiet room and, in Zoom, the "Original sound for musicians" setting, which stops noise suppression from cutting off long notes.',
    'NATS, which says it is the largest association of singing teachers in the world, says its Find-A-Teacher directory lists members. The pages we read do not say membership certifies a teacher, so ask for the qualifications yourself.',
    'Official health pages agree on one warning: a voice that stays hoarse for more than two to three weeks needs a doctor, not another lesson. Stop singing when your voice is hoarse or tired.',
    'Tutafy does not teach singing and lists no singing teachers yet. This guide is honest advice for choosing one anywhere, with 12 questions to ask before you book.',
  ] },
  { type: 'p', text: `Singing lessons online are one-to-one lessons with a voice teacher over a video call. You sing, the teacher listens through your headphones or speakers, and they correct your breathing, posture, tone and song, then set you work for the week. For many learners the draw is simple: the best teacher for you may not live in your town, and you can have the lesson at home.` },
  { type: 'p', text: `This guide is for adults who want to start, for parents choosing a teacher for a child, and for singers who are changing teacher. It explains how a lesson runs, the one thing video cannot do, how to set up your sound, what the main teachers' association says and does not say about qualifications, what official health pages say about your voice, how exam grades can guide your level, and 12 questions to ask. We make booking software, not singing courses, so for every fact about voices or exams we point to the official page, and our own opinions are marked as ours.` },
  { type: 'image', src: '/blog/inline/sing-chorus-sheet-music', alt: 'Open red leather folders of printed music on stands in a choir, with the singers blurred behind and warm out-of-focus lights.', caption: 'Illustrative photo, not a Tutafy user. A lesson usually works from one piece of music at a time.', credit: 'Photo: David Beale (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Chorus_sheet_music_(Unsplash).jpg' },
  { type: 'h2', text: 'How an online singing lesson works' },
  { type: 'p', text: `There is no official format for a singing lesson, and teachers differ. This outline is ours, to help you spot a lesson that has a shape. A 45-minute lesson often looks like this.` },
  { type: 'compare', caption: 'A typical 45-minute online singing lesson. Our outline, not an industry standard. Minutes are approximate.', headers: ['Part', 'Minutes', 'What happens', 'What you need'], rows: [
    ['Check-in', '3', 'How did the week go, any strain or illness, what you want from today', 'Be on time with water nearby'],
    ['Warm-up', '8', 'Breathing, gentle sounds and simple scales, the teacher playing or demonstrating and you repeating', 'Standing space and headphones'],
    ['Technique', '12', 'One skill, such as breath control or a smooth change between low and high notes, worked in short repeats', 'A pencil and the habit of saying what you felt'],
    ['Song', '15', 'A piece you are learning, sung in sections, with the teacher stopping you to fix one thing at a time', 'The music, or the lyrics and a recording'],
    ['Plan', '7', 'What to practise, how long, and what to record and send before the next lesson', 'A notebook'],
  ] },
  { type: 'p', text: `Two things follow. First, the teacher cannot sing with you. Second, much of the value lies between lessons: your practice, and what you record. A teacher who spends the whole lesson talking, or sets no work, is not giving you the shape above.` },
  { type: 'h2', text: 'The one thing video cannot do: sing together' },
  { type: 'p', text: `On a normal video call there is a delay between a sound leaving one computer and arriving at the other. Speech copes with it, because people take turns. Music does not, because singing together means hearing the other person at the same moment you make your own sound. If the other person is slower or faster than you, you adjust at once. With a delay, each of you waits for the other, and the two of you drift apart.` },
  { type: 'p', text: `Search results we read from music-technology writers put the delay of an ordinary video call at around half a second, and say group singing needs far less. We could not open a primary source for any number, so we rely on none. The practical result is the same everywhere: a teacher who says "sing along with me" over a video call is promising something the call cannot do.` },
  { type: 'ul', items: [
    `The teacher plays a note, chord or accompaniment, then goes quiet while you sing, then plays and answers.`,
    `The teacher sings a short phrase and you copy it back, as in a call and answer.`,
    `You sing along to a backing track that you play yourself, and the teacher listens. The track is in your room, with no delay between you and it, and the teacher hears you both.`,
    `You record yourself between lessons and send the recording, so the teacher can reply on a take that has no delay in it.`,
  ] },
  { type: 'p', text: `Ask a teacher how they handle this in the first message. A good answer names one or more of the methods above. A vague answer, or "it works fine", is a reason to ask again.` },
  { type: 'h2', text: 'Set up your sound and your room' },
  { type: 'p', text: `You do not need a studio. You need a few small things done well, and the first of them is a setting that surprises most beginners.` },
  { type: 'ul', items: [
    `Turn off noise suppression, or use the music setting. Oxford Brookes University's support page says that by default Zoom uses noise suppression that can interfere with the audio and even cut it out completely. It says to set the Audio Profile to "Original sound for musicians", and that a toggle button then turns suppression off. If your teacher uses another app, ask what it calls this setting.`,
    `Wear headphones. Without them, the teacher's voice comes out of your speaker and goes back into your microphone, which makes echo for the teacher. Headphones remove it.`,
    `Use a wired internet connection if you can. A cable is steadier than Wi-Fi. If you cannot, sit near the router.`,
    `Put the microphone where it hears you clearly: a laptop at arm's length is enough to start, and a cheap headset microphone is usually better than the built-in one. A pop filter, the round screen in front of a studio microphone, cuts the burst of air on hard consonants, and it is optional.`,
    `Frame the camera so the teacher can see your stance, shoulders and jaw, not only your face. Teachers correct what they can see.`,
    `Choose a room with soft surfaces, and tell the household. A rug, curtains and a sofa soak up echo better than a bare kitchen.`,
  ] },
  { type: 'image', src: '/blog/inline/sing-pop-filter', alt: 'A black and white photo of a studio condenser microphone in a shock mount with a round black pop filter in front of it, against a dark foam panel.', caption: 'A microphone with a pop filter. Nice to have, not needed for a first lesson.', credit: 'Photo: Tim Sheerman-Chase (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Condenser_Microphone_with_Pop_Filter_and_Reflection_Filter.jpg' },
  { type: 'p', text: `Test your set-up the day before: record a phrase, play it back with headphones and listen for notes that cut out, clicks and hum.` },
  { type: 'h2', text: 'Choosing a teacher: what a teachers\' association tells you' },
  { type: 'p', text: `The best-known association is NATS, the National Association of Teachers of Singing. Its Find-A-Teacher page says you can locate singing teachers who are members of NATS, and its membership page says it has around 7,000 members in more than 35 countries. That is useful, but be careful what you take from it.` },
  { type: 'compare', caption: 'What NATS pages say about membership, read 31 Oct 2026. "Not stated" means we found no such statement on the pages we read.', headers: ['Question', 'What the pages say'], rows: [
    ['Who can be a member?', 'Teachers of singing, collaborative pianists and other voice professionals, in five types, including students and those "just beginning their career".'],
    ['Does Find-A-Teacher mean NATS has checked the teacher?', 'The page says only that listed teachers are members. It does not say they are certified, vetted or endorsed.'],
    ['Does membership license or certify a teacher?', 'Not stated on the pages we read.'],
    ['What does its code of ethics ask?', 'That members present themselves honestly and "with documented qualifications", and strive to teach with competence in voice pedagogy, musicianship, repertoire and performance.'],
    ['What does it say about online lessons, children\'s voices or fees?', 'Not stated in the code text we read. We found no NATS page on choosing a teacher or teaching online.'],
  ] },
  { type: 'p', text: `So membership is a sign that a teacher is part of the profession and has agreed to a code. It is not a licence. We did not look at the law in any country, so we cannot say whether anyone needs a licence to teach singing. The sensible reading is that you do the checking, and the code gives you a fair thing to ask for: documented qualifications, which can include degrees, awards, professional affiliations and teaching and performing experience.` },
  { type: 'h2', text: '12 questions to ask a teacher before you book' },
  { type: 'p', text: `Send these in writing, so you have the answers later. A good teacher will not mind. They are our list, built from the NATS code, the health pages below and the problems above.` },
  { type: 'h3', text: 'About the teacher' },
  { type: 'ul', items: [
    `What is your training, and what have you taught? Ask for it in a sentence or two, and for anything in writing that you can check.`,
    `What styles do you teach? Classical, musical theatre, pop and rock use the voice differently. Choose a teacher who works in the style you want.`,
    `Who do you usually teach, and who do you not? A teacher who works mostly with adult beginners is not always the right fit for a teenager or an advanced singer.`,
    `Can I have a short trial, and what does it cost? Many teachers offer one. Ask what you get and what happens if you do not continue.`,
  ] },
  { type: 'h3', text: 'About the lesson' },
  { type: 'ul', items: [
    `How do you deal with the video delay? Look for taking turns, copying phrases, a backing track on your side or recordings between lessons.`,
    `What app do you use, and can I switch off noise suppression in it? See the set-up section.`,
    `What does a lesson look like, and what will I practise in between? Compare the answer with the outline above.`,
    `How do you look after my voice? Ask how they handle warm-ups, rest and strain, and what they do if you are ill or hoarse.`,
  ] },
  { type: 'h3', text: 'About money and rules' },
  { type: 'ul', items: [
    `What does a lesson cost, and what do I pay for a package? Ask for the price per hour, so you can compare teachers on the same footing.`,
    `What is your cancellation and rescheduling policy? Ask how much notice you must give and what happens to a missed lesson.`,
    `How do I pay, and can I dispute a payment if something goes wrong? Pay by a method with some protection.`,
    `If the student is a child, who is in the room? Our view: a parent or guardian should be able to be nearby, the lesson should happen in a shared space of the home, and you should be able to ask for the lesson to be recorded or for a parent to sit in. Ask the teacher about their policy.`,
  ] },
  { type: 'p', text: `If a teacher cannot answer three or more of these, or gets annoyed at being asked, try another. Our guide to finding an online tutor covers the first lesson and the first month.` },
  { type: 'h2', text: 'Exam grades: a guide to your level, not a rule' },
  { type: 'p', text: `Singing has graded exams, a ladder of levels with set songs and skills. Taking one is optional. We found no page that says grades are required for lessons or that they show what you should be learning in a lesson. They can give a teacher and you a shared language for level. These are the facts from the pages we could read.` },
  { type: 'compare', caption: 'Singing exam boards, from their own pages, read 31 Oct 2026. ABRSM answered 403 to our script, so nothing is reported for it.', headers: ['Board', 'Levels', 'Online options', 'What the pages do not say'], rows: [
    ['Trinity College London, singing', 'Initial to Grade 8; 12 songs at each grade with backing and demo tracks; the 2023 syllabus has no end date', 'Digital and face-to-face formats; Rock & Pop digital grades are recorded "at a place and time of their choice" and uploaded', 'A minimum age; anything you must pass before Grade 1'],
    ['RSL Awards (Rockschool), vocals', 'Debut and Grades 1 to 8; two free choice pieces beside the 12 pieces in each grade book', 'Recorded and live-streamed digital exams can take place at the student\'s home', 'A minimum age. Its pages disagree on whether recorded exams cover graded exams or only performance certificates, so check before you enter'],
    ['ABRSM', 'Not read', 'Not read', 'Not read'],
  ] },
  { type: 'p', text: `If you want an exam, ask the teacher whether they prepare students for it and for which board. If you do not, say so, and ask them to plan around songs you love. The RSL page says its exams are meant to encourage musicians of all ages and abilities, which is a reminder that grades are one route, not the only one.` },
  { type: 'image', src: '/blog/inline/sing-piano-keys', alt: 'A man\'s hand with a striped shirt cuff playing a note on a black and white keyboard, with soft green and orange lights blurred behind.', caption: 'Illustrative photo, not a Tutafy user. Many teachers accompany on piano or keyboard.', credit: 'Photo: Gabriel Barletta (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Fingers_on_the_piano_keys_(Unsplash).jpg' },
  { type: 'h2', text: 'Looking after your voice: what official pages say' },
  { type: 'p', text: `Teachers should keep you safe, and you should know the warning signs too. These are the official pages we read. They are general information, not medical advice, and not specific to online lessons.` },
  { type: 'compare', caption: 'Voice care from official pages, read 31 Oct 2026, with the date each page shows. None of this replaces a doctor.', headers: ['Source (date shown)', 'Warning signs and time limits', 'Everyday care it lists'], rows: [
    ['NIDCD, What Is Hoarseness? (updated 6 March 2017)', 'See a doctor if hoarse for more than three weeks, especially without a cold or flu. Also for blood in a cough, trouble swallowing or breathing, a neck lump, pain, or a lost voice lasting more than a few days.', 'Rest, use the voice less and drink plenty of water'],
    ['NIDCD, Taking Care of Your Voice (updated 11 June 2025)', 'Asks whether your voice has become hoarse or raspy, whether you have lost the ability to hit some high notes when singing, and whether your throat feels raw or strained. Advises seeing a doctor to find the cause.', 'Drink plenty of water, take "vocal naps", use a humidifier, avoid singing when hoarse or tired, avoid screaming or whispering, support the voice with breath'],
    ['The Voice Foundation (no date shown)', 'Symptoms that persist two or three weeks after a cold or flu should be seen by an ear, nose and throat doctor.', 'Voice warm-ups before use, and voice training on proper technique'],
    ['NHS, Laryngitis (reviewed 17 January 2024)', 'Usually clears in 1 to 2 weeks; see a GP if symptoms do not improve after 2 weeks or keep coming back.', 'Speak as little as possible, drink fluids, do not whisper or talk loudly'],
  ] },
  { type: 'callout', variant: 'warn', title: 'If your voice is hoarse, rest it and book the doctor, not another lesson', text: `The NIDCD page says to avoid singing when your voice is hoarse or tired. The time limits differ by page: more than three weeks on one, two to three weeks on another, two weeks on the NHS page for laryngitis. If you are unsure, use the shortest, and tell your teacher. A good teacher will cancel a lesson for a sore voice without charging for the rest.` },
  { type: 'p', text: `An online lesson changes one thing: nobody in the room can see you strain. Say when something hurts, and stop. The NIDCD asks whether you have lost the ability to hit some high notes when singing, and a teacher can only know about that change if you say so.` },
  { type: 'h2', text: 'What lessons cost, and how to compare them' },
  { type: 'p', text: `We found no official figure for what singing lessons cost, and we do not invent one. Prices depend on the teacher, the length and the country. One provider's page, as shown in a search result on 31 October 2026, lists one-to-one lessons from $50 for 30 minutes to $102 for 90 minutes. We did not open the page and we show it only as one example of how a price list can look.` },
  { type: 'p', text: `The way to compare is to turn every price into a price per hour. The sums below use invented prices.` },
  { type: 'compare', caption: 'Turning invented price lists into a price per hour. Our arithmetic.', headers: ['Offer', 'Price', 'Length', 'Price per hour'], rows: [
    ['Teacher A, single lesson', '$40', '30 minutes', '$80.00'],
    ['Teacher B, single lesson', '$55', '45 minutes', '$73.33'],
    ['Teacher C, single lesson', '$60', '60 minutes', '$60.00'],
    ['Teacher C, package of 4 for $216', '$54 per lesson', '60 minutes', '$54.00'],
  ] },
  { type: 'p', text: `The cheapest lesson is not the cheapest hour. A 30-minute lesson at $40 costs $80 an hour. And a package lowers the price in return for paying ahead and a rule for missed lessons, which is why our guide to lesson packages lists the terms to ask for: how long the lessons last, whether unused lessons expire and what a refund looks like.` },
  { type: 'p', text: `Also work out what a month costs. One 45-minute lesson a week from Teacher B is $220 for four weeks. Ask whether you can keep that up for six months.` },
  { type: 'image', src: '/blog/inline/sing-tuning-fork', alt: 'A metal tuning fork lying across a page of printed piano sheet music with many notes, with a corner of another white page at the bottom right.', caption: 'A tuning fork on sheet music. Teachers use tones like this to check pitch.', credit: 'Photo: Lukasz Kobus, European Commission (CC BY 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:A_tuning_fork_placed_on_sheet_music.jpg' },
  { type: 'h2', text: 'Adults, children and working singers' },
  { type: 'h3', text: 'If you are an adult beginner' },
  { type: 'p', text: `Say what you want in one sentence: to sing in a choir, to feel confident at karaoke, to play and sing, to stop your voice tiring in a long meeting. A teacher can only plan if you say. Book a trial, expect to feel awkward when you hear yourself, and give it a few weeks before you decide. Record your lesson only if the teacher agrees.` },
  { type: 'h3', text: 'If you are choosing for a child' },
  { type: 'p', text: `The NIDCD advice about not overusing the voice applies to children too. Ask the questions above, and add the last one about who is in the room. Our view is that a young child should have a parent nearby, and that you should be free to end a lesson if anything makes you uncomfortable. We have found no official guidance on children's voices to quote, so choose a teacher who talks about it openly.` },
  { type: 'h3', text: 'If you already sing a lot' },
  { type: 'p', text: `The NIDCD pages place singers among people who make great demands on their voices. Pick a teacher who works in your style, and see a doctor early for a change that does not clear.` },
  { type: 'h2', text: 'What Tutafy does and does not do' },
  { type: 'p', text: `Tutafy is booking software for independent tutors. A teacher can use it to show free hours in the student's time zone, take bookings, send email reminders, keep student notes and take payment through their own Stripe or PayPal account, with 0% commission. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29.` },
  { type: 'ul', items: [
    `Tutafy is not a singing school and has no singing lessons or exercises of its own.`,
    `No singing teacher is listed on Tutafy today. The tutor directory is not open yet: the live page says it opens once at least six tutors are ready, and it lists none. We do not promise you will find a singing teacher here.`,
    `Tutafy has a video classroom in the browser. We have not tested it for singing and do not claim it carries music well. A teacher who uses Zoom or another app for the video can still use Tutafy for the bookings.`,
    `Tutafy does not check qualifications, set prices or guarantee that a lesson helps.`,
    `Your payment processor charges its own fee, so read the Stripe or PayPal page for the current figure.`,
  ] },
  { type: 'h2', text: 'Mistakes people make with online singing lessons' },
  { type: 'ul', items: [
    `Expecting to sing along with the teacher in real time. The delay makes it impossible, and a teacher who plans for turns is doing the right thing.`,
    `Using the built-in noise suppression, so that long notes cut out and the teacher hears a broken sound.`,
    `Singing through a sore, hoarse or tired voice because the lesson is paid for.`,
    `Choosing on price per lesson and not price per hour.`,
    `Taking "member of an association" to mean "certified". The pages we read do not say that.`,
    `Buying a big package before a trial lesson.`,
  ] },
  { type: 'source', text: 'Official pages used here, read on 31 Oct 2026, with the dates the pages show. ABRSM and Zoom\'s own help pages did not load for our script, and we did not open the search results mentioned for video delay and for one provider\'s prices. Read the current page before you decide.', links: [
    { label: 'NATS: Find-A-Teacher', href: 'https://www.nats.org/cgi/page.cgi/find_teacher.html' },
    { label: 'NATS: membership types', href: 'https://www.nats.org/Membership_Types.html' },
    { label: 'NATS: code of ethics', href: 'https://www.nats.org/code-of-ethics.html' },
    { label: 'NIDCD: what is hoarseness?', href: 'https://www.nidcd.nih.gov/health/hoarseness' },
    { label: 'NIDCD: taking care of your voice', href: 'https://www.nidcd.nih.gov/health/taking-care-your-voice' },
    { label: 'The Voice Foundation: voice disorder prevention', href: 'https://voicefoundation.org/health-science/voice-disorders/overview-of-diagnosis-treatment-prevention/voice-disorder-prevention/' },
    { label: 'NHS: laryngitis', href: 'https://www.nhs.uk/conditions/laryngitis/' },
    { label: 'Oxford Brookes: improving audibility of speech over Zoom', href: 'https://telsupport.brookes.ac.uk/articles/improving-audibility-of-speech-in-lectures-over-zoom/' },
    { label: 'Trinity College London: singing grades', href: 'https://www.trinitycollege.com/qualifications/music/grade-exams/singing/' },
    { label: 'RSL Awards: vocals', href: 'https://www.rslawards.com/learn-vocals/' },
    { label: 'RSL Awards: recorded digital exams', href: 'https://www.rslawards.com/graded-music-exams/recorded-digital-exams/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to find a good online tutor', href: '/blog/how-to-find-an-online-tutor', text: 'Ten checks for any subject, before the first lesson and after four.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'The terms to ask about before you pay for a block of lessons.' },
    { label: 'How to schedule tutoring lessons across time zones', href: '/blog/schedule-tutoring-lessons-across-time-zones', text: 'Fixing a regular slot with a teacher in another country.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'For teachers: how to put your training and style on one page.' },
    { label: 'Tutoring cancellation policies and contracts', href: '/blog/tutoring-cancellation-policy-and-contracts', text: 'What a fair cancellation rule contains.' },
  ] },
  { type: 'faq', items: [
    { q: 'Do online singing lessons work?', a: `They can work for technique, song work and feedback, because the teacher listens and corrects you through a video call. They cannot let you sing in time with the teacher, because video delay breaks it, so good lessons use turns, copied phrases, a backing track on your side or recordings between lessons.` },
    { q: 'What do I need for an online singing lesson?', a: `A computer or phone with a camera, headphones, a quiet room with soft surfaces, and your music. In Zoom, set the Audio Profile to "Original sound for musicians" so noise suppression does not cut off your notes, as Oxford Brookes University's support page explains.` },
    { q: 'Can you sing together with a teacher over Zoom?', a: `Not in time. A delay on the call means each of you hears the other late, so you drift apart. Teachers get round it by playing and then listening, by singing a phrase for you to copy, or by listening while you sing to a track on your own device.` },
    { q: 'How do I know a singing teacher is qualified?', a: `Ask for their training and teaching experience in writing. NATS membership shows a teacher belongs to the association and has agreed to its code, which asks for documented qualifications, but the pages we read do not say membership certifies anyone.` },
    { q: 'How long should a voice stay hoarse before I see a doctor?', a: `The NIDCD says more than three weeks, especially without a cold or flu. The Voice Foundation says two or three weeks after a cold or flu, and the NHS laryngitis page says two weeks. Stop singing when your voice is hoarse or tired, and see a doctor sooner if you have pain or trouble breathing.` },
    { q: 'How do I compare singing lesson prices?', a: `Turn each price into a price per hour. A $40 lesson of 30 minutes is $80 an hour, while a $60 lesson of 60 minutes is $60 an hour. Then check the cancellation rule and whether a package lowers the price.` },
    { q: 'Can I find a singing teacher on Tutafy?', a: `Not yet. Tutafy's tutor directory is not open and lists no tutors. Tutafy is booking software for independent teachers, so a teacher you already know can use it for bookings, reminders and payment.` },
  ] },
  { type: 'cta', title: 'Teaching singing? Give students one place to book', text: 'A booking page that shows your free hours in the student\'s time zone, reminders and payment through your own account. The Free plan covers up to 10 students. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start.', button: 'Start free, no credit card', href: '/register' },
]
