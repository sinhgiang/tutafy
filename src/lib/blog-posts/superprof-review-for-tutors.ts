// T-1236. Article body for /blog/superprof-review-for-tutors (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1610-tutafy-batch3-10-articles-plan.md, article 1 (calendar day 13 Nov 2026). Cluster: "superprof" (18,100 searches a month, difficulty 33; OpenSEO, 31 Oct 2026).
// Step 0 (31 Oct 2026): the first page of results for "superprof" and "superprof review" is Superprof's own pages, Trustpilot and review-site pages, vendor blogs that sell a rival product and "how to become a tutor" career pages.
// Almost all of it is written for the STUDENT (what the pass costs) or is a one-line summary for tutors ("free to list, 10% if you use their payments"). Nobody puts the tutor's own arithmetic next to it, and nobody says that Superprof's own pages disagree with each other.
// On this site Superprof appears only in passing: a table row in online-tutoring-jobs (fees "not confirmed"), one-line mentions in preply-alternatives-for-tutors and marketplace-vs-independent-the-real-math, and a section in tutafy-vs-alternatives.
// Two of those older lines call it a "pass model" with "lead quality varies" and have no figures. This guide does not repeat them: it is the one place where the tutor side of Superprof is worked through.
// Own angle: what Superprof's pages say, page by page, with the dates; where they contradict each other and why that matters to a tutor's pay; a 60-day test the tutor runs on their own ad (cost per regular student); and how it compares with a marketplace and with a page of your own.
// Links both ways with online-tutoring-jobs, wyzant-fees-for-tutors, how-much-does-preply-take, marketplace-vs-independent-the-real-math, real-hourly-rate-for-tutors, how-to-write-a-tutor-bio and get-your-first-tutoring-clients.
//
// Sources, read on 31 Oct 2026 (Superprof blog pages, opened by a script; two help pages answered 403):
//   superprof.com/blog/how-superprof-works/ (US, 4 Mar 2025): profile free, up to 5 ads, no subscription for any tutor, a Premium Pass for a fee gives higher visibility, no commission on lesson or pack funds and statistics; verifiable credentials before a profile goes live;
//     tutor contact details are not sent to students until the tutor accepts a lesson request; 72 hours to answer a request; no penalty for declining; two ways to be paid, off-platform or online; funds show on the Superprof balance once the request is accepted and 24 hours after the lesson; PayPal is the only payout method on Superprof US; Student Pass $49 a month.
//   superprof.com/blog/charges-payments-superprof/ (US, 27 Feb 2025, staff replies to 2026): Student Pass $49 a month, needed to contact tutors, unlimited tutors, covers contact only; the only time Superprof charges tutors is when lessons and payments run through the platform, a 10% processing fee; tutors may take payment by Venmo, Zelle or PayPal and avoid it; communication may leave the platform.
//   superprof.co.uk/blog/charges-payments-superprof/ (UK, 17 Sep 2025): Student Pass 39 pounds a month, lasts 30 days; no fee to join or list; 10% processing fee if the tutor filters payments through the platform, no mandate to do so; tutors keep 100% when handling payments independently; a staff comment says the fee is charged at sign-up.
//   superprof.com/blog/students-and-superprof/ (US, 3 Mar 2026): "We don't take a commission on tutors' lessons"; the pass renews automatically; cancel any time.
//   superprof.co.uk/blog/superprof-vs-preply/ (UK, 30 Dec 2025): "Superprof doesn't charge tutors a commission"; profile quality, responsiveness and reviews influence exposure.
//   Not read: the tutor payment help page (403) and the tutor sign-up page (403), so payout minimums, payout fees and withdrawal timing are NOT stated here. Reviews: search-result summaries of Trustpilot and Verified Reviews pages only (we did not open them).
//   Premium price: no Superprof page we could read states it. Third-party pages give figures that disagree (69 pounds or euros a year in the UK and Italy; 99 dollars a year quoted in a staff reply as summarised by our reader; a monthly figure on a career-advice site). We give no price.
// Platform rates for Preply and italki come from src/lib/marketplace-rates.ts (RATES_SOURCE, which a test keeps equal on every page); Wyzant's from wyzant-fees-for-tutors (read 31 Oct 2026).
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: tutafy.com/tutors says "The tutor directory opens soon" and lists no tutors (src/lib/directory.ts); Tutafy sends no students; 0% commission; Free plan 10 students, Pro $12 a month, Academy $29 (src/lib/plans.ts).
// All names and examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'
import { RATES_SOURCE } from '@/lib/marketplace-rates'

