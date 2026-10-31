// T-1192. Article body for /blog/online-tutoring-jobs (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1230-tutafy-traffic-10-articles-plan.md, article 2; keyword data: reports/chief/2026-10-31-1315-keyword-data-sapa-tutafy.md
// (OpenSEO, US, English, 31 Oct 2026: "online tutoring jobs" about 18,100 searches a month, difficulty 29).
// Step 0 (overlap with the 32 articles on master, 31 Oct 2026): how-to-teach-english-online (step 3 "where to find students", the qualification question),
// preply-alternatives-for-tutors, how-much-does-preply-take and marketplace-vs-independent-the-real-math (commission, how marketplaces decide who students see),
// how-to-start-an-online-tutoring-business, get-your-first-tutoring-clients and how-to-leave-preply-migration-guide (the independent route). Not a rewrite of any: none of them is
// a dated side-by-side of what each HIRING route asks of an applicant. This guide is that, plus a worked "what you keep" example, and then hands the reader to the independent route
// and to those guides. Its own angle: what each platform's own pages say on 31 Oct 2026 about who can apply, what it keeps and how soon you hear back, with "not confirmed" where a page could not be read.
// Links to how-to-write-a-tutor-bio and do-tutors-have-to-pay-taxes: both are in the stacked pull requests (#125 and #128) under this one, so they are on the site before this article is.
//
// EVERY figure and rule in the text was read on 31 Oct 2026. Where a platform's own page answered 403 to a script, the text was taken from the search result of that official page (said in the source note):
//   Read directly: US Bureau of Labor Statistics, Occupational Outlook Handbook, Tutors (page modified 27 Aug 2026): 2025 median pay $43,350 a year ($20.84 an hour), 208,400 jobs, outlook 0% for 2025 to 2035,
//     "Most tutors work part time", self-employed workers 12% of tutor jobs, typical entry education "some college, no degree".
//   Read directly: Cambly tutor page: "No teaching certificate, bachelor's degree or prior teaching experience needed"; $0.17/min ($10.2/hour); Cambly Kids $0.20/min ($12/hour); paid weekly, direct deposit; sign-ups temporarily limited.
//   Read directly: Outschool support, Teacher Earnings and Payments Policy: Outschool's take rate is 30% of the parent's payment of a class price, the teacher receives 70%; payouts 7 to 8 days after the class start date (fixed-length).
//   Read directly: Tutor.com apply page: "we are only accepting applications from the U.S."; no rates published on the page.
//   Read directly: FTC consumer advice, job scams (March 2023): "Don't pay for the promise of a job"; no honest employer sends a check to deposit and asks you to send part of the money on.
//   Read directly: tutafy.com/tutors on 31 Oct 2026: "The tutor directory opens soon", no tutors listed.
//   From the search result of the official page (the page itself gave 403): Preply help center (register to teach, commission model), Wyzant support (fee structure, registration FAQs, background check policy), Varsity Tutors
//     (tutoring jobs page and tutor engagement help center), Tutor.com applicant FAQ, TutorMe help center (tutor pay, requirements), italki support (how to apply, Professional Teacher and Community Tutor), Superprof (blog and help pages).
//   Preply and italki rates come from src/lib/marketplace-rates.ts (RATES_SOURCE), which a test keeps equal on every page.
// Not read, so not written: the Superprof Premium price (only a user comment), a Tutor.com hourly rate, any Wyzant approval rate, how many students any platform sends, any other country's rules.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: src/lib/plans.ts (Free $0, Pro $12/mo, Academy $29/mo), docs/features/T-1052-plans-one-list.md (the Free plan allows 10 students),
// docs/features/T-1043-directory-setup.md and src/components/directory/DirectoryView.tsx (the directory opens once six tutors are ready; the live page says "opens soon"). All sums in the examples use invented prices and are said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'
import { RATES_SOURCE } from '@/lib/marketplace-rates'

