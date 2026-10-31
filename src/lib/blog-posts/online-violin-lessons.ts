// T-1262. Article body for /blog/online-violin-lessons (title, date and author are in the POSTS list in src/lib/blog.ts).
// Calendar day 18 Nov 2026. Keyword (OpenSEO, US, English, 31 Oct 2026): "online violin lessons" about 1,300 searches a month, keyword difficulty 14; chosen over "piano lessons online" (1,900, difficulty 46) and
// "guitar lessons online" (3,600, difficulty 46) because the demand is real and the competition is thin. Reader: a LEARNER (an adult, or a parent of a child), also a violin teacher who wants to teach online.
// Step 0 (31 Oct 2026): the first page of Google for "online violin lessons how they work beginners" is lesson-marketplace pages (Lessonface, Preply, Wiingy), video-course libraries and a few teacher blogs. They say a teacher can watch and
// correct you over video and that cheap "violin-shaped" instruments are a trap, but we found none that puts the size of the violin, what a teacher cannot do through a camera, the parent's job in Suzuki teaching, what the exam boards say about
// digital exams and a hearing-safety figure from an official page side by side. On this site, nothing covers the violin: blog.ts has no post on violin or strings (the singing post on another branch is the nearest music piece), so there is no overlap to rewrite.
// Own angle: what video can and cannot teach a violinist, how to set up two camera angles and your sound, how to size a violin by arm length, what the Suzuki and string-teacher associations say (and do not say), what two exam routes say about online
// exams, and 12 questions to put to a teacher. Tutafy is not a violin authority: every fact is from a page we name and our own advice is marked as ours.
// Tutafy data check (31 Oct 2026): we did not query production data. We read the 24 public tutor pages listed in the live sitemap: none mentions violin or any string instrument. The tutor directory is closed (src/lib/directory.ts DIRECTORY_OPENS_AT = 6;
// the live /tutors page says "The tutor directory opens soon"). So no violin teacher is listed today and the article does not promise to find one. Reported to the Chief: no violin tutor listed.
//
// Sources, read on 31 Oct 2026 by our fetch tool unless said otherwise:
//   Trinity College London, Strings (grade-exams/strings): "Exams can be taken face-to-face or digitally."; digital candidates choose the Technical Work pathway (three pieces plus technical work) or the Repertoire-only pathway (four pieces); "Digital exams can now be performed with
//     either live or recorded accompaniments across all grades."; "Backing tracks can be used for face-to-face exams up to Grade 3."; "Each new graded Violin book includes 12 pieces". Digital page: 100 marks for each pathway; "Record and submit your video ... using the online submission platform". No fee or age limit on the pages we read.
//   ASTA (American String Teachers Association), ASTACAP online page: open "from June 1 to June 30 and from November 1 to November 30 every year"; "You must be a current ASTA member to submit applications on behalf of your students"; "Students of all ages may participate."; levels "Foundation - Level 10";
//     fees with a digital-only certificate $40 (Foundation to 2), $55 (3 to 5), $70 (6 to 7), $85 (8 to 10); "Videos MUST be recorded back-to-back, as if in a live exam setting. No edits may be made to the videos". It is a recorded-video submission, not a live remote exam.
//   Suzuki Association of the Americas: "Ask teachers if they are SAA members and inquire about their training and experience."; "Don't be fooled into believing that 'anyone can teach Suzuki.'"; parents "attend lessons with the child and serve as 'home teachers and practice partners' during the week."
//     Teacher training courses can be taken "online or in person"; "No teaching experience, audition, or membership is required" for the first course. The phrase "registered teacher" is on none of the pages we read. No page we read mentions online lessons for students.
//   Corilon (a violin maker), "Finding a student violin in the proper size", no date shown: arm-length table, measuring "the span between the beginning of the shoulder and the middle of the open palm", and "A violin size that is too small is much less challenging to play than one that is too large."
//     The page text is flattened; we matched rows to sizes and checked them against a consolidated reading of several other charts (search result summary, page not opened). The boundaries differ by about half an inch between charts.
//   NIDCD, Noise-Induced Hearing Loss (last updated 16 April 2025): sounds at or below 70 dBA are unlikely to cause hearing loss; "long or repeated exposure to sounds at or above 85 dBA can cause hearing loss"; music through headphones at maximum volume 94 to 110 dBA; "The louder the sound, the shorter the amount of time".
//   Oxford Brookes University, "Improving audibility of speech in lectures over Zoom" (updated 22 February 2023): by default Zoom uses noise suppression that "can interfere with the audio and even cut it out completely"; choose the audio profile "Original sound for musicians"; a toggle button turns suppression off; more background noise results.
//   Not read: ABRSM (403 to our script), Zoom's own help page, any primary source for video-call delay, any official page on how much a violin lesson costs or on how long a beginner takes to reach a level.
// Not read, so not written: average lesson prices, how many months to a first piece, that online lessons are as good as in-person ones, how loud a violin is, the law on who may teach.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: src/lib/plans.ts (Free $0 for 10 students, Pro $12 a month, Academy $29), 0% commission, payment through the tutor's own Stripe or PayPal account, a browser video classroom that we have not tested for the violin.
// All names and sums in the examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const ONLINE_VIOLIN_LESSONS_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    `Online violin lessons are one-to-one video calls where a teacher watches your hold and bow and listens to your sound. A camera cannot move your fingers, so you need two camera angles and a teacher who tells you what to look for.`,
    `You cannot play in time with a teacher over video, because the delay breaks it. Good lessons run in turns: the teacher plays, then you play, or you play with a track on your own device while the teacher listens.`,
    `Measure before you buy. A violin maker's chart sizes a violin by arm length, from the shoulder to the middle of the open palm, and says a violin that is too small is much less of a problem than one that is too large.`,
    `Two exam routes say you can sit grades online: Trinity College London for strings, and the American String Teachers Association by recorded video. Both are optional.`,
    `Tutafy does not teach the violin and lists no violin teacher yet. This guide helps you choose one anywhere, with 12 questions to ask before you book.`,
  ] },
  { type: 'p', text: `Online violin lessons are one-to-one lessons with a violin teacher over a video call. You play, the teacher watches and listens, and then corrects how you hold the violin, draw the bow and place your fingers, and sets you work for the week. The draw is simple: the right teacher for you may live in another country, and you can have the lesson at home with your own instrument.` },
  { type: 'p', text: `The violin is a hard instrument to teach through a screen. A teacher in the room can lift your elbow a centimetre and hear the real sound of your violin. Over video, they see a small flat picture and hear compressed audio. This guide is for adults who want to start, parents choosing a teacher and players changing teacher. We make booking software, not violin courses, so for every fact we point to the page we read, and our own opinions are marked as ours.` },
  { type: 'image', src: '/blog/inline/violin-outdoor-practice', alt: 'A woman with a fringe and a ponytail plays a violin outdoors, her bow drawn across the strings and her left hand on the neck, with a blurred hillside behind her.', caption: 'Illustrative photo, not a Tutafy user. The bow arm and the left hand are the two things a teacher watches most.', credit: 'Photo: Elijah Henderson (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Outdoors_violin_practice_(Unsplash).jpg' },
  { type: 'h2', text: 'How an online violin lesson works' },
  { type: 'p', text: `There is no official format for a violin lesson, and teachers differ. The outline below is ours, to help you spot a lesson that has a shape. A 45-minute lesson often looks like this.` },
  { type: 'compare', caption: 'A typical 45-minute online violin lesson. Our outline, not an industry standard. Minutes are approximate.', headers: ['Part', 'Minutes', 'What happens', 'What you need'], rows: [
    ['Check-in', '3', 'How practice went, any aches, what you want from today, a quick tuning check', 'Violin tuned before the call'],
    ['Posture and hold', '7', 'Feet, shoulders, jaw, violin angle and bow grip, checked from the front and from the side', 'Two camera angles, standing space'],
    ['Technique', '12', 'One skill, such as an even bow stroke on an open string, or placing a finger in tune, worked in short repeats', 'Pencil, tuner or a piano app'],
    ['Piece', '15', 'A tune you are learning, played in short sections, with one fix at a time', 'The music on a stand you can see'],
    ['Plan', '8', 'What to practise, how long, what to record and send before the next lesson', 'A notebook'],
  ] },
  { type: 'p', text: `Much of the value lies between lessons, in your practice and what you record. A teacher who talks for the whole lesson, or sets no work, is not giving you this shape. For a young child the same parts shrink to 20 or 30 minutes with more play in them.` },
  { type: 'h2', text: 'What video cannot do for a violinist' },
  { type: 'ul', items: [
    `Touch. A teacher cannot straighten your bow or nudge your elbow. They must tell you in words and show you on their own violin, and you must try it and show them again. Good teachers name the body part, the direction and the amount.`,
    `Playing together. On a normal video call there is a delay between a sound leaving one computer and arriving at the other. Speech copes because people take turns. Playing a tune together does not, because each of you hears the other late and the two of you drift apart. We could not open a primary source for any figure for the delay, so we use none. A teacher who says "play along with me" over a call is promising something the call cannot do.`,
    `The side view. One camera at the front hides the angle of the violin, the height of your right elbow and the line of the bow. This is why the set-up section below asks for two angles.`,
    `Your real tone. Video software squeezes sound to save bandwidth, and it can cut out what it takes for noise. A teacher hears a thinner version of your violin, so many lessons use clips you record on your phone, with no delay and no software in the way.`,
    `Tuning. Pegs and fine tuners need hands. A beginner usually needs the teacher to tune for the first weeks, or a tuner you can see on camera, and a plan for who tunes before each lesson.`,
  ] },
  { type: 'p', text: `Ask a teacher how they handle these in the first message. A good answer names two or three of the following methods.` },
  { type: 'ul', items: [
    `Taking turns: the teacher plays a phrase, stays silent while you copy it, then answers.`,
    `A track on your side: you play along with a recording or a drone note on your own device, and the teacher listens to you and the track together. There is no delay between you and the track.`,
    `Recorded homework: you send a short clip between lessons, and the teacher replies on a take that has no call in the way.`,
  ] },
  { type: 'h2', text: 'Set up your camera, sound and room' },
  { type: 'p', text: `You do not need a studio. You need a few small things done well.` },
  { type: 'ul', items: [
    `Use two angles. Our suggestion: the laptop camera at the front, at about the height of your face, and a phone on a stand to your right side. If you only have one camera, move it to the side for a minute when the teacher asks.`,
    `Leave room to move: space to stand and to draw the bow its full length without hitting a lamp or the wall. Put the music on a stand where you can read it in the playing position.`,
    `Turn off noise suppression, or use the music setting. Oxford Brookes University's support page says that by default Zoom uses noise suppression that can interfere with the audio and even cut it out completely. It says to choose the audio profile "Original sound for musicians" and then use the toggle button that turns suppression off, at the price of more background noise. If your teacher uses another app, ask what it calls this setting.`,
    `Use headphones, and keep the volume moderate. The NIDCD says that long or repeated exposure to sounds at or above 85 dBA can cause hearing loss, and lists music through headphones at maximum volume at 94 to 110 dBA. Headphones also stop the teacher's voice from coming out of your speaker and back into your microphone, which makes echo.`,
    `Use a cable if you can, and tune before the call. A soft room with a rug and curtains sounds better to the microphone than a bare kitchen.`,
  ] },
  { type: 'image', src: '/blog/inline/violin-teaching-class', alt: 'A music stand holding an open book of printed music stands beside a row of lilac chairs, with an open black violin case with a red lining resting on one chair.', caption: 'A lesson room: a stand, a case and space. Photo from a music classroom. At home you only need the stand and the space.', credit: 'Photo: Satirdan kahraman (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Keman_%C3%B6%C4%9Fretim_s%C4%B1n%C4%B1f%C4%B1.jpg' },
  { type: 'p', text: `Test your set-up the day before: record a few notes on a phone and with the call software, play both back with headphones and listen for notes that cut out, clicks and hum.` },
  { type: 'h2', text: 'Violin size: measure before you buy' },
  { type: 'p', text: `Sizes are called fractions: 1/16 is the smallest on the chart below and 4/4 is full size. Charts size a violin by arm length, not age. The chart below is from Corilon, a violin maker, with no date shown on the page.` },
  { type: 'compare', caption: 'Violin size by arm length, from a violin maker (Corilon). Arm length is measured from the start of the shoulder to the middle of the open palm. Inches are our conversion. Other charts differ by about half an inch at each boundary.', headers: ['Arm length', 'About (inches)', 'Approximate age', 'Violin size', 'Body length'], rows: [
    ['340 to 430 mm', '13.4 to 16.9', '3 to 5', '1/16', '230 mm'],
    ['420 to 445 mm', '16.5 to 17.5', '4 to 7', '1/8', '255 mm'],
    ['445 to 510 mm', '17.5 to 20.1', '5 to 8', '1/4', '280 mm'],
    ['500 to 570 mm', '19.7 to 22.4', '6 to 9', '1/2', '320 mm'],
    ['560 to 600 mm', '22.0 to 23.6', '7 to 11', '3/4', '335 mm'],
    ['Over 600 mm', 'Over 23.6', 'Adults', '4/4', '355 mm'],
  ] },
  { type: 'p', text: `The same page gives a simple check: a child should be able to cup the scroll in their hand when they stretch their arm out fully. It also says that a violin that is too small is much less challenging to play than one that is too large. Our reading of that: if the arm falls between two sizes, ask the teacher, and lean towards the smaller one. Children grow, so measure again at the start of each term, and ask whether the shop or your teacher can swap or rent sizes.` },
  { type: 'p', text: `We found no official page on what a violin should cost, so we give no figure. Our advice is to ask your teacher or a violin shop to check an instrument before you buy it, because a violin that will not stay in tune or whose strings sit too high makes a beginner's sound worse and hides whether a problem is the player or the violin. A teacher over video cannot check it for you, so ask a local shop to set it up.` },
  { type: 'h2', text: 'Children, parents and the Suzuki approach' },
  { type: 'p', text: `If you are choosing for a child, the parent's job is bigger than for most subjects, and online it grows. The Suzuki Association of the Americas says that in Suzuki teaching parents attend lessons with the child and serve as "home teachers and practice partners" during the week. On a call, that means the parent sits beside the child, takes notes (or asks to record the lesson if the teacher agrees), and holds the phone for the side view. Our view: keep the lesson in a shared room, not a bedroom. We found no official guidance on children's online lessons to quote, so choose a teacher who talks about it openly, and keep a young child's lesson short.` },
  { type: 'h2', text: 'Choosing a teacher: what two associations say' },
  { type: 'p', text: `Two American associations have pages worth reading, and neither is a licence. Be careful what you take from them.` },
  { type: 'compare', caption: 'What the pages say, read 31 Oct 2026. "Not stated" means we found no such statement on the pages we read.', headers: ['Question', 'Suzuki Association of the Americas', 'American String Teachers Association'], rows: [
    ['What is it?', 'Says it is a community of over 6,000 teachers, parents, educators and learners, founded in 1972', 'Says it was founded in 1946 to support string and orchestra teachers and players'],
    ['What does it say about choosing a teacher?', '"Ask teachers if they are SAA members and inquire about their training and experience." And: "Don\'t be fooled into believing that \'anyone can teach Suzuki.\'"', 'Its home page has no page on choosing a teacher'],
    ['Does it say membership certifies a teacher?', 'Not stated. It says members are dedicated to the method and to training, and the phrase "registered teacher" is on none of the pages we read', 'Not stated'],
    ['What does it say about training?', 'Training courses for violin teachers can be taken "online or in person"; the first course needs no teaching experience, audition or membership', 'Not stated on the pages we read'],
    ['What does it say about online lessons for students?', 'Not stated', 'Not stated'],
  ] },
  { type: 'p', text: `So the Suzuki page gives you two fair questions: is the teacher a member, and what is their training and experience. It does not say that a member is vetted, and the Suzuki Method is one way to teach, not the only one.` },
  { type: 'h2', text: '12 questions to ask a teacher before you book' },
  { type: 'p', text: `Send these in writing so you have the answers later. A good teacher will not mind. They are our list, built from the pages above and the problems in this guide.` },
  { type: 'h3', text: 'About the teacher' },
  { type: 'ul', items: [
    `What is your training, and what have you taught? Ask for it in a sentence or two, and for anything in writing that you can check.`,
    `What approach do you use? Suzuki, a classical method book, folk or fiddle tunes. Pick one that fits what you want to play.`,
    `Who do you usually teach? A teacher who works mostly with young children is not always the right fit for an adult beginner, and the other way round.`,
    `Can I have a short trial, and what does it cost? Ask what you get and what happens if you do not continue.`,
  ] },
  { type: 'h3', text: 'About the lesson' },
  { type: 'ul', items: [
    `How do you deal with the video delay? Look for taking turns, a track on your side or recorded homework.`,
    `How do you check my hold and bow over video? Look for two camera angles and a short checklist for home.`,
    `Who tunes the violin, and how will I learn to? A good answer has a plan, such as a tuner on screen for the first weeks.`,
    `What will I practise between lessons, and how long should it take? Compare the answer with the outline above.`,
  ] },
  { type: 'h3', text: 'About money and rules' },
  { type: 'ul', items: [
    `What does a lesson cost, and what do I pay for a package? Ask for the price per hour, so you can compare teachers on the same footing.`,
    `What is your cancellation and rescheduling policy? Ask how much notice you must give and what happens to a missed lesson.`,
    `How do I pay, and can I dispute a payment if something goes wrong? Pay by a method with some protection.`,
    `If the student is a child, who is in the room, and can the lesson be recorded or a parent sit in? Our view is that a parent should be able to be nearby.`,
  ] },
  { type: 'p', text: `If a teacher cannot answer three or more of these, or gets annoyed at being asked, try another. Our guide to finding an online tutor covers the first lesson and the first month.` },
  { type: 'h2', text: 'Exam grades: two routes that say they work online' },
  { type: 'p', text: `Violin has graded exams: a ladder of levels with set pieces and skills. Taking one is optional. We found no page that says grades are required for lessons. They give you and a teacher a shared way to talk about level. These are the facts from the pages we could read.` },
  { type: 'compare', caption: 'Exam routes from their own pages, read 31 Oct 2026. ABRSM answered 403 to our script, so nothing is reported for it.', headers: ['Route', 'What the page says', 'Online option', 'What the page does not say'], rows: [
    ['Trinity College London, strings (including violin)', 'Each new graded violin book has 12 pieces. Digital candidates choose three pieces plus technical work, or four pieces', 'Exams can be taken face-to-face or digitally; you record and submit a video, with live or recorded accompaniment', 'A fee or a minimum age (not on the pages we read)'],
    ['ASTA, ASTACAP online', 'Levels from Foundation to Level 10; students of all ages may take part', 'Open 1 to 30 June and 1 to 30 November each year; a video recorded back-to-back with no edits; a current ASTA member must submit for the student', 'It is not a live remote exam. Digital-only certificates cost $40 to $85 by level. A teacher who is not an ASTA member cannot submit'],
    ['ABRSM', 'Not read', 'Not read', 'Not read'],
  ] },
  { type: 'p', text: `If you want an exam, ask the teacher which route they prepare students for, and who films and submits the video. If you do not, ask them to plan around tunes you love.` },
  { type: 'image', src: '/blog/inline/violin-sheet-music-studio', alt: 'A violin lying across two open pages of printed violin music in a dark studio, the pages lit from the left, with the neck of the violin pointing up to the right.', caption: 'Illustrative photo, not a Tutafy user. A violin and the page it is learning: most lessons work on one piece at a time.', credit: 'Photo: Peachyeung316 (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Sheet_music_and_Violin.jpg' },
  { type: 'h2', text: 'Looking after your hearing and your body' },
  { type: 'p', text: `We are not medical writers, so we only give what an official page says. The NIDCD page on noise-induced hearing loss, last updated 16 April 2025, says sounds at or below 70 dBA are unlikely to cause hearing loss even after long exposure, and long or repeated exposure to sounds at or above 85 dBA can cause it. It says the louder the sound, the shorter the time it takes. It lists music through headphones at maximum volume at 94 to 110 dBA. We found no page that gives a figure for a violin, so we do not.` },
  { type: 'ul', items: [
    `Keep headphone volume well below the maximum for a whole lesson.`,
    `Stop when something hurts. Pain in the shoulder, neck, wrist or jaw is a reason to stop and tell your teacher. This is our advice, and we found no official page to quote; a doctor is the person to ask about a pain that stays.`,
    `Take breaks, and tell the teacher if your instrument or chair does not fit. A teacher who cannot see your body cannot know.`,
  ] },
  { type: 'h2', text: 'What lessons cost, and how to compare them' },
  { type: 'p', text: `We found no official figure for what violin lessons cost, and we do not invent one. Prices depend on the teacher, the length and the country. The way to compare is to turn every price into a price per hour. The sums below use invented prices.` },
  { type: 'compare', caption: 'Turning invented price lists into a price per hour. Our arithmetic.', headers: ['Offer', 'Price', 'Length', 'Price per hour'], rows: [
    ['Teacher A, single lesson', '$30', '30 minutes', '$60.00'],
    ['Teacher B, single lesson', '$42', '45 minutes', '$56.00'],
    ['Teacher C, single lesson', '$50', '60 minutes', '$50.00'],
    ['Teacher C, package of 4 for $184', '$46 per lesson', '60 minutes', '$46.00'],
  ] },
  { type: 'p', text: `The cheapest lesson is not the cheapest hour: a 30-minute lesson at $30 costs more per hour than a one-hour lesson at $50. A package lowers the price in return for paying ahead, so read our guide to lesson packages for the terms to ask about. Then work out the month (one 45-minute lesson a week from Teacher B is $168 for four weeks), and add the violin, strings, a shoulder rest and rosin.` },
  { type: 'p', text: `If you are an adult beginner, say what you want in one sentence, such as playing folk tunes or joining a community orchestra, and expect scratchy first sounds. If you played once and are coming back, say what you remember and have your old violin checked by a shop before the first lesson.` },
  { type: 'image', src: '/blog/inline/violin-strings-closeup', alt: 'A close-up of the body of a violin lying on a grey wooden floor, with four strings in different colours running over the bridge and past one f-hole.', caption: 'Strings, bridge and f-hole. Illustrative photo, not a Tutafy user. A shop can check that the strings sit at the right height before the first lesson.', credit: 'Photo: Providence Doucet (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Violin_strings_in_close-up_(Unsplash).jpg' },
  { type: 'h2', text: 'What Tutafy does and does not do' },
  { type: 'p', text: `Tutafy is booking software for independent tutors. A teacher can use it to show free hours in the student's time zone, take bookings, send email reminders, keep student notes and take payment through their own Stripe or PayPal account, with 0% commission. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29.` },
  { type: 'ul', items: [
    `Tutafy is not a music school and has no violin lessons or exercises of its own.`,
    `No violin teacher is listed on Tutafy today. We read the 24 public tutor pages on the site on 31 October 2026 and none mentions the violin or any string instrument. The tutor directory is not open yet: the live page says it opens soon. We do not promise you will find a violin teacher here.`,
    `Tutafy has a video classroom in the browser. We have not tested it for the violin and do not claim it carries a violin's sound well. A teacher who uses Zoom or another app for the video can still use Tutafy for the bookings.`,
    `Tutafy does not check qualifications, set prices or guarantee that a lesson helps. Your payment processor charges its own fee.`,
  ] },
  { type: 'h2', text: 'Mistakes people make with online violin lessons' },
  { type: 'ul', items: [
    `Expecting to play along with the teacher in real time. The delay makes it impossible.`,
    `Using one camera at the front only, so the teacher never sees the bow line.`,
    `Leaving noise suppression on, so long notes cut out.`,
    `Buying a violin before measuring, or one that will not stay in tune.`,
    `Taking "member of an association" to mean "certified". The pages we read do not say that.`,
    `Buying a big package before a trial lesson.`,
  ] },
  { type: 'source', text: `Pages used here, read on 31 Oct 2026. ABRSM and Zoom's own help pages did not load for our script, and we did not open the search results behind the other size charts. Read the current page before you decide.`, links: [
    { label: 'Trinity College London: strings exams', href: 'https://www.trinitycollege.com/qualifications/music/grade-exams/strings' },
    { label: 'Trinity College London: digital exams', href: 'https://www.trinitycollege.com/qualifications/music/grade-exams/digital' },
    { label: 'ASTA: ASTACAP online', href: 'https://www.astastrings.org/site/astacap-online' },
    { label: 'Suzuki Association of the Americas: how to choose a teacher', href: 'https://suzukiassociation.org/parents/find-a-suzuki-teacher/how-to-choose-a-teacher/' },
    { label: 'Suzuki Association of the Americas: teacher training', href: 'https://suzukiassociation.org/teachers/teacher-training/' },
    { label: 'Corilon: finding a student violin in the proper size', href: 'https://www.corilon.com/us/library/practical-advice/finding-a-student-violin-in-the-proper-size' },
    { label: 'NIDCD: noise-induced hearing loss', href: 'https://www.nidcd.nih.gov/health/noise-induced-hearing-loss' },
    { label: 'Oxford Brookes: improving audibility of speech over Zoom', href: 'https://telsupport.brookes.ac.uk/articles/improving-audibility-of-speech-in-lectures-over-zoom/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to find a good online tutor', href: '/blog/how-to-find-an-online-tutor', text: 'Ten checks for any subject, before the first lesson and after four.' },
    { label: 'How to run a trial lesson', href: '/blog/how-to-run-a-trial-lesson-tutoring', text: 'For teachers: what a first lesson should cover and what a learner should look for.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'The terms to ask about before you pay for a block of lessons.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'For teachers: how to put your training and style on one page.' },
    { label: 'Tutoring cancellation policies and contracts', href: '/blog/tutoring-cancellation-policy-and-contracts', text: 'What a fair cancellation rule contains.' },
  ] },
  { type: 'faq', items: [
    { q: 'Can you learn violin online?', a: `Yes, for learning technique and tunes with feedback, because a teacher can watch and listen through a video call. It is harder than a room lesson, because the teacher cannot touch your hold, so use two camera angles, tune before the call and send short recordings between lessons.` },
    { q: 'What do I need for an online violin lesson?', a: `A violin of the right size with a bow and rosin, a camera, a second camera for the side view if you can, headphones, a music stand and space to stand. In Zoom, choose the "Original sound for musicians" profile, as Oxford Brookes University's support page explains.` },
    { q: 'Can you play violin together with a teacher over Zoom?', a: `Not in time. A delay on the call means each of you hears the other late, so you drift apart. Teachers get round it by taking turns, by listening while you play along with a track on your own device, or by replying to a recording.` },
    { q: 'What size violin should I buy?', a: `Size depends on arm length, not age. A violin maker's chart measures from the start of the shoulder to the middle of the open palm: about 445 to 510 mm for a 1/4, 500 to 570 mm for a 1/2, 560 to 600 mm for a 3/4 and over 600 mm for a full-size 4/4. If you are between sizes, lean towards the smaller one.` },
    { q: 'Can I take violin exams online?', a: `Some routes allow it. Trinity College London says string exams can be taken face-to-face or digitally, by submitting a video. The American String Teachers Association runs a recorded-video route in June and November, submitted by a member teacher. ABRSM was not readable for us.` },
    { q: 'Can I find a violin teacher on Tutafy?', a: `Not yet. Tutafy's tutor directory is not open and none of its 24 public tutor pages mentions the violin. Tutafy is booking software for independent teachers, so a teacher you already know can use it for bookings, reminders and payment.` },
  ] },
  { type: 'cta', title: 'Teaching the violin? Give students one place to book', text: `A booking page that shows your free hours in the student's time zone, reminders and payment through your own account. The Free plan covers up to 10 students. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start.`, button: 'Start free, no credit card', href: '/register' },
]
