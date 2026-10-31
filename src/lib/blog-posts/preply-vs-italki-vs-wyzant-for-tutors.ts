// T-1216. Article body for /blog/preply-vs-italki-vs-wyzant-for-tutors (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, article 5 (day 10 Nov 2026); owner approved in W-3852.
// Step 0 (31 Oct 2026). Search results for "Preply vs italki vs Wyzant for tutors" are written for LEARNERS and are mostly vendor-sponsored or generated comparison pages
// (CB Insights, toolradar, langoly, Notion pages, an italki blog post about Wyzant alternatives); none is written from the tutor's side, and they disagree on a winner.
// Overlap on this site: marketplace-vs-independent-the-real-math (a year of fees), preply-alternatives-for-tutors (alternatives to Preply), how-much-does-preply-take (commission),
// online-tutoring-jobs (what each HIRING route asks of an applicant: who can apply, what it keeps, how soon you hear back), real-hourly-rate-for-tutors, how-to-leave-preply-migration-guide.
// Not a rewrite of any of them: this post is the FIT guide. It says which kind of tutor each of the three platforms is built for, how each one decides who students see, what each one pays out and
// when, the rules that can cost a profile or a student, and what you keep from the same invented $30 lesson. It does not repeat the application table of online-tutoring-jobs.
// The Preply post of the same batch (T-1210, 8 Nov) and the Wyzant post (T-1212, 9 Nov) are written in other lanes and are not on master yet: this post links to existing posts only
// and to its sister post of 10 Nov. Link both ways with the trial-lesson post (T-1217).
//
// EVERY figure and rule was read on 31 Oct 2026. The help pages of Preply, italki and Wyzant answered 403 to a script, so each one was taken from the search result of that official page
// (the source note says so):
//   Preply commission model: first (trial) lesson with a new student 100%; then 33% for a new tutor, 28% after 20 hours of teaching, 18% for a tutor with 400+ hours (the page's own example:
//     $10 lesson, $6.70 for a new tutor and $8.20 with 400+ hours, non-trial); hours are cumulative across the platform and trial lessons count. Preply says the 100% is what lets it offer
//     a free replacement when a student is not satisfied with the trial. marketplace-rates.ts holds the same range (33% falling to 18%).
//   Preply when and how you get paid: earnings added to the balance when a lesson is confirmed; most lessons confirm about 15 minutes after the scheduled end in Preply Classroom, outside the
//     Classroom 72 hours after, unless the student confirms sooner. Withdrawal: Wise (min $10), PayPal (2% up to $20), Payoneer (min $20 plus $1; bank transfer min $23 plus $3), Skrill; max $3,000 a transaction.
//   Preply Tutoring Standards Policy (in force 6 Oct 2025): a rolling 90 days; to stay visible: fewer than 5 absences, short-notice reschedules under 40% of lessons, cancellations under 20% (changes asked for
//     by the student do not count); a profile outside them is hidden from search, but students you already have and anyone with a direct link can still book. Missed trial lessons: the profile is hidden for longer each
//     time, and after a fifth missed trial it is hidden from new students for two years. Super Tutor criteria since 1 Aug 2026: at least 80% of trials in the Preply Classroom, a reply to 80% of messages within 24 hours.
//   Preply tutor profile advertising: free, opt-in ("Allow Preply to advertise my profile"); Preply does not report how many students came from the ads; Super Tutors with it on are prioritised for some ads for new students.
//   Preply rules for tutors: a profile is blocked for links to other tutoring platforms; payment details or other tutoring sites may not be shared before a trial has been bought; no contact details, links or emails in the profile text or video.
//   Preply weekly lessons: a fixed weekly slot is held for the student; students pay in 28-day cycles; a weekly setup ends when the subscription is cancelled or the tutor is unavailable three weeks in a row; cancelling one
//     counts toward the tutor's cancellation rate; weekly lessons are managed on the website, not the app.
//   italki commission: 0% on trial lessons; 21% single lesson; 19% package of 5; 17% of 10; 15% of 15 and of 20; 30% group class; taken when the lesson or package is completed, from the teacher's own listed price (marketplace-rates.ts).
//   italki trial lessons: the lowest trial price a teacher can set is $5 in italki Credits, so no free trial; a student gets 3 trial chances, with 3 different teachers; a 100% Satisfaction Guarantee refund request on a trial must be made within 48 hours.
//   italki Professional Teacher and Community Tutor: Professional Teachers upload proof of training or experience as educators and can show work experience, education and certificates; Community Tutors can show work experience and
//     certificates only; the official table gives $10 to $120 a lesson for Professional Teachers and $5 to $120 for Community Tutors; up to six courses per teaching language.
//   italki withdrawal: italki takes no withdrawal fee, the provider may (PayPal 2%, Hyperwallet 1.5%, Payoneer $3 flat; US bank transfer through Payoneer $1.50); minimum $30 in italki Credits; standard payment twice a month;
//     express withdrawal costs $10 in Credits and needs three earlier successful withdrawals by the same method. The teacher sets the lesson price, not italki.
//   Wyzant fee structure and payment policies: 25% fee on lessons with all students (from 15 Jan 2019, replacing a 40% to 20% sliding scale), so 75% to the tutor; students pay a further 9% service fee; a referred student
//     who creates an account and takes lessons with the referring tutor carries no fee (the tutor keeps 100%); tutors set and may change their own hourly rate; a student who contacted the tutor in the last three months stays at the
//     rate of first contact unless they approve a change; lessons are submitted within 14 days; direct deposit twice a month (1st and 15th), lesson entered at least 5 days before the date; bank details and, above $50 cumulative, a Social Security number.
//   Wyzant cancellation: the tutor sets a policy, longest window 36 hours; a fee is optional, must be stated on the profile, may not exceed the session cost; Instant Book uses a uniform 24-hour policy and pays the full hour once the lesson
//     summary is submitted. Background check: not required of tutors; a student or guardian can buy one for $15.99; a tutor with one gets an icon. First lesson: the tutor decides whether to offer a free one (a card must still be on file).
//   Wyzant contact: until a student adds payment information both sides must refrain from exchanging personal contact details; afterwards Wyzant "strongly suggests" keeping lesson talk in Wyzant Messages.
//   Wyzant, how students find you: its tutor page says students contact you once you have a profile, that it does not sell premium listings or top placement (that page is old, said so), and that it sends daily notices of new jobs in your area.
// italki's rule on contacting students off the platform: its help pages did not come up, so the post says "not confirmed".
// Not read, so not written: how any platform ranks a profile in search, how many students any platform sends a new tutor, the share of tutors who earn a given amount, any country-by-country rule, an italki limit on teaching languages.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026 (same as online-tutoring-jobs): src/lib/plans.ts (Free $0 for up to 10 students, Pro $12/mo, Academy $29/mo, 0% commission),
// docs/features/T-1043-directory-setup.md (the directory opens once six tutors are ready; the live page says "opens soon"). All sums in the examples use invented prices and say so.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const PREPLY_ITALKI_WYZANT_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'The three are built for different tutors: italki for language lessons, Preply for languages and some other subjects, Wyzant for school and professional subjects, mostly in the US.',
    'The cut is not the only difference. Preply keeps your first lesson with each new student and ties your visibility to absences. italki charges less on bigger packages. Wyzant lets you write your own cancellation policy.',
    'On an invented $30 lesson you keep from $20.10 to $25.50 on the three platforms. A student you refer to Wyzant carries no fee.',
    'Each platform limits contact with students outside it. Read the rules before you move anyone.',
    'Tutafy is not a marketplace and sends no students. It is for tutors who bring their own.',
  ] },
  { type: 'p', text: `Preply, italki and Wyzant are not three versions of the same business. Preply and italki sell language lessons first, and Wyzant sells school and professional subjects, mostly to students in the United States. Which one suits you depends on what you teach, how regular your hours are, whether you hold a teaching qualification and how much you want to control your own rules. This guide goes through the three from the tutor's side, using what each platform's own help pages said on 31 October 2026. We make Tutafy, a tool for tutors who run their own business, so we also say where an independent tutor fits.` },
  { type: 'image', src: '/blog/inline/platforms-signpost', alt: 'A black and white signpost with two white arms stands at a country crossroads beside a wooden bench and a field.', caption: 'Illustrative photo, not a Tutafy user. A platform is a road to students, and the three roads go different ways.', credit: 'Photo: Gordon Hatton (CC BY-SA 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Signpost_at_crossroads_-_geograph.org.uk_-_5952204.jpg' },
  { type: 'h2', text: 'The three platforms side by side' },
  { type: 'p', text: `The table below puts the questions that matter once you are accepted in one place. Where a platform's pages did not say, we write "not confirmed" and do not guess.` },
  { type: 'compare', caption: 'What each platform\'s own pages said on 31 Oct 2026, for a tutor who is already accepted. Most figures come from the search result of the official page, because the page itself answered 403 to our script.', headers: ['Platform', 'Built for, and what it keeps', 'Worth knowing'], rows: [
    ['Preply', 'Languages first, other subjects too. Keeps all of your first lesson with each new student, then 33%, falling to 18% from 400 hours of teaching.', 'Students pay in 28-day cycles for a set number of lessons with one tutor. Absences and cancellations count against your visibility.'],
    ['italki', 'Language lessons only. 0% on a trial lesson, 21% on a single lesson, down to 15% on packages of 15 or 20.', 'You set the lesson and package prices. Its rule on contacting students off the platform: not confirmed.'],
    ['Wyzant', 'School, test prep and professional subjects. 25% on every lesson, and 0% on a student you refer.', 'You set your rate and write your own cancellation policy. Payout on the 1st and 15th, and a Social Security number above $50.'],
  ] },
  { type: 'h2', text: 'Preply: a good fit for regular weekly hours' },
  { type: 'p', text: `Preply's model rewards a tutor who can offer the same slot every week. Its pages describe weekly lessons as a fixed time held for one student, so the slot is unavailable to anyone else. Students pay in 28-day cycles, and a weekly setup keeps running until the student cancels or you are unavailable at that time three weeks in a row. For a tutor with stable hours, that is close to a retained student.` },
  { type: 'h3', text: 'The first lesson earns nothing' },
  { type: 'p', text: `Preply keeps the whole first lesson with each new student. Its commission page says the 100% is what lets it give a student a free replacement if the trial was not a good fit. Trial lessons still count toward your teaching hours, and those hours move you down the scale: 33% at the start, 28% after 20 hours, and 18% from 400 hours (its example pays $8.20 on a $10 lesson at the top). If many of your trials do not turn into regulars, you work for nothing, so our guide to running a trial lesson goes through it minute by minute.` },
  { type: 'h3', text: 'Finding students, and getting paid' },
  { type: 'p', text: `Students find you by search. Preply also runs free, optional ads for your profile, and says it cannot report how many students came from them. Earnings reach your balance when a lesson is confirmed, about 15 minutes after it ends in Preply Classroom, or 72 hours after it ends outside it unless the student confirms sooner. You withdraw through Wise, PayPal (a 2% fee, up to $20), Payoneer or Skrill, up to $3,000 a transaction.` },
  { type: 'h3', text: 'Rules that can hide your profile' },
  { type: 'p', text: `The Tutoring Standards Policy, in force since 6 October 2025, looks at a rolling 90 days. To stay visible in search you need fewer than 5 absences, short-notice reschedules on under 40% of your lessons and cancellations on under 20%. Changes your students ask for do not count. A profile outside those limits is hidden from search, but your existing students and anyone with your direct link can still book you.` },
  { type: 'p', text: `Missed trial lessons are treated more harshly. The profile is hidden for longer after each one, and after a fifth it is hidden from new students for two years. Super Tutor criteria, from 1 August 2026, include at least 80% of trial lessons inside the Preply Classroom and a reply to 80% of messages within 24 hours.` },
  { type: 'callout', variant: 'warn', title: 'Weekly lessons count one by one', text: 'Cancelling a whole weekly setup cancels all its upcoming lessons, and each one counts toward your cancellation rate. Check how many that is first.' },
  { type: 'h3', text: 'Who it suits' },
  { type: 'ul', items: [
    `Language tutors who can hold the same weekly hours for months and accept an unpaid first lesson.`,
    `Tutors with no teaching qualification: the Preply registration page we read for our jobs guide says none is required.`,
  ] },
  { type: 'p', text: `It suits less well a tutor with changeable hours, since reschedules and cancellations feed the visibility rules.` },
  { type: 'h2', text: 'italki: a good fit for language teachers who sell packages' },
  { type: 'p', text: `italki sells language lessons only, and it splits its teachers into two kinds. A Professional Teacher uploads proof of training or experience as an educator and can show work experience, education and certificates on the profile. A Community Tutor, as italki describes the role, can show work experience and certificates only. The official table lists a lesson price range of $10 to $120 for Professional Teachers and $5 to $120 for Community Tutors. Your price is yours to set, not italki's.` },
  { type: 'h3', text: 'The commission falls as students commit' },
  { type: 'p', text: `The structure that makes italki different for a tutor is the sliding cut by lesson type. A trial lesson carries 0% and a single lesson 21%. A package of 5 lessons carries 19%, a package of 10 carries 17% and a package of 15 or 20 carries 15%. A group class carries 30%. It is taken when the lesson or package is completed, from the price you listed. The effect is a reason to sell packages: a student who commits to fifteen lessons costs you six points less than one who buys a single lesson.` },
  { type: 'compare', caption: 'An invented $30 lesson on italki. Percentages are from italki\'s commission page as read on 31 Oct 2026; the sums are ours. Payment fees and tax are not taken off.', headers: ['Lesson type', 'italki keeps', 'You keep from $30'], rows: [
    ['Trial lesson', '0%', '$30.00 (the lowest trial price you can set is $5)'],
    ['Single lesson', '21%', '$23.70'],
    ['Package of 5', '19%', '$24.30'],
    ['Package of 10', '17%', '$24.90'],
    ['Package of 15 or 20', '15% (the lowest rate)', '$25.50'],
    ['Group class', '30%', '$21.00'],
  ] },
  { type: 'h3', text: 'Trial lessons and getting paid' },
  { type: 'p', text: `A trial on italki is paid. The lowest price you can set is $5 in italki Credits, so you cannot offer a free one. A student gets 3 trial chances, each with a different teacher, and can ask for a refund under the 100% Satisfaction Guarantee within 48 hours if the teacher did not show or the trial fell short. Turn up early and keep a note of what you covered.` },
  { type: 'p', text: `You withdraw from a minimum of $30 in Credits. italki takes no withdrawal fee, but the provider may: 2% for PayPal, 1.5% for Hyperwallet, $3 for a Payoneer transfer. Standard payment runs twice a month, and an express payment costs $10 in Credits after three successful withdrawals by the same method.` },
  { type: 'h3', text: 'Who it suits' },
  { type: 'ul', items: [
    `A language teacher with a qualification who wants the Professional Teacher label, or a native speaker starting as a Community Tutor.`,
    `Tutors who can sell lesson blocks, because the cut falls as the package grows.`,
  ] },
  { type: 'p', text: `One thing we could not confirm is italki's rule on contacting a student outside the platform. Read its Teacher Terms of Service before you move a student.` },
  { type: 'image', src: '/blog/inline/platforms-balance', alt: 'An old brass and cream cast-iron balance scale with two empty brass pans on a white background.', caption: 'Illustrative photo. Put the same lesson on each platform and see what is left in your pan.', credit: 'Photo: Nikodem Nijaki (CC BY-SA 3.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Balance_scale_IMGP9722.jpg' },
  { type: 'h2', text: 'Wyzant: a good fit for school subjects and for tutors who set their own rules' },
  { type: 'p', text: `Wyzant is built for academic and professional subjects and mostly for students in the US. It gives a tutor more control than the other two. You set your hourly rate and may change it. You choose your cancellation policy, with a window of up to 36 hours and an optional fee that must be on your profile and may not exceed the cost of the session. If you turn on Instant Book, a fixed 24-hour policy applies, and after that window you are paid for the full hour once you submit the lesson summary, whether or not the student shows up. If no-shows cost you money, Wyzant lets you write the rule, and our guide to stopping tutoring no-shows covers wording.` },
  { type: 'p', text: `Students find you through your profile, and Wyzant sends daily notices of new jobs in your area. Its tutor page says it does not sell premium listings or top placement, though that page is old.` },
  { type: 'h3', text: 'The fee, and one way to avoid it' },
  { type: 'p', text: `Wyzant keeps 25% of every lesson, so you keep 75% of your hourly rate, before tax. This has applied since 15 January 2019, when it replaced a sliding scale of 40% down to 20%. Students pay a separate 9% on top, which does not come out of your share. The exception is a student you refer: when a new student creates an account and takes lessons with the tutor who referred them, the tutor keeps 100% of their rate. That is the clearest platform-approved way to bring in students of your own.` },
  { type: 'h3', text: 'Getting paid, and what a first lesson costs' },
  { type: 'p', text: `You submit each lesson within 14 days. Direct deposit goes out on the 1st and 15th, and a lesson must be entered at least 5 days before the date to make that payout. Above $50 earned you must give a valid Social Security number, so the platform assumes a US taxpayer. Its older registration FAQ lists a US-resident condition, so outside the US, confirm with Wyzant before you apply.` },
  { type: 'p', text: `A first lesson is up to you: Wyzant's tutor page says you decide whether to offer a free one. Students must put a card on file before they meet a tutor, and a student can ask for the first hour to be refunded under its Good Fit guarantee. Wyzant does not require a tutor to pass a background check, but any student or guardian can pay $15.99 for one, and a tutor who passes gets an icon on the profile.` },
  { type: 'h3', text: 'Who it suits' },
  { type: 'ul', items: [
    `Maths, science, writing, test-prep and professional-skills tutors who teach US students and are US taxpayers.`,
    `Tutors who want a say in their rate and cancellation rules, or who can use the referral rule on students they already have.`,
  ] },
  { type: 'p', text: `It suits less well a tutor outside the US, or one who needs payment inside a few days: the payout runs twice a month.` },
  { type: 'h2', text: 'What you keep from the same $30 lesson' },
  { type: 'p', text: `A headline price tells you little. Here is one invented $30 lesson on each platform, with the cut taken from the pages above. None of these is a quote, and tax and payment fees are not taken off.` },
  { type: 'compare', caption: 'An invented $30 lesson. Percentages are from the pages checked on 31 Oct 2026; sums are ours.', headers: ['Where the lesson happens', 'The platform keeps', 'You keep', 'Over 10 such lessons'], rows: [
    ['Preply, first lesson with a new student', '100% ($30.00)', '$0.00', 'Not applicable'],
    ['Preply, new tutor', '33% ($9.90)', '$20.10', '$201'],
    ['Preply, after 20 hours', '28% ($8.40)', '$21.60', '$216'],
    ['Preply, 400 hours or more', '18% ($5.40)', '$24.60', '$246'],
    ['italki, single lesson', '21% ($6.30)', '$23.70', '$237'],
    ['italki, package of 15 or 20', '15% ($4.50)', '$25.50', '$255'],
    ['Wyzant, any student', '25% ($7.50)', '$22.50', '$225'],
    ['Wyzant, a student you referred', '0%', '$30.00', '$300'],
    ['Your own booking link', 'No commission from you', '$30 before the payment fee and tax', '$300 before the payment fee and tax'],
  ] },
  { type: 'p', text: `Take one new student who has ten lessons with you on Preply at $30, the first being the trial. You earn nothing from the first and $20.10 from each of the other nine: 9 × $20.10 = $180.90. The same ten lessons with a student you referred to Wyzant leave you $300. The sums are invented, but they show why the first-lesson and referral rules matter as much as a few points of commission. The table also leaves out what the marketplaces sell, which is the student: a tutor with no network may find the fee cheaper than weeks without one. Our real math guide runs a full year.` },
  { type: 'h2', text: 'Rules that can cost you a profile or a student' },
  { type: 'p', text: `The contact rules are where new tutors get into trouble. The table gives each platform's wording as we read it, not legal advice.` },
  { type: 'compare', caption: 'Contact and conduct rules, as the platforms\' pages said on 31 Oct 2026. "Not confirmed" means we could not find it.', headers: ['Platform', 'Contact outside the platform', 'What can hurt your standing'], rows: [
    ['Preply', 'No contact details, links or emails in your profile text or video. Links to other tutoring platforms get a profile blocked. Payment details and other tutoring sites may not be shared before a trial has been bought.', 'Absences, short-notice reschedules and cancellations over the limits. Missed trial lessons: a longer hiding each time.'],
    ['italki', 'Not confirmed. Read the Teacher Terms of Service.', 'Not confirmed. Trial refunds can be requested within 48 hours.'],
    ['Wyzant', 'Until a student adds payment information, neither side may exchange personal contact details. Wyzant calls a request to take you off the platform a hallmark of spam. After payment is on file it suggests keeping lesson talk in Wyzant Messages.', 'A tutor who does not follow the payment policies can have access denied, revoked or limited, in the page\'s words.'],
  ] },
  { type: 'p', text: `Do not solicit a student you only know through a trial lesson the platform kept. Invite a student you already know well, and let them choose. Our guide to leaving Preply is clear about the line.` },
  { type: 'image', src: '/blog/inline/platforms-globe', alt: 'An old world globe in a wooden stand, turned to show North America in blue, cream and orange.', caption: 'Illustrative photo. Preply and italki tutors teach across time zones, and Wyzant\'s students are mostly in the US.', credit: 'Photo: Amber Avalona (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Mappamondo-_Nord_America.jpg' },
  { type: 'h2', text: 'Which platform fits which tutor' },
  { type: 'p', text: `This is a starting point, not a ranking. It uses only what the pages above say.` },
  { type: 'compare', caption: 'A starting point built from the platform pages read on 31 Oct 2026. Read the current terms before you apply.', headers: ['If you are...', 'Look first at', 'Because'], rows: [
    ['A language conversation tutor with no formal qualification, with hours that change', 'italki, as a Community Tutor', 'You set your prices, the trial pays and the cut falls with packages. Preply\'s visibility rules punish reschedules.'],
    ['A qualified language teacher with documents to upload', 'italki as a Professional Teacher, or Preply', 'italki marks teachers who show proof of training. Preply does not ask for a certificate to register.'],
    ['A language tutor who can hold the same hours every week for months', 'Preply', 'Its weekly lessons hold your slot for the student and renew with their subscription.'],
    ['A school-subject or test-prep tutor with US students', 'Wyzant', 'You set your rate and cancellation policy, and the referral rule lets you keep your whole rate on students you bring.'],
    ['A tutor outside the US teaching school subjects', 'Check Wyzant\'s eligibility first, then your own link', 'Wyzant asks for a Social Security number above $50, and its older FAQ lists a US-resident condition.'],
    ['A tutor who already has students who trust you', 'Your own booking link', 'A platform adds only a cut, as the $30 table shows.'],
    ['A new tutor with no network', 'One platform to meet students, and your own link from week one', 'A platform supplies students, and your own link keeps the ones you earn.'],
  ] },
  { type: 'h2', text: 'Can you use more than one?' },
  { type: 'p', text: `Yes, and many tutors do, with two cautions. Each platform has its own calendar, so a slot open on one is not blocked on the others, and a booking you have to cancel counts on Preply as a cancellation. And each trial lesson takes preparation, so if a platform keeps that lesson your real hourly rate drops, as our guide to your real hourly rate shows. Give each platform a fixed part of the week and check one calendar before you accept anything.` },
  { type: 'h2', text: 'The fourth option: students who book you directly' },
  { type: 'p', text: `None of the three platforms writes about running your own booking page, since each earns from lessons that go through it. It removes the commission, and it removes the supply of students. For a tutor with no network and no reviews, that second half is the whole difficulty. It needs an offer ("I help Year 10 students move from a 5 to a 7 in GCSE maths", not "maths tutor"), a price you can defend, a booking page that takes payment before the lesson, and a few places to find the first students. Our playbook for your first ten clients lists the channels.` },
  { type: 'p', text: `A sensible plan for many tutors is to use one platform for its search and to meet students, while running a booking page beside it from the first week. Students who ask to book you directly can be invited to, within the platform's rules. The jobs guide sets out the other kinds of tutoring work.` },
  { type: 'h2', text: 'What Tutafy is, and what it is not' },
  { type: 'p', text: `Tutafy is a tool for tutors who run their own business: a public booking page that shows your hours in the student's time zone, a video classroom that opens in the browser, email reminders, student records, and payment through your own PayPal or Stripe account. It takes 0% commission on every plan. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29 a month. Here is what it does not do:` },
  { type: 'ul', items: [
    `It does not send you students. It is not a marketplace and promises no bookings.`,
    `It has a public tutor directory, but the directory is not open yet. It opens once six tutors have set free hours, an introduction and a language, and on 31 October 2026 the page said "The tutor directory opens soon" with no tutors listed.`,
    `It does not check qualifications or run background checks, and it does not hire or pay you. Payment goes from your student to your own account.`,
  ] },
  { type: 'p', text: `If you want a place where students already look, the platforms above do that and Tutafy does not. If you have students, or will find them, and want to keep what they pay, Tutafy removes the admin. Our Tutafy review is the honest overview.` },
  { type: 'source', text: 'Official pages used here, read on 31 Oct 2026. Our script could not read the Preply, italki and Wyzant help pages (each answered 403), so their figures come from the search results of those official pages. Terms change often: read the current page before you decide.', links: [
    { label: 'Preply: commission', href: 'https://help.preply.com/en/articles/4171383-preply-commission-model' },
    { label: 'Preply: payouts', href: 'https://help.preply.com/en/articles/4171348-when-and-how-you-get-paid-for-lessons' },
    { label: 'Preply: standards policy', href: 'https://help.preply.com/en/articles/11405781-tutoring-standards-policy' },
    { label: 'Preply: rules', href: 'https://help.preply.com/en/articles/4179152-rules-for-tutors' },
    { label: 'Preply: profile ads', href: 'https://help.preply.com/en/articles/5137235-tutor-profile-advertising' },
    { label: 'Preply: weekly lessons', href: 'https://help.preply.com/en/articles/16598169-how-weekly-lessons-work-for-tutors' },
    { label: 'italki: commission', href: 'https://support.italki.com/hc/en-us/articles/206352068-How-does-italki-charge-a-commission' },
    { label: 'italki: teacher types', href: 'https://support.italki.com/hc/en-us/articles/900002978766-Difference-between-Professional-Teacher-and-Community-Tutor' },
    { label: 'italki: trial lessons', href: 'https://support.italki.com/hc/en-us/articles/206351548-Offering-Trial-Lessons' },
    { label: 'italki: withdrawals', href: 'https://support.italki.com/hc/en-us/articles/210002367-How-do-I-get-paid-and-what-s-the-withdrawal-fee' },
    { label: 'Wyzant: fees', href: 'https://support.wyzant.com/tutors/tutor-payments/what-is-the-fee-structure-for-tutors-listed-on-wyzant/' },
    { label: 'Wyzant: payments', href: 'https://support.wyzant.com/tutors/tutor-payments/tutor-payment-policies/' },
    { label: 'Wyzant: cancellations', href: 'https://support.wyzant.com/tutors/tutor-account/how-do-i-determine-my-cancellation-policy/' },
    { label: 'Wyzant: free first lesson', href: 'https://support.wyzant.com/tutors/lessons/may-i-give-a-free-first-lesson-or-meeting-with-a-student/' },
    { label: 'Wyzant: contact details', href: 'https://support.wyzant.com/tutors/tutor-home/when-can-i-share-my-phone-number-or-email-address-with-a-student/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to run a trial lesson that turns into regular students', href: '/blog/how-to-run-a-trial-lesson-tutoring', text: 'The first lesson, minute by minute, and what to send afterwards.' },
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'Who can apply, what each route pays and how soon you hear back.' },
    { label: 'Preply, iTalki or on your own? The real math', href: '/blog/marketplace-vs-independent-the-real-math', text: 'A year of fees, side by side.' },
    { label: 'How much does Preply take from tutors?', href: '/blog/how-much-does-preply-take', text: 'The commission model in detail.' },
    { label: 'Wyzant fees for tutors', href: '/blog/wyzant-fees-for-tutors', text: 'The 25% fee, the student fee, payout dates and how to avoid the fee.' },
    { label: 'Your real hourly rate as a tutor', href: '/blog/real-hourly-rate-for-tutors', text: 'What a lesson earns after prep, gaps and fees.' },
    { label: 'How to leave Preply', href: '/blog/how-to-leave-preply-migration-guide', text: 'Moving regular students to your own link.' },
    { label: 'How to stop tutoring no-shows', href: '/blog/stop-tutoring-no-shows', text: 'Cancellation wording that works.' },
  ] },
  { type: 'faq', items: [
    { q: 'Is Preply or italki better for tutors?', a: `It depends on your hours and your qualifications. Preply suits language tutors who can hold regular weekly hours and are happy to teach a first lesson unpaid. italki suits language teachers who want to set their own prices, who sell packages and who want trial lessons paid. We read both platforms' pages on 31 October 2026, so check the current terms before you choose.` },
    { q: 'How much does Wyzant take from tutors?', a: `Wyzant keeps 25% of every lesson, so you keep 75% of your hourly rate before tax. Students pay a separate 9% service fee that does not reduce your share, and a student you refer to Wyzant carries no fee. The 25% has applied since 15 January 2019.` },
    { q: 'Does Preply take the first lesson from tutors?', a: `Yes. Its commission page says the commission on every trial lesson with a new student is 100%. Trial lessons still count toward your cumulative teaching hours, which lower your commission over time.` },
    { q: 'Does italki charge a commission on trial lessons?', a: `No. Its commission page lists 0% on trial lessons. A trial must still be priced at $5 or more in italki Credits, so you cannot offer a free one.` },
    { q: 'Which platform is best for a new tutor with no experience?', a: `The pages we read say Preply requires no teaching degree or certificate to register, and italki has a Community Tutor route for tutors without a teaching qualification. Wyzant asks you to choose subjects, pass any subject quiz and accept its agreement. Each one has its own review, so apply to one or two, not all three.` },
    { q: 'Can I use Preply, italki and Wyzant at the same time?', a: `Yes, if the rules of each allow it, but you need one calendar to avoid double booking. A late cancellation counts against you on Preply. Read each platform's rules on contacting students outside it before you move anyone.` },
    { q: 'Do I need to pay tax on income from these platforms?', a: `Usually yes. The tutors in the pages we read were independent contractors, so the income is yours to report. See our guide to tutor taxes for the forms and records.` },
    { q: 'Does Tutafy send me students like these platforms?', a: `No. Tutafy is a tool for tutors who bring their own students. It has no job listings, and its tutor directory had not opened on 31 October 2026. It gives you a booking page, a video classroom, reminders and payment through your own account, with 0% commission, and a Free plan for up to 10 students.` },
  ] },
  { type: 'cta', title: 'Keep the students you earn', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start, cancel anytime. Tutafy does not send students.', button: 'Start free, no credit card', href: '/register' },
]