export const ONLINE_TUTORING_JOBS_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'Online tutoring jobs come in three forms: a marketplace where students choose you, a company that signs you as a contractor, and your own business. They pay and treat you very differently.',
    'The US Bureau of Labor Statistics put median pay for all tutors at $20.84 an hour in 2025 and says most work part time. It does not split out online tutors.',
    'Pay is easy to misread. Preply keeps a new student\'s whole trial lesson, then 33% falling to 18%. Wyzant keeps 25%, Outschool 30%. Cambly pays $0.17 a minute.',
    'On the pages we read, these jobs make you an independent contractor, so tax and slow months are your job. Preply, Cambly and Outschool say no degree is needed; TutorMe and Tutor.com ask for a degree or university enrolment.',
    'Tutafy is not a job board and does not send you students. It is the booking, payment and lesson tools for tutors who bring their own, and this guide says what it lacks.',
  ] },
  { type: 'p', text: `Online tutoring jobs are open to people with very different backgrounds: a few platforms say no degree or teaching certificate is needed, and others want a degree or university enrolment. You get one by applying to a marketplace such as Preply, Wyzant or italki, by applying to a company such as Varsity Tutors, Tutor.com, TutorMe or Cambly, or by finding students yourself. This guide puts the main routes side by side, using what each platform's own pages said on 31 October 2026, and ends with the route the platform pages do not write about: working for yourself.` },
  { type: 'p', text: `We say where we could not read a page and we mark every table cell we could not confirm. Terms change often, so read the current page before you apply. We make Tutafy, a tool for tutors who run their own business, so near the end we say plainly what it does not do.` },
  { type: 'image', src: '/blog/inline/jobs-video-conference', alt: 'An open laptop on a dark wooden table showing a video call with two people, their faces blurred.', caption: 'Illustrative photo, not a Tutafy user. Most online tutoring jobs are a video call, a webcam and a quiet room.', credit: 'Photo: Project Kei (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Video_Conference_Using_Laptop.jpg' },
  { type: 'h2', text: 'What an online tutoring job is, and what the numbers say' },
  { type: 'p', text: `"Tutoring job" covers three different arrangements.` },
  { type: 'ul', items: [
    `Marketplace. You build a profile, students browse and book you, and the platform keeps a percentage of each lesson. Preply, italki, Wyzant, Superprof and Outschool work this way.`,
    `Company contract. A company has the students and signs you, usually as an independent contractor, to teach them. The company sets your rate. Varsity Tutors, Tutor.com, TutorMe and Cambly are in this group.`,
    `Your own business. You find students, set your price and take payment. There is no application, and no one to send you students.`,
  ] },
  { type: 'p', text: `The best official figure for how much tutors earn comes from the US Bureau of Labor Statistics. On its Occupational Outlook Handbook page for tutors, last modified 27 August 2026, median pay was $43,350 a year, or $20.84 an hour, in 2025, across 208,400 jobs. Employment is projected to show little or no change from 2025 to 2035. "Most tutors work part time," and self-employed workers make up 12% of tutor jobs. The typical entry education is some college, with no degree.` },
  { type: 'p', text: `Read that figure with care. It covers every tutor the survey counts, in schools, centres and homes as well as online, on payroll and self-employed. It is not a figure for online tutors and not a promise of what a new tutor will earn. It does show that tutoring is mostly part-time work at a moderate hourly wage, a useful check on any post that promises a large guaranteed income.` },
  { type: 'h2', text: 'Marketplaces: you list, students choose' },
  { type: 'p', text: `A marketplace gives you something hard to build alone: people who are already looking for a tutor. In return it keeps a share of every lesson and decides how students see you.` },
  { type: 'compare', caption: 'Marketplaces, as each platform\'s own pages said on 31 Oct 2026. "Not confirmed" means we could not read it. Pages on one platform sometimes disagree, and we say so.', headers: ['Platform', 'Who can apply', 'What it keeps from your lessons', 'When you hear back', 'Worth knowing'], rows: [
    ['Preply', 'Age 18 or older. No formal teaching degree or certificate required. Computer, webcam, microphone, profile photo and a 30 second to 2 minute intro video.', 'All of a new student\'s trial lesson (100%). After that 33% at the start, falling to 18% as your total hours grow.', '2 to 5 business days (its pages say 2, 3 and 5).', 'Register on a computer, not the app. Profiles are rejected for photos, videos or text that break the guidelines, and for contact details or prices in the text.'],
    ['italki', 'Choose Community Tutor or Professional Teacher (the second needs a teaching qualification). Native or C2 level in the language you teach.', '0% on a trial lesson; 21% on a single lesson, down to 15% on packages of 15 or 20; 30% on a group class.', 'Within 10 business days, then 15 days to finish onboarding (ID, quizzes).', 'Language exams (IELTS, DELE) and free online course certificates do not count as teaching qualifications.'],
    ['Wyzant', 'Choose subjects, write a free response, build a profile, accept the Independent Tutor Agreement. Some subjects need a quiz. An older FAQ says 18 or older, US resident, with a Social Security number: confirm.', '25% flat since 15 January 2019, so you keep 75%. Students pay a further 9% on top. 0% on a student you refer.', '3 to 10 business days.', 'No background check at sign-up, but a student or parent can order one at any time, and you must pass it.'],
    ['Outschool', 'Age 18 or older, living in a listed country six months a year, able to receive PayPal, with a background check and ID check. No formal credentials required.', '30% of the class price; you receive 70%. Parents pay a separate fee.', 'Not confirmed.', 'You design the classes. Fixed-length classes pay 7 to 8 days after the start.'],
    ['Superprof', 'Not confirmed.', 'Its pages disagree: the help center says 10% when a student pays through Superprof without Premium; the tutor page says no commission.', 'Not confirmed.', 'Creating an ad is free, up to 5 ads. We could not confirm a Premium price.'],
  ] },
  RATES_SOURCE,
  { type: 'p', text: `One cost is easy to miss: Preply keeps the whole first lesson with each new student, so that first hour earns you nothing. And a flat 25% and a rate that slides from 33% to 18% are not the same business at the same sticker price. The next section works that out.` },
  { type: 'h2', text: 'Companies that contract you: they set the rate' },
  { type: 'p', text: `A company with its own students removes the hardest part, finding them. You trade control for it: the company sets the rate and often the schedule, and usually screens you more tightly.` },
  { type: 'compare', caption: 'Companies that sign tutors, as their own pages said on 31 Oct 2026. Several of these pages are old FAQs, and we say which. "Not confirmed" means we could not read it.', headers: ['Company', 'Who can apply', 'What you are paid', 'How you are paid', 'Worth knowing'], rows: [
    ['Varsity Tutors', 'The US and Canada only, as independent contractors, but not in several states including California (read its full list). Prior teaching not required. A 30 to 45 minute application, a 15 to 20 minute spoken interview, a background check.', 'A job listing says base rates start at $18 an hour and rise with each session with the same student, up to $40. Rates vary by subject.', 'Twice a week.', 'The $40 is a ceiling, reached after a minimum number of sessions rated 3 stars or higher. Its "more than $3,000 a month" is a top figure, not an average.'],
    ['Tutor.com', 'The US only. Its page describes tutors as teachers, professors, adjuncts, PhD students and professionals. An older FAQ asks for a college sophomore or higher or a 4-year degree, and at least 5 hours a week.', 'A set hourly rate by subject, not published on its pages. Tutors are independent contractors.', 'Monthly. The older FAQ says the sixth business day.', 'Subject exams, mock sessions and a background check. A separate High-Dosage Tutor role lists $22 an hour for at least ten school-day hours a week.'],
    ['TutorMe', 'Age 18 or older, a degree or enrolment at an accredited university, fluent English. Some versions of its page list about two years of experience: confirm.', 'A minimum of $16 an hour, prorated to the minute. Sessions under 5 minutes are not paid.', 'Weekly, by PayPal. The pay period closes Sunday 11:59 pm Pacific.', 'Pay is minute by minute, so waiting for a student between sessions is unpaid.'],
    ['Cambly', 'No teaching certificate, degree or experience needed. New sign-ups are temporarily limited.', '$0.17 a minute ($10.20 an hour) for Cambly, $0.20 a minute ($12 an hour) for Cambly Kids. You are paid for each minute you spend in conversation.', 'Weekly, by direct deposit.', 'No minimum hours. It is English conversation practice, not subject tutoring.'],
  ] },
  { type: 'p', text: `The company route has a hidden second price: time between sessions is unpaid. Ask how sessions are assigned, whether you set your hours, and what happens when a student cancels late.` },
  { type: 'h2', text: 'What you actually keep from a $30 lesson' },
  { type: 'p', text: `A headline price tells you little. Here is one invented $30 lesson with the platform's cut taken from the figures above. It is not a quote from any platform.` },
  { type: 'compare', caption: 'An invented $30 lesson. Percentages are from the pages checked on 31 Oct 2026; sums are ours. Tax and payment fees are not taken off.', headers: ['Where you teach', 'Platform keeps', 'You keep', 'Over 10 lessons'], rows: [
    ['Preply, new tutor, a regular lesson', '33% ($9.90)', '$20.10', '$201'],
    ['Preply, after your hours have grown', '18% ($5.40)', '$24.60', '$246'],
    ['italki, a single lesson', '21% ($6.30)', '$23.70', '$237'],
    ['Wyzant, any lesson', '25% ($7.50)', '$22.50', '$225'],
    ['Your own booking link', '0% commission from you', '$30 before the payment fee and tax', '$300 before the payment fee and tax'],
  ] },
  { type: 'p', text: `Two cautions. On Wyzant the student pays $32.70 for a $30 lesson (the extra 9%), which does not come out of your share. And "own booking link" is not "$300 clear": your payment processor takes its own fee and tax applies, so read the PayPal or Stripe page for the current fee. The sums also ignore the time you spend finding students, which is what the marketplaces sell.` },
  { type: 'p', text: `Pay per minute works differently. At $0.17 a minute, a Cambly tutor who talks for 40 minutes of an hour earns 40 × $0.17 = $6.80 for that hour, not $10.20. To price your own lessons, how to price tutoring lessons goes through it step by step.` },
  { type: 'image', src: '/blog/inline/jobs-documents-table', alt: 'A woman with glasses sits at a round table in a home, holding a sheet of paper and a pen while looking at an open laptop.', caption: 'Illustrative photo, not a Tutafy user. Have your documents ready before you open the form.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Woman_working_at_home_with_laptop_and_documents_on_a_table.jpg' },
  { type: 'h2', text: 'How to apply without wasting a month' },
  { type: 'p', text: `Applications look alike, and so do the reasons they stall. Prepare one set of material and reuse it.` },
  { type: 'ul', items: [
    `A clear subject and level. "Maths" is vague; "GCSE and Year 9 maths" tells a reviewer who you help. How to choose a tutoring niche takes about an hour.`,
    `A short, factual profile text with no email, phone number or price in it: Preply gives contact details and prices in the text as a reason for rejection. How to write a tutor bio gives a template and fifteen invented examples.`,
    `A photo and video that meet the platform's rules. Preply asks for a head-and-shoulders photo with good light and a neutral background, not a selfie, and a video of 30 seconds to 2 minutes: say your name, your subject and who you help.`,
    `Proof of what you claim, as files you can upload: degrees, certificates, exam results. italki asks for ID in onboarding, and teaching qualifications for Professional Teachers.`,
    `A computer, webcam, microphone and stable connection, tested before you apply, and a way to be paid: PayPal for Outschool and TutorMe, a bank account for Cambly.`,
  ] },
  { type: 'p', text: `Apply to two or three at once, not twenty. The pages we read give 2 to 10 business days for an answer, so start the next application while you wait. Keep a notes file with dates and what each platform asked for.` },
  { type: 'h2', text: 'Employee, contractor or business owner: what the label changes' },
  { type: 'p', text: `On the pages we read, tutors were independent contractors (Varsity Tutors, Tutor.com) or signed an independent-tutor agreement (Wyzant), and none offered a salary or benefits. That has three effects.` },
  { type: 'ul', items: [
    `Tax is yours. You report the income, may owe self-employment tax and may need to pay during the year. Our guide to tutor taxes explains the forms, with the US, UK and Canadian rules we could check.`,
    `There is no paid time off. A week off or a slow summer is a week without income, so plan a buffer before you leave another job.`,
    `The rules are theirs. A platform can change its fee, close an account or limit sign-ups, as Cambly says it has for new tutors. If you hire tutors later, the 1099-or-W-2 question is yours: how to hire tutors covers it.`,
  ] },
  { type: 'h2', text: 'How to spot a job post that is not real' },
  { type: 'p', text: `Remote work with modest pay looks believable, so tutoring attracts fake offers. The US Federal Trade Commission's advice on job scams is clear: "Don't pay for the promise of a job." Honest employers never ask you to pay to get a job, and none will send you a check to deposit and ask you to send part of the money on. Never bank on a check that has "cleared". Scammers want your money and your personal information.` },
  { type: 'ul', items: [
    `Anyone asking you to pay to be hired, whether it is called a training fee, software fee or starter kit.`,
    `A check or payment sent in advance, with a request to forward part of it.`,
    `An offer from a free email address or a company with no site you can find, with no interview.`,
    `A "guaranteed" income. A post that promises many times the Bureau of Labor Statistics median to a beginner needs proof.`,
    `A request for ID or bank details before you have a contract, or a link that does not lead to the platform's own domain. Type the address yourself.`,
  ] },
  { type: 'image', src: '/blog/inline/jobs-neat-desk', alt: 'A silver laptop on a pale wooden desk beside a potted plant, with a desktop computer screen at the edge of the picture.', caption: 'A plain desk and a laptop are the whole office for an independent tutor.', credit: 'Photo: Norbert Levajsics (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Laptop_on_a_neat_desk_(Unsplash).jpg' },
  { type: 'h2', text: 'The route the platform pages do not write about: working for yourself' },
  { type: 'p', text: `Every platform page above is written to recruit you, and none says what it is like to run your own tutoring business. It is a real option: the Bureau of Labor Statistics counts 12% of tutor jobs as self-employed. It removes the commission and someone else's rules. It also removes the supply of students, and for many new tutors that is the whole difficulty.` },
  { type: 'ul', items: [
    `An offer: a subject, a level and a clear result. "I help Year 10 students move from a 5 to a 7 in GCSE maths" is an offer. "Maths tutor" is a category.`,
    `A price you can defend. Use the pricing guide, then work out your real hourly rate once prep and unpaid time are counted.`,
    `A place students can book, showing your free times in their time zone, and payment before the lesson under a cancellation policy you wrote before the first cancellation.`,
    `A few places to find the first students. Our playbook for your first ten clients lists the channels, and start an online tutoring business gives the order to do things in.`,
  ] },
  { type: 'p', text: `The first students are the hard part: a new tutor with no reviews and no network will not fill a calendar from a booking page alone. That is why many tutors do both. They take a marketplace or company job to learn, earn and meet students, and run their own booking link beside it from the first week. The migration guide for leaving Preply and the real math of marketplace against independent give the numbers and the steps.` },
  { type: 'callout', variant: 'warn', title: 'Read the terms before you move a student', text: `Most platforms have rules about contacting students outside the platform, and we did not read each one for this guide. Before you plan to move a student to your own link, read your platform's current terms. Wyzant's page says a tutor who refers a new student keeps 100% of their rate on that student, which is a legitimate way to bring your own students in. The rules differ, and breaking them can close your account.` },
  { type: 'h2', text: 'A month, week by week' },
  { type: 'ul', items: [
    `Week 1. Decide your subject and level, write the profile once, record the video and gather your documents. Apply to two platforms that match your qualifications.`,
    `Week 2. While you wait, set up your own booking page, hours, payment method and cancellation policy. Tell five people what you teach and ask each to pass it on.`,
    `Week 3. Teach your first lessons, wherever they come from. After each, ask for a one-line comment and note what the student asked that you could not answer well.`,
    `Week 4. Count what you earned, what you kept and the hours you set aside, using the $30 table above. Keep what pays and drop what does not.`,
  ] },
  { type: 'p', text: `After a month you have real figures, not a guess, and that is better evidence for the next decision than any average.` },
  { type: 'h2', text: 'Which route fits your situation' },
  { type: 'compare', caption: 'A starting point, not a ranking. It uses only what the pages above say.', headers: ['If you are...', 'Look at', 'Because'], rows: [
    ['New, with no degree or certificate', 'Preply, Cambly, Outschool', 'Their pages say no degree or certificate is needed (Outschool checks your background and ID; Cambly has limited new sign-ups).'],
    ['A university student or graduate in the US', 'Tutor.com, TutorMe, Wyzant, Varsity Tutors', 'These ask for a degree or enrolment, or list US locations.'],
    ['A language teacher with a qualification', 'italki Professional Teacher, Preply', 'italki separates qualified teachers from community tutors.'],
    ['Outside the US and Canada', 'Preply, italki, your own link', 'Varsity Tutors takes the US and Canada only, and Tutor.com the US only.'],
    ['Already have students who trust you', 'Your own booking link', 'A platform can add only a cut, as the $30 table shows.'],
  ] },
  { type: 'h2', text: 'What Tutafy is, and what it is not' },
  { type: 'p', text: `Tutafy is a tool for tutors who run their own business: a public booking page that shows your hours in the student's time zone, a video classroom that opens in the browser, email reminders, student records, and payment through your own PayPal or Stripe account. It takes 0% commission on every plan. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29 a month. Here is what it does not do, so you do not look for it:` },
  { type: 'ul', items: [
    `It does not send you students. It is not a marketplace, has no job listings and promises no bookings.`,
    `It has a public tutor directory, but the directory is not open yet. It opens once six tutors have set free hours, an introduction and a language, and on 31 October 2026 the page said "The tutor directory opens soon" with no tutors listed. Even then, treat it as one extra place to be found.`,
    `It does not check qualifications or run background checks, and it does not hire or pay you. Payment goes from your student to your own account.`,
    `It is not tax software: it does not file for you or send tax forms.`,
  ] },
  { type: 'p', text: `If you want a place where students already look, a marketplace does that and Tutafy does not. If you already have students, or will find them, and want to keep what they pay, Tutafy removes the admin. The Tutafy review is the honest overview, and the free software comparison lists what else is free.` },
  { type: 'image', src: '/blog/inline/jobs-laptop-notepad', alt: 'Close view of a person typing on a black laptop beside a closed notebook with a pen and a glass jug of dark red tea.', caption: 'Illustrative photo, not a Tutafy user. Keep a notes file for each application and each lesson.', credit: 'Photo: Microbiz Mag (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Working_from_home_laptop_and_notepad.jpg' },
  { type: 'h2', text: 'Common mistakes when looking for online tutoring jobs' },
  { type: 'ul', items: [
    `Reading the headline rate and not the cut: $25 an hour on a platform that keeps a share is not $25.`,
    `Ignoring location rules: Varsity Tutors and Tutor.com ask for US or US and Canadian residence.`,
    `Treating one platform as your whole business, with nothing of your own if its terms change.`,
    `Forgetting tax, or paying anyone to get hired.`,
  ] },
  { type: 'source', text: 'Official pages used here, read on 31 Oct 2026. We could not read the Preply, Wyzant, Varsity Tutors, TutorMe, italki, Superprof and Tutor.com FAQ pages, so those figures come from search results. Read the current page before you apply.', links: [
    { label: 'US Bureau of Labor Statistics: Tutors', href: 'https://www.bls.gov/ooh/education-training-and-library/tutors.htm' },
    { label: 'US Federal Trade Commission: job scams', href: 'https://consumer.ftc.gov/articles/job-scams' },
    { label: 'Cambly: become a tutor', href: 'https://www.cambly.com/english/tutors' },
    { label: 'Outschool: teacher earnings policy', href: 'https://support.outschool.com/en/articles/2382129-teacher-earnings-and-payments-policy' },
    { label: 'Tutor.com: become a tutor', href: 'https://www.tutor.com/apply' },
    { label: 'Tutor.com: applicant FAQs', href: 'https://www.tutor.com/apply/tutoring-faq' },
    { label: 'Preply: register to teach', href: 'https://help.preply.com/en/articles/4175138-register-to-teach-on-preply' },
    { label: 'Wyzant: tutor fees', href: 'https://support.wyzant.com/tutors/tutor-payments/what-is-the-fee-structure-for-tutors-listed-on-wyzant/' },
    { label: 'Wyzant: registration FAQs', href: 'https://support.wyzant.com/tutors/tutor-account/tutor-registration-faqs/' },
    { label: 'Wyzant: background checks', href: 'https://support.wyzant.com/tutors/tutor-account/background-check-policy/' },
    { label: 'Varsity Tutors: tutoring jobs', href: 'https://www.varsitytutors.com/tutoring-jobs' },
    { label: 'TutorMe: tutor pay', href: 'https://help.tutorme.com/tutor-applicants/tutor-pay' },
    { label: 'italki: apply to teach', href: 'https://support.italki.com/hc/en-us/articles/213716298-How-do-I-apply-to-become-a-teacher' },
    { label: 'Superprof: how it works', href: 'https://www.superprof.com/blog/how-superprof-works/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to start an online tutoring business', href: '/blog/how-to-start-an-online-tutoring-business', text: 'The order to do things in when you work for yourself.' },
    { label: 'How to get your first 10 tutoring clients', href: '/blog/get-your-first-tutoring-clients', text: 'Where the first students come from without a marketplace.' },
    { label: 'Preply, iTalki or on your own? The real math', href: '/blog/marketplace-vs-independent-the-real-math', text: 'A year of fees, side by side.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'The profile text every application asks for.' },
    { label: 'Your real hourly rate as a tutor', href: '/blog/real-hourly-rate-for-tutors', text: 'What a lesson earns after prep, gaps and fees.' },
    { label: 'Do tutors have to pay taxes?', href: '/blog/do-tutors-have-to-pay-taxes', text: 'What contractor income means at tax time.' },
    { label: 'How to leave Preply', href: '/blog/how-to-leave-preply-migration-guide', text: 'Moving regular students to your own link.' },
    { label: 'Wyzant fees for tutors', href: '/blog/wyzant-fees-for-tutors', text: 'Both fees, worked out.' },
    { label: 'Tutor.com jobs', href: '/blog/tutor-com-jobs', text: 'Its pages, read closely.' },
  ] },
  { type: 'faq', items: [
    { q: 'How do I get an online tutoring job with no experience?', a: `Start with platforms whose pages say no degree or experience is needed, such as Preply and Cambly, and prepare a clear subject, a short profile and a good video. The pages we read give 2 to 10 business days for an answer, so apply to two or three at once.` },
    { q: 'Do you need a degree to tutor online?', a: `Not everywhere. Preply, Cambly and Outschool say no degree or teaching certificate is required. TutorMe asks for a degree or university enrolment, and an older Tutor.com FAQ asks for a college sophomore or higher or a 4-year degree.` },
    { q: 'How much do online tutors make?', a: `It depends on the route. The US Bureau of Labor Statistics reported median pay of $20.84 an hour for all tutors in 2025. Cambly pays $0.17 a minute, TutorMe at least $16 an hour, and a Varsity Tutors listing says base rates start at $18 an hour. On a marketplace the platform keeps a share, and on your own you keep the rest after payment fees and tax.` },
    { q: 'Are online tutoring jobs legit?', a: `The companies and marketplaces named here are real businesses, but fake offers copy them. The FTC warns never to pay for the promise of a job, and no honest employer sends a check and asks you to forward part of it. Apply only through the platform's own address.` },
    { q: 'Are online tutors employees or contractors?', a: `On the pages we read, tutors were independent contractors or signed an independent-tutor agreement. You handle your own tax and have no paid leave. Read the agreement you are given, and see our guide to tutor taxes.` },
    { q: 'Can I tutor online without a platform?', a: `Yes. You need an offer, a price, a booking link, a way to take payment and a way to find students. Finding students is the hard part, so many tutors start on a platform and add their own booking link beside it.` },
    { q: 'Does Tutafy have tutoring jobs or send me students?', a: `No. Tutafy is a tool for tutors who bring their own students. It has no job listings, and its tutor directory had not opened on 31 October 2026. It gives you a booking page, a video classroom, reminders and payment through your own account, with 0% commission, and a Free plan for up to 10 students.` },
  ] },
  { type: 'cta', title: 'Take the bookings and payments off your plate', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start, cancel anytime. Tutafy does not send students.', button: 'Start free, no credit card', href: '/register' },
]
