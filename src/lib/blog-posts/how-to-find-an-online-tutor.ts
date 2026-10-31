// T-1215. Article body for /blog/how-to-find-an-online-tutor (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, article 4 (calendar day 9 Nov 2026).
// Step 0 (31 Oct 2026): the first page of results for "how to find an online tutor" is platform and vendor pages (Wyzant's blog, tutoring companies, a university help page), a news-site explainer and generic lists that all say the same four things:
// set a goal, pick a platform, check credentials and reviews, ask for a trial. Nothing on the page sorts the checks by WHEN you can do them, and none puts the price, the refund rules and the payment method in the same list as the teaching checks.
// On this site every one of the 39 articles on master is written for tutors; none is for a learner. The nearest are how-to-write-a-tutor-bio (what a tutor writes, which is also what a learner reads) and tutoring-lesson-packages-explained (what a package is, for a tutor).
// Own angle: ten checks in three stages (before you book, in the first lesson, after four lessons), each with the evidence it rests on; the money and safety checks are in the same list as the teaching ones; Tutafy's own gap is said first (the directory lists no tutors today).
// Links both ways with wyzant-fees-for-tutors (T-1214, same day), how-to-write-a-tutor-bio, tutoring-lesson-packages-explained, tutoring-cancellation-policy-and-contracts, schedule-tutoring-lessons-across-time-zones and ielts-speaking-part-2-topics.
//
// Sources, read on 31 Oct 2026 (official pages; EEF, FTC, NSPCC, Preply, italki and Wyzant pages answered 403 or 404 to our script, so each of their figures comes from the search result of the official page, not the page opened in a browser):
//   Education Endowment Foundation (UK), Teaching and Learning Toolkit, One to one tuition: about five additional months' progress on average, evidence security rated moderate; short regular sessions of about 30 minutes, three to five times a week, over a set period of up to ten weeks;
//     tuition should be additional to, and explicitly linked with, normal teaching; primary studies +6 months, secondary +4; mathematics +2, literacy +6; one to one against small groups of two or three: mixed results. The evidence is mostly school pupils, not adult learners.
//   US Federal Trade Commission, consumer advice on how to spot a scam by how someone asks you to pay: pay by credit card when possible; a card dispute notice must reach the company within 60 days of the first bill that shows the error; wiring money is like sending cash; gift cards and crypto are the hardest to get back;
//     anyone who says you can only pay in one of those ways is probably a scammer.
//   NSPCC (UK), Finding a tutor for your child, and Safeguarding and child protection for tutors; GOV.UK, guidance for parents and carers on out-of-school settings: ask for an up-to-date criminal records check certificate and two referees; a safeguarding policy and code of conduct;
//     an adult within earshot; for online sessions use a shared space and not a bedroom; contact through the parent; regular progress updates; trust your instincts and stop if a child is uncomfortable. The tutoring sector is largely unregulated.
//   Wyzant support, What's the Good Fit Guarantee; Background Check Policy; Tutor Payment Policies; tutor safety page; What is the service fee charged to students: a student can ask for a refund of the first hour of a first lesson with a new tutor; whoever orders a background check pays $15.99 and a tutor with a check bought on their profile must pass it;
//     payment outside the platform is not permitted and Wyzant's protections do not apply to communication outside it; students pay a 9% service fee on top of the tutor's rate. The pages do not say how a refund changes the tutor's pay.
//   Preply help, How to book a trial lesson and What can I expect from my trial lesson: a trial lesson is bought on the tutor's profile in a 25 or 50 minute slot, one trial per tutor per student; it normally covers introductions, goals, a short level check, a sample activity and a suggested plan; if it does not work out the student can switch tutor or be refunded.
//   italki support, What are trial lessons: the teacher sets the trial price; trials are usually around 30 minutes; a student may take one trial per teacher; italki's own pages disagree on how many trials a student may take in total (three in one, five in another), so we give no number.
// Not read, so not written: how much online tutoring costs by subject or country (a separate guide), any figure on how many tutors pass a background check, any rating or review count for any platform, how any platform ranks tutors, whether any one tutor's claims are true.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: tutafy.com/tutors says "The tutor directory opens soon" and lists no tutors; the directory opens once six tutors are ready (src/lib/directory.ts, DIRECTORY_OPENS_AT = 6; src/components/directory/DirectoryView.tsx);
// "Find me a tutor" (src/app/find-a-tutor/page.tsx, docs/features/T-0897-find-a-tutor.md) asks five questions and shows the three tutors that fit best, and is closed on the same rule; a tutor may switch on a 30-minute trial lesson at a price the tutor sets, for a first lesson only (docs/features/T-1007-standard-trial.md);
// the booking page shows free hours in the visitor's time zone. Tutafy does not vet qualifications, run background checks or guarantee results. We make no claim about reviews on Tutafy: the reviews flow is off by default in code (docs/features/T-0898-real-reviews.md) and we did not check whether it is on.
// All names and examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const FIND_ONLINE_TUTOR_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'Ten checks find a good online tutor, in three stages: seven before you book, two in the first lesson and one after about four lessons. Money and safety are on the list, not only teaching.',
    'Write your goal in one sentence with a date before you search. The UK Education Endowment Foundation says one to one tuition should be linked to what you are already learning.',
    'Read the trial, cancellation and refund rules before you pay, and pay by credit card where you can. The US Federal Trade Commission says anyone who insists on a wire, gift card or crypto is probably a scammer.',
    'Use the first lesson as a test, not a favour. Bring a real task and watch what the tutor does in the first ten minutes.',
    'Tutafy is where tutors run their own bookings. Its tutor directory is not open yet and lists no tutors today, so this guide works with any platform.',
  ] },
  { type: 'p', text: `To find a good online tutor, decide what you want to be able to do and by when, shortlist tutors who teach exactly that, test one in a trial lesson, and judge by what happens in the first four lessons rather than by the profile. That is simple to say and easy to skip. It is easy to choose on a photo, a star rating and a price, and find out the rest after you have paid.` },
  { type: 'p', text: `The ten checks below put the questions in the order you can answer them. Seven need only a profile and a few minutes, two need a lesson and one needs a month. For each we say what it rests on, from official pages read on 31 October 2026, and where we found no evidence we say so. We make Tutafy, a tool tutors use to run their own bookings, so near the end we say what it does and does not do for a learner. Rules and prices change, so read the current page of any platform you use.` },
  { type: 'image', src: '/blog/inline/find-video-call', alt: 'A smiling woman with long dark hair talking and gesturing toward an open laptop on a wooden table in a bright room with bookshelves behind her.', caption: 'Illustrative photo, not a Tutafy user. A trial lesson is a video call, so test the call too.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Woman_smiling_and_using_laptop_during_video_call_in_cozy_wooden_room.jpg' },
  { type: 'h2', text: 'Where tutors are found, and what each place is good for' },
  { type: 'p', text: `You can look in four places, and the checks work in all of them. The place changes who has already done some of the checking for you, and who you can complain to.` },
  { type: 'compare', caption: 'Four places to find an online tutor. Our summary, not a ranking.', headers: ['Where', 'What it does for you', 'What it does not do'], rows: [
    ['A marketplace such as Wyzant, Preply or italki', 'Search by subject, level and price, read profiles, book and pay on one site. Some offer trial lessons and a refund route.', 'Does not know whether this tutor suits you. Fees and refund terms differ, so read them.'],
    ['A tutoring company or school service', 'May screen its tutors and match you to one.', 'You often cannot choose the person, and the price includes the company.'],
    ['A recommendation from a teacher, friend or parent', 'Someone who has seen the tutor teach vouches for them.', 'Their student may not be you. Still check goal, time and price.'],
    ['A tutor\'s own booking page', 'Direct contact, often a lower price because no platform takes a share, and a booking in your time zone.', 'Nobody has checked the tutor for you, so checks 3, 6 and 9 matter more.'],
  ] },
  { type: 'p', text: `Whichever you use, shortlist two or three tutors and compare them on the same ten points.` },
  { type: 'h2', text: 'The ten checks at a glance' },
  { type: 'compare', caption: 'The ten checks, in the order you can do them.', headers: ['#', 'Check', 'When', 'You are looking for'], rows: [
    ['1', 'Your goal, in a sentence', 'Before you search', 'What you want to do, by when'],
    ['2', 'The exact subject match', 'Before you book', 'Your exam, level, age or language variety named'],
    ['3', 'The profile as evidence', 'Before you book', 'Specific, checkable claims'],
    ['4', 'The full price', 'Before you book', 'The total at checkout, not the headline rate'],
    ['5', 'A time you can keep', 'Before you book', 'A weekly slot in your own time zone'],
    ['6', 'Trial, cancellation and refund rules', 'Before you pay', 'Written terms you can read'],
    ['7', 'How you pay', 'Before you pay', 'A method you can dispute, on the platform'],
    ['8', 'The first lesson as a test', 'In the first lesson', 'Level checked, you talking, a next step'],
    ['9', 'Safety', 'Before and in the first lesson', 'Checks that suit who is learning'],
    ['10', 'A review after four lessons', 'After about a month', 'Evidence of progress against your goal'],
  ] },
  { type: 'h2', text: 'Stage one: before you book' },
  { type: 'h3', text: '1. Write your goal in one sentence, with a date' },
  { type: 'p', text: `"Get better at English" cannot be tested, and a tutor cannot aim at it. "Order food and talk to my landlord in English by March" can. "Raise my algebra mark from a C to a B by the June exam" can. A goal names a skill, a place to use it and a date, and it is the yardstick for check 10.` },
  { type: 'p', text: `The goal also decides what kind of tutor to look for. The Education Endowment Foundation, a UK charity that reviews education research, rates one to one tuition at about five additional months' progress on average, with evidence it calls moderate, and says tuition should be additional to normal teaching and explicitly linked with it. That is a finding about school pupils. It does not tell you how much an adult will gain learning a language. But the idea carries over: tuition that is tied to something you are really doing, such as a course, an exam or a job, is easier to steer than tuition about nothing in particular.` },
  { type: 'h3', text: '2. Check the tutor teaches your exact thing' },
  { type: 'p', text: `A tutor of "maths" and a tutor of "GCSE maths, higher tier, AQA" are not the same offer. Look for your exam or board, your level, the age group, the language variety (British or American English, for instance) and whether they teach beginners or only advanced learners. If the profile does not name your case, ask in a message before you book. A good tutor will answer in a sentence. A vague reply is information.` },
  { type: 'p', text: `Be careful with a tutor who claims to teach everything. Some can. But a profile that lists a dozen subjects and no levels tells you less than one that lists two and explains how a lesson goes.` },
  { type: 'h3', text: '3. Read the profile as evidence, not an advert' },
  { type: 'p', text: `A profile is the tutor's own account, so read it the way you would read any claim: which parts could you check? Look for these.` },
  { type: 'ul', items: [
    `A description of a lesson: what you do in the first ten minutes, what you take away, what homework looks like.`,
    `A specific kind of student. "Adults who understand English but freeze when they speak" is a claim you can test. "All students" is not.`,
    `Qualifications and experience that can be named. If a qualification matters to you, ask to see it: a profile cannot prove it.`,
    `An introduction video, if the platform has one. You hear the accent, the pace and the manner before you commit.`,
    `Reviews, read for detail. "Great tutor!" says little. "She corrected my past tense in every lesson and gave me a list" says a lot. A review is one student's experience, and a platform may show only some.`,
    `Silence on results. Be wary of a promised score or grade.`,
  ] },
  { type: 'p', text: `A profile can only tell you what the tutor chose to say. Check 8 tells you the rest. If you are a tutor, the same list is a guide to writing a profile that passes it, and our tutor bio guide has examples.` },
  { type: 'h3', text: '4. Work out the full price' },
  { type: 'p', text: `The headline rate is rarely the whole price. The only number that matters is the total at checkout for the lesson you want. Wyzant shows the pattern: it charges students a 9% service fee on top of the tutor's rate, so a lesson posted at $50 costs $54.50. Our guide to Wyzant fees explains it from the tutor's side. Another platform may build the cost into the rate. We did not compare totals, so this is not a ranking. Open the checkout page and read the last number before you click.` },
  { type: 'p', text: `Then look at what you are buying. A single lesson, a trial lesson and a package of ten are different products, and only the first two let you leave cheaply. A package is a payment in advance for a person you have not tested, so check 6 comes first. Our guide to lesson packages lists the expiry and refund terms to ask about.` },
  { type: 'h3', text: '5. Check you can keep a weekly time' },
  { type: 'p', text: `Online tutoring crosses time zones, and a lesson booked at "7 pm" is 7 pm for someone. Make sure the booking shows your time zone, or ask the tutor to name the time in yours. Then ask for the same weekly slot. A fixed slot is easier to keep, and the Education Endowment Foundation's review points to regular, short sessions over a set period as part of what works: about 30 minutes, three to five times a week, for up to ten weeks. That is the pattern in school studies. Most private learners cannot do it and need not copy it. The lesson to take is that regular beats occasional.` },
  { type: 'p', text: `Two clock changes a year and a tutor in another country can shift a regular slot by an hour for part of the year. Our guide to scheduling lessons across time zones lists the dates and says what to agree.` },
  { type: 'h3', text: '6. Read the trial, cancellation and refund rules before you pay' },
  { type: 'p', text: `A trial lesson is the cheapest way to test a tutor, and platforms treat it differently, which is why you read the rules first. As the official pages describe them:` },
  { type: 'ul', items: [
    `Preply. A trial lesson is bought on the tutor's profile in a 25 or 50 minute slot, one per tutor per student. It normally includes introductions, your goals, a short level check, a sample activity and a suggested plan. If it does not work out, the page says you can switch tutor or be refunded.`,
    `italki. The teacher sets the trial price. Trials are usually around 30 minutes, and a student may take one per teacher. italki's own pages disagree on how many trials a student can take in total, so we give no number.`,
    `Wyzant. For a first lesson with a new tutor you can ask Wyzant support for a refund of the first hour. It is the first hour only, and it applies to a tutor you have not had lessons with before.`,
    `Tutafy. A tutor may switch on a 30-minute trial lesson at a price the tutor chooses, for a first lesson only. A tutor who has not switched it on offers none, so look for it on the profile.`,
  ] },
  { type: 'p', text: `Then read the cancellation rule, which says what you lose if you move or miss a lesson. Wyzant's pages, for example, allow a tutor to set a cancellation policy of up to 36 hours' notice and say that charging more than the cost of the session is abusive. Another tutor on another platform may have a different rule. The point is to read it before the first lesson, not the day you need to cancel. Our guide to tutoring cancellation policies shows what a fair one contains.` },
  { type: 'callout', variant: 'warn', title: 'Trial and refund terms are not the same everywhere', text: `We found no page that says the same thing about trials on two platforms, and Wyzant's pages did not say how a refund affects the tutor's pay. The rule that matters is the one on the platform you use, on the day you pay. Screenshot it or copy it, because pages change.` },
  { type: 'h3', text: '7. Pay in a way you can dispute, and keep it on the platform' },
  { type: 'p', text: `This check is about money, and most guides leave it out. The US Federal Trade Commission's advice on spotting scams starts with how someone asks you to pay. It says to pay by credit card when you can, because a card carries dispute rights. If you are charged for something you did not get, you can ask the issuer to investigate, but the notice has to reach the company within 60 days of the first bill showing the error. Wiring money is like sending cash and almost never comes back, a gift card is gone once you read out the number, and crypto has no legal protection. Its rule of thumb: anyone who says you can only pay one of those ways is probably a scammer.` },
  { type: 'p', text: `Two consequences. If a tutor asks you to pay outside the platform where you found them, be careful: on Wyzant payment outside the platform is not permitted, and its safety page says its protections do not apply off the platform. And if a stranger asks for a large payment up front, slow down. Pay for one lesson, then another.` },
  { type: 'image', src: '/blog/inline/find-two-at-laptop', alt: 'Two people seen from behind looking at a laptop screen on a table, one of them touching the trackpad, with a glass, a pencil and two phones on the table.', caption: 'Illustrative photo, not a Tutafy user. In a good first lesson you do something, not only listen.', credit: 'Photo: Irvin Parco Sto. Tomas (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:One-on-one_tutorial_during_the_WikiTutorial_Session_1.jpg' },
  { type: 'h2', text: 'Stage two: the first lesson' },
  { type: 'h3', text: '8. Use the first lesson as a test' },
  { type: 'p', text: `Go in with a real task: a page of homework, a past-paper question, a paragraph you wrote, a conversation you dread. Watch what the tutor does with it. These are the five things worth noticing, and none needs any teaching knowledge from you.` },
  { type: 'ul', items: [
    `Did they check your level before they taught? A tutor who asks you to do something, or asks what you already know, is finding the starting point. A tutor who starts a prepared lesson without asking is guessing.`,
    `Did you do the talking, writing or solving, or did they? In a language lesson you should speak for much of it. In a maths lesson you should be the one with the pen for part of it.`,
    `Did they explain a mistake, or only correct it? "That is wrong, here is the answer" teaches less than "this is why it goes wrong".`,
    `Did they leave you with a next step? A task, a topic for next time, a short plan. A lesson with no next step is easy to forget.`,
    `Did the call work? Sound, picture, a shared screen or whiteboard and a lesson that starts on time. A tutor who handles the tools badly will keep losing minutes.`,
  ] },
  { type: 'p', text: `You do not need to love the tutor. You need to be able to say, after the lesson, what you did and what you will do next. If you cannot, try your second shortlisted tutor. Preply's page says a trial normally covers a level check, a sample activity and a suggested plan, which overlaps this list.` },
  { type: 'h3', text: '9. Check safety for who is learning' },
  { type: 'p', text: `Safety is a different check for an adult and for a child. For an adult learner it is mostly the payment and communication checks above, plus basic care with personal details: you do not need to share your address, your bank details or your employer to learn a language.` },
  { type: 'p', text: `For a child it is more. The NSPCC, a UK child protection charity, advises parents and carers to ask a tutor for an up-to-date criminal records check certificate and two referees, and whether the tutor has a safeguarding policy and a code of conduct. It advises that an adult is within earshot, that an online lesson takes place in a shared space and not a bedroom, and that the tutor contacts the parent, not the child directly. It also advises regular progress updates, asking your child how lessons are going, and stopping if you or your child feel uncomfortable. The UK government's guidance for parents on out-of-school settings asks for a child protection policy in the same way. Both are UK guidance and rules differ elsewhere, but the questions travel.` },
  { type: 'p', text: `A platform may make some of this easier. On Wyzant, for example, a student or parent can order a background check on a tutor, the person who orders it pays $15.99, and a tutor whose profile has a check bought on it must pass it to stay. A check shows what a record contained on the day. It is not a promise about the future, and many platforms and tutors offer none. If a check matters to you, ask.` },
  { type: 'image', src: '/blog/inline/find-taking-notes', alt: 'A hand holding a pencil over a notebook page of handwritten notes on a table.', caption: 'Write down what you did in the lesson. It is your evidence for check 10.', credit: 'Photo: Thought Catalog (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Taking_notes_with_a_pencil_(Unsplash).jpg' },
  { type: 'h2', text: 'Stage three: after about four lessons' },
  { type: 'h3', text: '10. Review progress against your goal, then decide' },
  { type: 'p', text: `After about four lessons, sit down with the sentence you wrote in check 1. Can you do a little more of it than you could a month ago? Not "did I enjoy it", which is not the same thing, but: what can I now do that I could not? Use your notes from each lesson. If you can point to two or three things, stay. If you cannot, say so to the tutor and ask what will change. If nothing changes in a lesson or two, switch.` },
  { type: 'p', text: `Four is a rule of thumb, not a figure from a study. We found none that says how many lessons you need to judge a tutor. A month of regular lessons gives you enough to compare against your goal, and a month is a short time to have spent if the answer is no.` },
  { type: 'p', text: `This is also where a package makes sense. Once the tutor has passed your review, a package may be cheaper per lesson. Before then, pay as you go.` },
  { type: 'h2', text: 'Warning signs, in one place' },
  { type: 'ul', items: [
    `A request to pay outside the platform, or only by wire, gift card or crypto.`,
    `A promised score, grade or fluency by a date, with no plan for how.`,
    `A tutor who will not do a trial lesson or explain a refund, or who hurries you to pay for a package.`,
    `Pressure: "only today", "the last slot", "pay now to hold it".`,
    `For a child, a tutor who wants private contact outside lessons, or objects to an adult being nearby.`,
    `No next step after three lessons, and no answer when you ask what the plan is.`,
  ] },
  { type: 'p', text: `One warning sign is not a verdict. Two or three together are a reason to try someone else, which is the cheapest thing you can do.` },
  { type: 'h2', text: 'What Tutafy can and cannot do for you' },
  { type: 'p', text: `Tutafy is a set of tools that tutors use to run their own bookings: a public booking page that shows free hours in the visitor's time zone, a video classroom in the browser, reminders and payment through the tutor's own account. A tutor on Tutafy is an independent person running a small business. Here is what that means for you as a learner.` },
  { type: 'ul', items: [
    `The tutor directory is not open yet. Its page says it opens once six tutors are ready, and today it lists none. We would rather say so than point you at an empty page. If you know a tutor who uses Tutafy, you can book through that tutor's link.`,
    `"Find me a tutor" asks five questions, such as the language, the level, the price range and the time of day, and shows the three tutors that fit best. It is closed on the same rule as the directory, so it shows nothing yet.`,
    `A tutor may offer a 30-minute trial lesson at a price the tutor sets, for a first lesson only. Look for it on the booking page.`,
    `Tutafy does not check qualifications, run background checks, vouch for a tutor or guarantee results or a refund. Checks 3, 6 and 9 are yours to make on any tutor, including one who uses Tutafy.`,
    `A tutor on Tutafy keeps the whole lesson fee, because Tutafy takes 0% commission. That may let a tutor charge less than on a marketplace, but we do not promise it.`,
  ] },
  { type: 'p', text: `If you are a tutor and want learners to find you, there are two honest routes: a marketplace, which finds students and keeps a share, or your own page with your own students. Our guides on online tutoring jobs and on Wyzant fees do the sums.` },
  { type: 'source', text: 'Official pages used here, read on 31 Oct 2026. The pages below answered 403 or 404 to our script, so each figure comes from the search result of the official page, not the page opened in a browser. Read the current page before you decide.', links: [
    { label: 'Education Endowment Foundation: one to one tuition', href: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/one-to-one-tuition' },
    { label: 'US Federal Trade Commission: a way to spot scams, how someone asks you to pay', href: 'https://consumer.ftc.gov/consumer-alerts/2026/07/way-spot-scams-how-someone-asks-you-pay' },
    { label: 'NSPCC: finding a tutor for your child', href: 'https://www.nspcc.org.uk/keeping-children-safe/outside-the-home/find-tutor-child/' },
    { label: 'NSPCC: safeguarding and child protection for tutors', href: 'https://learning.nspcc.org.uk/safeguarding-child-protection/tutors' },
    { label: 'GOV.UK: using after-school clubs, tuition and community activities', href: 'https://www.gov.uk/government/publications/guidance-for-parents-and-carers-on-safeguarding-children-in-out-of-school-settings/using-after-school-clubs-tuition-and-community-activities' },
    { label: 'Wyzant: the Good Fit Guarantee', href: 'https://support.wyzant.com/students-parents/lessons/whats-the-good-fit-guarantee/' },
    { label: 'Wyzant: background check policy', href: 'https://support.wyzant.com/tutors/tutor-account/background-check-policy/' },
    { label: 'Wyzant: service fee charged to students', href: 'https://support.wyzant.com/tutors/tutor-payments/what-is-the-service-fee-charged-to-students/' },
    { label: 'Preply: how to book a trial lesson', href: 'https://help.preply.com/en/articles/4179487-how-to-book-a-trial-lesson' },
    { label: 'Preply: what can I expect from my trial lesson', href: 'https://help.preply.com/en/articles/5707752-what-can-i-expect-from-my-trial-lesson' },
    { label: 'italki: what are trial lessons', href: 'https://support.italki.com/hc/en-us/articles/360022944554-What-are-trial-lessons' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'Wyzant fees for tutors', href: '/blog/wyzant-fees-for-tutors', text: 'What the extra 9% is, from the tutor\'s side of the same lesson.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'What a package is, and the terms to ask about.' },
    { label: 'Tutoring cancellation policies and contracts', href: '/blog/tutoring-cancellation-policy-and-contracts', text: 'What a fair cancellation rule contains.' },
    { label: 'How to schedule tutoring lessons across time zones', href: '/blog/schedule-tutoring-lessons-across-time-zones', text: 'The clock-change dates that move a regular slot.' },
    { label: 'IELTS Speaking Part 2 topics', href: '/blog/ielts-speaking-part-2-topics', text: 'A practice routine to use in a lesson with an IELTS tutor.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'What a good profile says, written for tutors.' },
    { label: 'Spanish tutor online', href: '/blog/spanish-tutor-online', text: 'The checks applied to one language.' },  ] },
  { type: 'faq', items: [
    { q: 'How do I find a good online tutor?', a: `Write your goal in one sentence with a date, shortlist two or three tutors who teach your exact subject and level, read their trial, cancellation and refund rules, pay by a method you can dispute, and use the first lesson as a test. After about four lessons, judge by whether you can do more of what you wanted.` },
    { q: 'How do I know if an online tutor is legit?', a: `Check that the profile makes specific claims you can check, that payment goes through the platform, and that they will do a trial lesson and explain a refund. A profile cannot prove a qualification, so ask to see one if it matters. Be wary of a promised grade or a request to pay outside the platform.` },
    { q: 'Is a trial lesson worth it?', a: `Yes, for most learners. It is the cheapest way to see how a tutor checks your level, whether you do the talking and whether you leave with a next step. Terms differ by platform, so read them first. On Preply a trial is a 25 or 50 minute lesson, and on italki the teacher sets the price.` },
    { q: 'How should I pay for online tutoring?', a: `By credit card where you can, on the platform where you found the tutor. The US Federal Trade Commission says a card carries dispute rights, and that anyone who says you can only pay by wire, gift card or crypto is probably a scammer. Pay for one lesson at a time until the tutor has passed your review.` },
    { q: 'How do I find a safe online tutor for my child?', a: `The NSPCC advises asking for an up-to-date criminal records check certificate and two referees, a safeguarding policy and a code of conduct, an adult within earshot, lessons in a shared space and contact through the parent. Both its advice and GOV.UK's guidance are for the UK, but the questions apply elsewhere.` },
    { q: 'Does Tutafy have tutors I can book today?', a: `Not through the directory. Its page says the directory opens once six tutors are ready, and today it lists none. If you know a tutor who uses Tutafy, you can book through that tutor's own link. Tutafy does not vet tutors or guarantee results.` },
  ] },
  { type: 'cta', title: 'Teach? Take bookings on your own page', text: 'If you are a tutor, the Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not find you students yet.', button: 'Start free, no credit card', href: '/register' },
]
