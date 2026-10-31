// T-1214. Article body for /blog/wyzant-fees-for-tutors (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, article 3 (calendar day 9 Nov 2026).
// Step 0 (31 Oct 2026): the first page of results for "wyzant fees tutors" is Wyzant's own fee-structure help page, a second copy of it, and third-party review and side-hustle blogs that repeat "25%".
// None of them puts the tutor's side and the student's side, the 2019 change, the referral exception, the payout dates and the contractor tax rules on one page with a worked sum.
// On this site the nearest pieces are: how-much-does-preply-take (Preply only), online-tutoring-jobs (one table row for Wyzant: "25% flat since 15 January 2019 ... students pay a further 9% on top. 0% on a student you refer"),
// marketplace-vs-independent-the-real-math and preply-alternatives-for-tutors (one paragraph on Wyzant each, "a flat 25% and adds a fee on the student side too"). Not a rewrite of any: this is the Wyzant-only guide.
// Own angle: Wyzant has two fees on one lesson (25% from the tutor's rate, 9% on top for the student), so the tutor's real price to a student is the rate plus 9%; a worked table, the reverse formula (what to post to take home a number),
// the referral exception as Wyzant's own sanctioned way to keep 100%, the payout calendar read from the July 2025 page, what the fee does not cover, and what Wyzant's pages could not tell us (stated, not guessed).
// Links both ways with how-much-does-preply-take, online-tutoring-jobs, real-hourly-rate-for-tutors, do-tutors-have-to-pay-taxes, how-to-build-a-tutor-referral-program and how-to-find-an-online-tutor (T-1215, same day).
//
// Sources, read on 31 Oct 2026. Wyzant's help pages answered 403 to our script, so every Wyzant figure and rule below comes from the search result of the official page (the text the search showed from that page), not from the page opened in a browser:
//   Wyzant support, What is the fee structure for tutors listed on Wyzant: "All tutors will retain 75% of their posted hourly rate for lessons with students, minus any applicable taxes, and Wyzant will retain a 25% Platform Fee"; tutors approved to list agree to the Independent Tutor Agreement;
//     a tutor who refers a new student and takes lessons with that student receives 100% of the rate and the Platform Fee is not assessed on those lessons; students pay a 9% service fee and any applicable taxes.
//   Wyzant support, What is the service fee charged to students: 9% on each lesson, calculated on the total lesson cost (rate times length); it "helps us individually vet tutors" and covers the US-based support team; new students are told when they add payment information;
//     lesson cancellations are subject to the tutor's cancellation policy plus the 9% and any taxes.
//   Wyzant blog, Details about the tutor platform fee changes going into effect January 15, 2019 (December 2018): from a graduated scale of 40% down to 20% to a flat 25% for lessons submitted on or after 15 January 2019; tutors at 25% stayed there unless they crossed 400 lesson hours before that day;
//     tutors at 20% kept it for students they had taught before 15 January 2019 until 1 July 2019; the referral programme was unchanged; Wyzant said the change was not an increase in its take rate.
//   Wyzant support, Tutor Payment Policies, When will I be paid, Tutor Payment Schedule Update July 2025, How does direct deposit work: since 1 July 2025 all tutors are paid semimonthly on the 1st and 15th (or the next business day) for lessons submitted five days before the payment date;
//     lessons must be submitted within 14 days of the lesson; direct deposit is free; the bank may need 1 to 3 more business days; returned deposits are reissued on the 10th and 25th; payments over $50 in total need a Social Security Number (an EIN with a W-9 can be used for reporting) and are held until it is given;
//     direct payments (cash, cheque, money-sharing apps, PayPal invoices) are not permitted.
//   Wyzant support, Independent Tutor Agreement and Tutor tax information: tutors are independent contractors; Wyzant will not withhold income or payroll tax; Wyzant issues a Form 1099 when a tutor makes $600 or more in a calendar year and the Earnings page shows the yearly total; Wyzant cannot advise on filing.
//   Wyzant support, Tutor Referrals FAQs: invite through Wyzant Rewards (Toolkit menu, Invite Students) or the iOS app; a student met outside Wyzant still needs a free account and the lesson is submitted on Wyzant; the tutor keeps 100% of the rate and the student pays the 9% and any taxes;
//     a green check under "Referred Student" on the Student Connections page and the Pay column of the Lessons page show it was applied; contact support if it was not.
//   Wyzant support, How do I determine my cancellation policy and Can tutors change their hourly rates: a cancellation policy is optional; a policy may cover notice up to 36 hours; a fee cannot be assessed earlier than 30 minutes before the scheduled end of a lesson or more than fourteen days after it;
//     charging more than the cost of the session or requiring more than 36 hours' notice is described as abusive; tutors set their own rate and may change it; an existing student keeps the earlier rate for three months unless they agree.
//   Wyzant support, Background Check Policy: whoever orders the check pays $15.99; if one is bought on a tutor's profile the tutor must complete and pass it. Wyzant, How it works for tutors: listing is free and Wyzant does not accept payment for premium listings or top placement.
//   Wyzant support, What's the Good Fit Guarantee: for a first lesson with a new tutor the student can ask support for a refund of the first hour. The pages we saw do not say how a refund changes the tutor's payment: we say that, and do not guess.
// Not read, so not written: any rate for Preply or italki here (the Preply guide has them and a test keeps those figures on one note), Wyzant's rate range or average rates, how many students Wyzant sends, how its search ranks tutors, any approval rate,
// what "applicable taxes" means in the 75% sentence (the pages do not say), whether the 1099 threshold has changed in the tax law since the page was written.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: src/lib/plans.ts (Free $0, Pro $12/mo, Academy $29/mo; the Free plan allows 10 students, docs/features/T-1052-plans-one-list.md), 0% commission with payment through the tutor's own Stripe or PayPal account
// (the payment processor's own fee still applies), the tutor directory "opens soon" and lists no tutors (src/lib/directory.ts, DIRECTORY_OPENS_AT = 6). Tutafy sends no students and has no referral programme that pays a tutor.
// All names and sums in the examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const WYZANT_FEES_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'Wyzant keeps a flat 25% of a tutor\'s posted hourly rate, so you keep 75%. Its help pages say this has applied to every lesson submitted since 15 January 2019.',
    'Students pay a second fee: 9% on top of your rate. It does not come out of your pay, but it is part of your price. A lesson posted at $50 costs the student $54.50.',
    'A student you refer to Wyzant carries no platform fee, so you keep 100% of your rate on that student. The student still pays the 9%.',
    'To take home $40 an hour you must post $53.33, and the student then pays $58.13. Work the sum backwards before you set a rate.',
    'Wyzant pays by direct deposit on the 1st and 15th and does not allow payment outside the platform. Tutafy is not a marketplace: it sends no students and takes 0% commission.',
  ] },
  { type: 'p', text: `Wyzant takes 25% of a tutor's posted hourly rate and charges the student a further 9% service fee on top. Those are the two numbers on its own help pages, read on 31 October 2026. They are easy to find. What is harder to find is what they add up to for a real lesson, how the fee got to 25%, how to avoid it on students you bring yourself, and when the money reaches your bank.` },
  { type: 'p', text: `This guide is for tutors deciding whether to join Wyzant or to stay. It has a worked table, the formula for the rate to post, the referral exception, the payout calendar, the contractor tax rules and a comparison with working for yourself. Wyzant's pages answered 403 to our script, so each Wyzant figure comes from the search result of the official page, as the source note says. The names and sums in our examples are invented. Fees change, so read the current page before you decide.` },
  { type: 'image', src: '/blog/inline/wyzant-dollar-bills', alt: 'A one dollar bill lying on a pile of other one dollar bills, with the words In God We Trust and One Dollar visible on the back of the top note.', caption: 'Two fees sit on every Wyzant lesson.', credit: 'Photo: Pictures of Money (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:1_dollar_bill.jpg' },
  { type: 'h2', text: 'What Wyzant keeps from a lesson' },
  { type: 'p', text: `Wyzant's fee page for tutors says that all tutors keep 75% of their posted hourly rate for lessons with students, minus any applicable taxes, and that Wyzant keeps a 25% Platform Fee. Tutors who are approved to list agree to the Independent Tutor Agreement, which covers the payment policies and the fee. The current wording has no sliding scale: the same 25% applies to a new tutor and to one with ten thousand lessons.` },
  { type: 'p', text: `The student pays differently. Wyzant's help page says it charges students a 9% service fee each time they have a lesson, worked out on the total lesson cost, which is your rate multiplied by the length. So a lesson has two fees on it. The table shows what they do to three invented rates.` },
  { type: 'compare', caption: 'One-hour lessons at invented posted rates, with the 25% and 9% from Wyzant\'s help pages (31 Oct 2026). Our arithmetic.', headers: ['Your posted rate', 'Student pays (rate + 9%)', 'You keep (75%)', 'Wyzant keeps from your rate', 'Wyzant adds from the student', 'Wyzant in total', 'Share of the student\'s payment'], rows: [
    ['$30', '$32.70', '$22.50', '$7.50', '$2.70', '$10.20', '31.2%'],
    ['$50', '$54.50', '$37.50', '$12.50', '$4.50', '$17.00', '31.2%'],
    ['$80', '$87.20', '$60.00', '$20.00', '$7.20', '$27.20', '31.2%'],
    ['$50, a student you referred', '$54.50', '$50.00', '$0.00', '$4.50', '$4.50', '8.3%'],
  ] },
  { type: 'p', text: `Two things follow. The share is the same at every rate, because both fees are percentages: 25% plus 9% of the rate is 34% of the rate, and 34 divided by 109 is 31.2% of what the student pays. And you are paid 75% of the rate you posted. The 9% is a charge on top that the student sees and you do not receive. A tutor who says "Wyzant takes 25%" is right, and a student who says "Wyzant costs me 9% more" is right too.` },
  { type: 'callout', variant: 'info', title: 'What "minus any applicable taxes" means', text: `The fee page does not say which taxes. The Independent Tutor Agreement says Wyzant will not withhold income or payroll tax. We could not tell from the pages whether any tax is taken from a payment, so check a real lesson on your Earnings page before you rely on the 75%.` },
  { type: 'h2', text: 'How the fee got to a flat 25%' },
  { type: 'p', text: `Older blog posts and a few answers on the web describe percentages that fall as a tutor teaches more hours. That was true until 2019. Wyzant announced in December 2018 that from 15 January 2019 it would replace a graduated scale, which ran from 40% down to 20%, with a flat 25% on lessons submitted on or after that day.` },
  { type: 'p', text: `The announcement set out what happened to each group. Tutors on higher tiers moved to 25% for all students. Tutors already at 25% stayed there, unless they crossed 400 lesson hours before 15 January 2019, in which case they went to 20%. Tutors at 20% kept that rate for students they had taught before the cut-off until 1 July 2019, after which the flat 25% applied to everyone. The referral programme did not change. Wyzant described the change as not an increase in its take rate. That is its own account, and we report it as that.` },
  { type: 'p', text: `The effect depended on who you were: a tutor on the highest fee tier paid less after the change, and one who had worked down to 20% paid more. Nobody joining today lives with the old scale. If a page gives you a percentage that moves with your hours, it describes the time before 2019, or another platform. The help center says flat, and the help center is the page to trust.` },
  { type: 'h2', text: 'The 9% student fee: not your money, still your price' },
  { type: 'p', text: `The service fee is charged to the student after each lesson. Wyzant says it helps vet tutors, so that only tutors with the most experience and subject expertise are listed, and that it pays for the US-based support team. New students are told about it when they add payment information. It also applies to a cancellation, on top of whatever fee your own cancellation policy charges.` },
  { type: 'p', text: `For you it has three effects. Your lesson costs more than the number on your profile, so a student comparing you with a tutor elsewhere sees your rate and then, at checkout, a higher figure. It is paid on every lesson, including one with a student you referred. And it is not yours to waive, discount or absorb. If you compete on price, set your rate with the extra 9% in mind. If students choose you on evidence and fit, it will matter less than your profile.` },
  { type: 'h2', text: 'Work the sum backwards: what to post to take home what you want' },
  { type: 'p', text: `Most tutors pick a rate they like and then discover what it leaves. Start from the number you want in your hand. Divide it by 0.75 to find the rate to post, then multiply by 1.09 to see what the student pays.` },
  { type: 'compare', caption: 'The rate to post to take home a target, for a student who finds you on Wyzant. Invented targets.', headers: ['You want to take home', 'Post this rate (target divided by 0.75)', 'The student pays (post times 1.09)', 'Post a whole-dollar rate instead', 'Then you take home'], rows: [
    ['$30.00 an hour', '$40.00', '$43.60', '$40', '$30.00'],
    ['$40.00 an hour', '$53.33', '$58.13', '$54', '$40.50'],
    ['$50.00 an hour', '$66.67', '$72.67', '$67', '$50.25'],
  ] },
  { type: 'p', text: `The student pays $58.13 for a tutor who clears $40. That gap, $18.13, is the price of being found. The question for every tutor is whether the student would have found you without it.` },
  { type: 'p', text: `A month makes the same point. Take an invented tutor, Maya, who teaches 20 one-hour lessons a month at a posted $50. Wyzant keeps $250 and she takes home $750, not the $1,000 on her profile. Our guide to your real hourly rate takes it further: divide by every hour you work, not only the hours you teach.` },
  { type: 'image', src: '/blog/inline/wyzant-headphones-laptop', alt: 'A pair of black over-ear headphones with silver ear cups resting on the keyboard of an open laptop, with a mountain landscape on the screen.', caption: 'You are paid for lesson hours, not preparation hours.', credit: 'Photo: Álvaro Bernal (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Macro_headphones_laptop_(Unsplash).jpg' },
  { type: 'h2', text: 'Students you refer: the route to 100%' },
  { type: 'p', text: `Wyzant has one sanctioned way to avoid the 25%. Its referral page says that when a new student creates a Wyzant account and takes lessons with the tutor who referred them, that tutor receives 100% of their rate and the Platform Fee is not assessed on those lessons. The student still pays the 9% and any taxes. The table's last row shows it: on a $50 lesson, Wyzant keeps $4.50 and you keep $50.` },
  { type: 'p', text: `To send a referral, open Wyzant Rewards from the Toolkit menu, choose Invite Students and invite by email, through your network or by text. The page says the rule also covers a student you know from outside Wyzant: the student needs a free Wyzant account, and you submit the lesson on Wyzant. After the first lesson, look for a green check under "Referred Student" on your Student Connections page and check the Pay column on your Lessons page. If the referral was not applied, contact support.` },
  { type: 'p', text: `Run Maya's month again. If six of her 20 lessons are with students she referred, she takes home $300 on those six and $525 on the other fourteen: $825, which is $75 more. That is small for one tutor, but it grows with each student who stays, and it is Wyzant's clearest answer to "how do I stop paying 25% on students I brought myself".` },
  { type: 'callout', variant: 'warn', title: 'What the referral rule does not do', text: `It does not move the lesson off Wyzant. The student, the lesson record, the payment and the 9% all stay on the platform, and you stay bound by its payment rules. It lowers the fee on one student. It does not give you the student's contact details outside Wyzant's messages, or their payment. For that you need your own booking page.` },
  { type: 'h2', text: 'When the money reaches your bank' },
  { type: 'p', text: `Wyzant pays tutors by direct deposit and, in the pages we saw, by no other method. Direct deposit is free. Since 1 July 2025 every tutor is paid semimonthly: on the 1st and the 15th of each month, or the next business day when that falls on a weekend or a bank holiday. A payment covers lessons submitted five days before the payment date.` },
  { type: 'p', text: `Two more limits apply. A lesson has to be submitted within 14 days of the day it was taught, and an older lesson cannot be submitted at all. And once a payment leaves Wyzant, your bank may take one to three more business days to show it. The table shows four invented lessons in November 2026. It is our reading of the page, not a promise, so read your own Payments page for the real date.` },
  { type: 'compare', caption: 'Four invented lessons and the dates the July 2025 wording implies. 1 and 15 November 2026 are Sundays, so those payments run on Monday.', headers: ['Lesson taught and submitted', 'Counts for the payment of', 'Paid out on', 'Could show in your bank by'], rows: [
    ['Wed 4 Nov', '15 Nov', 'Mon 16 Nov', 'Thu 19 Nov'],
    ['Mon 9 Nov', '15 Nov', 'Mon 16 Nov', 'Thu 19 Nov'],
    ['Thu 12 Nov (after the cut-off)', '1 Dec', 'Tue 1 Dec', 'Fri 4 Dec'],
    ['Taught Fri 30 Oct, submitted Fri 13 Nov', '1 Dec', 'Tue 1 Dec', 'Fri 4 Dec'],
  ] },
  { type: 'p', text: `Two details catch tutors out. A returned deposit is reissued on the 10th and 25th, and you must update your bank details at least two business days before a payment date to make the next run. And once your payments pass $50 in total, Wyzant needs a valid Social Security Number: payments are withheld until you give it, then released with the next scheduled payment. An EIN can be used instead for reporting, with an IRS Form W-9. If you teach from outside the US, the pages we read did not say what applies to you, so ask Wyzant support first.` },
  { type: 'image', src: '/blog/inline/wyzant-monthly-schedule', alt: 'An open paper monthly planner lying on a wooden desk, with a grid of days and a few handwritten notes.', caption: 'Two payment dates a month: plan cash flow around them.', credit: 'Photo: Eric Rothermel (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Monthly_schedule_(Unsplash).jpg' },
  { type: 'h2', text: 'What the fee does not cover, and what else the rules say' },
  { type: 'p', text: `The rules around a flat share are where tutors get surprised. These are the ones on Wyzant's pages that touch your income.` },
  { type: 'ul', items: [
    `Listing is free. Wyzant's page for tutors says listing costs nothing and that Wyzant does not accept payment for premium listings or top placement. We found no monthly subscription for tutors.`,
    `Background checks. Whoever orders the check pays $15.99. Wyzant does not require one at sign-up, but a student or parent can order one on a tutor, and then the tutor must complete and pass it to keep using the platform.`,
    `Payment outside Wyzant is not allowed. The agreement says a tutor will not seek or receive payment for services directly from students, and the payment help page names cash, cheques, money-sharing apps and PayPal invoices. A student may tip you after a lesson, outside Wyzant.`,
    `Cancellation fees have limits. A policy is optional. The page says it may cover notice of up to 36 hours, that a fee cannot be assessed earlier than 30 minutes before the scheduled end of a lesson or more than 14 days after it, and that charging more than the cost of the session or demanding more than 36 hours' notice counts as abusive. Tell students the policy before you start.`,
    `Rate changes. You set your own rate and may change it at any time. A student who contacted you at the old rate keeps it for three months unless they agree to the new one.`,
    `The Good Fit Guarantee. For a first lesson with a new tutor, a student can ask support for a refund of the first hour. The pages we saw do not say how that changes your payment, so ask before you assume you are paid for a first lesson.`,
  ] },
  { type: 'p', text: `That last point decides whether a fee is fair, and it is not on the fee page. When you compare platforms, ask what happens to your pay on a refunded first lesson, a no-show and a dispute, not only what percentage is taken on a normal lesson.` },
  { type: 'h2', text: 'Taxes: you are a contractor' },
  { type: 'p', text: `Wyzant's agreement makes tutors independent contractors. It says Wyzant will not hold back any part of your fees for income tax or payroll tax, and that you are responsible for the taxes due. Wyzant's tax page says it issues a Form 1099 whenever a tutor makes $600 or more in a calendar year, and that your yearly total is on the Earnings page even when no form is produced. It cannot help with filing questions and tells you to ask a tax professional.` },
  { type: 'p', text: `Tax thresholds change and a help page can lag the law, so check the IRS before you rely on the $600 figure. We do not say how the 25% is treated on your return, which depends on your situation. Our guide to tutor taxes explains the US forms, the UK trading allowance and the records to keep. It is general information, not tax advice.` },
  { type: 'h2', text: 'Wyzant beside Preply, italki and your own business' },
  { type: 'p', text: `A fee only means something next to its alternatives. We keep the Preply and italki figures in one place, our Preply commission guide, with the day they were checked. Here the comparison is how each route charges, not only how much.` },
  { type: 'compare', caption: 'How the three marketplaces charge, in words. The Preply and italki figures are in our Preply commission guide. The Wyzant details are from the pages read on 31 Oct 2026.', headers: ['', 'Wyzant', 'Preply', 'italki', 'Your own booking page'], rows: [
    ['What shape the tutor\'s fee has', 'One flat percentage of your posted rate', 'A sliding percentage that falls as hours grow, plus the first trial lesson kept', 'A percentage that depends on the lesson type', 'No platform percentage. The payment processor still charges its own fee'],
    ['Does the student pay a fee on top?', 'Yes, a 9% service fee', 'Read its own pages', 'Read its own pages', 'Only what you set'],
    ['A way to keep your whole rate on a student', 'Refer them: 100% of your rate, the student pays the 9%', 'Not covered here', 'Not covered here', 'Every student you book yourself'],
    ['Does it find you students?', 'It lists you, and listing is free', 'It lists you', 'It lists you', 'No. You bring them'],
  ] },
  { type: 'p', text: `The row to look at is the third. Wyzant publishes a rule for keeping your whole rate on a student you bring. We did not look for an equivalent on the other platforms, so we do not say whether one exists. On a student Wyzant finds for you, the 25% is fixed. Our Preply commission guide and our piece on marketplaces against independent work do the same sums for those routes.` },
  { type: 'h2', text: 'Is 25% worth it? Two invented tutors' },
  { type: 'p', text: `Whether the fee is worth paying depends on what you would do without it. These two tutors are invented, and the point is the reasoning, not the numbers.` },
  { type: 'h3', text: 'Sam has no students and a degree in chemistry' },
  { type: 'p', text: `Sam has taught nobody for money and has no website, no audience and no budget for advertising. A marketplace gives Sam what is hard to build alone: people searching for a chemistry tutor today. Paying 25% to be found is a fair price while the alternative is no lessons. Sam should treat the fee as a cost of getting started, set a rate that still pays at 75%, and invite friends and classmates through the referral link, so that the second year costs less than the first.` },
  { type: 'h3', text: 'Dev has twelve students and a waiting list' },
  { type: 'p', text: `Dev has built a name locally and takes students by word of mouth. On Wyzant, every lesson with a new student costs a quarter of Dev's rate. Dev's choice is not "Wyzant or nothing". It is whether Wyzant still brings students Dev could not get otherwise. If Dev does not need new students, the fee buys nothing. If Dev does, the referral rule lowers the cost on the ones Dev brings to Wyzant, and students Dev finds elsewhere can book on Dev's own page, where no percentage is taken.` },
  { type: 'p', text: `The test is the same for both. Count the students you could not have found yourself and price those at 75% of your rate. For every other student, ask whether they would have come to you anyway, and bring them through a route that costs less. Our guides to getting your first ten students and to leaving a marketplace give the steps.` },
  { type: 'h2', text: 'Working for yourself, and what Tutafy does and does not do' },
  { type: 'p', text: `If you already have students, or will find them, you can teach with no platform percentage. The trade is that you do the finding, booking, reminding and collecting yourself. Tutafy is a set of tools for that: a public booking page that shows your free hours in the student's time zone, a video classroom in the browser, email reminders, student records and payment through your own Stripe or PayPal account, with 0% commission. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29.` },
  { type: 'ul', items: [
    `Your payment processor still charges its own fee, so read the Stripe or PayPal page for the current figure before you work out your take-home.`,
    `Tutafy does not find you students. The tutor directory is not open yet: its page says it opens once six tutors are ready, and it lists none today.`,
    `Tutafy has no referral programme that pays tutors, does not check qualifications and does not guarantee that a student pays, shows up or stays.`,
    `If you teach on Wyzant, follow its rules. Read the Independent Tutor Agreement before you point a Wyzant student at a booking page. We do not give legal advice and we do not suggest breaking an agreement.`,
  ] },
  { type: 'p', text: `A sensible pattern for many tutors is both: use a marketplace to find first students while you are new, and bring the students you find elsewhere to your own page.` },
  { type: 'h2', text: 'Mistakes tutors make with the Wyzant fee' },
  { type: 'ul', items: [
    `Quoting the 25% and forgetting the 9%. A student sees $54.50 for your $50, and you must be able to explain it.`,
    `Setting a rate from what you want on the profile instead of what you want in your bank. Divide by 0.75 first.`,
    `Expecting weekly pay. Pay is twice a month, with a cut-off and a bank delay.`,
    `Leaving the Social Security Number or EIN step until a payment is held.`,
    `Taking payment outside Wyzant from a student you met there. The agreement forbids it, and Wyzant's safety page warns it can end in the closure of your account.`,
  ] },
  { type: 'source', text: 'Wyzant pages used here, read on 31 Oct 2026. They answered 403 to our script, so each figure comes from the search result of the official page, not the page opened in a browser. Read the current page before you decide.', links: [
    { label: 'Wyzant: fee structure for tutors', href: 'https://support.wyzant.com/tutors/tutor-payments/what-is-the-fee-structure-for-tutors-listed-on-wyzant/' },
    { label: 'Wyzant: service fee charged to students', href: 'https://support.wyzant.com/tutors/tutor-payments/what-is-the-service-fee-charged-to-students/' },
    { label: 'Wyzant blog: fee changes from 15 January 2019', href: 'https://www.wyzant.com/blog/tutor/platform-fee-changes/' },
    { label: 'Wyzant: tutor payment policies', href: 'https://support.wyzant.com/tutors/tutor-payments/tutor-payment-policies/' },
    { label: 'Wyzant: payment schedule update, July 2025', href: 'https://support.wyzant.com/tutors/tutor-payments/tutor-payment-schedule-update-july-2025/' },
    { label: 'Wyzant: direct deposit', href: 'https://support.wyzant.com/tutors/tutor-payments/how-does-direct-deposit-work/' },
    { label: 'Wyzant: tutor referrals FAQs', href: 'https://support.wyzant.com/tutors/referrals-for-tutors/tutor-referrals-faqs/' },
    { label: 'Wyzant: Independent Tutor Agreement', href: 'https://support.wyzant.com/tutors/tutor-account/independent-tutor-agreement/' },
    { label: 'Wyzant: tax information', href: 'https://support.wyzant.com/tutors/tutor-payments/how-do-i-obtain-information-to-file-my-taxes/' },
    { label: 'Wyzant: cancellation policy', href: 'https://support.wyzant.com/tutors/tutor-account/how-do-i-determine-my-cancellation-policy/' },
    { label: 'Wyzant: changing your hourly rate', href: 'https://support.wyzant.com/hc/en-us/articles/208602126-Can-tutors-change-their-hourly-rates' },
    { label: 'Wyzant: background check policy', href: 'https://support.wyzant.com/tutors/tutor-account/background-check-policy/' },
    { label: 'Wyzant: Good Fit Guarantee', href: 'https://support.wyzant.com/students-parents/lessons/whats-the-good-fit-guarantee/' },
    { label: 'Wyzant: how it works for tutors', href: 'https://www.wyzant.com/howitworks/tutors' },
    { label: 'Wyzant: tutor safety', href: 'https://support.wyzant.com/tutors/messaging/some-straight-talk-about-tutor-safety/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How much does Preply take from tutors?', href: '/blog/how-much-does-preply-take', text: 'The same questions for Preply, with the figures and the day checked.' },
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'What each platform keeps or pays, and who can apply.' },
    { label: 'Your real hourly rate as a tutor', href: '/blog/real-hourly-rate-for-tutors', text: 'Divide what you keep by every hour you work.' },
    { label: 'Tutor taxes', href: '/blog/do-tutors-have-to-pay-taxes', text: 'Contractor income, 1099 forms and records.' },
    { label: 'How to get your first 10 tutoring clients', href: '/blog/get-your-first-tutoring-clients', text: 'Where students come from when no marketplace sends them.' },
    { label: 'How to find a good online tutor', href: '/blog/how-to-find-an-online-tutor', text: 'The student\'s side: ten checks before the first lesson.' },
  ] },
  { type: 'faq', items: [
    { q: 'How much does Wyzant take from tutors?', a: `Wyzant keeps a flat 25% Platform Fee, so the tutor keeps 75% of their posted hourly rate. Its help pages say the flat rate has applied to lessons submitted since 15 January 2019. Students pay a separate 9% service fee on top, which does not come out of the tutor's pay.` },
    { q: 'Do Wyzant students pay a fee too?', a: `Yes. Wyzant charges students a 9% service fee on each lesson, worked out on the total lesson cost. A lesson posted at $50 costs the student $54.50. It applies to cancellations and to lessons with a student the tutor referred.` },
    { q: 'How do I avoid the Wyzant fee?', a: `Wyzant's own rule is the referral route: when a new student you referred takes lessons with you, you keep 100% of your rate and the Platform Fee is not assessed. The student still pays the 9%. Payment outside Wyzant is not permitted, so being paid directly is not a way around the fee.` },
    { q: 'How often does Wyzant pay tutors?', a: `Since 1 July 2025 Wyzant pays all tutors by direct deposit on the 1st and 15th of each month, or the next business day, for lessons submitted five days before the payment date. Lessons must be submitted within 14 days, and your bank may take up to three more business days.` },
    { q: 'How much should I post to take home $40 an hour on Wyzant?', a: `Divide 40 by 0.75 to get $53.33. The student then pays $58.13 with the 9% service fee. Post a whole-dollar $54 and you take home $40.50. On a student you referred you would keep the whole $54.` },
    { q: 'Is Tutafy a Wyzant alternative?', a: `Not as a marketplace. Tutafy does not send you students and its tutor directory is not open yet. It is a booking page, video classroom, reminders and payment tool for tutors who bring their own students, with 0% commission and a Free plan for up to 10 students.` },
  ] },
  { type: 'cta', title: 'Got your own students? Keep the whole rate', text: 'Put them on one booking page with reminders, a built-in video classroom and payment through your own account. The Free plan covers up to 10 students. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start.', button: 'Start free, no credit card', href: '/register' },
]
