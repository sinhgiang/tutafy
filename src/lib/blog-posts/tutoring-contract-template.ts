// T-1199. Article body for /blog/tutoring-contract-template (title, date and author are in the POSTS list in src/lib/blog.ts).
// Keyword: "tutoring contract template" (170 searches a month in the US, difficulty 0; OpenSEO, reports/chief/2026-10-31-1315-keyword-data-sapa-tutafy.md). Calendar date 6 Nov 2026.
// Step 0 (31 Oct 2026): the blog already has /blog/tutoring-cancellation-policy-and-contracts (12 Jul 2026). It says WHAT a policy should contain (ten points, three policy styles, no-shows,
// payment structure, e-signature tools) but holds no contract text. The overlap is the cancellation and no-show material, so this post links there and does not repeat it. Own angle: the contract
// itself, written out as a copyable one-page agreement with blanks, clause by clause, plus the rules from official sources that can override a clause, plus what Tutafy does and does not store.
// That post also says Tutafy applies a late fee automatically. The code does not do that (see below); the Chief was told in the hand-over, the old post is left as it was.
//
// Sources, read on 31 Oct 2026:
//   Read directly: Cornell Law School LII, 15 U.S.C. 7001 (E-SIGN Act), section (a) and (c): a signature or contract "may not be denied legal effect, validity, or enforceability solely because it is in electronic form".
//   Read directly: Cornell LII Wex, "Liquidated damages": an exact amount or formula owed on breach; must be clearly stated in the contract and agreed before it is made; courts will not impose a clause that is "punitive, illegal, unconscionable"
//     or "contrary to public policy". The page does NOT say "reasonable estimate", so the article does not say it.
//   Read directly: Cornell LII Wex, "Capacity": "capacity rules often require a person to have reached a minimum age and to be of sound mind"; "A contract signed by a person lacking capacity may be void or voidable".
//     The page does not mention minors by name, so the article does not claim more; it says why we still have the parent sign.
//   Read directly: FTC consumer page "Buyer's Remorse: The FTC's Cooling-Off Rule May Help" (page dated September 2025): three days to cancel certain sales made at your home or at a seller's temporary location, including when you invite a
//     salesperson; not covered: sales under $25 at home, sales made entirely online, by mail or by telephone, business purchases (but the rule "applies to instruction or training courses, regardless of your reason for taking them").
//     The notice and form duties of the seller are from a search summary of FTC pages, not from a line we read, so the article only says the seller has duties and points to the FTC page.
//   Read directly: IRS, "Independent contractor (self-employed) or employee?": three categories of evidence; a written contract is part of the "type of relationship" evidence and "no one factor stands alone".
//   Read directly: gov.uk, "Online and distance selling for businesses": the seller must tell the customer they can cancel up to 14 days after an order is delivered; there are "different rules for downloads and streaming services".
//   NOT read: the Consumer Contracts Regulations 2013 text on legislation.gov.uk came back empty and the GOV.UK guidance PDF could not be read as text. The article says what the regulations do for services (14 days from the day the contract is made,
//     an early start only on the customer's express request, reasonable costs payable if they cancel after) "per a search summary" and tells the reader to read the regulations.
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/components/settings/sections/ExtrasSection.tsx (Settings, "Trial lesson and contract", optional "Lesson Contract" text box, plain text),
// src/app/book/[slug]/BookingForm.tsx (the "Lesson agreement" box, a checkbox "I have read and agree to the terms above", a "Type your full name to sign" field, both required before booking; the request carries termsAgreed only),
// src/app/api/bookings/route.ts line 212 (terms_agreed_at saved on the lesson), src/app/api/portal/[token]/cancel/route.ts (inside the notice window the portal refuses and says to contact the tutor; no fee is charged),
// src/lib/no-show.ts (a lesson can be marked no-show). No parent signature field, no PDF, no copy of the contract text stored with the lesson, no automatic late fee, no page that shows terms_agreed_at that we could find.
// All names, amounts and hours in the template are blanks or examples of ours and are said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const TUTORING_CONTRACT_TEMPLATE_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'A tutoring contract can fit on one page. It needs twelve things: who, what, the fee, cancellation, no-shows, a tutor cancellation, packages, privacy, materials, results, ending, and signatures. The full text is below, with blanks to fill.',
    'A typed name or a ticked box can be a signature. The US E-SIGN Act says a contract may not be denied legal effect solely because it is electronic. That says nothing about whether your clauses are fair, and a court decides that.',
    'A late fee needs to be written down before the lesson and kept modest. A Cornell Law School explainer says courts will not enforce a fee clause that is punitive. Our advice, and not the law: tie the fee to the time you lost.',
    'Rules outside your contract can win over it. We found three to check: the FTC Cooling-Off Rule for in-person sales at a customer\'s home, the 14-day cancellation rights in the UK, and the age of the student.',
    'This is a template and a guide, not legal advice. Tutafy has a contract box on the booking page with a tick-and-type signature. It has no parent signature, no PDF and no automatic late fee.',
  ] },
  { type: 'p', text: `A tutoring contract is a short written agreement between you and a student, or the student's parent, that says what you will teach, what it costs, what happens when a lesson is cancelled or missed, and how either side can stop. You agree to it before the first lesson, so nobody has to remember a conversation from March.` },
  { type: 'p', text: `Below is a one-page template you can copy, with blanks in square brackets. After it comes a reason for every clause, versions for adults, children, groups and packages, a look at signing, and the outside rules we found that can override what you write. We run a tutoring-software company and we are not lawyers, so read the "not legal advice" notes as seriously as the template.` },
  { type: 'image', src: '/blog/inline/contract-legal-signature', alt: 'A black fountain pen lying on a printed contract, beside blank signature, name and date lines.', caption: 'Illustrative photo. The paper version still works for in-person lessons.', credit: 'Photo: Blogtrepreneur (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Legal_Contract_%26_Signature_-_Warm_Tones.jpg' },
  { type: 'h2', text: 'What this guide adds to our cancellation guide' },
  { type: 'p', text: `We already have a guide to tutoring cancellation policies and contracts. It explains what a policy should include, compares a strict, a moderate and a flexible one, and covers no-shows and payment terms. It does not give you any contract wording. This guide does, and it keeps the cancellation material short by sending you there for the long version.` },
  { type: 'p', text: `So the split is simple. Read the cancellation guide to decide your rules: how many hours, what fee, what to do with a package. Come back here to put those rules into sentences a parent can sign.` },
  { type: 'h2', text: 'What a contract can and cannot do' },
  { type: 'p', text: `A contract does three useful things for a private tutor. It makes you decide your rules before a dispute. It gives a parent something to read and agree to, so a later "I didn't know" is harder. And it gives you a dated record if a fee is questioned.` },
  { type: 'p', text: `It does not do four things, and tutors sometimes expect it to.` },
  { type: 'ul', items: [
    `It does not make an unfair clause fair. A court can refuse to enforce a term that is punitive, and consumer rules in some places cannot be signed away.`,
    `It does not decide how the law sees you. The IRS says no single factor decides whether someone is an employee or self-employed, and a written contract is only one piece of evidence under "type of relationship". If you tutor through a company, what you do day to day matters more than what the page says.`,
    `It does not collect the money for you. A signed fee clause helps if you ask for payment, and it does not replace asking. Our guide to asking for tutoring payment covers the messages.`,
    `It is not a substitute for a lawyer when the stakes are larger, such as a contract with a school, a team of tutors or a large prepaid sum.`,
  ] },
  { type: 'callout', variant: 'warn', title: 'Not legal advice', text: `We are not lawyers and this is not legal advice. Laws differ by country and by US state, and they change. The template is a starting point for a modest arrangement of a few hours a week. If you are unsure, a short review by a local lawyer costs less than one lost dispute. We read the sources below on 31 Oct 2026 and say where we could not read one.` },
  { type: 'h2', text: 'The one-page template' },
  { type: 'p', text: `Copy this into a document, replace everything in square brackets, and delete clauses you do not need. The hours, percentages and days are examples of ours, taken from common practice and not from any law. Choose your own.` },
  { type: 'h3', text: 'Tutoring Agreement' },
  { type: 'ul', items: [
    `1. Who. This agreement is between [your full name or business name] ("the tutor") and [student's full name] ("the student"). If the student is under 18, [parent or guardian's full name] ("the parent") signs for the student, is responsible for payment, and makes the decisions this agreement gives to the student.`,
    `2. What. The tutor will teach [subject and level] in [one-to-one / small group] lessons of [60] minutes, by [video call app / in person at address], starting on [date]. The usual time is [day and time] in [time zone].`,
    `3. Fees. Each lesson costs [amount and currency]. Payment is due [before each lesson / on the 1st of each month / in full before the first lesson] by [payment method]. If a payment is more than [7] days late, the tutor may pause lessons until it is paid.`,
    `4. Cancelling and moving a lesson. The student or parent may cancel or move a lesson at no charge by giving at least [24] hours' notice by [message / email / the booking page]. With less notice, the lesson is charged at [50]% of the fee.`,
    `5. No-shows. If the student has not joined [15] minutes after the start time and the tutor has not heard from them, the lesson is a no-show. It is charged at [100]% of the fee and the lesson ends.`,
    `6. If the tutor cancels. If the tutor cancels or moves a lesson, the student may choose a make-up lesson within [30] days or a refund of that lesson. The tutor charges no fee.`,
    `7. Packages and unused lessons. A package of [number] lessons costs [amount] and must be used within [number] months of the first lesson. At the end of that time, unused lessons [expire / are refunded at the per-lesson price, minus any package discount]. Lessons cancelled with enough notice return to the package.`,
    `8. Privacy and recordings. Lessons are not recorded unless the tutor and the student (or parent) agree in writing. The tutor uses the student's contact details only for lessons, scheduling and payment, and does not share them without permission, except where the law requires it.`,
    `9. Materials. The notes, worksheets and other materials the tutor creates are for the student's own use. They may not be shared publicly or sold.`,
    `10. Results. The tutor will teach to the best of their ability and cannot promise a particular grade, score or result.`,
    `11. Ending. Either side may end this agreement by giving [7] days' notice in writing, and email counts. Fees for lessons already taught stay due. Unused paid lessons are handled under clause 7.`,
    `12. Changes. The tutor may change fees or rules by emailing at least [14] days before the change starts. Lessons already booked keep the old terms.`,
    `Signed: [student or parent name], [date]. [Tutor name], [date].`,
  ] },
  { type: 'p', text: `That is short enough that a parent will read it. If it grows to three pages, you have probably written a rule for every possible event, and parents stop reading at page two.` },
  { type: 'h2', text: 'Clause by clause: why each line is there' },
  { type: 'p', text: `A template teaches little unless you know why each line exists. Here is the reason for every clause, and the one mistake we see most with it.` },
  { type: 'h3', text: 'Clauses 1 and 2: who and what' },
  { type: 'p', text: `The names settle who owes what. The line about a parent matters most when the student is a child: if only the child is named, nobody has clearly agreed to pay. Putting the time zone beside the lesson time costs five words and prevents the missed lesson that happens when a clock change reaches one country before the other. Our guide to scheduling across time zones explains that problem.` },
  { type: 'h3', text: 'Clause 3: fees' },
  { type: 'p', text: `Write the amount with the currency, and say when it is due. The single most useful words in this clause are "before each lesson" or "in full before the first lesson", because asking for money before the lesson is far easier than chasing it after. The right to pause lessons for late payment gives you a calm, rule-based reason to stop, so you do not have to argue.` },
  { type: 'h3', text: 'Clauses 4 and 5: cancelling and no-shows' },
  { type: 'p', text: `These two clauses carry the most weight, and our cancellation guide covers how to choose the numbers. Two points on wording. First, name the way notice is given, so that a message sent at 10 p.m. to a number you do not check does not count as notice. Second, say what time the notice period is counted from, which is the start of the lesson.` },
  { type: 'p', text: `A fee for late cancellation is what lawyers call a liquidated damages clause: a fixed amount, or a formula, that one side owes if it breaks the agreement. A Cornell Law School explainer says such a clause must be clearly stated in the contract and agreed before the contract is made, and that courts will not impose one that is "punitive, illegal, unconscionable" or "contrary to public policy". We read that as a reason to keep the fee modest and to explain it as the time you held for them, and not as a fine. That reading is ours, and a lawyer in your state can tell you more.` },
  { type: 'h3', text: 'Clause 6: if the tutor cancels' },
  { type: 'p', text: `Parents notice one-sided contracts. A line that says you owe a make-up lesson or a refund when you cancel is the cheapest way to show good faith, and it prevents the argument "you charge me when I cancel but not when you do". A tutor without that clause can end up granting the make-up anyway, with no rule to point to.` },
  { type: 'h3', text: 'Clause 7: packages and unused lessons' },
  { type: 'p', text: `This is where the largest sums, and the most arguments, sit. Decide three things before you sell a package: how long it lasts, what happens to lessons left at the end, and whether the discount is lost if the student stops early. Write down the answers. Our guide to lesson packages explains how to price them. Check whether your state or country regulates prepaid services or expiry dates, because some places do.` },
  { type: 'h3', text: 'Clauses 8 and 9: privacy and materials' },
  { type: 'p', text: `Parents of children want to know whether lessons are recorded and who sees their child's name. Say it plainly, and then do what it says. The materials line protects worksheets you spent hours writing; its limit is that you cannot stop a student from keeping their own notes. Keep it as a request not to share or sell, and do not threaten.` },
  { type: 'p', text: `This is not a privacy policy, and we did not research child-data rules for this guide. If you teach children, read the rules for your country.` },
  { type: 'h3', text: 'Clause 10: results' },
  { type: 'p', text: `Never promise a grade. Even a hopeful "you will get a 7" in a message can come back later as a promise. The clause says that you teach, the student learns, and the result is not guaranteed.` },
  { type: 'h3', text: 'Clauses 11 and 12: ending and changing' },
  { type: 'p', text: `Say how to stop. A family that cannot easily end an agreement is a family that says unkind things in reviews. A short notice period, with fees for lessons already taught still due, is fair to both sides. The change clause lets you raise your rates later with a fixed warning and no new contract.` },
  { type: 'image', src: '/blog/inline/contract-fountain-pen', alt: 'A close view of a fountain pen nib writing cursive handwriting on lined paper.', caption: 'Illustrative photo. Write the blanks in plain words.', credit: 'Photo: Aaron Burden (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Writing_with_a_fountain_pen_(Unsplash).jpg' },
  { type: 'h2', text: 'Versions for different students' },
  { type: 'p', text: `One template does not suit everyone. These are the changes we would make for the usual cases. They are our suggestions, and they are not a legal requirement.` },
  { type: 'compare', caption: 'How the template changes by student. The hours and rules are examples; choose your own.', headers: ['Student', 'Who signs', 'What to change', 'What to add'], rows: [
    ['An adult', 'The student', 'Remove the parent wording in clause 1.', 'Nothing special. Say how you will talk about progress.'],
    ['A child or teenager', 'The parent or guardian, and the student may sign too', 'Name the parent as responsible for fees and for cancelling.', 'A line on who may collect or contact the child, and on recordings.'],
    ['A small group', 'Each student or parent, separately', 'Longer notice, such as 48 hours, because one change affects the others.', 'What happens if the group falls below a minimum number.'],
    ['A prepaid package', 'The student or parent', 'Clause 7 becomes the main clause, with an end date.', 'Refund rule for unused lessons, stated as a formula.'],
  ] },
  { type: 'p', text: `Why have the parent sign for a child? A Cornell Law School explainer on contract capacity says that "capacity rules often require a person to have reached a minimum age and to be of sound mind", and that a contract signed by a person lacking capacity "may be void or voidable". The page does not mention children by name, so we claim no more than this: a contract with a child is on shakier ground, and a contract with a parent is not. The age at which a person can sign differs between places. Ask a local lawyer if you teach in a place with unusual rules.` },
  { type: 'h2', text: 'Signing it: a typed name, a checkbox or paper' },
  { type: 'p', text: `You do not need a pen. The US E-SIGN Act, in 15 U.S.C. section 7001, says that for a transaction in or affecting interstate or foreign commerce, a signature, contract or other record "may not be denied legal effect, validity, or enforceability solely because it is in electronic form", and the same for a contract that used an electronic signature. We read this on the Cornell Law School site on 31 Oct 2026.` },
  { type: 'p', text: `Notice the word "solely". A contract cannot be thrown out only because it is electronic. That does not mean a tick in a box proves the person understood a clause, or that an unfair clause becomes fair. Outside the US, other laws apply, so check yours.` },
  { type: 'h3', text: 'Three ways to collect agreement' },
  { type: 'ul', items: [
    `A checkbox and a typed name on your booking page. It is quick, and it records a time. The risk is that you keep no copy of what the student agreed to, so keep a dated copy of each version of your text yourself.`,
    `An e-signature app that emails a PDF to both sides. It gives a signed document that each side keeps. Many such apps have free or paid tiers, and we have not compared them here.`,
    `Paper, for in-person lessons. Sign two copies, and each side keeps one. See the next section on in-person sales before you rely on it.`,
  ] },
  { type: 'p', text: `Whatever you pick, keep three things for each student: the exact text they agreed to, the date, and the way they agreed (the email, the signed PDF, the booking record). Update the text rarely, and when you do, keep the old version with a date.` },
  { type: 'image', src: '/blog/inline/contract-coffee-notebooks', alt: 'A wooden table seen from above with a cup of coffee, two closed notebooks and a pen.', caption: 'Illustrative photo. Keep a dated copy of each version of your text.', credit: 'Photo: Freddy Castro (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Coffee,_notebooks_and_pen_(Unsplash).jpg' },
  { type: 'h2', text: 'Rules outside your contract that can win' },
  { type: 'p', text: `A signed clause is not the last word. We found three places where an outside rule can apply. Check them for your country and state.` },
  { type: 'h3', text: 'The US FTC Cooling-Off Rule, for in-person sales' },
  { type: 'p', text: `The FTC's Cooling-Off Rule gives buyers three days to cancel certain sales made at their home, workplace or dormitory, or at a seller's temporary location, and it also applies when the buyer invites a salesperson to their home. We read the FTC's consumer page, dated September 2025. It excludes sales under $25 made at the buyer's home, and sales made entirely online, by mail or by telephone.` },
  { type: 'p', text: `The part that matters for tutors: the FTC page says the rule "applies to instruction or training courses, regardless of your reason for taking them", although business purchases are otherwise excluded. So an in-person tutor who sells a package of lessons and has it signed at the student's kitchen table may be inside the rule, and the rule puts duties on the seller, such as telling the buyer about the right to cancel. A tutor who sells and signs entirely online appears to be outside it. This is our reading of one FTC page and not a legal opinion, so check the rule for your own sales before you rely on this.` },
  { type: 'h3', text: 'Cancellation rights in the UK' },
  { type: 'p', text: `The GOV.UK guidance for businesses selling online says that a seller must tell a customer they can cancel up to 14 days after an order is delivered, and that there are different rules for downloads and streaming. Services work differently from goods. Per a search summary of the Consumer Contracts Regulations 2013 (the regulations themselves would not load for us, so we did not read them), the 14 days for a service run from the day the contract is made, a service starts inside that period only if the customer asks expressly, and a customer who cancels after an early start can owe a reasonable cost for what was already supplied. Read the regulations before you write a UK refund clause. If you tutor UK students online, this can matter for a package that you sell on the web.` },
  { type: 'h2', text: 'Mistakes we would avoid' },
  { type: 'ul', items: [
    `Copying a long contract from a big company. A parent will not read it, and a clause you do not follow is worse than no clause.`,
    `Writing rules you will not enforce. If you always waive the fee, the clause teaches families that it is optional. Waive it on purpose, and say it is a favour.`,
    `Changing the text and not keeping the old one. In a dispute you need what that student agreed to.`,
    `Forgetting the parent. A contract with a teenager who has no money does not help you collect.`,
  ] },
  { type: 'h2', text: 'What Tutafy has for contracts, and what it does not' },
  { type: 'p', text: `We build Tutafy, so here is what the app does and does not do about contracts, read from the code on 31 October 2026.` },
  { type: 'compare', caption: 'Contracts in Tutafy, as of 31 Oct 2026.', headers: ['What you might want', 'Tutafy', 'Plan'], rows: [
    ['A contract box on your booking page', 'Yes: Settings, "Trial lesson and contract", an optional "Lesson Contract" text box. It is plain text, so no formatting, tables or logo.', 'All plans'],
    ['Students must agree before booking', 'Yes: the booking form shows a "Lesson agreement" box, and a student must tick "I have read and agree to the terms above" and type their full name to sign before they can book.', 'All plans'],
    ['A record of when they agreed', 'Partly: the time of agreement is saved on the lesson. We found no page that shows it. The typed name is required on the form, but the request we read sends only the agreed flag, so we cannot say the name is stored.', 'All plans'],
    ['A saved copy of the text each student agreed to', 'No. Only the time is saved, so keep your own dated copy of every version.', '-'],
    ['A parent signature or a signature for a child', 'No: one name field. Put the parent\'s name in the field and say so in clause 1.', '-'],
    ['A downloadable or emailed PDF of the signed contract', 'No', '-'],
    ['A late-cancellation or no-show fee charged for you', 'No. Inside your notice window, the student portal refuses the cancellation and tells the student to contact you. You can mark a lesson as a no-show. Any fee you collect yourself.', '-'],
    ['A contract template library', 'No. Use the twelve clauses above.', '-'],
  ] },
  { type: 'p', text: `One correction to our own site. Our older cancellation guide describes a booking tool that applies a late fee automatically. Tutafy does not do that, and the table above is the accurate description: it sets the notice window and blocks the cancellation, and you collect any fee yourself.` },
  { type: 'p', text: `A practical way to use it: paste a short version of the twelve clauses into the contract box as plain numbered lines, and keep the full version in a document for parents. The box scrolls on the booking form, so keep the text short enough to read there.` },
  { type: 'source', text: 'Sources read on 31 Oct 2026. The Cornell Law School pages, the FTC page, the IRS page and the GOV.UK page were read directly. The text of the UK Consumer Contracts Regulations 2013 could not be read by our script, so what we say about services comes from search summaries and is marked as such. The FTC seller duties are from a search summary of FTC pages. Nothing here is legal advice.', links: [
    { label: 'Cornell LII: 15 U.S.C. 7001 (E-SIGN)', href: 'https://www.law.cornell.edu/uscode/text/15/7001' },
    { label: 'Cornell LII Wex: Liquidated damages', href: 'https://www.law.cornell.edu/wex/liquidated_damages' },
    { label: 'Cornell LII Wex: Capacity', href: 'https://www.law.cornell.edu/wex/capacity' },
    { label: 'FTC: The Cooling-Off Rule', href: 'https://consumer.ftc.gov/articles/buyers-remorse-ftcs-cooling-rule-may-help' },
    { label: 'IRS: Independent contractor or employee', href: 'https://www.irs.gov/businesses/small-businesses-self-employed/independent-contractor-self-employed-or-employee' },
    { label: 'GOV.UK: Online and distance selling for businesses', href: 'https://www.gov.uk/online-and-distance-selling-for-businesses' },
    { label: 'legislation.gov.uk: Consumer Contracts Regulations 2013', href: 'https://www.legislation.gov.uk/uksi/2013/3134' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'Tutoring cancellation policies and contracts', href: '/blog/tutoring-cancellation-policy-and-contracts', text: 'How to choose the notice window, the fee and the no-show rule.' },
    { label: 'How to stop tutoring no-shows', href: '/blog/stop-tutoring-no-shows', text: 'Reminders that prevent the problem before a fee is needed.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'Price a package and decide what happens to unused lessons.' },
    { label: 'How to ask for tutoring payment', href: '/blog/how-to-ask-for-tutoring-payment', text: 'The messages that go with clause 3.' },
    { label: 'How to handle reschedule requests', href: '/blog/how-to-handle-tutoring-reschedule-requests', text: 'What to say when a student moves a lesson.' },
    { label: 'A free tutoring invoice template', href: '/blog/free-tutoring-invoice-template', text: 'Send a record of what was taught and what is owed.' },
  ] },
  { type: 'faq', items: [
    { q: 'What should a tutoring contract include?', a: `Who the parties are, what you teach, the fee, the cancellation and no-show rules, what happens if you cancel, packages, privacy, materials, no promise of results, how to end the agreement, and signatures. The template above has all twelve.` },
    { q: 'Do I need a lawyer to write a tutoring contract?', a: `For a modest arrangement of a few hours a week, many tutors use a plain-English template and do not. A short review by a local lawyer is sensible for large prepaid packages, a team of tutors or a school contract. This guide is not legal advice.` },
    { q: 'Is a typed name or a ticked box a valid signature?', a: `In the US, the E-SIGN Act says a contract may not be denied legal effect solely because it is electronic. That does not make every clause enforceable, and other countries have their own laws. Keep the text, the date and how the person agreed.` },
    { q: 'Can I charge a fee for a late cancellation?', a: `Many tutors do, with the rule written down before the lesson. A Cornell Law School explainer says courts will not enforce a fee clause that is punitive. Keep the fee tied to the time you lost.` },
    { q: 'Does a parent have to sign for a child?', a: `We recommend it. A contract signed by someone lacking capacity may be void or voidable, per a Cornell Law School explainer, and the age differs between places. Name the parent as responsible for payment and cancellations.` },
    { q: 'Does Tutafy have a contract feature?', a: `Partly. You can add a contract text to your booking page, and students must tick a box and type a name before booking. Tutafy does not store a copy of the text with each lesson, has no parent signature or PDF, and does not charge late fees for you.` },
  ] },
  { type: 'cta', title: 'Put your agreement on your booking page', text: 'The Free plan covers up to 10 students with a booking page, the contract box described above, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not charge late fees for you.', button: 'Start free, no credit card', href: '/register' },
]
