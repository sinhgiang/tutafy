// T-1218. Article body for /blog/how-to-get-tutoring-students (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1450-tutafy-batch2-10-articles-plan.md, article 7 (calendar day 11 Nov 2026).
// Step 0 (31 Oct 2026). Search results for "how to get tutoring students" (the search tool is not Google itself) were mostly university tutoring-centre pages, a coaching podcast and
// two general guides (APU, Youth Central); few pages written for a tutor who has no students yet. The pages on our own blog that touch the subject, read in full:
//   get-your-first-tutoring-clients ("first 10 tutoring clients without a marketplace"): a CHANNEL playbook for a tutor who wants to leave marketplaces: booking link, people you know, online communities,
//     referrals, price, trial, a 30-day plan. This is the closest article and the overlap is real, so this one does NOT repeat the channel list and does not give another 30-day plan.
//   how-to-start-an-online-tutoring-business (step 5 is two paragraphs), how-to-build-a-tutor-referral-program (one channel in depth), how-to-write-a-tutor-bio, online-tutoring-jobs, marketplace-vs-independent-the-real-math.
// Own angle: a DIAGNOSTIC. Work backwards from ten students to the number of conversations needed, name each stage, keep a tracker, and when students do not come, say which stage is failing and what to change.
// It adds what the old article does not: who is buying (parent, adult, school), the Google Business Profile rules for tutors who visit, the FTC rule on reviews, CAN-SPAM, and message templates for the whole sequence.
// The old article links here and this one links back. If the Chief prefers to treat the overlap as "update the old article instead", this branch can be dropped without touching the other article.
//
// Sources, read directly on 31 Oct 2026:
//   US Bureau of Labor Statistics, Occupational Outlook Handbook, Tutors: about 12% self-employed; "Most tutors work part time, and their schedules may vary"; evenings and weekends; more hours during the school year and before
//     standardized test dates. The page does not say how tutors find clients.
//   FTC, Consumer Reviews and Testimonials Rule, questions and answers (staff guidance): effective 21 Oct 2024; fake reviews and buying reviews known to be false prohibited; an incentive is allowed if it does not require a particular
//     sentiment; insiders must disclose; suppression by intimidation, unfounded legal threats or false accusations prohibited; a generalized request to buyers is exempt, asking only the customers you expect to be happy could still violate the FTC Act.
//   FTC, CAN-SPAM Act: A Compliance Guide for Business: eight requirements; up to 53,088 USD per separate violating email; no business-to-business exception; transactional or relationship messages exempt from most provisions.
//   Google Business Profile Help (answers 9157481 and 3038177): a physical location customers can visit, or travelling to customers; service-area businesses may hide the address; virtual offices not eligible; one profile per business; tutoring and online-only not mentioned.
// Not read, so not written: any published rate at which enquiries become lessons, what any school or library allows, platform terms on taking students off a platform, advertising costs, Reddit rules (403), laws outside the United States.
// Tutafy facts from the code on 31 Oct 2026: Free plan 10 students, Pro 12 USD, Academy 29 (src/lib/plans.ts); the "Get your first student" card (src/lib/first-student.ts); the standard 30-minute trial (src/lib/trial.ts,
// docs/features/T-1007-standard-trial.md); the directory opens at 6 tutors (DIRECTORY_OPENS_AT in src/lib/directory.ts); coupons are Pro. Every number in the worked example is invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const GET_TUTORING_STUDENTS_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'Getting students is a chain: people see you, some reply, some book a trial, some become regulars. Find the thin step before you try a new channel.',
    'Work backwards. If one in three enquiries books a trial and one in two trials becomes a regular, ten regulars need about sixty enquiries. Those rates are invented. Count your own.',
    'Parents, adult learners and schools buy differently. Write to one of them at a time.',
    'Two rules apply as soon as you promote yourself: the FTC rule on reviews and, if you email strangers, the CAN-SPAM Act.',
    'Tutafy gives you the booking page, the 30-minute trial and payments. It does not send you students: its directory opens only when 6 tutors are ready.',
  ] },
  { type: 'p', text: `To get tutoring students, tell people who need your subject exactly what you teach, make it easy to reply, and count what happens at each step: how many saw your message, how many answered, how many booked a trial and how many came back for a second lesson. The step where the count drops hardest is the one to fix. Most tutors who say they cannot find students are losing them at one step, and a new channel will not help until that is repaired.` },
  { type: 'p', text: `This guide covers where students come from, how many conversations ten regulars need, who is buying, message templates, the two legal rules that catch new tutors, a tracker and a table that matches what you see to what to change. Our guide to the first ten clients covers the channels that work without a marketplace. This one assumes you have a channel or two and asks why they are not turning into lessons.` },
  { type: 'image', src: '/blog/inline/students-private-tuition', alt: 'A tiled floor beside a table where a stack of notebooks and textbooks and a dark school backpack sit under a chair, with several pairs of sandals and a trainer left near the door.', caption: 'Illustrative photo, not a Tutafy user. A first student usually comes from a person, not an advertisement.', credit: 'Photo: Ikshya (CC BY 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Private_Tuition_in_India.jpg' },
  { type: 'h2', text: 'Where tutoring students come from' },
  { type: 'p', text: `There are only a handful of sources. What differs is how quickly each produces a first lesson and what it asks of you. The table is our own judgement, not measured data: we found no published conversion rates for tutors, and the US Bureau of Labor Statistics page for tutors, read on 31 October 2026, does not say how tutors find clients. Use it as a map and replace our guesses with your counts.` },
  { type: 'compare', caption: 'Seven sources of tutoring students. Speed and effort are our judgement, not measured figures.', headers: ['Source', 'Who arrives', 'How fast', 'The catch'], rows: [
    ['People you know', 'Friends, former classmates, colleagues, their children', 'Days', 'A small pool that runs out unless it feeds referrals.'],
    ['Referrals from students and parents', 'People who trust someone who trusts you', 'Weeks', 'You cannot start here. It needs students first.'],
    ['Teachers, schools and tutoring centres', 'Students whose teacher says "get some extra help"', 'Weeks to months', 'Some schools have rules about recommending tutors. Ask first.'],
    ['Local places (in-person tutors)', 'Parents and adults nearby', 'Weeks', 'Only works if you really meet students in person or visit them.'],
    ['Online communities', 'Learners asking questions in public', 'Weeks to months', 'Each community has rules. Pitching gets you removed.'],
    ['A marketplace', 'Strangers searching a platform', 'Days after approval', 'A commission, platform rules, and the student belongs to the platform.'],
    ['Your own page, found by search', 'People who type what you teach', 'Months', 'Slow to start and not guaranteed.'],
  ] },
  { type: 'p', text: `The first two rows are people, not platforms. The BLS page says about 12% of tutors are self-employed and most work part time, with evenings and weekends common and more hours during the school year and before standardized test dates. Two things follow. Your buyers are busy at the same hours you are, so replies may arrive in the evening. And demand follows the school calendar, so a tutor who starts looking the week before an exam is late.` },
  { type: 'h2', text: 'Work backwards from ten students' },
  { type: 'p', text: `Ten is a goal. To plan for it you need a number at each step. An enquiry is a person who asks about lessons, a trial is a first lesson, a regular is someone who books a second and third, and a conversation is any two-way exchange with a possible student or parent. Each step keeps only a share of the one before. Multiply backwards from your goal and you get the work.` },
  { type: 'compare', caption: 'An invented example. Every figure is made up to show the arithmetic. Yours will differ, which is the point.', headers: ['Step', 'What counts', 'Share that moves on (invented)', 'Needed for 10 regulars'], rows: [
    ['Regular', 'Booked a second and third lesson', '1 in 2 trials', '10 regulars'],
    ['Trial', 'Had a first lesson with you', '1 in 3 enquiries', '20 trials'],
    ['Enquiry', 'Asked about price, times or fit', '1 in 5 conversations', '60 enquiries'],
    ['Conversation', 'A two-way exchange with a possible student or parent', 'Starts with you', '300 conversations'],
  ] },
  { type: 'p', text: `Read it from the bottom: three hundred conversations for sixty enquiries for twenty trials for ten regulars. That looks like a lot, but two things change the picture. The rates are not fixed: a clearer message can double the share that reply, and a better trial can double the share that return. And conversations are cheap with people who already know you, while a referral skips the bottom two rows because it arrives as an enquiry. After about twenty conversations you have a rough share for the first step, and after about ten trials one for the last.` },
  { type: 'callout', variant: 'info', title: 'A caution about numbers', text: `You will find posts that say "tutors convert 30% of enquiries" or "send 50 messages a week". We found no published source for any such figure that we could check, so we do not give one. The only rates worth using are the ones you count.` },
  { type: 'h2', text: 'Who is buying: a parent, an adult or a school' },
  { type: 'p', text: `Three kinds of buyer look for tutors, and the same message does not suit all three. Decide which you are writing to before you write.` },
  { type: 'compare', caption: 'What each buyer wants to see first. Our own summary, not a survey.', headers: ['Buyer', 'First question in their head', 'What to show', 'Who decides'], rows: [
    ['A parent of a child or teenager', 'Who is this person and is it safe?', 'Your name, a short background, how the lesson is run, a way to speak to you first', 'The parent, often with the student'],
    ['An adult learner', 'Will this get me the result by my deadline?', 'The result you work towards, how often you meet, a plan for the first month', 'The learner alone'],
    ['A school, centre or employer', 'Can we rely on you?', 'A one-page profile, references on request, a clear price', 'A teacher or a manager'],
  ] },
  { type: 'p', text: `The parent is the most common buyer and the hardest, because the question is trust before skill. Say who you are, what a lesson looks like and offer a short call before the trial. Rules about working with children differ by country and sometimes by city, and we found no single official page that sets out what a parent may ask a private tutor, so look up the rules where you teach and never claim a background check you do not have. An adult decides alone and fast and wants a result, so say what changes for them. Our guide to writing a tutor bio has fifteen invented examples.` },
  { type: 'image', src: '/blog/inline/english-tulane-studying', alt: 'Four young men seated around a round table in a library lounge, writing in notebooks, with calculators, open textbooks and loose pages of notes spread across the table.', caption: 'Illustrative photo, not a Tutafy user. Adult learners decide alone and look first at what you teach and when you are free.', credit: 'Photo: Tulane Public Relations (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Four_Tulane_University_Students_Studying_January_2008.jpg' },
  { type: 'h2', text: 'Route 1: the people who already know you' },
  { type: 'p', text: `Start here because it is fast and because the replies teach you what people hear when you describe your lessons. List thirty people: relatives, friends, former classmates, past colleagues, neighbours, parents you know through a school, anyone who has ever asked you for help with your subject. Write each one a message. A message that mentions something real, such as "Sam has a chemistry exam in March", gets an answer where a general one will not.` },
  { type: 'p', text: `Ask for two things: do they know someone who needs the subject, and would they pass on your link. Do not ask a friend to become a student unless they are a likely one, because it makes them say no to a friend.` },
  { type: 'compare', caption: 'A message to someone you know. The names are invented.', headers: ['Weak', 'Better'], rows: [
    ['Hi! I am tutoring now. Let me know if you need anything!', 'Hi Dana, I now tutor GCSE maths online, evenings and weekends. Your Sam mentioned the mock exams in January. If a parent you know wants a trial lesson, here is my page: [link]. No pressure at all.'],
  ] },
  { type: 'h2', text: 'Route 2: teachers, schools and tutoring centres' },
  { type: 'p', text: `A teacher sees which students are slipping, and a school office is asked for tutor names every term. You can introduce yourself to a teacher, a head of department or a learning-support coordinator and leave a one-page profile with your subjects, levels, price and how to reach you. Some schools have a policy on recommending named tutors, and we did not read any school's rules, so ask what is allowed first. Never contact a student at school without the school's approval.` },
  { type: 'p', text: `Tutoring centres and learning companies are another door. They find students for you and keep part of the fee, which is the marketplace trade in another form. Our guide to online tutoring jobs sets out what several ask and pay. It is a fair way to build hours while your own list is short.` },
  { type: 'h2', text: 'Route 3: local places, if you teach in person' },
  { type: 'p', text: `If you teach in person or travel to students, a profile on Google Maps can bring local parents and adults. Google's help page says a business with a physical location customers can visit, or one that travels to customers, can create a profile, and a business that visits customers but does not serve them at its own address can be a service-area business and hide its home address. It also says virtual offices are not eligible, a profile must reflect your business accurately, and there is one profile per business. The pages do not mention tutoring or online-only businesses.` },
  { type: 'p', text: `So if you teach online only, do not try to make a map profile, because it is not what the profile is for. If you visit students or meet them at a real place, read the current guidelines for service-area businesses, choose categories honestly and keep your home address private. A notice on a community board is the older version of the same idea, and whether a library, shop or hall lets you post is for each place to say.` },
  { type: 'image', src: '/blog/inline/students-notice-board', alt: 'A wooden outdoor notice board with a cork surface holding several printed notices and a child\'s drawing of a bear wearing a mask, set among green plants.', caption: 'Illustrative photo, not a Tutafy user. A community notice board: whether you may post is for each place to say.', credit: 'Photo: Sarahlibrarina (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Community_notice_board_in_North_East_Valley,_Dunedin.jpg' },
  { type: 'h2', text: 'Communities, referrals and marketplaces' },
  { type: 'p', text: `Learners ask questions in forums and groups. Read each group's rules, answer well and mention your lessons only where that is allowed. We could not read Reddit's current rules page, so we quote none. A referral arrives as an enquiry with trust attached, and the way to get one is a good lesson followed by one easy link to pass on. A marketplace is the quickest way to meet strangers, but it keeps a share of the fee and treats the student as its own, so read its terms on contact outside the platform before you promise anyone anything. We did not read those terms for this guide.` },
  { type: 'h2', text: 'Messages that get a reply' },
  { type: 'p', text: `The same four messages come up in almost every tutor's first month. Keep each short, put one question in it and never write a paragraph where a sentence will do. The names and details are invented.` },
  { type: 'h3', text: '1. A first message to a possible student or parent' },
  { type: 'p', text: `"Hi Priya, I teach A-level chemistry online, mostly students aiming for an A or A*. Is your son still working on equilibria? I can do a free 15-minute chat this week to see whether lessons would help. Evenings suit me best. Which day works?" It names the subject and the problem, offers one small step and ends with one question.` },
  { type: 'h3', text: '2. A reply to an enquiry' },
  { type: 'p', text: `"Thanks for asking. Lessons are 50 minutes and cost 40 dollars. For a first step I offer a 30-minute trial for 15 dollars, so you can see how I teach. Which suits you: Tuesday at 6 pm or Thursday at 7 pm? Please tell me your time zone." Reply within a few hours if you can. A slow reply gives a possible student time to ask someone else.` },
  { type: 'h3', text: '3. A follow-up after silence' },
  { type: 'p', text: `"Hi Priya, I wanted to follow up in case my last message got buried. If now is not a good time, no problem. I have two evening slots free next week. Would you like me to hold one?" Send one follow-up after three or four days and a second only if there is a reason, such as a free slot or an exam date. After that, stop. A third message becomes pressure.` },
  { type: 'h3', text: '4. After the trial' },
  { type: 'p', text: `"Thanks for today. Here is what we covered, and here is what I would work on next: the first three questions on the sheet. I can hold the same slot every Thursday. Shall I book the next two?" End with a choice of the next two lessons, not a general invitation. A student with a booked time is a regular.` },
  { type: 'h2', text: 'Reviews and recommendations: what the FTC rule says' },
  { type: 'p', text: `Once you have a few students, you will want reviews. The Federal Trade Commission's rule on consumer reviews and testimonials took effect on 21 October 2024. The FTC's staff guidance for small businesses says fake reviews, and buying reviews you know or should know are false, are prohibited. An incentive for a review is not prohibited as long as it does not require the reviewer to express a particular sentiment, so a discount for a five-star rating is out while a thank-you for any honest review is not. Employees and their relatives may post but must disclose the relationship. You may not suppress reviews by intimidation, unfounded legal threats or false accusations.` },
  { type: 'p', text: `In practice: ask every student, not only the ones you think were happy, because a general request to buyers is exempt while asking only the likely-positive ones could still be a problem. Do not write reviews for your own page. Do not ask a relative to post without saying who they are. Do not tie a reward to the rating. This is staff guidance for the United States, not legal advice.` },
  { type: 'h2', text: 'Emailing people you do not know: the CAN-SPAM Act' },
  { type: 'p', text: `Writing to a friend is one thing. Sending a promotional email to a list is another, and in the United States the CAN-SPAM Act applies to commercial email. The FTC's compliance guide lists eight requirements: accurate header information, a subject line that reflects the content, a clear statement that the message is an advertisement, your valid physical postal address, a clear way to opt out, opt-outs that also work for subscribers and members, an opt-out honoured within ten business days, and responsibility for anyone you hire to send for you. It gives a penalty of up to 53,088 dollars per separate email in violation and says the law makes no exception for business-to-business email.` },
  { type: 'p', text: `A reply to someone who wrote to you, or a note about a lesson already booked, is mostly a relationship message and is exempt from most of these rules. A bulk email to people who never asked to hear from you is the case to avoid. The simplest course for a new tutor is to write one-to-one to people you have a reason to contact. Other countries have their own laws, and we did not read them.` },
  { type: 'h2', text: 'Reply fast, ask one question, offer a trial' },
  { type: 'p', text: `Once someone writes, three habits do most of the work. Reply the same day, because the person has probably asked several tutors. Ask about their goal, deadline and free times, not about price. And offer a small first step: a short free chat or a paid trial lets them judge you at low risk, and our older guide discusses which suits different students.` },
  { type: 'p', text: `Teach the trial as a real lesson: find out what they want, give one thing they can use that day and end with a plan for the next two lessons. In Tutafy the trial is a standard 30-minute lesson that you switch on and price in Settings. It is for a first lesson only, and the server refuses a second trial for a student who already has a lesson with you.` },
  { type: 'h2', text: 'A tracker you can keep in a spreadsheet' },
  { type: 'p', text: `A tutor who tracks conversations finds the thin step in two weeks. Use one row per person, with a first name or initials only, and these columns.` },
  { type: 'compare', caption: 'A tracker with one row per person. Rows are invented.', headers: ['Name or initials', 'Source', 'First contact', 'Replied', 'Trial date', 'Second lesson', 'Next step and date'], rows: [
    ['P. (parent of a Year 11 student)', 'Friend of a friend', '3 Nov', 'Yes, 3 Nov', '7 Nov', 'Booked 14 Nov', 'Hold Thursday 7 pm'],
    ['Forum member A.', 'Online community', '5 Nov', 'No', '', '', 'Follow up on 9 Nov'],
    ['M. (adult, IELTS)', 'Former colleague', '5 Nov', 'Yes, same day', '8 Nov', 'No', 'Ask what stopped them'],
  ] },
  { type: 'p', text: `Every Friday, count the rows and fill four numbers: conversations, enquiries, trials, regulars. Then write one sentence about which number is lowest relative to the one before it. That sentence is your plan for next week. Keep the routine for a month before changing anything big, because a few days of silence mean little.` },
  { type: 'h2', text: 'When it is not working: match the symptom to the step' },
  { type: 'compare', caption: 'A diagnostic. The causes are the common ones tutors tell us about, not measured findings.', headers: ['What you see', 'The step that is thin', 'Likely causes', 'What to change'], rows: [
    ['Few people reply to your first message', 'Conversation to enquiry', 'Message is general, long, or sent to people who do not need the subject', 'Name the exact subject and problem, end with one question, send to fewer people who fit'],
    ['People reply but never book a trial', 'Enquiry to trial', 'Price or times unclear, slow reply, no small first step', 'Reply within hours, give two time options, offer a short chat or a cheap trial'],
    ['Trials happen but no second lesson', 'Trial to regular', 'The trial was a demo, no plan, no next time booked', 'End the trial with a plan and two booked lessons, send notes the same day'],
    ['Regulars leave after a month or two', 'Keeping students', 'No visible progress, missed lessons, price rises', 'Share progress every few lessons, set a clear cancellation rule'],
    ['You cannot find enough people to talk to', 'Reach', 'Too narrow a niche, wrong places, or one channel only', 'Add a second source from the table, widen the level you teach'],
  ] },
  { type: 'p', text: `If the trial is the weak step, the free-or-paid section of our older guide goes deeper. If keeping students is the problem, see the guide to retaining tutoring students. If price is the sticking point, see the guide to pricing lessons.` },
  { type: 'h2', text: 'Mistakes that keep new tutors empty' },
  { type: 'ul', items: [
    `Describing yourself as "an experienced tutor in many subjects". Name one subject and one kind of student first.`,
    `Answering slowly. A same-day reply beats a better message sent on Thursday.`,
    `Ending a trial without booking the next lesson.`,
    `Giving up after two weeks. A silence of a few days tells you nothing yet.`,
    `Writing reviews for yourself, or offering a reward for a five-star rating. That is the case the FTC rule is aimed at.`,
  ] },
  { type: 'h2', text: 'What Tutafy does here, and what it does not' },
  { type: 'p', text: `Tutafy is a tool for tutors to book, teach and get paid. It helps with the steps after a person says yes. It does not find the person.` },
  { type: 'ul', items: [
    `A booking page you can send in one link, with free times shown in the student's time zone.`,
    `A standard 30-minute trial lesson, switched on and priced by you, for first lessons only.`,
    `A "Get your first student" card on the dashboard with five steps from free hours to a first booking.`,
    `A Free plan for up to 10 students and 0% commission on every plan. Pro is 12 dollars a month, Academy 29. Coupons, packages and payment links are Pro features.`,
    `It does not send you students. The tutor directory opens when 6 tutors are ready, and until then students reach you only through your own link.`,
    `It does not track people who have not booked. For the tracker above, use a spreadsheet.`,
  ] },
  { type: 'source', text: 'The official pages used for the facts about tutor work, reviews, email and map profiles, read on 31 Oct 2026. Our tables and templates are our own advice and every number in the worked example is invented. The FTC pages describe US rules; check the rules where you work.', links: [
    { label: 'US Bureau of Labor Statistics: Tutors', href: 'https://www.bls.gov/ooh/education-training-and-library/tutors.htm' },
    { label: 'FTC: Consumer Reviews and Testimonials Rule, questions and answers', href: 'https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers' },
    { label: 'FTC: CAN-SPAM Act, a compliance guide for business', href: 'https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business' },
    { label: 'Google Business Profile Help: who can create a profile', href: 'https://support.google.com/business/answer/9157481' },
    { label: 'Google Business Profile Help: guidelines for representing your business', href: 'https://support.google.com/business/answer/3038177' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to get your first 10 tutoring clients (without a marketplace)', href: '/blog/get-your-first-tutoring-clients', text: 'The channels: booking link, people you know, communities and referrals.' },
    { label: 'How to build a tutor referral program', href: '/blog/how-to-build-a-tutor-referral-program', text: 'When to ask, what to say, what to offer.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'Say who you help in the first line.' },
    { label: 'How to retain tutoring students', href: '/blog/how-to-retain-tutoring-students', text: 'Keep the ones you worked to win.' },
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'Which platforms and companies hire tutors, and what they keep.' },
  ] },
  { type: 'faq', items: [
    { q: 'How do I get my first tutoring student?', a: `Start with people who know you. Write to thirty people with a message that names your subject and the problem you solve, ask whether they know someone who needs it, and offer a short chat or a low-price trial. A first student more often comes through a person than through an advertisement.` },
    { q: 'Should I use a marketplace or find students myself?', a: `It depends on how many students you have and how long you keep them. A marketplace sends strangers and keeps a share of the fee. Finding students yourself is slower and lets you keep all of it. Many tutors use both for a while.` },
    { q: 'Can I ask students for reviews?', a: `Yes. In the United States the FTC's staff guidance says a generalized request to buyers is exempt from the rule. Ask everyone, do not offer a reward that depends on a rating, do not write reviews yourself and do not ask a relative to post without saying who they are.` },
    { q: 'Is it legal to email people I do not know to promote my lessons?', a: `In the United States the CAN-SPAM Act applies to commercial email, with eight requirements including an opt-out and your postal address, and penalties of up to 53,088 dollars per email. Writing one-to-one to people you have a reason to contact is safer than bulk email. Other countries have their own laws.` },
    { q: 'Can I list myself on Google Maps as an online tutor?', a: `Google's help pages say a profile is for businesses with a physical location customers can visit or that travel to customers. They do not mention online-only tutors, so do not create one for online lessons. If you visit students, a service-area profile with your home address hidden may apply.` },
    { q: 'Does Tutafy send me students?', a: `No. Tutafy gives you a booking page, a video classroom, a standard trial lesson and payments, and a Free plan for up to 10 students. Its tutor directory opens only when 6 tutors are ready, so for now students find you through your own link.` },
  ] },
  { type: 'cta', title: 'Give your first student one link to book', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not send you students.', button: 'Start free, no credit card', href: '/register' },
]
