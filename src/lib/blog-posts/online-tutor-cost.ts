// T-1213. Article body for /blog/online-tutor-cost (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, article 2 of the 08/11 day. Search phrase: "online tutor cost" (no search volume measured: the OpenSEO session had expired on 31 Oct 2026).
// Reader: a LEARNER or a parent, comparing prices. The other cost articles on the site are written for the tutor (how-to-price-tutoring-lessons, real-hourly-rate-for-tutors, group-tutoring-classes-pricing).
//
// Step 0 (31 Oct 2026). Google results for "how much does an online tutor cost per hour" and "online tutor cost": tutoring companies and marketplaces (Fullmind, Learner, Wyzant's blog, Preply's blog, Care.com, Tutorful, Languatalk, Superprof,
// Wise) with a table or a range each, mostly one country and mostly from a company that sells tutoring. None compares the sources with one another or says how old a figure is. Pages on tutafy.com that touch the topic: how-to-price-tutoring-lessons
// (how a tutor sets a rate), real-hourly-rate-for-tutors (what a tutor keeps), online-tutoring-jobs (what platforms pay tutors), tutoring-lesson-packages-explained (how packages are priced), group-tutoring-classes-pricing. All are for the tutor;
// none answers a learner's "what will I pay". Own angle: the learner's side, with every figure dated and tied to the page it came from, a plain account of why sources differ by a factor of three, and a method for turning any quote into a price
// per hour of real teaching. This guide links to the tutor-side pages and they link back.
//
// Sources, read directly on 31 Oct 2026 (a page "read" means the text was fetched and the figure checked against it):
//   Fullmind, "How Much Does a Tutor Cost?" (published 18 Dec 2024, updated 16 Oct 2026): US average $40 to $80 an hour; as low as $25 and as high as $150; in person $40 to $90, online $30 to $80; online 20 to 30% cheaper than in person for the same
//     subject and qualifications; list of platform rates (iTutor $40, Tutor.com $29 to $40 in packages, Varsity Tutors $70 to $100, Skooli $39 to $49 in packages, Wyzant $25 to $250, Air Tutors $100 to $120 in packages). Fullmind sells tutoring.
//   Learner, "How Much Does Tutoring Cost?" (updated 6 May 2026): private tutoring "$20 to $100 per hour"; its own online 1:1 sessions "about $60 to $130 per hour"; Brighterly "often around $20 per lesson, depending on the plan"; the more education a tutor has, the more
//     likely $40 or more. Learner sells tutoring.
//   US Bureau of Labor Statistics, Occupational Outlook Handbook, Tutors: median pay $20.84 an hour, $43,350 a year, May 2025 (what tutors are paid, not what a family pays); employment outlook "little or no change" 2025 to 2035.
//   Tutorful, "How Much Does a Tutor Cost?" (UK, 29 Oct 2026): the advertised rates for online lessons, "October 2026" table of Maths and English by level, subject table, "Most families pay between £43 and £54 an hour".
//   The Profs, "How much does a tutor cost per hour in the UK" (last updated 21 Sep 2026): standard online tutoring £25 to £40, top-tier £60 to £100+, in person £10 to £20 higher, London and South East £45 to £70 against £25 to £35 in the North, Midlands, Wales and Scotland.
//   Superprof UK blog (page dated 3 Jan 2022, figures labelled 2025): A Level maths £41.50 an hour.
//   Tutero (Australia, undated "2026 Guide"): "A$55 and A$85/hr" for most families, A$95 to A$140+ for experienced classroom teachers and ATAR specialists, online "A$10 to A$25/hr cheaper than in-person", Tutero's own price A$65 an hour. Tutero sells tutoring.
//   Wise, "Average Tutor Rates Per Hour in Australia" (5 Feb 2026): online A$40 to A$90, in person A$70 to A$120; the same page later says online A$30 to A$60 (it disagrees with itself).
//   Languatalk, "How much do English tutors charge per hour?" (last updated 22 Nov 2022): averages by the tutor's country, online and in person combined: UK $21, US $18, Canada $20, South Africa $17, Australia $25; overall $19.
//   The platforms' marketplace commission: src/lib/marketplace-rates.ts (Preply and italki tutor commission pages, checked 25 Oct 2026 by the owner's account of the search results; the pages answered 403 to a script).
// Not read, so not written: Preply, Wyzant and italki price pages (403 to a script on 31 Oct 2026; no price of theirs is quoted except through Fullmind and said so), the Education Endowment Foundation page on one-to-one tuition (403), any measure of tutor quality against price,
// any price for Canada, India or the Philippines that we could read, any official statistics on what families pay.
// What it says about Tutafy is from the code and the live site, read 31 Oct 2026: the booking page shows the tutor's price in their own currency, lesson lengths, a free-trial setting and the cancellation rule (src/components/settings/BookingPreview.tsx),
// payments go through the tutor's own Stripe or PayPal account with 0% commission, and tutafy.com/tutors says "The tutor directory opens soon" with no tutors listed. All prices in the worked quotes are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'
import { RATES_SOURCE } from '@/lib/marketplace-rates'

