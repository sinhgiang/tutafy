// T-1200. Article body for /blog/how-to-teach-english-online (title, date and author are in the POSTS list in src/lib/blog.ts).
// Update of the post that has been live since 8 Jul 2026: rewritten on 7 Nov 2026 around "teach english online without a degree"
// (OpenSEO, US, English, 31 Oct 2026: about 210 searches a month, difficulty 9; reports/chief/2026-10-31-1315-keyword-data-sapa-tutafy.md).
// Step 0 (overlap with the articles on master, 31 Oct 2026): online-tutoring-jobs (T-1192) is the dated side-by-side of EVERY hiring route (US and Canada companies, rates, tax);
// tutor-resume and how-to-write-a-tutor-bio are the documents; how-to-choose-a-tutoring-niche is niche choice. This guide keeps the English-teaching journey but
// has one angle of its own: the DEGREE question, answered platform by platform for English teachers only, with what a certificate (CELTA, CertTESOL) really is, and how to
// build proof when you have no degree, certificate or experience. It links to those guides instead of repeating them. The old text's claims that cannot be sourced were dropped
// (earning figures for English tutors, "exam prep pays most", "SMS reminders", "student portal", "CEFR levels in Tutafy").
//
// Sources, read on 31 Oct 2026:
//   Read directly: Cambly support, "Applying to become a tutor": "You must be a native English speaker."; "You must be at least 18 years of age."; "While helpful, no prior teaching certificate or experience is
//     required to apply."; applications from a computer, Chrome only; "If you do not receive a response from us, please feel free to apply again in a few months."
//   Read directly: Cambly, Become a tutor (cambly.com/english/tutors): "No teaching certificate, bachelor's degree or prior teaching experience needed."; $0.17/min ($10.2/hour), Cambly Kids $0.20/min ($12/hour);
//     "Get Paid Weekly"; "We're temporarily limiting the number of new tutors we welcome to Cambly".
//   Read directly: Verbling, teacher application (verbling.com/teach): C2 in the language you teach, native speaker not required; "A formal teaching certificate is preferable and will increase your chances of admission.";
//     "Candidates that don't have a certificate or a verifiable teaching experience will not be accepted."; previous experience teaching the language required; no degree mentioned; own hourly rate, no commission figure;
//     application reviewed within 2 weeks.
//   Read directly: AmazingTalker, English teacher page (en.amazingtalker.com/apply-to-teach/english) and home page: "All tutor applicants must have relevant teaching experience or language teaching certificates";
//     "You have a degree in English or a similar degree, or are a native English speaker yourself." under "You're fluent in English"; you choose your hourly rate; a variable service fee "as low as 0%"; paid on the 2nd of every month.
//   Read directly: Cambridge English, CELTA pages: at least 120 hours of study; face-to-face, online or both; usually 4 to 5 weeks, or part time over a few months to a year; entry: age 18+, high C1 or above, "educated to the standard
//     required for entry into higher education"; no degree requirement and no fee stated.
//   Read directly: Trinity College London, CertTESOL page: minimum 130 guided learning hours, total qualification time 200 hours; "Level 5 on the Ofqual Regulated Qualifications Framework" (Trinity's own words, not checked on the
//     Register); age 18 (some providers 20 or 21); sufficient education for entry to higher education; about C1; providers set the fee.
//   Read directly: TESOL International Association, position statements list: independent short-term TESL/TEFL certificate programs "typically ... 4-6 weeks or longer" and "typically neither accredited nor affiliated with an
//     accredited post-secondary institution" (the 2009 statement's PDF could not be decoded, so only the list text is used). Ofqual and GOV.UK pages read: none says anything about TEFL.
//   Read directly: US Bureau of Labor Statistics, Occupational Outlook Handbook, Tutors (last modified 27 Aug 2026): typical entry education "Some college, no degree"; 2025 median pay $43,350 a year ($20.84 an hour); "Most tutors work part time".
//   From search results of the official pages (the pages answered 403 to a script): Preply's FAQ about teaching English online (no official qualifications or professional experience required; many experienced tutors have a degree
//     or certificates) and its register-to-teach help page (18+, photo, 30 second to 2 minute introduction video); italki's apply-to-teach pages (Community Tutor and Professional Teacher; language exams and free online course
//     certificates do not count as teaching qualifications; native or C2). Preply and italki commission numbers come from src/lib/marketplace-rates.ts (RATES_SOURCE), which a test keeps equal on every page.
// Not read, so not written: Engoo's and Wyzant's requirements (the pages gave an empty page and 403), any British Council page (timed out), what any course costs, how much a certificate raises pay, what an English tutor earns
// (no official figure was found), legal rules in any country, whether any given TEFL course is recognised by any platform.
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/lib/plan-list.ts (Free: up to 10 students, booking page, built-in video classroom, email reminders, calendar, PayPal payment link; Pro $12: Stripe card payments,
// packages; 0% commission), src/components/directory/DirectoryView.tsx ("The tutor directory opens soon"), src/components/VideoRoom.tsx (no whiteboard), the booking page shows the student's time zone (src/app/book).
// Invented figures (the $20 take-home target, the $25 lesson) are said to be invented.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'
import { RATES_SOURCE } from '@/lib/marketplace-rates'

export const TEACH_ENGLISH_ONLINE_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'You can teach English online without a degree, but not on every route. Of the five platforms we read on 31 October 2026, Cambly and Preply say a degree is not needed, and Verbling and AmazingTalker ask for a teaching certificate or teaching experience instead.',
    'The test is not the degree. It is your English level (Verbling asks for C2, Cambly for a native speaker), then a certificate, experience, or neither.',
    'A certificate has a real size: Cambridge says CELTA is at least 120 hours and Trinity says CertTESOL is at least 130. Ask the platform you want whether it accepts the one you plan to buy.',
    'With no degree, certificate or experience, build proof: practice lessons, written comments you may quote and a short sample lesson. Then choose where students come from and price from what you keep.',
    'Tutafy is not a marketplace. It does not send students or check qualifications. It is the booking, video, reminder and payment tools for tutors who bring their own students.',
  ] },
  { type: 'p', text: `You can teach English online without a degree, but whether a platform accepts you depends on the platform. On the pages we read on 31 October 2026, Cambly and Preply say no degree is needed, while Verbling and AmazingTalker want a teaching certificate or teaching experience instead. Nothing we read made a degree the deciding test. What the platforms check is how well you speak English and what evidence you have that you can teach.` },
  { type: 'p', text: `This guide was first published in July 2026 and rewritten on 7 November 2026 around that one question. It shows what each platform's own page says, what a certificate such as CELTA involves, how to build proof when you have none, and how to run lessons of your own. We say where a page could not be read, and what Tutafy, the tool we make, does not do. It covers teaching from where you live. Rules for working in a school abroad, such as visas, differ by country, and we have not researched them.` },
  { type: 'image', src: '/blog/inline/teach-online-class', alt: 'A boy with a white earphone sits at a laptop on a cluttered desk with his palms pressed together, joining a video class shown as a grid of faces on the screen.', caption: 'Illustrative photo, not a Tutafy user. A learner joins a class by video call.', credit: 'Photo: Kannan Shanmugam, Shanmugam Studio, Kollam (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Student_attending_online_class_in_Kerala.jpg' },
  { type: 'h2', text: 'What the platforms say about a degree' },
  { type: 'p', text: `We read each platform's own page on 31 October 2026 and copied what it says. Where a page would not load for our script, we used what search results showed of the official page, and the table says so. Terms change, so read the live page before you apply.` },
  { type: 'compare', caption: 'Five platforms that take English teachers, as their pages said on 31 Oct 2026. Preply and italki answered 403 to our script, so their rows come from search results of the official pages.', headers: ['Platform', 'Degree', 'Certificate or experience', 'English level', 'Pay'], rows: [
    ['Cambly', 'Not needed.', 'Not needed. Experience is "helpful".', 'Native English speaker, 18 or older.', '$0.17 a minute ($10.20 an hour), $0.20 for Cambly Kids, paid weekly. New sign-ups are temporarily limited.'],
    ['Preply', 'Not required.', 'No official qualifications or professional experience required for English.', 'Native or proficient English.', 'Keeps a new student\'s first trial lesson, then 33% falling to 18%.'],
    ['italki', 'Not required for a Community Tutor.', 'A Professional Teacher shows documents of teaching training and experience. Language exams and free online course certificates do not count.', 'Native or C2.', '0% on trial lessons, 15–21% on other lessons by type.'],
    ['Verbling', 'Not mentioned.', 'A certificate is preferable. Previous teaching experience is required, and an application with neither a certificate nor verifiable experience is not accepted.', 'C2 in the language you teach. Native speaker not required.', 'You set your hourly rate. No commission figure on the page.'],
    ['AmazingTalker', 'Not required outright.', 'Relevant teaching experience or language teaching certificates.', 'Fluent. A degree in English or being a native speaker is listed as one way to show it.', 'You choose your rate. A variable service fee, "as low as 0%". Paid on the 2nd of each month.'],
  ] },
  RATES_SOURCE,
  { type: 'p', text: `Read the table by columns. The degree column is mostly "not needed". The certificate-or-experience column is where the gates are. The English level column matters most if you are not a native speaker, because Cambly asks for a native speaker and Verbling does not. We could not read Engoo's or Wyzant's requirements, so we say nothing about them.` },
  { type: 'h2', text: 'What platforms test instead of a degree' },
  { type: 'p', text: `Across these pages, three things decide whether you are accepted.` },
  { type: 'ul', items: [
    `Your English. Verbling states C2, the top of the CEFR scale. Cambly asks for a native speaker, Preply for native or proficient English and italki for native or C2.`,
    `Evidence that you can teach. A certificate or experience. Verbling and AmazingTalker ask for one of them. Cambly and Preply do not.`,
    `How you come across on a screen. Preply asks for a profile photo and an introduction video of 30 seconds to 2 minutes. Cambly says applications must come from a computer, in Chrome.`,
  ] },
  { type: 'p', text: `The US Bureau of Labor Statistics points the same way for tutoring in general. Its Occupational Outlook Handbook, last modified 27 August 2026, lists the typical entry education for tutors as "Some college, no degree" and says most tutors work part time. It does not measure online English tutors on their own, so treat it as context, not proof for your route.` },
  { type: 'h2', text: 'Is a teaching certificate worth it without a degree?' },
  { type: 'p', text: `A certificate is the usual stand-in for a degree, and it is the thing two of the five platforms ask for. The two best-known courses publish their own size and entry rules.` },
  { type: 'ul', items: [
    `CELTA, from Cambridge English. At least 120 hours of study, face to face, online or a mix, usually over 4 to 5 weeks or part time over a few months to a year. Entry is age 18 or older, English at high C1 or above, and "educated to the standard required for entry into higher education". The page states no degree requirement and gives no fee.`,
    `CertTESOL, from Trinity College London. At least 130 guided learning hours and 200 hours of total qualification time, in full-time, part-time, online or blended form. Trinity says it is Level 5 on the Ofqual Regulated Qualifications Framework, which we did not check on the register. Entry is age 18 or older (some providers ask for 20 or 21), education enough for higher education, and English at about C1. Each provider sets its own fee.`,
  ] },
  { type: 'p', text: `Many cheaper 120-hour online TEFL courses come from independent providers. The TESOL International Association says short-term independent TESL and TEFL certificate programs typically run 4 to 6 weeks or longer and are "typically neither accredited nor affiliated with an accredited post-secondary institution". We could read only its list page, not the full statement, and the Ofqual and GOV.UK pages we read said nothing about TEFL. So we cannot tell you which independent course is good. Before you pay for any course, ask five questions.` },
  { type: 'ul', items: [
    `How many hours are taught by a trainer, and how many are reading you do alone?`,
    `Does a qualified trainer watch your own teaching and comment on it?`,
    `Who regulates or accredits the course, and can you check that on the body's own site?`,
    `Does the platform you want accept this certificate? Ask the platform, not the course seller. italki's pages, as search results show them, say free online course certificates do not count for its Professional Teacher type.`,
    `What is the full cost, and what do you get back if you stop?`,
  ] },
  { type: 'callout', variant: 'tip', title: 'You can start before you decide', text: 'On their pages, Cambly and Preply accept you without a certificate, so you can teach while you decide. A certificate pays off most if you aim at a route that asks for one, or at students who ask who trained you. We found no figure for how much a certificate raises pay, so we give none.' },
  { type: 'h2', text: 'No degree, no certificate, no experience: how to build proof' },
  { type: 'p', text: `Verbling asks for "verifiable teaching experience", so for you the gap is evidence, not paper. You can close much of it without a paying student.` },
  { type: 'ul', items: [
    `Volunteer. A conversation club, a library or a community group that helps people practise English gives you real learners and someone who can confirm you taught.`,
    `Teach five free practice lessons to people you know, each with a written plan. Ask each learner for two sentences on what changed, and ask permission before you quote them.`,
    `Record a ten-minute sample lesson on one topic. It doubles as the introduction video that some platforms ask for.`,
    `Keep a record for each learner: date, level, goal, what you taught and the homework you set. One page per learner is what you show when someone asks for experience.`,
  ] },
  { type: 'image', src: '/blog/inline/teach-volunteer', alt: 'Three people sit at a wooden table with papers, a notebook and a clipboard; one writes while the other two lean in to help.', caption: 'Illustrative photo, not a Tutafy user. A volunteer helps two students with their English in Haiti, as the photographer described it.', credit: 'Photo: Emma Taylor (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Haitian_students_learn_English_from_Canadian_volunteer.jpg' },
  { type: 'p', text: `When you apply, write what you really did and no more. Our tutor resume guide has a section for people with no paid tutoring, and our tutor bio guide covers the profile text every platform asks for.` },
  { type: 'h2', text: 'Your profile and introduction video' },
  { type: 'p', text: `Whichever platform you apply to, the first thing it sees is a short profile and, for some, a video. Preply asks for a profile photo and an introduction video of 30 seconds to 2 minutes, and its pages say a profile is rejected if the photo, video or text breaks its guidelines or puts contact details or prices in the text. Verbling says it reviews an application within 2 weeks, and Cambly says that if you hear nothing you can apply again in a few months. So write once, carefully, and reuse it.` },
  { type: 'ul', items: [
    `Say who you help and at what level, in one sentence: "I help adults at B1 speak with more confidence in meetings."`,
    `Say what a lesson with you is like, in plain words and the present tense.`,
    `Give one fact that can be checked, such as a certificate, a course, or how many learners you have taught. Leave out any claim you cannot back up.`,
    `In the video, look at the lens, speak at the pace you would use with a learner, sit in front of a plain, lit background and keep it inside the time limit.`,
  ] },
  { type: 'p', text: `If you have not written a profile before, our tutor bio guide has a template and examples for each platform.` },
  { type: 'h2', text: 'Step 1: Choose who you teach' },
  { type: 'p', text: `"I teach English" is hard to find and hard to price. Narrow it from three angles: the level (CEFR A1 to C2), the goal (conversation, business English, an exam such as IELTS) and the learner (children, students, professionals). A tutor known for one clear problem is easier to recommend than a generalist. Exam students have a date and a measurable goal, which makes lessons easier to plan. Whether they pay more depends on your market, and we found no official figure.` },
  { type: 'p', text: `Our niche guide walks through the choice, and the IELTS Speaking Part 2 guide shows what one exam niche looks like in practice.` },
  { type: 'h2', text: 'Step 2: Set up the tools you need' },
  { type: 'p', text: `The minimum is a computer, a webcam, a headset with a microphone, a quiet room and a steady connection. Cambly says its application must come from a laptop or desktop, not a phone or tablet. Beyond the hardware, you need six things.` },
  { type: 'image', src: '/blog/inline/teach-webcam', alt: 'A blue webcam with a bird pattern and a small black lens clipped to the top edge of a dark computer monitor against a cream wall.', caption: 'Illustrative photo, not a Tutafy user. A plain webcam on top of the screen is enough to start.', credit: 'Photo: Peter Placzek (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Fancy_webcam_on_computer_screen.jpg' },
  { type: 'ul', items: [
    'A booking page that shows your real hours in the student\'s time zone.',
    'A video classroom the student can join in a browser, or your own Zoom or Google Meet link.',
    'A way to take payment that settles to you.',
    'Reminders before each lesson.',
    'A record for each learner: level, goal, notes and homework.',
    'A way to share materials, such as a shared document or folder.',
  ] },
  { type: 'image', src: '/blog/inline/teach-headset', alt: 'A black neckband headset with a silver-ringed earpiece and a boom microphone with a foam cover, lying on a white surface.', caption: 'Illustrative photo, not a Tutafy user. A headset with a microphone makes you easier to understand.', credit: 'Photo: Zephyris at English Wikipedia (CC BY-SA 3.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Headphones_with_Microphone.jpg' },
  { type: 'p', text: `Tutafy covers part of this. The Free plan is $0 for up to 10 students and has a booking page that shows your hours in the student's time zone, a built-in video classroom that opens in the browser, email reminders, a calendar and a PayPal payment link. Card payments with Stripe and lesson packages need Pro at $12 a month. There is 0% commission on every plan. Here is what it does not do.` },
  { type: 'ul', items: [
    `It does not send you students. It is not a marketplace and has no job listings. Its tutor directory showed "The tutor directory opens soon" in the code on 31 October 2026.`,
    `Its built-in classroom has no whiteboard. Share your screen from any whiteboard, or put a Zoom or Google Meet link on the lesson. Our whiteboard guide compares the free options.`,
    `It does not check qualifications or run background checks.`,
  ] },
  { type: 'h2', text: 'Step 3: Decide where your students come from' },
  { type: 'p', text: `A marketplace puts you in front of learners who are already looking, which is hard to build alone. In return it sets the terms, as the table above shows: Preply keeps a new student's first trial lesson and then a share, italki takes a share by lesson type, and Cambly sets your rate at so much a minute. Your own channels cost no commission but you have to find the students yourself.` },
  { type: 'prosCons', title: 'A marketplace or your own booking link', pros: ['Learners are already searching for a tutor', 'Booking, video and payment are handled for you', 'Some accept you with no degree and no certificate'], cons: ['The platform sets what it keeps and who may apply, and its pages can change', 'Preply keeps a new student\'s first trial lesson, then 33% falling to 18%', 'You compete with many tutors on the same page'] },
  { type: 'p', text: `A common path is to use one marketplace to meet your first students and then offer regulars your own booking link. Read the platform's terms before you move anyone, because some restrict taking students off the platform. Our guides on getting your first clients and on leaving Preply cover the practical steps.` },
  { type: 'h2', text: 'Step 4: Price from what you keep' },
  { type: 'p', text: `We found no official hourly figure for English tutors alone. The US Bureau of Labor Statistics gives a 2025 median of $20.84 an hour for all tutors, and Cambly pays $10.20 an hour for conversation. Neither is a promise of what you will earn, so price from the other end: decide what you want in your pocket and work back through the cut.` },
  { type: 'p', text: `Say you want $20 for each lesson. This is an invented target, not a market rate. At 33% commission you would have to charge $29.85, because $20 divided by 0.67 is $29.85. At 18% you would charge $24.39. With no commission you charge $20 plus whatever your payment provider takes, which you should read on its own pricing page. Try your own numbers:` },
  { type: 'calculator' },
  { type: 'p', text: `Our guides on pricing lessons and on your real hourly rate show how to count unpaid hours too.` },
  { type: 'h2', text: 'Step 5: Run a first lesson that turns into a second' },
  { type: 'p', text: `Treat the first lesson as teaching, not a chat. Ask about the learner's goal and level, and pin the level to the CEFR scale so you share a reference. Teach one useful thing they can feel, such as fixing a repeated grammar error or practising one exam task. End with an honest plan: where they are, what you would work on and roughly how many lessons it takes.` },
  { type: 'p', text: `To keep learners, give them a regular weekly slot, homework that links one lesson to the next, and reminders so they rarely miss a class. Packages of prepaid lessons, which need Pro on Tutafy, secure income, and our guides on packages and on no-shows cover the details. Keep the lesson shape the same each week, a warm-up, a review, one focus, practice and homework, so preparation shrinks as you go.` },
  { type: 'p', text: `Here is one shape for a 60-minute lesson. The times are a suggestion, not a standard, so change them to fit the learner.` },
  { type: 'ul', items: [
    `5 minutes: warm-up. Ask an open question and let the learner talk, so they settle in and you hear their level.`,
    `10 minutes: review. Go over last week's homework and the mistakes you noted.`,
    `25 minutes: focus. One grammar point, one set of words or one exam task, with the learner speaking most of the time.`,
    `15 minutes: practice. Use the new language in a short conversation or task and correct patterns, not every slip.`,
    `5 minutes: close. Summarise what you covered and set small homework that leads into next week.`,
  ] },
  { type: 'p', text: `The common mistake is talking too much. Your job is to give the learner as many chances to produce English as possible, then correct efficiently. Type new words into a shared document as you go, so the learner leaves with a record.` },
  { type: 'h2', text: 'Do you need to be a native speaker?' },
  { type: 'p', text: `It depends on the platform. Cambly asks for a native English speaker. Verbling says native is not required but asks for C2. italki asks for native or C2, and AmazingTalker lists a degree in English or being a native speaker as ways to show you are fluent. So if you are not a native speaker, aim at the routes that name a level you can show, and be ready to show it. Our reading is that an exam result is useful evidence of your own level, but italki says language exams do not count as a teaching qualification, so they answer a different question.` },
  { type: 'h2', text: 'Getting paid, and tax' },
  { type: 'p', text: `Platforms pay on their own schedule: Cambly weekly, AmazingTalker on the 2nd of each month. On your own link, payment goes to your own account, a PayPal link on every Tutafy plan and Stripe cards on Pro. On the platform pages we read for our online tutoring jobs guide, tutors were independent contractors, so tax is your job. Our tutor taxes guide explains the basics and is not tax advice.` },
  { type: 'h2', text: 'Your first four weeks' },
  { type: 'p', text: `A plan keeps this from staying a someday project. It assumes you are starting from nothing, and the timings are ours, not a promise of results.` },
  { type: 'ul', items: [
    `Week 1. Pick one niche, record the ten-minute sample lesson, write your profile once and read the live pages of two platforms that match what you can show.`,
    `Week 2. Apply to those two. While you wait, teach your first practice lessons to people you know, each with a written plan, and ask for a short comment after each.`,
    `Week 3. Teach more practice lessons or your first platform lessons. Note every question a learner asked that you could not answer well, and study those first.`,
    `Week 4. Count what you did: lessons taught, hours spent on preparation, what you kept after any platform cut. Keep what works, drop what does not, and decide whether a certificate would open a route you want.`,
  ] },
  { type: 'p', text: `After a month you have real numbers and some proof, and both are better evidence for the next decision than any guide, including this one.` },
  { type: 'h2', text: 'Mistakes that stall new English tutors' },
  { type: 'ul', items: [
    `Assuming "no degree needed" means "no requirements". Read the English level and the certificate-or-experience line too.`,
    `Buying a certificate before asking the platform you want whether it counts.`,
    `Quoting a headline rate without taking off the platform's cut.`,
    `Running trial lessons as free chats with no plan.`,
    `Having no proof ready when a platform asks for experience.`,
  ] },
  { type: 'source', text: 'Pages read on 31 Oct 2026. Preply and italki answered 403 to our script, so their facts come from search results of the official pages. Engoo and Wyzant could not be read. Read the current page before you apply.', links: [
    { label: 'Cambly: applying to become a tutor', href: 'https://studentsupport.cambly.com/hc/en-us/articles/44522545417485-Applying-to-become-a-tutor' },
    { label: 'Cambly: become a tutor', href: 'https://www.cambly.com/english/tutors' },
    { label: 'Verbling: teach', href: 'https://www.verbling.com/teach' },
    { label: 'AmazingTalker: teach English', href: 'https://en.amazingtalker.com/apply-to-teach/english' },
    { label: 'Preply: teaching English online FAQ', href: 'https://preply.com/en/job/4703' },
    { label: 'italki: apply to teach', href: 'https://support.italki.com/hc/en-us/articles/213716298-How-do-I-apply-to-become-a-teacher' },
    { label: 'Cambridge English: CELTA', href: 'https://www.cambridgeenglish.org/teaching-english/teaching-qualifications/celta' },
    { label: 'Trinity College London: CertTESOL', href: 'https://www.trinitycollege.com/qualifications/teaching-english/certtesol' },
    { label: 'TESOL International Association: position statements', href: 'https://www.tesol.org/position-statements/' },
    { label: 'US Bureau of Labor Statistics: Tutors', href: 'https://www.bls.gov/ooh/education-training-and-library/tutors.htm' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'Every hiring route side by side.' },
    { label: 'Tutor resume', href: '/blog/tutor-resume', text: 'What to write with no paid experience.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'The profile text platforms ask for.' },
    { label: 'How to choose a tutoring niche', href: '/blog/how-to-choose-a-tutoring-niche', text: 'Narrow your offer.' },
    { label: 'IELTS Speaking Part 2 topics', href: '/blog/ielts-speaking-part-2-topics', text: 'One exam niche in practice.' },
    { label: 'Online whiteboard for tutoring', href: '/blog/online-whiteboard-for-tutoring', text: 'Free boards to share.' },
    { label: 'How to price tutoring lessons', href: '/blog/how-to-price-tutoring-lessons', text: 'Set a rate.' },
    { label: 'Do tutors have to pay taxes?', href: '/blog/do-tutors-have-to-pay-taxes', text: 'Contractor income at tax time.' },
    { label: 'How to leave Preply', href: '/blog/how-to-leave-preply-migration-guide', text: 'Moving regulars to your own link.' },
  ] },
  { type: 'faq', items: [
    { q: 'Do I need a degree to teach English online?', a: `Not on every route. On the pages we read on 31 October 2026, Cambly says no degree is needed and Preply's FAQ says no official qualifications are required. Verbling and AmazingTalker ask for a teaching certificate or experience instead, and none of the five made a degree the test.` },
    { q: 'Can I teach English online with no experience?', a: `Cambly says no prior teaching certificate or experience is required to apply, and Preply's FAQ says no professional experience is required. Verbling requires previous teaching experience. Build proof first with practice lessons, volunteering and a sample lesson.` },
    { q: 'Do I need a TEFL certificate to teach English online?', a: `Not for Cambly or Preply on their pages. Verbling prefers a certificate and AmazingTalker accepts a certificate or experience. CELTA is at least 120 hours by Cambridge's page. Ask the platform whether it accepts the course you plan to buy.` },
    { q: 'Which platforms take English tutors without a degree?', a: `On the pages we read, Cambly and Preply, and italki for a Community Tutor. Verbling and AmazingTalker do not name a degree but need a certificate or experience. We could not read Engoo or Wyzant.` },
    { q: 'Can a non-native speaker teach English online?', a: `Yes on some routes. Verbling says native is not required but asks for C2, and italki asks for native or C2. Cambly asks for a native speaker.` },
    { q: 'How much can I earn teaching English online?', a: `We found no official figure for English tutors alone. The US Bureau of Labor Statistics gave a 2025 median of $20.84 an hour for all tutors, and Cambly pays $0.17 a minute. What you keep also depends on the platform's cut.` },
    { q: 'Can I teach English online without a platform?', a: `Yes. You need a clear offer, a price, a booking link, a way to take payment and a way to find students. Finding students is the hard part. Tutafy's Free plan covers up to 10 students, but it does not send you any.` },
    { q: 'Is it legal to teach English online without a degree?', a: `We have not researched every country, so we cannot say. Teaching from home to students abroad is treated differently from working in a school. Check your own country's rules on self-employment and tax, and see our tutor taxes guide.` },
  ] },
  { type: 'cta', title: 'Run your own English lessons', text: 'Free for up to 10 students: a booking page, a built-in video classroom and email reminders. 0% commission on every plan. Tutafy does not send you students.', button: 'Start free, no credit card', href: '/register' },
]
