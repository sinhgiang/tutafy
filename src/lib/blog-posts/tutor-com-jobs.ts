// T-1238. Article body for /blog/tutor-com-jobs (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1610-tutafy-batch3-10-articles-plan.md, article 3 (calendar day 14 Nov 2026).
// Keyword (OpenSEO, US, English, 31 Oct 2026, from the plan): "tutor.com jobs" about 720 searches a month, difficulty 30. Reader: a tutor looking at Tutor.com as an employer.
// Step 0 (31 Oct 2026): the first page of Google results for "tutor.com jobs" is job-board listings (Indeed, Glassdoor interview pages, EdTech Jobs, Migrate Mate) and Tutor.com's own pages. The aggregators disagree on whether
// Tutor.com is hiring (one counts 9 open roles on 16 July 2026, another says it is not actively hiring), and none of them puts the application rules, the pay that is and is not published, the hours and the alternative on one page.
// On this site the nearest piece is online-tutoring-jobs, which has one table row for Tutor.com among about ten platforms. This is the Tutor.com-only guide and is not a rewrite of it.
// Own angle: read Tutor.com's own applicant pages line by line, say what they publish (US only, the criteria, 1 to 3 weeks, $22 an hour for one role) and what they do not (an on-demand rate, pay frequency, age, worker status),
// turn the one published rate into real hours, and work out how many lessons an independent tutor needs to match it, with the catch (you must find the students) stated plainly.
// Links both ways with online-tutoring-jobs, real-hourly-rate-for-tutors, wyzant-fees-for-tutors, do-tutors-have-to-pay-taxes and how-to-get-your-first-tutoring-clients.
//
// Sources, all read on 31 Oct 2026 (no page shows an updated date; each footer reads "2026 Tutor.com / The Princeton Review"):
//   Read directly: tutor.com/apply ("at this time we are only accepting applications from the U.S., excluding U.S. Territories other than Puerto Rico"; "Get paid on a regular schedule, no invoice needed"; the application login is on a tutor.com address).
//   Read directly: tutor.com/apply/tutoring-faq (criteria: reside in the U.S., valid Social Security Number, eligible to work in the U.S., at least five hours a week, expert in your subject, fluent English, a college sophomore or higher at an accredited
//     university in pursuit of a 4-year degree OR a 4-year degree or higher; no sponsorship for H-1B, F-1 or OPT; 1 to 3 weeks; a competency exam "to expedite"; "a set hourly rate dictated by the subjects you tutor" plus incentives;
//     "More information on our pay structure will be provided once you have successfully completed the initial application and subject exam phase"; three ways to tutor; technology requirements; the list of high-demand exam subjects).
//   Read directly: tutor.com/apply/why-tutor-with-us ("as few as 5 hours a week and as many as 29 hours a week", 24 hours a day, 7 days a week, "We bring our clients to you"), tutor.com/apply/application-process (same text as /apply), tutor.com/tutors
//     (screening "with subject exams, mock tutoring sessions, mentor review and third-party background check"; public subject areas Math, Science, English, Social Studies, AP Support, SAT/Test Prep).
//   Read directly: tutor.com/hdt-apply and tutor.com/hdt-tutor-faq (High-Dosage Tutor: "High-Dosage Tutors are paid $22/hour"; at least ten hours a week during the school day; a 4-year degree; K-12 Math or ELA; the same group of students, typically three times a week
//     at a pre-scheduled time; remote, or in person in select cities; applications not accepted from ten named states and the territories; the same pay-structure sentence as above).
//   Read directly: the Tutor.com board on Greenhouse (job-boards.greenhouse.io/tutor_com): "Current Openings at Tutor.com", "9 jobs".
//   Read directly on the applicant pages: no age limit, no years of experience, no pay frequency, no on-demand hourly rate, no session length and no worker status. The only related text is the title of a link,
//     "Privacy Policy for California Employees, Job Applicants, and Independent Contractors"; its PDF text could not be read by our script, so we do not say what it states.
//   Figures from other guides on this site, read on 31 Oct 2026: US Bureau of Labor Statistics, Occupational Outlook Handbook, Tutors (page modified 27 Aug 2026): 2025 median pay $43,350 a year ($20.84 an hour), "Most tutors work part time" (online-tutoring-jobs);
//     FTC consumer advice on job scams, "Don't pay for the promise of a job".
// Not read, so not written: any rate for the on-demand role, how many sessions a tutor gets, how Tutor.com assigns sessions, the order of its screening steps, whether tutors are employees or contractors, third-party reviews (we mention none as fact).
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: src/lib/plans.ts (Free $0, Pro $12/mo, Academy $29/mo; the Free plan allows 10 students), 0% commission with payment through the tutor's own Stripe or PayPal account
// (the processor's own fee applies), the directory "opens soon" once six tutors are ready and lists none (src/lib/directory.ts, tutafy.com/tutors). Tutafy sends no students. All names and sums in the examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const TUTOR_COM_JOBS_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'Tutor.com is open to US residents only, and its criteria include a valid Social Security Number and either a four-year degree or enrolment as a college sophomore or higher. Its pages say the process takes 1 to 3 weeks.',
    'The only pay figure on its pages is $22 an hour for the High-Dosage Tutor role. For the on-demand role the pages say "a set hourly rate dictated by the subjects you tutor" and give no number until after you pass the application and the subject exam.',
    'The pages we read do not say tutors are employees or contractors, do not say how often you are paid, and do not give an age or experience requirement. Ask before you accept.',
    'An independent tutor who charges $35 an hour needs about seven lessons a week to match ten paid hours at $22. The catch is that you must find those students yourself.',
    'Tutafy is not a job board and sends you no students. It is the booking page, video classroom and payment tools for tutors who bring their own, with 0% commission, and it lists no tutors yet.',
  ] },
  { type: 'p', text: `Tutor.com jobs are tutoring roles with a US company that already has students, so you do not have to find them. You apply on its site, pass a subject exam and a screening process, and then tutor online for a set hourly rate. This guide reads Tutor.com's own applicant pages line by line, on 31 October 2026, and tells you what they say, what they leave out and what to ask before you say yes.` },
  { type: 'p', text: `It is written for tutors who are deciding between applying to Tutor.com and teaching for themselves. Job-board pages for Tutor.com disagree with one another, so we use only the company's own pages and say where they are silent. The names and sums in our examples are invented. Terms change, so read the current page before you apply. We make Tutafy, a tool for tutors who run their own business, and near the end we say what it does not do.` },
  { type: 'image', src: '/blog/inline/tcom-hands-laptop', alt: 'Two hands on the keyboard and trackpad of an open silver laptop seen from above, on a wooden desk with a phone, a wallet and a camera lens beside it.', caption: 'Illustrative photo, not a Tutafy user. Tutor.com sessions run in its own online classroom on a computer.', credit: 'Photo: Fabian Irsara (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Hands_on_a_laptop_keyboard_(Unsplash).jpg' },
  { type: 'h2', text: 'What Tutor.com is, and which jobs people mean' },
  { type: 'p', text: `Tutor.com is an online tutoring company. Its page for tutors says it brings its clients to you, so you do not have to scout for business, and its footer names The Princeton Review. People who search for "Tutor.com jobs" usually mean one of two roles, and the pages treat them very differently.` },
  { type: 'ul', items: [
    `The on-demand tutor. You pass a subject exam, then tutor students who log on to Tutor.com, in a schedule you create or by picking up sessions when you are online. The pages say you can tutor from 5 to 29 hours a week. This is the role most people have in mind.`,
    `The High-Dosage Tutor. A separate role for school-day tutoring of K-12 students in Math or ELA. You meet the same group of students, typically three times a week at a pre-scheduled time. It has its own page and a published rate.`,
  ] },
  { type: 'p', text: `Tutor.com also lists some in-person school roles, and its job board on Greenhouse showed nine openings when we read it. Third-party job sites disagree on whether the company is hiring at all, so treat any one of them as a pointer and the company's own page as the answer.` },
  { type: 'h2', text: 'Who can apply' },
  { type: 'p', text: `Start with the rule that decides most applications. Tutor.com's apply page says: "at this time we are only accepting applications from the U.S., excluding U.S. Territories other than Puerto Rico." If you live elsewhere, the page closes the door for now, and our guide to online tutoring jobs lists routes that accept tutors from other countries.` },
  { type: 'compare', caption: 'Who can apply, from Tutor.com\'s applicant FAQ and High-Dosage Tutor page, read 31 Oct 2026. "Not stated" means we found no such rule on the pages we read.', headers: ['Requirement', 'On-demand tutor', 'High-Dosage Tutor'], rows: [
    ['Where you live', 'Reside in the U.S. and be eligible to work there', 'Reside in, be eligible to work in and tutor from the U.S.; applications are not accepted from ten named states or from the territories'],
    ['Education', 'A college sophomore or higher at an accredited university in pursuit of a 4-year degree, or a 4-year degree or higher', 'A 4-year degree or higher from an accredited college or university'],
    ['Social Security Number', 'A valid one', 'Not stated'],
    ['Visa sponsorship', 'Not accepted: the page names H-1B, F-1 and OPT', 'Not accepted: the page names H-1B'],
    ['Hours', 'At least five a week, up to 29', 'At least ten a week, during the school day'],
    ['Subject', 'An expert in your subject', 'In-depth knowledge of Math or ELA'],
    ['Age and years of experience', 'Not stated', 'Not stated'],
  ] },
  { type: 'p', text: `Three points are worth a second look. The education rule is generous in one way: a student who is a sophomore or higher can apply before graduating. It is strict in another: the High-Dosage role asks for the finished degree. And the pages do not give a minimum age or a number of years of experience. They say you must be an expert in your subject, which the exam is there to test.` },
  { type: 'callout', variant: 'info', title: 'The states that are left out', text: `The High-Dosage Tutor page says it is not accepting applications from Arkansas, Delaware, Hawaii, Idaho, Mississippi, North Dakota, New Mexico, Rhode Island, South Dakota and Wyoming, or from any US territory. The on-demand FAQ names no states. Separate notices are linked for applicants in California, the City and County of Los Angeles and Philadelphia. We did not read those notices, so read them if they apply to you.` },
  { type: 'h2', text: 'How the application works, and how long it takes' },
  { type: 'p', text: `The FAQ says the application process takes 1 to 3 weeks, depending on how quickly you complete each step. It points you to a tutor application portal, where you can take a competency exam in one of its high-demand subjects "to expedite your application". That wording means the exam speeds things up. It does not say the exam is optional, and the pay page says pay details come after the exam, so plan to sit one.` },
  { type: 'p', text: `The page for would-be tutors describes the vetting in one sentence: a screening process with subject exams, mock tutoring sessions, mentor review and a third-party background check. It does not give the order of those steps or how long each takes. So we cannot tell you whether the background check comes before or after the mock session, and we would rather say so than guess.` },
  { type: 'h3', text: 'A plan for the first two weeks' },
  { type: 'ul', items: [
    `Day 1: read the apply page and the FAQ, and check the three hard rules: US residence, a valid Social Security Number and the degree or enrolment line.`,
    `Day 1 to 2: check your computer and connection against the technology list further down. The pages list a Windows computer, so find out early if you only have a Mac.`,
    `Choose the exam subject you could teach tomorrow, and keep a note of each step and its date. If a step stalls, you can point to the date.`,
    `Do not pay anyone to "guarantee" a Tutor.com job. The FTC's advice on job scams is blunt: do not pay for the promise of a job. The real application is free on the company's own site, and the login link on its pages is on a tutor.com address.`,
  ] },
  { type: 'h2', text: 'What you are paid: what the pages say and what they do not' },
  { type: 'p', text: `This is the part that people searching for Tutor.com jobs most want, and it is where the pages say the least. Here is everything they say about money, side by side with what is missing.` },
  { type: 'compare', caption: 'Pay on Tutor.com\'s own pages, read 31 Oct 2026.', headers: ['Question', 'What the pages say', 'What they do not say'], rows: [
    ['How much do I earn an hour?', 'On-demand: "a set hourly rate dictated by the subjects you tutor", with incentives for high-quality tutoring. High-Dosage Tutor: "$22/hour".', 'Any number for the on-demand role, or for any single subject'],
    ['When do I find out?', '"More information on our pay structure will be provided once you have successfully completed the initial application and subject exam phase."', 'Whether you can accept or refuse after seeing it'],
    ['How am I paid?', '"Get paid on a regular schedule, no invoice needed", and "payment comes on a set schedule directly from Tutor.com".', 'Weekly, twice a month or monthly, and the pay dates'],
    ['Am I an employee?', 'Nothing on the applicant pages we read.', 'Whether you are an employee or a contractor, and so who pays which taxes'],
    ['Are non-session hours paid?', 'The High-Dosage page says you take part in training and professional development.', 'Whether training, planning or waiting between sessions is paid'],
  ] },
  { type: 'p', text: `One comparison helps put the number in context. The US Bureau of Labor Statistics put median pay for all tutors at $20.84 an hour in 2025, as we recorded in our online tutoring jobs guide, and says most tutors work part time. That figure covers every kind of tutor, in schools and homes as well as online, so it is not a quote for Tutor.com. It does show that $22 sits close to the middle of what tutoring pays in the US, not above it.` },
  { type: 'callout', variant: 'warn', title: 'Ask for the rate before you spend days preparing', text: `The pages say the pay structure comes after the exam. That is a fair order for the company, but it means you commit a few days before you see the number. If you are choosing between Tutor.com and another route, ask support what the rate range is for your subject before you sit the exam, and write down what you are told.` },
  { type: 'h2', text: 'Hours, and how students reach you' },
  { type: 'p', text: `The page on why tutors join says Tutor.com is available 24 hours a day, 7 days a week, and that you can tutor "as few as 5 hours a week and as many as 29 hours a week" and change your scheduled hours week by week. The FAQ lists three ways to work: create a schedule each week, log on and pick up unscheduled sessions, or set availability for scheduled appointments.` },
  { type: 'p', text: `A page testimonial describes signing in and being matched with a student at once. Nothing on the pages explains how sessions are matched, how many a tutor gets, or how long a session lasts. That matters, because the hours you are available and the hours you are paid are not always the same. In a model where you log on and wait for a student, your income depends on how often a student arrives in your subject at the time you chose.` },
  { type: 'image', src: '/blog/inline/tcom-calendar-year', alt: 'A person in a dark top holding a clipboard with a printed January calendar page, the large number 01 at the top.', caption: 'Illustrative photo, not a Tutafy user. Tutor.com says you can change your scheduled hours every week.', credit: 'Photo: Brooke Lark (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Calendar_Year_(Unsplash).jpg' },
  { type: 'p', text: `The High-Dosage role is different and simpler to picture. You are available at least ten hours a week during the school day. You meet the same group of students about three times a week at a time set in advance, and the schedule may change slightly from semester to semester. The page calls it a daytime, scheduled-hours position. That suits retired and former teachers, substitute teachers and anyone with Math or ELA expertise, which is how the page describes its target tutors.` },
  { type: 'h2', text: 'The equipment you need' },
  { type: 'p', text: `Tutor.com's FAQ lists technology requirements, and they are more specific than on many platforms. This is a list to check against your own set-up before you start.` },
  { type: 'ul', items: [
    `A computer running Windows 11 or Windows 10, with at least 4.0 GB of memory (8 GB recommended) and a processor of 1.8 GHz or faster (2.4 GHz recommended).`,
    `An internet connection of at least 15 Mbps down and 5 Mbps up (20 and 10 recommended).`,
    `Microsoft Office, or other software that can open and edit Word, Excel and PowerPoint files.`,
    `A screen of at least 1280 by 720 pixels (1920 by 1080 recommended), a microphone or other audio, and a webcam.`,
    `On a Mac, the page says running Windows through Boot Camp or an emulator such as Parallels "will be considered", provided you can get the required software. It does not say a Mac alone is enough.`,
  ] },
  { type: 'h2', text: 'The subjects it tests in' },
  { type: 'p', text: `The FAQ lists the high-demand subjects where you can take a competency exam. They are Calculus and Calculus BC, Discrete Math, Finite Math, Physics, Chemistry and Organic Chemistry, Statistics and College Statistics, Finance, Economics (introductory, micro and macro), Accounting (introductory, intermediate, cost, managerial and tax), Nursing, Medical Coding and Health Administration, Research Methods, Computer Science (database systems, web design and Python), college-level essay writing and Quantitative Methods.` },
  { type: 'p', text: `The page does not rank them by demand, and Tutor.com's public tutor page lists broader areas: Math, Science, English, Social Studies, AP Support and SAT and test prep. A longer list of concepts is linked as a PDF. If your strongest subject is not on the high-demand list, check that PDF before you assume you cannot apply.` },
  { type: 'h2', text: 'Ten questions to ask before you accept' },
  { type: 'p', text: `Whatever the offer, put these to the recruiter or support in writing, so you have the answers on the day the rate arrives.` },
  { type: 'ul', items: [
    `What is the hourly rate for my subject, and does it change with hours, ratings or time of day?`,
    `Am I an employee or an independent contractor? Who sends the tax form, and for what?`,
    `How often am I paid, which day, and what is the cut-off for a session to count?`,
    `Are training, mock sessions and the background check paid, unpaid or at my cost?`,
    `If I am logged on and no student arrives, am I paid for that time?`,
    `How long is a typical session, and what happens if a student leaves early?`,
    `What are the incentives for high-quality tutoring, and how is quality measured?`,
    `Can I tutor for other platforms or my own students at the same time, and are there rules about contacting students I meet here?`,
    `How do I leave, and what notice do I give?`,
    `What happens to my pay if a student disputes a session?`,
  ] },
  { type: 'p', text: `The eighth question is the one tutors forget. Many companies have rules about taking students away from the platform. We have not read Tutor.com's, so we do not say what they are. If you are building your own business next to a job like this one, read the agreement before you point a student at your own page.` },
  { type: 'h2', text: 'What a $22 hour is worth' },
  { type: 'p', text: `Take the one published rate, the High-Dosage Tutor's $22 an hour, and work out what it is worth. The sums below are ours. They assume ten paid hours a week and no other income from the role.` },
  { type: 'compare', caption: 'What $22 an hour comes to for a tutor on a ten-hour High-Dosage schedule. Our arithmetic, before any tax.', headers: ['Paid hours a week', 'Pay a week', 'Pay a month (52 weeks divided by 12)', 'If 2 more hours a week are unpaid, you earn per hour'], rows: [
    ['10', '$220', '$953', '$18.33'],
    ['15', '$330', '$1,430', '$19.41 (for 17 hours)'],
    ['20', '$440', '$1,907', '$20.00 (for 22 hours)'],
  ] },
  { type: 'p', text: `The last column is a what-if, because the pages do not say whether planning, training or waiting between sessions is paid. If two hours a week were unpaid, ten paid hours at $22 would work out as $18.33 for every hour you gave. Our guide to your real hourly rate explains why you should always divide by every hour you work, not only the hours that are paid.` },
  { type: 'p', text: `The monthly figure is also before tax. An employee has tax withheld. A contractor must set money aside. The pages do not say which you would be, which is one more reason to ask.` },
  { type: 'image', src: '/blog/inline/tcom-planning-coffee', alt: 'An open notebook with ruled pages and a sharpened black pencil lying across it, with pencil shavings and a cup of coffee at the edge of a wooden table.', caption: 'Illustrative photo, not a Tutafy user. Write down every hour you give, paid or not.', credit: 'Photo: Hope House Press (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Planning_over_coffee_(Unsplash).jpg' },
  { type: 'h2', text: 'Where independent tutors can earn more, and the catch' },
  { type: 'p', text: `The reason many tutors look past a company job is the rate. A company sets the price and keeps the difference between what its client pays and what you are paid. When you tutor for yourself, you set the price. The sums below show how many lessons a tutor who charges their own rate needs to match ten paid hours at $22, which is $220 a week. The three rates are invented.` },
  { type: 'compare', caption: 'Lessons an independent tutor needs each week to take in $220, the pay for ten High-Dosage hours. Invented rates, before the payment processor\'s fee and before tax.', headers: ['Your own rate', 'Lesson hours to take in $220', 'Rounded up to whole lessons', 'Total hours if 1 in 5 hours is not teaching'], rows: [
    ['$25 an hour', '8.8', '9', '11.0'],
    ['$35 an hour', '6.3', '7', '7.9'],
    ['$50 an hour', '4.4', '5', '5.5'],
  ] },
  { type: 'p', text: `At $35 an hour, seven lessons a week matches the pay of ten hours on the High-Dosage schedule, and you are working fewer hours to do it. That is the argument for independence, and it is a real one. Now the catch, stated as plainly as the sums: those seven students have to exist. Tutor.com brings its clients to you. When you teach for yourself, finding students is a job you do without pay, and the table's last column covers only a guess at how much of your time it takes.` },
  { type: 'p', text: `Here is one invented tutor to make it concrete. Alex charges $40 an hour and teaches ten lessons a week, which is $400. Alex spends three hours a week on messages, scheduling and invoices and two hours finding new students, so the week is 15 hours long. Dividing $400 by 15 gives $26.67 an hour, before the payment processor's fee and before tax. That is above $22, and it is still $13.33 an hour less than the $40 on Alex's price list. Our guide to your real hourly rate shows how to find that gap, and our guide to the Wyzant fee does the same sum for a marketplace that takes a quarter of your rate.` },
  { type: 'ul', items: [
    `Month one with no students: independent pay is $0 until someone books. A company job pays from the first session.`,
    `Month six with a full week: independent pay is higher per hour, and you can raise your rate. A company job pays the rate it set.`,
    `A cancelled lesson: on your own you can set a cancellation policy. On a platform you follow its rules.`,
    `Tax and paperwork: on your own they are all yours. On a company job it depends on your status, which the pages do not give.`,
  ] },
  { type: 'h2', text: 'Both at once: a company for steady hours, your own page for the rest' },
  { type: 'p', text: `You do not have to choose forever. Many tutors take a company role for steady hours while they build a small list of students of their own. Our guide to getting your first tutoring clients covers where those students come from when no platform sends them.` },
  { type: 'p', text: `If you do both, read the company's agreement and teach only what it allows. We have not read Tutor.com's tutor agreement, and we do not suggest breaking anyone's terms. Keep the two apart: your own students book on your own page, and company students stay on the company's platform.` },
  { type: 'h2', text: 'What Tutafy does and does not do' },
  { type: 'p', text: `Tutafy is for the own-students half of that picture. It gives you a public booking page that shows your free hours in the student's time zone, a video classroom in the browser, email reminders, student records and payment through your own Stripe or PayPal account, with 0% commission. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29.` },
  { type: 'ul', items: [
    `Tutafy does not find you students. Its tutor directory is not open yet: the live page says it opens once at least six tutors are ready, and it lists none today.`,
    `Tutafy is not a job board or an employer. It does not hire you, set your rate or guarantee any income.`,
    `Your payment processor still charges its own fee, so read the Stripe or PayPal page for the current figure before you work out your take-home.`,
    `It does not check your qualifications and does not guarantee that a student pays, shows up or stays.`,
  ] },
  { type: 'h2', text: 'Mistakes tutors make with Tutor.com jobs' },
  { type: 'ul', items: [
    `Applying from outside the US. The page says it accepts applications from the US only, so you lose weeks.`,
    `Assuming the $22 is the rate for every role. It is the figure for one role, the High-Dosage Tutor.`,
    `Preparing for days before asking what the rate is.`,
    `Not asking whether you are an employee or a contractor, and so not setting aside tax.`,
    `Counting only paid hours when you work out your hourly rate.`,
  ] },
  { type: 'source', text: 'Tutor.com pages read on 31 Oct 2026. None shows an updated date, and the footer reads "2026 Tutor.com / The Princeton Review". We did not read the California, Los Angeles and Philadelphia notices or the full subject list PDF. Read the current pages before you apply.', links: [
    { label: 'Tutor.com: become a tutor', href: 'https://www.tutor.com/apply' },
    { label: 'Tutor.com: tutoring FAQ for applicants', href: 'https://www.tutor.com/apply/tutoring-faq' },
    { label: 'Tutor.com: why tutor with us', href: 'https://www.tutor.com/apply/why-tutor-with-us' },
    { label: 'Tutor.com: application process', href: 'https://www.tutor.com/apply/application-process' },
    { label: 'Tutor.com: our tutors', href: 'https://www.tutor.com/tutors' },
    { label: 'Tutor.com: High-Dosage Tutor', href: 'https://www.tutor.com/hdt-apply' },
    { label: 'Tutor.com: High-Dosage Tutor FAQ', href: 'https://www.tutor.com/hdt-tutor-faq' },
    { label: 'Tutor.com: current openings on Greenhouse', href: 'https://job-boards.greenhouse.io/tutor_com' },
    { label: 'US Bureau of Labor Statistics: tutors', href: 'https://www.bls.gov/ooh/education-training-and-library/tutors.htm' },
    { label: 'FTC: job scams', href: 'https://consumer.ftc.gov/articles/job-scams' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'Marketplaces, companies and your own business, side by side.' },
    { label: 'Your real hourly rate as a tutor', href: '/blog/real-hourly-rate-for-tutors', text: 'Divide what you keep by every hour you work.' },
    { label: 'Wyzant fees for tutors', href: '/blog/wyzant-fees-for-tutors', text: 'What a marketplace keeps, worked out lesson by lesson.' },
    { label: 'Tutor taxes', href: '/blog/do-tutors-have-to-pay-taxes', text: 'Contractor income, forms and records.' },
    { label: 'How to get your first 10 tutoring clients', href: '/blog/get-your-first-tutoring-clients', text: 'Where students come from when no company sends them.' },
    { label: 'Tutor resume', href: '/blog/tutor-resume', text: 'What to put on the page before you apply.' },
  ] },
  { type: 'faq', items: [
    { q: 'How do I apply for a job at Tutor.com?', a: `Apply on Tutor.com's own site, through the "become a tutor" page. Its FAQ says the process takes 1 to 3 weeks and points you to a tutor application portal where you can take a subject competency exam. Applications are accepted only from the US, and the real application is free.` },
    { q: 'Can I get a Tutor.com job without a degree?', a: `Its FAQ says you must be enrolled as a college sophomore or higher at an accredited university in pursuit of a 4-year degree, or hold a 4-year degree or higher. The High-Dosage Tutor role asks for the finished degree. We found no route without either on the pages we read.` },
    { q: 'How much does Tutor.com pay tutors?', a: `Its High-Dosage Tutor page says $22 an hour. For the on-demand role the pages say a set hourly rate dictated by the subjects you tutor, with incentives for quality, and give no number until you have passed the application and the subject exam.` },
    { q: 'Is Tutor.com open to tutors outside the US?', a: `Not at the moment. The apply page says it is only accepting applications from the US, excluding US territories other than Puerto Rico. Its FAQ also says it cannot accept applicants who need visa sponsorship, and names H-1B, F-1 and OPT.` },
    { q: 'How many hours can I work at Tutor.com?', a: `Its page says you can tutor as few as 5 hours a week and as many as 29, and change your scheduled hours each week. The High-Dosage Tutor role asks for at least ten hours a week during the school day.` },
    { q: 'Are Tutor.com tutors employees or contractors?', a: `The applicant pages we read on 31 October 2026 do not say. Ask before you accept, because it decides who withholds tax and whether you set money aside yourself.` },
    { q: 'Is Tutafy a Tutor.com alternative?', a: `Not as an employer. Tutafy has no students to send you and its tutor directory is not open yet. It is a booking page, video classroom, reminders and payment tool for tutors who bring their own students, with 0% commission and a Free plan for up to 10 students.` },
  ] },
  { type: 'cta', title: 'Teaching your own students? Keep the whole rate', text: 'Put them on one booking page with reminders, a built-in video classroom and payment through your own account. The Free plan covers up to 10 students. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start.', button: 'Start free, no credit card', href: '/register' },
]
