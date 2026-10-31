// T-1262. Article body for /blog/german-tutor-online (title, date and author are in the POSTS list in src/lib/blog.ts).
// Calendar day 18 Nov 2026. Keyword (OpenSEO, US, English, 31 Oct 2026): "online german lessons" about 1,900 searches a month, keyword difficulty 35, low competition level (also "french tutor online" 720 at 27, "japanese tutor online" 480 at 24).
// Reader: a LEARNER, an adult who wants to start German or to move up a level, or someone who needs a certificate; also a German teacher who wants to teach online. The site has a Spanish guide on another branch (day 15), so this is the second language guide, not a repeat.
// Step 0 (31 Oct 2026): the first page of Google for "online german lessons tutor how to choose" is tutoring platforms (Preply, AmazingTalker, Sherpa), a language-app blog and a Reddit thread. They say: match the tutor to your level, ask about a native speaker, book a trial, look at credentials,
// one-to-one is better than a group. None puts the official level scale, Goethe-Institut's own hour ranges, the US Foreign Service Institute estimate, what an exam body says about taking German exams remotely and the cost of a certificate for a visa in one place.
// On this site, nothing covers German: blog.ts has no post on German (the Spanish guide on the day-15 branch is the nearest language piece; it is not linked here because it may not be merged yet), so there is no overlap to rewrite.
// Own angle: the levels in plain words, how many hours each level takes (with a sum of weeks for your own hours a week), a first-month plan, what the exam bodies say about online exams (telc says its remote test is not available for German and that remote certificates are not recognised for visa or residence applications),
// and 12 questions to put to a tutor. Tutafy is not a German authority: every fact is from a page we name and our own advice is marked as ours.
// Tutafy data check (31 Oct 2026): we did not query production data. We read the 24 public tutor pages listed in the live sitemap: none mentions German (or Deutsch). The tutor directory is closed (src/lib/directory.ts DIRECTORY_OPENS_AT = 6; the live /tutors page says "The tutor directory opens soon").
// So no German tutor is listed today and the article does not promise to find one. Reported to the Chief: no German tutor listed.
//
// Sources, read on 31 Oct 2026 by our fetch tool unless said otherwise:
//   Wikipedia, "Common European Framework of Reference for Languages" (the page showed "last edited on 22 October 2026"): it copies the Council of Europe level descriptions for A1 to B2 (quoted in the article, marked as Wikipedia's copy) and a table, attributed on the page to the Goethe-Institut for German,
//     of cumulative hours of instruction: A1 60 to 150; A2 150 to 260; B1 260 to 490; B2 450 to 600; C1 600 to 750; C2 750+. The Council of Europe's own pages answered 403 to our script, so we did not read the descriptions at the source.
//   Goethe-Institut London FAQ (goethe.de/ins/gb/en/sta/lon/kur/faq.html): 403 to our script. A search result summary quoted it as giving about 60 to 150 hours (80 to 200 teaching units) for A1, 150 to 260 hours (200 to 350 units) for A2 and 260 to 490 hours (350 to 650 units) for B1, and the Glasgow FAQ as defining a teaching unit
//     as 45 minutes. These match the Wikipedia table above. We say "per a search summary" where we use them.
//   Atlas & Boots, "Foreign Service Institute Language Difficulty Rankings" (page date 16 August 2026, original 21 September 2021): a secondary page that says its data comes from the US State Department's Foreign Service Institute; German is listed in "Category II: 30 weeks (750 hours)";
//     categories are "ranked from easiest to hardest based on the number of classroom hours a learner would need to achieve professional working proficiency (i.e., Level 3 on the Interagency Language Roundtable scale)". The state.gov page answered 403, so we did not read the primary page.
//     Search results show some sites giving 36 weeks and 900 hours for the same category, so the page does not settle which table is current; we give both and say so.
//   telc (telc.net): German certificate exams run from A1 to C2, with dual-level exams A2/B1, B1/B2 and B2/C1 (page undated). "Please note: the remote test is not available for German." "Currently, telc REMOTE certificates are not recognised for visa or residence permit applications."
//     DIGItelc 2.0 "is the new platform for conducting digital telc examinations", rolled out "gradually in March and April 2026"; oral exams "can still be held via Zoom or other video conferencing software". The pages do not say whether candidates can sit German digital exams at home.
//   Not read: Goethe-Institut exam pages (fees, formats, online options: 403 to our script; a search found only low-quality pages with conflicting fees, which we do not use), the Council of Europe, Make it in Germany, BAMF, Deutsche Welle Learn German (blocked), any German embassy page.
//     From search results only (pages not opened): German embassy pages (Dhaka and India sites) were reported to say that spouses generally need A1 German before a visa is issued, with exemptions; we show this as a pointer and send the reader to the embassy page for their own case.
// Not read, so not written: the price of a German certificate exam, whether Goethe offers any exam at home, which certificates a given authority accepts, any average lesson price, how long a given person will take, the claim that online lessons are as good as in-person ones.
// Our own explanation of how German works (cases, genders, verb position) is general language knowledge and is marked as ours; it is not from a source.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: src/lib/plans.ts (Free $0 for 10 students, Pro $12 a month, Academy $29), 0% commission, payment through the tutor's own Stripe or PayPal account, scheduling in the student's time zone,
// a browser video classroom. All names and sums in the examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const GERMAN_TUTOR_ONLINE_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    `A German tutor online gives you one-to-one speaking practice and corrections by video. The levels run from A1 to C2, and the Goethe-Institut's own ranges, as reproduced by Wikipedia, put A1 at about 60 to 150 hours and B1 at 260 to 490 hours in total.`,
    `A US Foreign Service Institute table, as repeated by a secondary site, puts German at about 750 classroom hours for professional working proficiency. Other sites give 900, so treat any figure as a rough guide, not a promise.`,
    `If you need a certificate for a visa, check first. telc says its remote test is not available for German and that remote certificates are not recognised for visa or residence permit applications.`,
    `The best use of a tutor is speaking and feedback. A first month needs a level check, a trial lesson, a fixed weekly time and a few hours of your own practice.`,
    `Tutafy does not teach German and lists no German tutor yet. This guide helps you choose one anywhere, with 12 questions to ask before you book.`,
  ] },
  { type: 'p', text: `A German tutor online is a person who teaches you German in one-to-one video lessons. You speak, they listen and correct, and they set practice for the week. The draw is simple: you can have a lesson with someone in Germany, Austria or Switzerland, or with a teacher who learned German as you are learning it, from your own kitchen table.` },
  { type: 'p', text: `This guide is for adults who want to start, for learners who want to move up a level and for anyone who needs a certificate. It explains what the levels mean, how many hours each takes, what the exam bodies say about taking exams remotely, and how to choose a tutor. We make booking software, not language courses, so for every fact we point to the page we read, and our own opinions are marked as ours.` },
  { type: 'image', src: '/blog/inline/german-marienplatz-street', alt: 'A busy pedestrian street in Munich at dusk, with the Gothic tower of the New Town Hall in the centre, shop signs on both sides and people with umbrellas walking in the foreground.', caption: 'Illustrative photo, not a Tutafy user. Marienplatz in Munich: signs, shop names and station names are real German to read.', credit: 'Photo: Wilfredor (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Street_life_at_Marienplatz,_Munich_-_Images_from_Munich_Project_49.jpg' },
  { type: 'h2', text: 'What an online German lesson looks like' },
  { type: 'p', text: `There is no official format, and tutors differ. The outline below is ours, to help you spot a lesson that has a shape. A 50-minute lesson often looks like this.` },
  { type: 'compare', caption: 'A typical 50-minute online German lesson. Our outline, not an industry standard. Minutes are approximate.', headers: ['Part', 'Minutes', 'What happens', 'What you do'], rows: [
    ['Warm-up', '5', 'Short talk about your week, in German at your level', 'Speak, even when it is slow'],
    ['Review', '10', 'The tutor goes through last week\'s homework and the mistakes that came up most', 'Ask why, not only what'],
    ['New point', '15', 'One new piece of grammar or one theme with the words you need for it', 'Write two or three of your own sentences'],
    ['Speaking practice', '15', 'A role play or a conversation that uses the new point, with corrections at the end, not on every word', 'Aim to talk for most of it'],
    ['Plan', '5', 'What to practise, how long, what to send before the next lesson', 'Note it down'],
  ] },
  { type: 'p', text: `Two things follow. A tutor who talks for most of the lesson is not giving you practice, because you only learn to speak by speaking. And your own work between lessons is where most of the hours come from, which the next sections make clear.` },
  { type: 'h2', text: 'The levels in plain words' },
  { type: 'p', text: `Almost every German course, exam and tutor profile uses the same six levels from the Common European Framework of Reference for Languages, A1 to C2. The Council of Europe's own pages refused our script, so the table below uses Wikipedia's copy of the descriptions for the first four levels. We did not read C1 and C2.` },
  { type: 'compare', caption: 'The first four levels, from Wikipedia\'s copy of the Council of Europe descriptions, read 31 Oct 2026. Wording shortened.', headers: ['Level', 'What the description says you can do'], rows: [
    ['A1', 'Understand and use familiar everyday expressions and very basic phrases; introduce yourself and ask and answer questions about personal details; interact in a simple way if the other person talks slowly and clearly and helps.'],
    ['A2', 'Understand sentences and frequently used expressions on shopping, local geography, employment and basic family information; communicate in simple, routine tasks; describe your background and surroundings in simple terms.'],
    ['B1', 'Understand the main points of clear standard speech on familiar matters; deal with most situations when travelling where the language is spoken; produce simple connected text; describe experiences, hopes and plans and give brief reasons.'],
    ['B2', 'Understand the main ideas of complex text, including technical discussion in your field; interact with enough fluency that regular conversation with native speakers is possible without strain; write clear, detailed text on a wide range of subjects.'],
  ] },
  { type: 'p', text: `Use the table to name where you are and where you want to be. "I can order food and introduce myself, but I cannot follow a conversation" sounds like A1 going on A2. A tutor who asks you to describe your goal as a task ("ring a landlord", "follow a team meeting") is using the same idea.` },
  { type: 'h2', text: 'How many hours does each level take?' },
  { type: 'p', text: `Nobody can say how long you will take, and the sources we found give ranges, not promises. This is what we could read.` },
  { type: 'compare', caption: 'Hours of instruction by level for German, from the Goethe-Institut as copied in a table on Wikipedia (cumulative hours). A search summary of the Goethe-Institut London FAQ gives the same figures for A1 to B1 and defines a teaching unit as 45 minutes.', headers: ['Level', 'Cumulative hours', 'In 45-minute teaching units (A1 to B1 only)'], rows: [
    ['A1', '60 to 150', '80 to 200'],
    ['A2', '150 to 260', '200 to 350'],
    ['B1', '260 to 490', '350 to 650'],
    ['B2', '450 to 600', 'Not read'],
    ['C1', '600 to 750', 'Not read'],
    ['C2', '750 or more', 'Not read'],
  ] },
  { type: 'p', text: `A second source is the US Foreign Service Institute, which sorts languages into categories by classroom hours needed for professional working proficiency. A secondary site (Atlas & Boots, page dated 16 August 2026) says its data comes from the Institute and lists German in "Category II: 30 weeks (750 hours)". We could not open the Institute's own page, and some sites in our search results give 36 weeks and 900 hours for the same category, so we do not know which table is current. Note what it measures: a high level of working proficiency, not a holiday phrasebook.` },
  { type: 'p', text: `The ranges are wide for good reasons. They depend on your first language, your time, how much you speak and how well the lessons fit you. To turn hours into weeks, divide by the hours you really give each week, lessons and self-study together. The sums below are our arithmetic on the Goethe-Institut ranges.` },
  { type: 'compare', caption: 'Weeks to reach the upper end of each range at a steady pace. Our arithmetic. These are not predictions.', headers: ['Target', 'Hours (upper end)', 'At 3 hours a week', 'At 5 hours a week', 'At 8 hours a week'], rows: [
    ['A1', '150', '50 weeks', '30 weeks', 'About 19 weeks'],
    ['A2', '260', 'About 87 weeks', '52 weeks', 'About 33 weeks'],
    ['B1', '490', 'About 163 weeks', '98 weeks', 'About 61 weeks'],
  ] },
  { type: 'p', text: `The point of the table: even at five hours a week in all, the first level takes about 30 weeks at the upper end. Plan for months. If a tutor or course promises B1 in 30 days, ask what hours they assume.` },
  { type: 'h2', text: 'What a tutor does that a course or app does not' },
  { type: 'p', text: `A course and an app teach content on a fixed path. A tutor does something different: they listen to you and react. That makes three things a tutor is good for, in our view.` },
  { type: 'ul', items: [
    `Speaking and listening. You get time to talk, and a person who tells you what you got wrong and why.`,
    `Fitting the plan to you. A tutor can skip what you know and spend a month on what trips you up, such as a case ending you keep missing.`,
    `A deadline. A fixed lesson on Thursday at 7 gets the practice done in a way a free evening does not.`,
  ] },
  { type: 'p', text: `And three things you should not expect them to do alone: learn your vocabulary for you, replace listening to German outside the lesson, or fix a tight schedule. Most learners do best with a tutor and some self-study, such as a course book, short daily reading and listening to German you enjoy.` },
  { type: 'h2', text: 'What German asks of English speakers' },
  { type: 'p', text: `This is our summary of general language knowledge, not a quotation from a source, and it explains what a tutor will spend time on.` },
  { type: 'ul', items: [
    `Gender. Every noun has one of three genders, and you learn the word with its article: der, die or das.`,
    `Cases. The article and the ending change with the job a noun does in the sentence. English hides this; German shows it. It takes time, and it is the main reason a tutor who explains patiently is worth paying for.`,
    `Word order. In a main clause the verb comes second, and in a subordinate clause it goes to the end. A tutor can make you say these aloud until they feel natural.`,
    `Sounds. Some German sounds are new to English speakers, and a tutor can hear which ones you swap. That is hard to learn from a book.`,
    `Long words. German joins words together. The long ones are usually made of small ones you know.`,
  ] },
  { type: 'p', text: `Ask a tutor how they teach cases and word order, and whether they explain in English or in German at your level. Both can work, but the answer tells you how they think.` },
  { type: 'image', src: '/blog/inline/german-ubahn-platform', alt: 'The yellow platform area of the Marienplatz U-Bahn station in Munich with the station name on a sign, an exit sign, a red emergency post and several people sitting and standing.', caption: 'Illustrative photo, not a Tutafy user. A station platform in Munich: the signs say Marienplatz and Ausgang (exit).', credit: 'Photo: Wilfredor (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Platform_of_the_Marienplatz_U-Bahn_station_in_Munich.jpg' },
  { type: 'h2', text: 'One-to-one, a group class or both?' },
  { type: 'p', text: `We found no study that compares them for German, so this is our view. A one-to-one lesson gives you the most speaking time per hour and a plan that fits you. A group class costs less per hour and gives you other learners to talk to, but each person speaks for a small share of the lesson. Many learners do both: a weekly group class for the path and structure, and a tutor every week or two to fix what the class does not reach. If you must choose one and you are a beginner who wants to speak, choose the tutor.` },
  { type: 'p', text: `Be wary of one trap: switching tutors every few weeks. Each new tutor starts again with a level check, and you lose the thread of your mistakes. Give a tutor four lessons before you judge, unless something is wrong.` },
  { type: 'h2', text: 'A first-month plan' },
  { type: 'p', text: `Here is a plan we would use. It is ours, and a good tutor will adjust it.` },
  { type: 'compare', caption: 'A first month with a German tutor. Our plan.', headers: ['Week', 'Lesson', 'Your own practice (about 2 to 3 hours)'], rows: [
    ['1', 'Trial lesson. Level check by speaking, one goal, the weekly slot fixed', 'Learn the alphabet sounds, numbers to 20, greetings. Say them aloud'],
    ['2', 'First real lesson on the most useful pattern for your goal', 'Ten minutes a day of listening, and the homework'],
    ['3', 'Review the mistakes. Add the next pattern', 'Write five sentences about your day, and send them before the lesson'],
    ['4', 'Short test of the month, by speaking. Decide: keep, change or stop', 'Record one minute of yourself, and compare with week 1'],
  ] },
  { type: 'h3', text: 'What to do between lessons' },
  { type: 'ul', items: [
    `Say it aloud. Read the lesson's sentences aloud, and record yourself once a week.`,
    `Learn each noun with its article, der, die or das, as one word. "Tisch" alone is half a word; "der Tisch" is a whole one.`,
    `Listen to German you enjoy, at a level you can follow, for ten minutes a day. Slow news, a podcast for learners or a children's programme all count.`,
    `Keep a mistake list. Write down the three errors your tutor corrects most, and check them before each lesson.`,
  ] },
  { type: 'p', text: `At the end of the month ask three questions: can I say more than I could? Do I look forward to the lesson? Does the tutor tell me what to do next? Three yeses mean continue.` },
  { type: 'h2', text: 'Exams, certificates and visas' },
  { type: 'p', text: `You do not need an exam to learn German. You do need one for some jobs, courses and visas, and then the details matter. This is what we could read, and what we could not.` },
  { type: 'compare', caption: 'What the pages say about German exams, read 31 Oct 2026. "Not read" means the page refused our script or we did not find a page.', headers: ['Question', 'telc (telc.net)', 'Goethe-Institut'], rows: [
    ['Which levels?', 'A1 to C2, plus dual-level exams A2/B1, B1/B2 and B2/C1', 'Not read'],
    ['Can I take it remotely?', '"Please note: the remote test is not available for German." DIGItelc 2.0, the digital exam platform, was rolled out in March and April 2026; the pages do not say whether German digital exams can be taken at home. Oral exams "can still be held via Zoom or other video conferencing software"', 'Not read. A search found only low-quality pages with conflicting answers, so we use none'],
    ['Is a remote certificate accepted for a visa?', '"Currently, telc REMOTE certificates are not recognised for visa or residence permit applications."', 'Not read'],
    ['What does it cost?', 'Not stated on the pages we read', 'Not read; a search gave conflicting figures, so we do not quote one'],
  ] },
  { type: 'p', text: `The lesson is plain. Before you pay for an exam, find out from the body that needs the certificate (the embassy, the university, the employer) which certificates it accepts and whether remote or digital ones count. A search showed German embassy pages saying that spouses generally need A1 German before a visa is issued, with exemptions. We did not open those pages and we cannot tell you your case: read your own embassy's page.` },
  { type: 'callout', variant: 'warn', title: 'A certificate sold without an exam is not an exam result', text: `A search for exam fees turned up sites that sell German certificates with no exam. A certificate of that kind is not what an embassy or university asks for, and presenting one can end an application. Book exams only through the exam body's own site or a centre it lists.` },
  { type: 'image', src: '/blog/inline/german-brandenburg-morning', alt: 'The Brandenburg Gate in Berlin on an overcast morning, its tall columns and the chariot statue on top seen from the square, with trees in the distance and no crowds.', caption: 'Illustrative photo, not a Tutafy user. The Brandenburg Gate in Berlin, a place many learners hope to visit.', credit: 'Photo: Thomas Wolf (CC BY-SA 3.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Brandenburger_Tor_morgens.jpg' },
  { type: 'h2', text: '12 questions to ask a German tutor before you book' },
  { type: 'p', text: `Send these in writing so you have the answers later. They are our list, built from the problems above.` },
  { type: 'h3', text: 'About the tutor' },
  { type: 'ul', items: [
    `What is your German background? Native speaker, a learner who reached a high level, or a trained teacher? Ask for what you can check, such as a certificate or a teaching record.`,
    `Which levels do you teach? A tutor who loves advanced reading may not be the best for an A1 beginner.`,
    `Do you teach for an exam, and which one? If you need a certificate, ask whether the tutor has taken students through that exam.`,
    `Can I have a short trial, and what does it cost? Ask what you get and what happens if you do not continue.`,
  ] },
  { type: 'h3', text: 'About the lessons' },
  { type: 'ul', items: [
    `What do you do in a lesson, and how much do I speak? Compare the answer with the outline above.`,
    `Do you explain in English or in German? Beginners often need some English. Ask how that changes as you improve.`,
    `How do you correct me? Look for corrections at the end of an answer, and a list of the most common mistakes.`,
    `What materials do you use, and what do I practise between lessons? Look for a set homework, not "read something".`,
  ] },
  { type: 'h3', text: 'About money and rules' },
  { type: 'ul', items: [
    `What does a lesson cost, and what is the price per hour? Ask so that you can compare tutors on the same footing.`,
    `What is your cancellation and rescheduling policy? Ask how much notice you must give and what happens to a missed lesson.`,
    `Which time zone is the lesson in? Ask them to confirm the time in yours, especially around the clock changes in spring and autumn.`,
    `How do I pay, and can I dispute a payment if something goes wrong? Pay by a method with some protection.`,
  ] },
  { type: 'p', text: `If a tutor cannot answer three or more of these, or gets annoyed at being asked, try another. Our guide to finding an online tutor covers the first lesson and the first month for any subject.` },
  { type: 'h2', text: 'What lessons cost, and how to compare them' },
  { type: 'p', text: `We found no official figure for what German lessons cost, and we do not invent one. One search result summarised a platform listing about $35 for a 50-minute lesson and others at $16 to $20 for newer tutors; we did not open those pages and show the figures only as an example of how wide a market can be. Prices depend on the tutor, the length and the country. Compare by turning every price into a price per hour. The sums below use invented prices.` },
  { type: 'compare', caption: 'Turning invented price lists into a price per hour. Our arithmetic.', headers: ['Offer', 'Price', 'Length', 'Price per hour'], rows: [
    ['Tutor A, single lesson', '$20', '30 minutes', '$40.00'],
    ['Tutor B, single lesson', '$34', '50 minutes', '$40.80'],
    ['Tutor C, single lesson', '$36', '60 minutes', '$36.00'],
    ['Tutor C, package of 10 for $330', '$33 per lesson', '60 minutes', '$33.00'],
  ] },
  { type: 'p', text: `The cheapest lesson is not the cheapest hour: Tutor A's 30-minute lesson costs more per hour than Tutor C's full hour. A package lowers the price in return for paying ahead, so read our guide to lesson packages for the terms to ask about, such as expiry and refunds. Then work out a month: two one-hour lessons a week from Tutor C is about $288 for four weeks at the single-lesson price. Ask whether you can keep that up for six months.` },
  { type: 'h2', text: 'What Tutafy does and does not do' },
  { type: 'p', text: `Tutafy is booking software for independent tutors. A tutor can use it to show free hours in the student's time zone, take bookings, send email reminders, keep student notes and take payment through their own Stripe or PayPal account, with 0% commission. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29.` },
  { type: 'ul', items: [
    `Tutafy is not a language school and has no German lessons or exercises of its own.`,
    `No German tutor is listed on Tutafy today. We read the 24 public tutor pages on the site on 31 October 2026 and none mentions German. The tutor directory is not open yet: the live page says it opens soon. We do not promise you will find a German tutor here.`,
    `Tutafy shows free hours in the student's time zone, which helps with a tutor in another country. It does not check qualifications, set prices or guarantee that a lesson helps. Your payment processor charges its own fee.`,
  ] },
  { type: 'h2', text: 'Mistakes people make with online German lessons' },
  { type: 'ul', items: [
    `Booking a long package before a trial lesson.`,
    `Paying for a remote exam, and then finding the visa office does not accept it.`,
    `Buying a certificate sold without an exam.`,
    `Choosing on price per lesson, not price per hour.`,
    `Expecting a level in weeks. The hour ranges say months.`,
    `Talking less than the tutor in the lesson.`,
  ] },
  { type: 'source', text: `Pages used here, read on 31 Oct 2026. The Goethe-Institut, Council of Europe, State Department and Make it in Germany pages refused our script, so figures from them come from Wikipedia, a search summary or a secondary site, as said above. Read the current page before you decide.`, links: [
    { label: 'Wikipedia: Common European Framework of Reference for Languages', href: 'https://en.wikipedia.org/wiki/Common_European_Framework_of_Reference_for_Languages' },
    { label: 'Atlas & Boots: Foreign Service Institute language difficulty', href: 'https://www.atlasandboots.com/foreign-service-institute-language-difficulty' },
    { label: 'telc: German certificate exams', href: 'https://www.telc.net/en/language-examinations/certificate-exams/german/' },
    { label: 'telc: remote tests', href: 'https://www.telc.net/en/language-examinations/telc-remote-tests/' },
    { label: 'telc: DIGItelc 2.0', href: 'https://www.telc.net/en/language-examinations/digital-telc-exams-with-digitelc-20/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to find a good online tutor', href: '/blog/how-to-find-an-online-tutor', text: 'Ten checks for any subject, before the first lesson and after four.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'The terms to ask about before you pay for a block of lessons.' },
    { label: 'How to schedule tutoring lessons across time zones', href: '/blog/schedule-tutoring-lessons-across-time-zones', text: 'Fixing a regular slot with a tutor in another country.' },
    { label: 'How to run a trial lesson', href: '/blog/how-to-run-a-trial-lesson-tutoring', text: 'For tutors: what a first lesson should cover and what a learner should look for.' },
    { label: 'Tutoring cancellation policies and contracts', href: '/blog/tutoring-cancellation-policy-and-contracts', text: 'What a fair cancellation rule contains.' },
  ] },
  { type: 'faq', items: [
    { q: 'How long does it take to learn German with a tutor?', a: `It depends on you. The Goethe-Institut's ranges, as copied by Wikipedia, are about 60 to 150 hours of instruction in total for A1, 260 to 490 for B1 and 600 to 750 for C1. A secondary site gives the US Foreign Service Institute estimate for German as about 750 classroom hours for professional working proficiency, and other sites say 900. At five hours a week in all, the upper end of A1 takes about 30 weeks.` },
    { q: 'What do the German levels A1, A2, B1 and B2 mean?', a: `They are levels of the Common European Framework of Reference. A1 is very basic phrases and simple exchanges, A2 is routine tasks and simple descriptions, B1 is the main points of clear speech and simple connected text, and B2 is understanding complex text and talking with native speakers without strain.` },
    { q: 'Can I take a German exam online?', a: `It depends on the exam body and the level. telc says its remote test is not available for German, and that oral exams can be held over video. We could not read Goethe-Institut's pages, so check the exam body's own site, and check with whoever needs the certificate.` },
    { q: 'Do I need a certificate for a visa?', a: `Some visas ask for a certificate at a set level, often A1 for a spouse, and some exempt certain cases. We could not open an official page, so read your embassy's page. telc says its remote certificates are currently not recognised for visa or residence permit applications.` },
    { q: 'How do I compare German tutors?', a: `Turn each price into a price per hour: a $20 lesson of 30 minutes is $40 an hour and a $36 lesson of 60 minutes is $36 an hour. Then check the trial lesson, the cancellation rule, how much you speak in a lesson and whether the tutor has taught for your exam.` },
    { q: 'Can I find a German tutor on Tutafy?', a: `Not yet. Tutafy's tutor directory is not open and none of its 24 public tutor pages mentions German. Tutafy is booking software for independent tutors, so a tutor you already know can use it for bookings, reminders and payment.` },
  ] },
  { type: 'cta', title: 'Teaching German? Give students one place to book', text: `A booking page that shows your free hours in the student's time zone, reminders and payment through your own account. The Free plan covers up to 10 students. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start.`, button: 'Start free, no credit card', href: '/register' },
]