export const ONLINE_TUTOR_COST_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'Sources we read on 31 Oct 2026 put one-to-one online tutoring in the US at $30 to $80 an hour for most families, with a ceiling above $100. Fullmind says $30 to $80, Learner says $20 to $100 for private tutoring and $60 to $130 for its own sessions.',
    'In the UK, Tutorful says most families pay £43 to £54 an hour. The Profs says standard online tutoring costs £25 to £40. Both are current, and they differ because they count different tutors.',
    'Level moves the price less than people expect, and the tutor moves it more. On Tutorful the gap between the cheapest and dearest subject on its list is £10.',
    'The number that matters is the price per hour of teaching you actually receive. A 10-lesson package that you only half use can cost more per hour than a single lesson.',
    'Tutafy is software for tutors, not a place to compare them. Its tutor directory had not opened on 31 Oct 2026, so this guide cannot tell you what Tutafy tutors charge.',
  ] },
  { type: 'p', text: `An online tutor costs about $30 to $80 an hour in the US, according to Fullmind's guide updated on 16 October 2026, and £43 to £54 in the UK, according to Tutorful on 29 October 2026. Those are the middle of the range. Prices run from about $20 to above $100, and the sources disagree with one another by a factor of three, so the useful question is less "what is the average" and more "what will I pay for this subject, this tutor and this way of buying".` },
  { type: 'p', text: `This guide is for learners and parents. It gives the figures we read, with the date and the company behind each, says why they differ, and shows how to turn any quote into a price per hour of real teaching. We run a tool for tutors and have no tutoring to sell you.` },
  { type: 'image', src: '/blog/inline/cost-tutoring-chemistry', alt: 'Two hands over handwritten chemistry notes on a wooden desk, one pointing at an equation and the other holding a pen.', caption: 'Illustrative photo, not a Tutafy user. A one-to-one lesson is paid by the hour, and the hour is what you compare.', credit: 'Photo: Preply.com Images (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Tutoring_Chemistry.jpg' },
  { type: 'h2', text: 'What the sources say in the US' },
  { type: 'p', text: `We read five pages on 31 October 2026. Two are from companies that sell tutoring, so their numbers are marketing as well as information. One is a government page about what tutors are paid, which is a different thing from what you pay. Read the table with that in mind.` },
  { type: 'compare', caption: 'US figures from the pages we read on 31 Oct 2026. The source is a company that sells tutoring unless noted.', headers: ['Source and date', 'What it says', 'What it measures'], rows: [
    ['Fullmind, updated 16 Oct 2026', 'Average $40 to $80 an hour; as low as $25, as high as $150. Online $30 to $80, in person $40 to $90.', 'Price families pay, across tutoring types'],
    ['Learner, updated 6 May 2026', 'Private tutoring $20 to $100 an hour. Its own online 1:1 sessions about $60 to $130.', 'Price families pay; the second figure is its own product'],
    ['Learner, same page', 'Brighterly "often around $20 per lesson, depending on the plan".', 'A subscription price, per lesson, not per hour'],
    ['Fullmind, platform list', 'Wyzant $25 to $250; Varsity Tutors $70 to $100; iTutor $40; Skooli $39 to $49 in packages; Tutor.com $29 to $40 in packages; Air Tutors $100 to $120 in packages.', 'Rates Fullmind reports for other companies'],
    ['US Bureau of Labor Statistics, May 2025', 'Median pay for tutors $20.84 an hour.', 'What tutors are paid, not what a family pays'],
  ] },
  { type: 'p', text: `What families pay clusters between about $30 and $80, and both companies' ranges stretch beyond it at the top. The lowest prices belong to subscriptions and packages sold by the lesson, where the hour is often shorter or shared. The highest belong to specialists and managed services.` },
  { type: 'p', text: `The BLS figure needs care. A median of $20.84 an hour is what tutors were paid in May 2025, so it is not a price list and not comparable with the rows above. It is useful for one thing: a lesson priced far below $20 an hour should make you ask what is being left out.` },
  { type: 'h2', text: 'Why the sources disagree' },
  { type: 'p', text: `A $30 hour and a $130 hour both appear in pages read on the same day. That is not a mistake by either page. Five things change what a figure means.` },
  { type: 'ul', items: [
    `Who is selling. A company quotes its own range, and it tends to sit at the top because it includes vetting, matching and support. Learner's $60 to $130 is for its own sessions, while its range for private tutoring in general is $20 to $100.`,
    `What is counted. Some pages average online and in-person tutors together. Languatalk's table says so, and Wise's Australia ranges for online and in person overlap.`,
    `What the hour is. A "lesson" can be 25, 30, 45 or 60 minutes. A price of $20 a lesson is $40 an hour if the lesson is 30 minutes.`,
    `Who set the price. On a marketplace the tutor sets it. In an agency the company does. A list of "rates" can mix the two.`,
    `How old the page is. Languatalk's English tutor averages were last updated on 22 November 2022 and sit near $18 to $25 an hour, below the 2026 figures. We cannot say how much of the gap is time and how much is a different sample.`,
  ] },
  { type: 'p', text: `The same effect shows inside one country. Tutorful, a UK platform, says on 29 October 2026 that most families pay £43 to £54 an hour for online lessons. The Profs, another UK service, says standard online tutoring costs £25 to £40, and that only "top-tier services" cost £60 to £100 or more. Tutorful's low end is higher than The Profs' top end for standard tutoring. A Superprof page that labels its figures 2025 gives £41.50 for A Level maths, where Tutorful's table gives £50. Each is telling the truth about the tutors it counts.` },
  { type: 'callout', variant: 'info', title: 'How to use a figure from a pricing page', text: 'Before you trust a number, find three things on the page: who sells tutoring, how long the lesson in the figure is, and the date. If any of the three is missing, treat the number as a rough guide and ask the tutor for a quote instead.' },
  { type: 'h2', text: 'Prices by level and subject in the UK' },
  { type: 'p', text: `The best level-by-level data we found is for the UK, and it comes from two sources that disagree in level, which is useful. Tutorful's table, headed "October 2026", gives average advertised rates for online lessons. The Profs gives ranges by level without saying whether they are online or in person.` },
  { type: 'compare', caption: 'Tutorful, average advertised hourly rate for online lessons, October 2026 table, read 29 to 31 Oct 2026.', headers: ['Level', 'Maths', 'English'], rows: [
    ['Primary', '£44', '£45'],
    ['11+', '£47', '£54'],
    ['GCSE', '£46', '£48'],
    ['A-Level', '£50', '£49'],
    ['University (maths only)', '£53', 'not given'],
  ] },
  { type: 'p', text: `The cost does not climb steadily with the level. Primary maths at £44 is only £6 below A-Level maths at £50, and English peaks at 11+ with £54, above A-Level at £49. Prices follow demand and the tutors available, not only difficulty.` },
  { type: 'compare', caption: 'Tutorful, average hourly rate by subject, read 31 Oct 2026.', headers: ['Subject', 'Average hourly rate'], rows: [
    ['Special educational needs (SEN)', '£53'],
    ['Piano', '£52'],
    ['Physics', '£50'],
    ['Economics', '£49'],
    ['Combined science', '£49'],
    ['Chemistry', '£47'],
    ['Maths', '£46'],
    ['Biology', '£46'],
    ['French', '£43'],
  ] },
  { type: 'p', text: `On this list, the most expensive subject costs £10 an hour more than the cheapest. Special educational needs tutoring is the dearest at £53, which fits what you would expect, because it asks for specialist training. French at £43 is the cheapest.` },
  { type: 'compare', caption: 'The Profs, UK average rates by level, last updated 21 Sep 2026. The page does not say whether these are online or in person.', headers: ['Level', 'Hourly range'], rows: [
    ['Primary', '£25 to £35'],
    ['GCSE', '£30 to £45'],
    ['A-level', '£35 to £50'],
    ['University', '£40 to £70'],
    ['Specialist subjects', '£60 to £100+'],
  ] },
  { type: 'p', text: `The Profs' table climbs steadily with the level, where Tutorful's does not, and its numbers are lower at every level. Either it counts a different mix of tutors or the two measure different things; neither page says. The practical advice is the same: expect a spread of £10 to £15 within one level, and pay for the tutor, not the label.` },
  { type: 'image', src: '/blog/inline/cost-video-call-laptop', alt: 'A smiling woman gestures while talking to a laptop at a wooden kitchen table with books on shelves behind her.', caption: 'Illustrative photo, not a Tutafy user. Online lessons remove travel, and most sources say they also lower the price.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Woman_smiling_and_using_laptop_during_video_call_in_cozy_wooden_room.jpg' },
  { type: 'h2', text: 'Prices by country' },
  { type: 'p', text: `Online lessons cross borders, so the question "what does a tutor cost in my country" has two answers: what a local tutor charges and what a tutor elsewhere charges. We found readable, dated figures for only three places, and we say so instead of filling the gaps.` },
  { type: 'compare', caption: 'Country figures from pages we read on 31 Oct 2026. Currencies are as the source gives them, and none has been converted.', headers: ['Place', 'Figure', 'Source and date', 'Caution'], rows: [
    ['United States', '$30 to $80 an hour online', 'Fullmind, updated 16 Oct 2026', 'From a company that sells tutoring'],
    ['United Kingdom', '£43 to £54 an hour; £25 to £40 for standard online', 'Tutorful, 29 Oct 2026; The Profs, 21 Sep 2026', 'The two differ; see above'],
    ['Australia', 'A$55 to A$85 for most families', 'Tutero, undated 2026 guide', 'Tutero sells tutoring and charges A$65 itself'],
    ['Australia, online', 'A$40 to A$90 (and elsewhere on the page A$30 to A$60)', 'Wise, 5 Feb 2026', 'The page disagrees with itself'],
    ['English tutors by tutor country', 'UK $21, US $18, Canada $20, South Africa $17, Australia $25 an hour', 'Languatalk, last updated 22 Nov 2022', 'Four years old; online and in person combined'],
  ] },
  { type: 'p', text: `Each of the three places has a source that says online is cheaper than in person. Tutero says online is "A$10 to A$25/hr cheaper than in-person" because there is no travel and no premises, and The Profs says in-person tutoring costs £10 to £20 an hour more than the national average. For the US, Fullmind says online runs $30 to $80 and in person $40 to $90, and that online tutoring tends to be 20 to 30% cheaper for the same subject and tutor qualifications.` },
  { type: 'p', text: `Online, you can also hire a tutor in another country. We found no current source that compares prices across countries for the same lesson, so we cannot say how large the difference is today. Time zones matter as much as price, and a cheaper hour at 3 a.m. is not a bargain.` },
  { type: 'h2', text: 'What is inside the price' },
  { type: 'p', text: `Two lessons at $40 can contain different amounts of teaching. The cost of getting you and the tutor together has to come from somewhere, and it comes from one of three places.` },
  { type: 'compare', caption: 'Three ways to buy a tutor, and where the money goes. A generalisation, with the exceptions noted in the text.', headers: ['Way to buy', 'Who sets the price', 'Where your money goes', 'What to check'], rows: [
    ['Marketplace (Preply, italki, Wyzant and similar)', 'The tutor, within the platform rules', 'Part of the tutor\'s earnings goes to the platform as commission', 'The trial lesson rules, the package terms, any fee at checkout'],
    ['Agency or managed service (Varsity Tutors and similar)', 'The company', 'The company pays the tutor and keeps the difference; the price includes matching and support', 'What the company promises if the match is wrong'],
    ['A tutor on their own (their own site or booking link)', 'The tutor', 'Almost all of it goes to the tutor; the payment processor takes a small fee', 'The cancellation rule and how the tutor takes payment'],
  ] },
  { type: 'p', text: `On a marketplace, the commission is taken from the tutor's earnings. Preply takes 33% from a new tutor on later lessons and 18% from a tutor who has taught many hours, and it keeps the first trial lesson with each new student in full. italki takes between 15% and 21% by lesson type and nothing on a trial. These are commissions charged to tutors, according to the platforms' own tutor pages. We did not read whether any platform adds a fee for students, so check the checkout screen before you pay.` },
  RATES_SOURCE,
  { type: 'p', text: `A tutor who pays a third of each lesson to a platform has to charge more to earn the same, or accept less. Our guide to Preply's commission shows the arithmetic from the tutor's side. For you, the point is that the same tutor may quote less for a lesson booked directly. Whether they may is between the tutor and the platform's terms. Never move a payment off a platform if its terms forbid it, because you also lose its refund and dispute process.` },
  { type: 'p', text: `An agency is different again. Fullmind's list puts Varsity Tutors at $70 to $100 an hour, and Air Tutors at $100 to $120 in packages. You pay for a process: a company vets the tutor, handles scheduling and support, and answers to you when something goes wrong. A parent buying a first tutor may want that. An adult learner who knows what they need may not.` },
  { type: 'image', src: '/blog/inline/cost-piggy-bank', alt: 'A glass jar of coins and a folded banknote with a purple arrow drawn on it, with coloured crayons in front.', caption: 'Illustrative photo, not a Tutafy user. A cheaper quote is only a saving if the lessons are good enough to keep.', credit: 'Photo: stevepb (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Piggy-bank-968302.jpg' },
  { type: 'h2', text: 'How to read a quote' },
  { type: 'p', text: `A quote is a sentence with several numbers in it. The one that matters is the price per hour of teaching you actually receive, so convert everything to it. Here are four invented quotes for the same subject. The prices are made up to show the method, not taken from any tutor.` },
  { type: 'compare', caption: 'Four invented quotes for one subject, converted to a price per hour. The prices are examples only.', headers: ['Quote', 'Arithmetic', 'Price per hour'], rows: [
    ['Tutor A: $40 for a 60-minute lesson', '$40 ÷ 1 hour', '$40.00'],
    ['Tutor B: $28 for a 45-minute lesson', '$28 ÷ 0.75 hour', '$37.33'],
    ['Tutor C: $25 for a 30-minute lesson', '$25 ÷ 0.5 hour', '$50.00'],
    ['Tutor D: 10 one-hour lessons for $360, to be used within 8 weeks, no refund', '$360 ÷ 10 hours', '$36.00 if you use all 10'],
  ] },
  { type: 'p', text: `On the face of it, Tutor D is the cheapest at $36 an hour and Tutor C looks cheap at $25 a lesson. The conversion puts Tutor C at the top, $50 an hour, because the lesson is short. Tutor D has a catch too, and it is the one to look for in every package.` },
  { type: 'compare', caption: 'What Tutor D\'s package really costs per hour, depending on how many lessons you use before it expires (invented example).', headers: ['Lessons used', 'Arithmetic', 'Price per hour'], rows: [
    ['10', '$360 ÷ 10', '$36.00'],
    ['8', '$360 ÷ 8', '$45.00'],
    ['6', '$360 ÷ 6', '$60.00'],
    ['4', '$360 ÷ 4', '$90.00'],
  ] },
  { type: 'p', text: `If you use six lessons, Tutor D costs $60 an hour, more than Tutor A at $40. A package is a discount for certainty, and it only exists if you use the lessons. Before you buy one, check the expiry, whether lessons roll over, what happens if the tutor cancels and whether the unused balance is refunded. Our guide to lesson packages shows how a tutor should write these terms.` },
  { type: 'h3', text: 'Eight questions to ask before you pay' },
  { type: 'ul', items: [
    `How long is a lesson, in minutes, and is that time spent teaching or does it include setting up?`,
    `Is the trial lesson free, discounted or full price, and does it count towards a package?`,
    `What do I pay if I cancel, and how much notice do you need? Is a late cancellation charged in full?`,
    `Is there a package price? When does it expire, and does the balance roll over or get refunded?`,
    `What currency is the price in, and does the total include tax or a card fee?`,
    `How do I pay: through a platform, a payment link or a bank transfer? Where do I find a receipt?`,
    `Do you share notes, homework or a recording afterwards, or is that extra?`,
    `If we are not a good fit after the first lessons, what happens to what I have paid?`,
  ] },
  { type: 'p', text: `Good tutors answer these in a sentence each. A tutor who cannot say what the cancellation rule is has told you something about the next ten lessons. Read their booking page first, because it usually has the answers.` },
  { type: 'h2', text: 'What a term of lessons costs' },
  { type: 'p', text: `An hourly price sounds small. A term is a different scale. The table multiplies a few hourly prices over twelve weeks, which is about a school term. The numbers are arithmetic, not prices from a source.` },
  { type: 'compare', caption: 'Twelve weeks of lessons at different hourly prices. Arithmetic only.', headers: ['Hourly price', 'One lesson a week for 12 weeks', 'Two lessons a week for 12 weeks'], rows: [
    ['$25', '$300', '$600'],
    ['$40', '$480', '$960'],
    ['$60', '$720', '$1,440'],
    ['$80', '$960', '$1,920'],
    ['$100', '$1,200', '$2,400'],
  ] },
  { type: 'p', text: `At $40 an hour, one lesson a week for a 36-week school year costs $1,440. At $80 it costs $2,880. The gap, $1,440, equals the cheaper tutor's whole year. Remember that before you decide the dearer tutor is "only" twice the price.` },
  { type: 'p', text: `It also makes frequency a budget decision. Two lessons a week at $40 costs the same as one a week at $80. We found no source that says which is better, so ask the tutor what they recommend for your goal and why.` },
  { type: 'image', src: '/blog/inline/cost-girl-studies-home', alt: 'A girl in a pink top writes in an open exercise book at a desk beside a lamp, with a purple pencil case and books close by.', caption: 'Illustrative photo, not a Tutafy user. Practice between lessons is free, and it decides how many lessons you need.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Girl_studies_at_home_in_a_cozy_room.jpg' },
  { type: 'h2', text: 'Ways to pay less without paying for worse' },
  { type: 'ul', items: [
    `Book online. Every source we read that compares them says online is cheaper than in person: Fullmind by 20 to 30%, Tutero by A$10 to A$25 an hour, The Profs by £10 to £20.`,
    `Start with one lesson, not a package. Buy a package only after the first two lessons have shown you that you will use it.`,
    `Choose the shortest lesson that works. A 30-minute lesson is often better for a young child than an hour, and it halves the weekly bill. Check the per-hour price, as in the examples above.`,
    `Share. Group tutoring is cheaper per person, and a pair of learners at the same level can split a lesson. We found no dated group price we could read, so ask the tutor for their own group price per learner.`,
    `Do the practice yourself. A tutor's hour is best spent on feedback, explanation and a plan. Reading and past papers do not need a tutor.`,
    `Ask about a discount for a term paid up front. It costs the tutor nothing to say no.`,
  ] },
  { type: 'p', text: `Cheap is not the same as bad, and expensive is not the same as good. No source here measures tutor quality against price, so we cannot say the $80 tutor teaches better than the $40 one. The better test is a trial lesson with a clear aim: after it, can you say what you learned?` },
  { type: 'h2', text: 'Red flags in a price' },
  { type: 'ul', items: [
    `A price far below the rest of the market, with no explanation. The BLS median pay for tutors is $20.84 an hour, so a lesson quoted well below that has to be a short lesson, a group or a tutor who is learning, and you should be told which.`,
    `A large prepayment with no refund rule. A package of 40 lessons paid up front is a loan to the tutor, and you should know what happens if they stop.`,
    `A price quoted only per month, with no number of lessons or minutes.`,
    `Payment by gift card, cryptocurrency or a transfer to a personal account you cannot look up.`,
    `A guaranteed result. Nobody can promise a grade or an exam score, and a tutor who does is selling the promise, not the teaching.`,
  ] },
  { type: 'h2', text: 'What Tutafy is, and what it is not, for a learner' },
  { type: 'p', text: `Tutafy is software for tutors who run their own business: a public booking page, a video classroom in the browser, reminders, student records and payment through the tutor's own Stripe or PayPal account, with 0% commission. If your tutor uses it, you see their booking page, which shows the price in their own currency, the lesson lengths, whether there is a free trial and the cancellation rule, so most of the eight questions above have their answer on the page.` },
  { type: 'ul', items: [
    `Tutafy is not a place to compare tutors yet. The tutor directory had not opened on 31 October 2026, and tutafy.com/tutors said "The tutor directory opens soon" with no tutors listed.`,
    `Tutafy does not set or guarantee any price. Each tutor sets their own.`,
    `Tutafy takes no commission from the tutor and adds no fee for you. The payment service the tutor uses takes its normal card fee, which is the tutor's cost.`,
    `We have no table of what Tutafy tutors charge, because we do not have enough tutors to make an honest one.`,
  ] },
  { type: 'source', text: 'Figures and dates come from the pages below, read on 31 Oct 2026. The prices in the worked quotes are invented. Pages change, so open the source before you rely on a figure.', links: [
    { label: 'Fullmind: How much does a tutor cost?', href: 'https://www.fullmindlearning.com/blog/how-much-a-tutor-costs' },
    { label: 'Learner: How much does tutoring cost?', href: 'https://www.learner.com/blog/how-much-is-tutoring' },
    { label: 'US Bureau of Labor Statistics: Tutors', href: 'https://www.bls.gov/ooh/education-training-and-library/tutors.htm' },
    { label: 'Tutorful: How much does a tutor cost?', href: 'https://tutorful.co.uk/blog/how-much-does-a-tutor-cost' },
    { label: 'The Profs: tutor cost per hour in the UK', href: 'https://www.theprofs.co.uk/student-resources/uncategorized/how-much-does-a-tutor-cost-per-hour-in-the-uk/' },
    { label: 'Superprof UK: how expensive are private tutors?', href: 'https://www.superprof.co.uk/blog/how-expensive-are-private-tutors/' },
    { label: 'Tutero: maths tutoring cost in Australia', href: 'https://www.tutero.com/au/blog/how-much-does-maths-tutoring-cost-in-australia' },
    { label: 'Wise: average tutor rates per hour in Australia', href: 'https://www.wise.live/blog/?p=5157' },
    { label: 'Languatalk: what English tutors charge per hour', href: 'https://languatalk.com/blog/how-much-do-english-tutors-charge/' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to price tutoring lessons', href: '/blog/how-to-price-tutoring-lessons', text: 'The tutor side of the same question.' },
    { label: 'Your real hourly rate as a tutor', href: '/blog/real-hourly-rate-for-tutors', text: 'What a tutor keeps after commission and unpaid time.' },
    { label: 'How much does Preply take from tutors?', href: '/blog/how-much-does-preply-take', text: 'Where part of a marketplace price goes.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'How packages are priced and what terms to expect.' },
    { label: 'How to price group tutoring classes', href: '/blog/group-tutoring-classes-pricing', text: 'Why a group costs less per learner.' },
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'What platforms pay the tutors behind the prices.' },
  ] },
  { type: 'faq', items: [
    { q: 'How much does an online tutor cost per hour?', a: `Sources we read on 31 October 2026 put it at $30 to $80 in the US (Fullmind) and £43 to £54 in the UK (Tutorful), with £25 to £40 for standard online tutoring from The Profs. Ranges run from about $20 to above $100, depending on subject, level and who sells the lesson.` },
    { q: 'Is online tutoring cheaper than in-person tutoring?', a: `The sources we read say yes. Fullmind says 20 to 30% cheaper for the same subject and qualifications, Tutero says A$10 to A$25 an hour cheaper, and The Profs says in person costs £10 to £20 more than the national average.` },
    { q: 'How much does a tutor cost per month?', a: `Multiply the hourly price by your lessons. One hour a week at $40 is about $160 a month. Packages and subscriptions change this, so convert any quote to a price per hour first.` },
    { q: 'Are lesson packages cheaper?', a: `Only if you use all the lessons. A $360 package for 10 hours is $36 an hour when you use 10, and $60 an hour when you use 6. Check the expiry date and the refund rule before you buy.` },
    { q: 'Does a higher price mean a better tutor?', a: `We found no source that measures tutor quality against price, so we cannot say. A trial lesson with a clear aim is a better test than the price.` },
    { q: 'Does the price include the platform fee?', a: `We could not tell from the pages we read. Preply and italki publish commissions charged to tutors, taken from the tutor's earnings. Check the checkout screen for any fee added for the student.` },
    { q: 'Can I find tutors and compare prices on Tutafy?', a: `Not yet. Tutafy is software for tutors, and its tutor directory had not opened on 31 October 2026. If your tutor uses Tutafy, their booking page shows their price, lesson lengths, trial setting and cancellation rule.` },
  ] },
  { type: 'cta', title: 'Teach? Keep what you charge', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not send students and has no directory of tutors open yet.', button: 'Start free, no credit card', href: '/register' },
]