export const SUPERPROF_REVIEW_CONTENT: PostBlock[] = [
  { type: 'p', text: `Superprof is a tutor directory where the student pays a monthly pass to message tutors, and the tutor lists for free. A tutor pays nothing to be listed. A tutor who takes lesson payments through Superprof pays a 10% processing fee, according to two of its pages, while two other pages say it takes no commission at all. That disagreement is the main thing a tutor needs to know, and it is why we wrote this guide from Superprof's own pages, with the dates, instead of from a summary.` },
  { type: 'p', text: `We read five Superprof pages on 31 October 2026. They are blog posts and staff replies in comment threads, not a contract, and two help pages that would settle some points answered 403 to our script. So this is a review of what the company says, plus the arithmetic to run before you spend time on an ad. Nobody outside Superprof can say how many students it will send you, and we show below how to find out yourself in 60 days.` },
  { type: 'takeaways', items: [
    `Listing is free. The US page says you can upload up to 5 ads and that no tutor pays a subscription.`,
    `Students pay $49 a month in the US (39 pounds in the UK) to contact tutors, and that fee covers contact only, not lessons.`,
    `The 10% fee applies, by the pages that mention it, only when the lesson is paid through Superprof. The pages disagree on whether any commission exists at all.`,
    `The honest test is cost per regular student over 60 days. The table below shows what to count.`,
  ] },
  { type: 'h2', text: 'What Superprof is, in plain words' },
  { type: 'p', text: `Superprof is a directory of tutors and teachers. A student searches by subject and place, reads ads, and sends a lesson request to a tutor. To send it, the student needs a Student Pass, which is a subscription. The lesson price is separate, and the tutor sets it. In this respect Superprof differs from a marketplace such as Preply or Wyzant, which charges the tutor a share of each lesson and holds the booking and the payment. Superprof's main charge falls on the student, and it comes before any lesson.` },
  { type: 'p', text: `That structure explains most of what tutors report. The tutor's side is cheap to join, so ads are plentiful. The student's side has a price on every inquiry, so a student who writes to you has already paid to do it. That filters out some casual browsers, and a student who only wants two or three lessons may decide the pass is not worth it. Both effects reach you as the number of requests, not as a fee.` },
  { type: 'image', src: '/blog/inline/superprof-hands-keyboard', alt: 'Two hands on a laptop keyboard seen from above, with a phone, a wallet and a camera lens on a wooden desk.', caption: 'Illustrative photo, not a Tutafy user. A free ad costs you time, not money, and you write it once.', credit: 'Photo: Fabian Irsara (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Hands_on_a_laptop_keyboard_(Unsplash).jpg' },
  { type: 'h2', text: 'How it works for a tutor, step by step' },
  { type: 'ul', items: [
    `You create a profile. Superprof's US page says it is free and that you can upload up to 5 ads. Its UK page says there is no fee to join or list.`,
    `You upload credentials. The US page says tutors must upload verifiable credentials before the platform lets a profile go live. It does not say what counts, so read the sign-up screen.`,
    `A student finds an ad and sends a lesson request. The student has paid for the pass to be able to do this.`,
    `You get the request. The US page says your contact details are not passed to the student until you accept, that you have up to 72 hours to respond, and that there is no penalty for declining.`,
    `You accept, agree a time and a price, and teach. Many tutors give a free first lesson. The UK page says tutors are encouraged but not required to, and the US page says only that many do.`,
    `You are paid in one of two ways: directly by the student, outside Superprof, or through Superprof's online payment.`,
  ] },
  { type: 'p', text: `The request is the step tutors tend to underrate. A 72-hour window is long enough for a student to write to five tutors, pick the first who replies and forget the other four. Reply speed is part of your pay. Superprof's UK comparison page says profile quality, responsiveness and reviews influence an ad's exposure, so replying fast helps twice.` },
  { type: 'h2', text: 'What Superprof costs a tutor' },
  { type: 'p', text: `Here is every charge we found on a tutor, set against what the page said and the date of the page. Where a page is silent, the cell says so.` },
  { type: 'compare', caption: 'Charges on a tutor, from Superprof pages read on 31 Oct 2026. "Not stated" means the pages we could read do not say.', headers: ['Item', 'What the pages say', 'Page and date'], rows: [
    ['Joining and listing', 'Free. Up to 5 ads (US). No fee to join or list (UK).', 'US how it works, 4 Mar 2025; UK charges, 17 Sep 2025'],
    ['Monthly subscription for tutors', 'None. "There is no subscription fee required for any tutor."', 'US how it works, 4 Mar 2025'],
    ['Commission when you are paid outside Superprof', 'None. You may use Venmo, Zelle or PayPal, and the processing fee is avoided.', 'US charges, 27 Feb 2025'],
    ['Fee when you are paid through Superprof', '10% processing fee. A US page also says there is no commission on tutors\' lessons.', 'US and UK charges; US students, 3 Mar 2026'],
    ['Premium', 'Optional. Gives your ads higher visibility, no commission on lesson or pack funds, and statistics. The price is not stated on the pages we read.', 'US how it works, 4 Mar 2025'],
    ['Taking money out', 'Funds show on your Superprof balance after you accept the request and 24 hours after the lesson. PayPal is the only payout method on Superprof US. Minimum, fees and timing: not stated.', 'US how it works, 4 Mar 2025'],
  ] },
  { type: 'p', text: `So the cost of being on Superprof can be zero, if you list for free and take payment yourself. The cost rises to 10% of a lesson if you let Superprof process the payment, and it rises by an unknown subscription if you buy Premium. Everything else in this guide is about whether the leads justify any of that.` },
  { type: 'h2', text: 'The commission question: five pages, three answers' },
  { type: 'p', text: `Read in the order we found them, the pages give three different answers to one question: does Superprof take a cut of a tutor's lessons?` },
  { type: 'ul', items: [
    `Yes, 10%, but only on lessons paid through Superprof. The US and UK charges pages say this. The US page: "The only time Superprof charges tutors is if they conduct lessons and payments through the Superprof platform." The UK page says there is "no mandate for any tutor to do so".`,
    `No. The US students page, dated 3 March 2026, says "We don't take a commission on tutors' lessons." The UK comparison with Preply, dated 30 December 2025, says "Superprof doesn't charge tutors a commission."`,
    `Not if you pay for Premium. The US how-it-works page lists, as a Premium benefit, "No commission on the funds from your lesson or packs". That sentence only makes sense if a commission exists for a tutor without Premium.`,
  ] },
  { type: 'p', text: `These can be reconciled. A reading that fits all five pages is this: Superprof charges no commission on lessons you arrange and are paid for yourself, it charges a 10% processing fee if you use its payment tool, and Premium removes that fee. Pages for students may say "no commission" because, for a student who pays the tutor directly, that is true. We think that is the most likely reading, but it is our reading. The screen where you accept the first lesson is the one that binds, so check it.` },
  { type: 'callout', variant: 'warn', title: 'Before you accept your first lesson', text: `Find the line on the lesson screen that shows what you will be paid after fees, or ask support in writing which fee applies to this lesson and keep the answer. These pages are blog posts and comments. They can change without notice, and none of them is the terms of service.` },
  { type: 'p', text: `For the numbers, take a lesson priced at $40. If it is paid outside Superprof, you receive $40 before whatever the payment app charges you. We did not check any payment app's fees, so the sums here leave them out. If it is paid through Superprof with the 10% fee, you receive $36. Over 30 lessons that is $120 less, the price of three lessons. It is worth paying for something real. Payment protection, a record and not having to chase a student are all real. Whether they are worth $4 a lesson to you is your decision, not ours.` },
  { type: 'image', src: '/blog/inline/superprof-piggy-bank', alt: 'A small pink clay piggy bank facing the camera on a white background.', caption: 'Illustrative photo, not a Tutafy user. Ten percent of a $40 lesson is $4.', credit: 'Photo: Fabian Blank (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Cute_piggy_bank_(Unsplash).jpg' },
  { type: 'h2', text: 'What the student pays, and why it is your problem too' },
  { type: 'p', text: `The Student Pass is $49 a month in the US on the pages dated 27 February 2025, 4 March 2025 and 3 March 2026. The UK page dated 17 September 2025 says 39 pounds a month and that the pass lasts for 30 days. All pages say it covers contact only. It renews automatically. The student can cancel at any time and still reach tutors already contacted.` },
  { type: 'p', text: `The pages disagree about when the student is billed. One US page says the subscription activates when the tutor replies to the message. Another says it goes live once the student initiates contact. A third says payment is fully processed only after a tutor accepts the first lesson request. A staff comment on the UK page, from September 2024, says the fee is charged at sign-up whether or not a tutor accepts. Which of these is right today we cannot say. It matters because the student's feeling about the fee shapes whether you get a lesson. A student who thinks they were charged before anyone answered is more likely to go away.` },
  { type: 'p', text: `Here is how that shows up in your numbers, with invented figures. A parent wants eight math lessons at $40. That is $320 in lessons, plus $49 for the pass in the first month, so the parent pays $369 and the pass is about 13% of the bill. A parent who wants two lessons pays $80 plus $49, and the pass is 38% of the bill. The shorter the engagement, the heavier the pass. Tutors whose subject is ongoing, such as a weekly language lesson or exam preparation over months, face a lighter pass. Tutors whose subject is a one-off fix, such as help with a single assignment, face a heavy one.` },
  { type: 'h2', text: 'How leads reach you, and what we do not know' },
  { type: 'p', text: `The pages describe a request, not a lead list. A student writes to you about a lesson; you decide. There is no bidding and no per-lead price on the tutor's side, which is a real difference from lead-selling sites. The US page says funds from an accepted lesson appear on your Superprof balance 24 hours after the lesson, and that PayPal is the only way to receive them on Superprof US. If PayPal is not available where you live, ask before you invest in the profile.` },
  { type: 'p', text: `What we do not know is the number you most want: how many requests an ad gets. No Superprof page we read gives one. The pages say responsiveness, profile quality and reviews influence exposure and Premium gives higher visibility, but not what any of that is worth in requests. Treat any figure you read elsewhere, including a tutor saying they get "ten requests a week", as one person's result in one subject and one city.` },
  { type: 'h2', text: 'What tutors say about it' },
  { type: 'p', text: `We did not open the review pages. We read search-result summaries of Trustpilot and Verified Reviews pages for the US, UK and Australian sites, so take this as a sketch and read the pages yourself.` },
  { type: 'ul', items: [
    `Tutors who report steady inquiries tend to praise how easy it is to use and how fast support replies. One said they mostly get high-quality leads.`,
    `Other tutors report modest results: a few leads that came through, two active students, and leads that never went beyond first contact.`,
    `Some say a paid membership was worth it because it removed the per-lesson fee. One found the ad hard to see without paying.`,
    `Students complain about cost more than tutors do, mostly that the pass fee was unclear or that they paid and the tutor did not reply.`,
  ] },
  { type: 'p', text: `That mix is what you would expect from a free-to-list directory. Results vary by subject, by place and by how fast you answer, and only the last is yours to control.` },
  { type: 'h2', text: 'The 60-day test: is Superprof worth it for you?' },
  { type: 'p', text: `Instead of asking whether Superprof is good, ask whether it is good for your subject, at your price, in your hours. You can find out in 60 days with a notebook. Create one ad, take payments outside the platform if you are happy to, and count.` },
  { type: 'compare', caption: 'What to count in 60 days. Fill in your own numbers. The example column is invented.', headers: ['Count', 'How', 'Example'], rows: [
    ['Requests received', 'Every message that asks for a lesson', '14'],
    ['Replied within 2 hours', 'Count the ones you answered fast', '11'],
    ['First lessons booked', 'Requests that became a booked first lesson', '6'],
    ['Regular students after 4 weeks', 'Students who booked a second and a third lesson', '3'],
    ['Unpaid hours', 'Writing the ad, replying, free first lessons, chasing', '18'],
    ['Paid lesson hours', 'Lessons taught to those students in the 60 days', '18'],
    ['Money you paid', 'Fees, Premium if you bought it', '$0'],
    ['Income', 'Lesson fees from those students, at $40 an hour', '$720'],
  ] },
  { type: 'p', text: `Now do two sums. First, the conversion: 14 requests became 3 regular students, about 21%. Second, the real rate: $720 less $0 in fees, divided by all 36 hours, paid and unpaid, is $20 an hour, half of the $40 you charge. Our guide to a tutor's real hourly rate shows the method. Run the same sums on another channel, say a booking link you share in two local groups, and compare.` },
  { type: 'p', text: `Do not count a request from a student you already knew; it would have found you anyway. And do not judge on a shorter window: a new ad has no reviews yet, and 60 days gives it a fair first look without committing a year.` },
  { type: 'image', src: '/blog/inline/superprof-planner-notebook', alt: 'An open diary with blank lined pages on a wooden desk, with colored pencils and a pair of glasses beside it.', caption: 'Illustrative photo, not a Tutafy user. A plain notebook is all the 60-day test needs.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Working_on_a_planning_session_with_stationery_items,_notebook,_and_colorful_pencils_on_a_wooden_desk.jpg' },
  { type: 'h2', text: 'Writing an ad that gets a reply' },
  { type: 'p', text: `Your ad is the whole sales page, and a student reads several in a row. Our tutor bio guide has the long version. For Superprof the short list is this.` },
  { type: 'ul', items: [
    `Say who you teach and what changes for them. "I help adults who understand English but freeze in meetings" beats "experienced English tutor".`,
    `State a price and a first-lesson rule in the ad. The US page lists "Offer a free 20-30 minute lesson" as a tip, and the UK page does not require it.`,
    `Answer within hours. The 72-hour limit is the maximum, not the target.`,
    `Keep your phone number and outside payment links out of the ad text. The US page says contact details go to the student only after you accept. We found no rule on this, so read the terms.`,
  ] },
  { type: 'h2', text: 'Premium: what it is and what we could not confirm' },
  { type: 'p', text: `Premium is an optional paid tier for tutors. The US page lists three benefits: no commission on the funds from your lessons or packs, more visibility for your ads, and statistics to improve. It does not state a price. Third-party pages give figures that do not agree, so we print none. Read the price for your country on the sign-up screen and write it down with the date.` },
  { type: 'p', text: `Whether Premium pays for itself is a sum you can do. If it costs P for a year and removes a 10% fee, you break even when your lessons through Superprof add up to ten times P in that year. At a price of $99, which is only an example, that is $990, about 25 lessons at $40. With fewer lessons than that, fee savings alone do not pay. If the visibility brings students you would not otherwise have, it might. The 60-day test tells you which case you are in, so run it before you decide.` },
  { type: 'h2', text: 'Superprof next to the alternatives' },
  { type: 'p', text: `A tutor is rarely choosing Superprof or nothing. The usual options are a marketplace, a directory and your own page. Here is one comparison, with what we read and when.` },
  { type: 'compare', caption: 'Where each channel takes its money. Our summary of the pages named, not a ranking. Preply and italki rates checked 25 Oct 2026, Wyzant read 31 Oct 2026, Superprof as in this guide.', headers: ['Channel', 'Who pays what', 'Who holds the student'], rows: [
    ['Superprof', 'Student pays a monthly pass. Tutor lists free; 10% only if paid through the platform (some pages say none).', 'You, once you accept. The platform is the introduction.'],
    ['Preply', 'Preply keeps 100% of the first lesson with a new student. After that it takes 33% for a new tutor, falling to 18% as hours grow.', 'The platform, for the first lessons, then it depends on how you use it.'],
    ['italki', '0% on a trial lesson, then 21% on a single lesson, down to 15% on larger packs. 30% on a group class.', 'The platform books and pays.'],
    ['Wyzant', 'Tutor keeps 75% of the posted rate (25% fee). Student pays 9% on top. Students you refer yourself: no fee.', 'The platform, except students you bring.'],
    ['Your own page', 'You pay for your tools. No commission to a platform. You find the students.', 'You.'],
  ] },
  { type: 'p', text: `The difference to take from the table is where the cost falls. On Preply, italki and Wyzant, the tutor's share is cut on every lesson for as long as the student stays. On Superprof, it is cut only if you choose the processing fee, and the student pays at the door. If you keep students for a year, a fee on every lesson adds up and a fee at the door does not. Our guides on how much Preply takes and on Wyzant's fees do that arithmetic for each, and the marketplace-against-your-own-page guide does the full-year version.` },
  { type: 'p', text: `Some tutors use a directory or marketplace as the front door and move regulars to a booking link of their own once trust is built. Check each platform's rules first, because some restrict contact outside the platform. Superprof's US page says you are free to take your communication off it, but read the current terms. Our online tutoring jobs guide lists what each platform says about contact and payment outside it.` },
  { type: 'h2', text: 'What Tutafy can and cannot do here' },
  { type: 'p', text: `Tutafy is a set of tools for running your own bookings. It is not a directory that sends you students, and we would rather say that than let you assume it. Here is what that means next to Superprof.` },
  { type: 'ul', items: [
    `Tutafy does not find you students. Its tutor directory says it opens soon and lists none today, and it does not open until six tutors are ready. Superprof, with its search and its student base, does that part.`,
    `Tutafy takes 0% commission on every plan. The Free plan covers up to 10 students, Pro is $12 a month and Academy $29. You are paid through your own Stripe or PayPal account, so there is no processing fee from us.`,
    `You get a booking page that shows free hours in the visitor's time zone, a video classroom in the browser, reminders and lesson notes. Once a student has chosen you, from Superprof or by word of mouth, those are the tools that keep them.`,
    `Tutafy does not vouch for you, check your credentials or guarantee anything for a student.`,
  ] },
  { type: 'p', text: `A sensible combination, we think: treat Superprof as one place to be found, count what it brings with the 60-day test, and send regulars to a page you control. If the test says it brings nothing, you have lost two months of an ad, not a year of fees.` },
  { type: 'h2', text: 'What we did not check' },
  { type: 'p', text: `The tutor payment help page and the tutor sign-up page answered 403, so payout minimum, payout fees and withdrawal timing are not stated. We found no Premium price in any country, and no trustworthy figure for how many requests an average ad gets. We know the review pages only from search-result summaries, and we did not read Superprof's terms of service. The pages above are the company's blog and comment replies, and where they disagree we say so.` },
  { type: 'source', text: 'Pages used here, read on 31 Oct 2026. The two Superprof help pages (tutor payment, tutor sign-up) answered 403 to our script and were not read. Read the current page before you decide. Preply and italki rates are checked and dated below.', links: [
    { label: 'Superprof (US): what is Superprof and how it works', href: 'https://www.superprof.com/blog/how-superprof-works/' },
    { label: 'Superprof (US): subscription and fees', href: 'https://www.superprof.com/blog/charges-payments-superprof/' },
    { label: 'Superprof (UK): subscription and fees', href: 'https://www.superprof.co.uk/blog/charges-payments-superprof/' },
    { label: 'Superprof (US): the Student Pass', href: 'https://www.superprof.com/blog/students-and-superprof/' },
    { label: 'Superprof (UK): Superprof vs Preply', href: 'https://www.superprof.co.uk/blog/superprof-vs-preply/' },
    { label: 'Trustpilot: Superprof UK reviews', href: 'https://ca.trustpilot.com/review/superprof.co.uk' },
  ] },
  RATES_SOURCE,
  { type: 'links', title: 'Related guides', items: [
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'What each platform pays, keeps and asks for, side by side.' },
    { label: 'Wyzant fees for tutors', href: '/blog/wyzant-fees-for-tutors', text: 'The 25% fee, the 9% on the student and what you take home.' },
    { label: 'How much Preply takes', href: '/blog/how-much-does-preply-take', text: 'The commission tiers and the sums behind them.' },
    { label: 'Marketplace vs independent: the real math', href: '/blog/marketplace-vs-independent-the-real-math', text: 'A full year of fees on a marketplace against a page of your own.' },
    { label: 'The real hourly rate for tutors', href: '/blog/real-hourly-rate-for-tutors', text: 'How to count unpaid hours and fees into one rate.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'What a profile or an ad should say.' },
    { label: 'Get your first tutoring clients', href: '/blog/get-your-first-tutoring-clients', text: 'Other places to find students besides a directory.' },
  ] },
  { type: 'faq', items: [
    { q: 'Is Superprof free for tutors?', a: `Listing is free. Superprof's US page says creating a profile is free, that you can upload up to 5 ads and that no tutor pays a subscription. A 10% processing fee applies if you take lesson payments through Superprof, and Premium is an optional paid tier. Pages read 31 Oct 2026.` },
    { q: 'Does Superprof take a commission from tutors?', a: `Its pages do not agree. Two say a 10% processing fee applies when lessons are paid through Superprof and not otherwise. Two others say there is no commission on tutors' lessons. Check the lesson screen before you accept your first booking.` },
    { q: 'How much does the Superprof Student Pass cost?', a: `$49 a month in the US and 39 pounds a month in the UK, on pages dated 2025 and 2026. It covers contact only, not lessons, renews automatically and can be cancelled at any time.` },
    { q: 'How do I get paid on Superprof?', a: `Directly by the student outside Superprof, or through Superprof's online payment. The US page says funds show on your balance 24 hours after the lesson and that PayPal is the only payout method on Superprof US.` },
    { q: 'Is Superprof worth it for tutors?', a: `It costs nothing to try, so run the test: one ad for 60 days, count requests, first lessons and regular students, and divide what you spent in time and fees by what the regular students paid.` },
    { q: 'What are the alternatives to Superprof for tutors?', a: `Marketplaces such as Preply, italki and Wyzant, which take a share of each lesson, and your own booking page, which takes none but leaves finding students to you.` },
    { q: 'Does Tutafy send me students like Superprof?', a: `No. Tutafy is the set of tools for running your own bookings, with 0% commission. Its tutor directory lists no tutors today. Superprof does the finding; Tutafy does what comes after.` },
  ] },
  { type: 'cta', title: 'Keep the whole lesson fee on your own page', text: 'If you are a tutor, the Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not find you students yet.', button: 'Start free, no credit card', href: '/register' },
]
