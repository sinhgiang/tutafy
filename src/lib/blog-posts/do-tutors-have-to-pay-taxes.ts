// T-1170. Article body for /blog/do-tutors-have-to-pay-taxes (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1230-tutafy-traffic-10-articles-plan.md, article 5; overlap check: docs/traffic-plan/T-1165-step0-report.md (topic 5: touches how-to-start-an-online-tutoring-business,
// step 7 and its FAQ "Do I have to pay tax on tutoring income?", marketplace-vs-independent-the-real-math (the admin side: invoices, taxes and records), how-to-write-a-tutoring-business-plan (the LLC
// question) and how-to-hire-tutors-and-build-a-team (1099 against W-2, from the employer's side), which each give a sentence or two; this guide is the one place that explains the forms, the
// arithmetic and the records, and links to all four).
// Search data (OpenSEO, US, 31 Oct 2026): "tutoring taxes" about 30 a month, "do tutors pay taxes" about 10; the owner chose to write it anyway (W-3765, option 1).
// EVERY figure and rule in the text was read on 31 Oct 2026 from an official page, and the text says "checked 31 Oct 2026" with the source block listing the pages:
//   IRS, Form 1099-K FAQs (irs.gov/newsroom/form-1099-k-faqs-general-information): "All income, no matter the amount, is taxable unless the tax law says it isn't - even if you don't get a Form 1099-K."
//   IRS, IR-2025-107, 23 Oct 2025: a third party settlement organization need not file Form 1099-K unless the gross amount to a payee "exceeds $20,000 and the number of transactions exceeds 200"
//     (the One, Big, Beautiful Bill reinstated the earlier threshold retroactively; the page is marked as historical content).
//   IRS, instructions for Forms 1099-MISC and 1099-NEC: "Enter nonemployee compensation (NEC) of $2,000 or more"; may be adjusted for inflation beginning in calendar year 2027.
//   IRS, Schedule C: sole proprietors report profit or loss from a business; the activity must be pursued mainly to make money and carried on consistently.
//   IRS, self-employment tax: net earnings of $400 or more; 15.3% (12.4% Social Security and 2.9% Medicare); Schedule SE.
//   IRS, estimated taxes: generally when you expect to owe $1,000 or more when the return is filed; Form 1040-ES; four payment periods, each with its own due date (not copied here).
//   IRS, recordkeeping: keep records "as long as needed to prove the income or deductions on a tax return"; any system that "clearly shows your income and expenses".
//   IRS, Form W-8BEN: a foreign person who is the beneficial owner of an amount subject to U.S. withholding gives it to the payer.
//   GOV.UK, trading allowance: up to GBP 1,000 a year; at or under it you need not tell HMRC unless an exception applies; over GBP 1,000 gross, register for Self Assessment by 5 October after the tax year.
//   Canada Revenue Agency, when to register for GST/HST: small supplier threshold of $30,000 over four consecutive calendar quarters (or in a single quarter); a small supplier need not register.
// Not read, so not written: any figure from the Australian Taxation Office (its page returned 403), any Canadian income tax figure, any US due date, any state rule, the 92.35% base of self-employment tax.
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/app/api/earnings/export/route.ts (CSV of the Earnings payment history for the period and status shown, any plan),
//   src/app/api/accounting/export/route.ts and src/lib/accounting.ts (Pro: invoice CSVs for Xero and QuickBooks Online from completed, priced lessons), and the review article (Tutafy is not a merchant
//   of record: the tutor brings their own Stripe or PayPal account). All figures in the examples are invented and said to be; nothing here is tax advice.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const TUTOR_TAXES_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'In most countries money you earn from tutoring is taxable income, whether or not anyone sends you a form. In the US the IRS says all income is taxable even if you do not get a Form 1099-K.',
    'A tutor who works for themselves is usually self-employed: you report your profit (income minus allowed expenses), and in the US you may also owe self-employment tax and estimated tax payments.',
    'US forms depend on who pays you: a marketplace may send a 1099-NEC (from 2026 for $2,000 or more) and a payment app may send a 1099-K (over $20,000 and over 200 transactions).',
    'In the UK a trading allowance of £1,000 a year means very small earners may not need to tell HMRC; above it you register for Self Assessment.',
    'The one habit that fixes most problems: record every payment and every business cost as it happens. This guide is general information, not tax advice.',
  ] },
  { type: 'p', text: `Yes, tutors have to pay tax on what they earn. In most countries income from private lessons is taxable, and it does not matter whether a marketplace, a payment app or nobody sends you a form. In the United States, the IRS says: "All income, no matter the amount, is taxable unless the tax law says it isn't, even if you don't get a Form 1099-K."` },
  { type: 'p', text: `This guide explains in plain English what that usually means for an independent tutor: how self-employed income works, which forms may arrive, how the US, UK and Canadian rules differ on the points we could check, what to do if you teach from another country, and the simple records that make a tax return easy. It is general information, not tax advice. Rules change every year, so we say what we checked and when, and we tell you where to confirm.` },
  { type: 'image', src: '/blog/inline/tax-laptop-coffee', alt: 'A laptop with a dark screen, a cup of black coffee, two pencils, a pad of paper and crumpled paper balls on a light wooden desk, seen from above.', caption: 'Illustrative photo, not a Tutafy user. Taxes are mostly a records habit.', credit: 'Photo: Lauren Mancke (CC0), Wikimedia Commons', creditHref: 'https://commons.wikimedia.org/wiki/File:Laptop_and_coffee_on_a_desk.jpg' },
  { type: 'h2', text: 'How we checked, and what we could not check' },
  { type: 'p', text: `Every figure in this guide was read on 31 October 2026 from the tax authority's own page, and the pages are listed at the end of the guide. Where a page could not be opened, or a rule depends on details we cannot see, we say so instead of guessing. We could not read the Australian Taxation Office's pages with our tool that day, so we give no Australian figures. We give no US due dates and no state rules, because they change and vary: the IRS pages linked below list them.` },
  { type: 'callout', variant: 'warn', title: 'Not tax advice', text: 'The examples use invented numbers to show how the rules work. Your situation depends on your country, your other income, how you are registered and the year. For a decision with money attached, ask your tax authority or an accountant.' },
  { type: 'h2', text: 'Is tutoring income taxable?' },
  { type: 'p', text: `For almost everyone, yes. Money students or parents pay you for lessons is income from work, and the fact that it came by PayPal, a card link or a bank transfer does not change that. Two ideas are worth separating. Whether the income is taxable is one question. Whether someone sends you a form about it is a different question. The second does not decide the first.` },
  { type: 'p', text: `The IRS puts it directly in its Form 1099-K questions and answers: the reporting threshold for that form "doesn't affect whether payments are taxable or whether a tax return must be filed". So a tutor who is paid $5,000 over a year through a payment app will not get a form and still has $5,000 of income to report. The same logic applies in other countries: the authority expects you to report income, whether or not a platform did.` },
  { type: 'p', text: `What changes is whether the money counts as income from a business or as a hobby. In the US, the IRS's page on Schedule C says an activity counts as a business when it is pursued mainly to make money and carried on consistently. A tutor with regular students, a price list and a booking page is a business by any ordinary reading. The details matter for your own case, so confirm with the authority.` },
  { type: 'h2', text: 'Self-employed: what it means' },
  { type: 'p', text: `If you teach on your own account, rather than as an employee of a school or a company, you are usually self-employed. Three things follow, and they hold in most countries even though the names and numbers differ.` },
  { type: 'ul', items: [
    'You report your profit, not your takings. Profit is the money you received minus the business costs the rules allow, such as software, a share of your internet, equipment and training.',
    'Nobody takes tax out for you. An employer withholds tax from each pay; a self-employed person has to set money aside, and in some countries pay in instalments through the year.',
    'You keep the records. The authority may ask how you worked out your numbers, so you need the payments and the receipts behind them.',
  ] },
  { type: 'p', text: `If a marketplace pays you, it usually treats you as an independent contractor, not an employee, and it may send a form. If you take payments yourself, you choose and pay your own processor and no one sends anything, so the habit of recording matters more.` },
  { type: 'h2', text: 'The United States' },
  { type: 'h3', text: 'Schedule C: where your tutoring profit goes' },
  { type: 'p', text: `A US tutor who works as a sole proprietor reports tutoring on Schedule C, which the IRS describes as "Profit or Loss from Business (Sole Proprietorship)". Income goes at the top; expenses come off; the result is your net profit, which then flows into your income tax return. You do not need a company to be a sole proprietor.` },
  { type: 'h3', text: 'Self-employment tax' },
  { type: 'p', text: `On top of income tax, a self-employed person in the US usually pays self-employment tax, which funds Social Security and Medicare. The IRS says you must pay it if your net earnings from self-employment are $400 or more. The rate is 15.3%, made up of 12.4% for Social Security and 2.9% for Medicare, and you work it out on Schedule SE. The IRS page has the details of how net earnings are calculated, which we have not copied here because the method has steps; use the page or a tax professional.` },
  { type: 'h3', text: 'Estimated tax payments' },
  { type: 'p', text: `Because no employer withholds tax, the IRS expects self-employed people to pay during the year. Its page says individuals generally must make estimated payments if they expect to owe $1,000 or more when their return is filed. You use Form 1040-ES, and the year is split into four payment periods, each with its own due date. The IRS lists the dates, and we do not repeat them because they shift when a date falls on a weekend. A tutor who earns steadily can set a fixed share of each payment aside in a separate account, which makes the instalments painless.` },
  { type: 'h3', text: 'The forms you may or may not receive' },
  { type: 'p', text: `Forms are where most new tutors get confused, so here is the short version. A form is a report to the tax authority that you were paid, sent to you as well. Its absence never means the income is free.` },
  { type: 'compare', caption: 'US forms a tutor may meet, as described by the IRS pages checked on 31 Oct 2026. Thresholds can change; check the IRS.', headers: ['Form', 'Who may send it', 'When it is sent', 'What it means for you'], rows: [
    ['1099-NEC', 'A business that pays you for services, such as a tutoring marketplace', 'When the payments reach $2,000 or more, for payments from 2026 (the IRS instructions say the figure may be adjusted for inflation from 2027)', 'It shows what the business paid you. Report that income, and any other income the form missed'],
    ['1099-K', 'A payment app or other third party settlement organization', 'When your gross payments exceed $20,000 and the number of transactions exceeds 200 (IRS release IR-2025-107)', 'It shows gross payments before fees. Use it together with your own records to work out your income'],
    ['None', 'You are paid by bank transfer, cash or a small amount through an app', 'Nothing is sent', 'The income is still taxable. Your own records are the only record'],
  ] },
  { type: 'p', text: `Two details are worth a second look. First, the $20,000 and 200 numbers are both required: the IRS wording is that the gross amount "exceeds $20,000 and the number of transactions exceeds 200". Second, the IRS release is marked as historical content on its site, and some US states may set their own lower limits, so check the current IRS page and your state's tax agency before you assume that no form is coming.` },
  { type: 'h3', text: 'A worked example with invented numbers' },
  { type: 'p', text: `Take two tutors with the same year. Tutor A earns $22,000 from 120 payments, through PayPal and bank transfers. Tutor B earns $30,000 from 260 small payments through one payment app.` },
  { type: 'compare', caption: 'Two invented tutors, same year. Figures are examples only.', headers: ['', 'Tutor A', 'Tutor B'], rows: [
    ['Gross payments in the year', '$22,000', '$30,000'],
    ['Number of payments', '120', '260'],
    ['Over $20,000?', 'Yes', 'Yes'],
    ['Over 200 transactions?', 'No', 'Yes'],
    ['Form 1099-K from the payment app?', 'No: only one of the two conditions is met', 'Yes: both conditions are met'],
    ['Business costs (software, internet share, equipment)', '$1,040', '$1,040'],
    ['Profit to report', '$22,000 - $1,040 = $20,960', '$30,000 - $1,040 = $28,960'],
    ['Must they report the income?', 'Yes', 'Yes'],
  ] },
  { type: 'p', text: `The point of the example is the last row. Tutor A gets no form, and reports the same way as Tutor B, who does. The profit lines show how costs come off the takings before anything is taxed; whether each cost is allowed, and by how much, depends on the rules, so the $1,040 is just an example. A real return also involves other income, the deductions and credits you qualify for, and the self-employment tax, which is why a professional can pay for themselves in the first year.` },
  { type: 'image', src: '/blog/inline/tax-overhead-desk', alt: 'A tidy white desk seen from above with a keyboard, a mouse on a leather pad, a phone stand, a spiral notebook and a tray of pens.', caption: 'Illustrative photo, not a Tutafy user. A desk that makes record keeping easy.', credit: 'Photo: Jeff Sheldon (CC0), Wikimedia Commons', creditHref: 'https://commons.wikimedia.org/wiki/File:Overhead_desktop_workspace_(Unsplash).jpg' },
  { type: 'h2', text: 'The United Kingdom' },
  { type: 'p', text: `GOV.UK describes a trading allowance of up to £1,000 a year for people with income from self-employment and similar small trades. If your gross income from these sources is £1,000 or less, the page says you do not need to tell HMRC unless an exception applies. You can use the allowance instead of deducting your real expenses, and if you do you must keep records of your income.` },
  { type: 'p', text: `Above £1,000, the same page says that if your gross income for a tax year is more than £1,000 you must register for Self Assessment, and the deadline is 5 October in the following tax year. A tutor who earns a few thousand pounds from private lessons generally needs to register. Registration is a separate step from filing, so do it early. You may also need to register for other reasons the page lists, such as claiming relief on a loss.` },
  { type: 'image', src: '/blog/inline/tax-hmrc-letter', alt: 'A close-up of a printed HM Revenue and Customs form on a wooden table, showing the department logo and the labels for tax reference and date.', caption: 'Illustrative photo, not a Tutafy user. Self Assessment has its own registration step.', credit: 'Photo: Images_of_Money (CC BY 2.0), Wikimedia Commons', creditHref: 'https://commons.wikimedia.org/wiki/File:HMRC_Self_Assessment_tax_return.jpg' },
  { type: 'h2', text: 'Canada' },
  { type: 'p', text: `For sales tax, the Canada Revenue Agency's GST/HST pages say a business is a small supplier if its taxable sales do not exceed $30,000 over four consecutive calendar quarters, and it also stops being one if it goes over $30,000 in a single quarter. The revenue is counted before expenses. A small supplier does not have to register for GST/HST, though it may register voluntarily.` },
  { type: 'p', text: `A tutor who stays under that line does not have to charge GST/HST, but it is worth watching the total as the year goes on, because the single-quarter test can catch a busy season. Whether tutoring services are taxable or exempt in your province, and how your income is reported on your return, are separate questions that the CRA answers on its site; we did not check them here, so confirm before you rely on this.` },
  { type: 'h2', text: 'Australia and everywhere else' },
  { type: 'p', text: `We could not open the Australian Taxation Office's pages on 31 October 2026, so we give no Australian figures. If you teach in Australia, start at ato.gov.au and search for the sole trader pages, and read the GST registration rules there before you charge anyone. For any other country, search for the national tax authority's page on self-employed or freelance income, and for any sales tax or value-added tax registration threshold.` },
  { type: 'p', text: `Three questions will get you most of the answer in any country. Do I have to register as self-employed or as a business, and by when? Do I have to register for sales tax or VAT, and from what turnover? And how do I pay: once a year, or in instalments? Write the answers and the dates in one place, and put the dates in your calendar.` },
  { type: 'h2', text: 'If you teach from one country and your students or platform are in another' },
  { type: 'p', text: `Many online tutors live in one country and are paid from another. As a rule you owe tax in the country where you are tax resident, and the countries of your students and platforms may ask for forms to establish that. For example, the IRS says that a foreign person who is the beneficial owner of an amount subject to US withholding gives Form W-8BEN to the payer. A US platform may therefore ask a tutor who lives elsewhere to complete that form, so that it knows who it is paying.` },
  { type: 'p', text: `We cannot tell you which country has the right to tax your income in your case, and treaties between countries can change the answer. Do not guess. Ask the tax authority of the country where you live, and tell any platform's tax form the truth about where you are resident. If you work between two countries, a local accountant who knows both is worth the fee.` },
  { type: 'h2', text: 'Costs you may be able to deduct' },
  { type: 'p', text: `A business cost is something you spend to earn the income. Which costs a tutor can deduct, and how much, depends on the country's rules, and some need records or limits. Common candidates for an independent tutor, to ask about rather than assume:` },
  { type: 'ul', items: [
    'Software you use for teaching: video, scheduling, a whiteboard, tutoring management software.',
    'A share of internet and phone costs, where the rules allow a business share.',
    'Equipment used for lessons, such as a computer, headset, webcam or pen tablet.',
    'Training and books that relate to what you teach.',
    'Payment processing fees and platform commissions. These are the cost of getting paid, and they are the reason a form showing gross payments can overstate your profit.',
    'A portion of home costs, in the countries that allow it, which usually has strict conditions.',
  ] },
  { type: 'p', text: `Keep the receipt or invoice for each. If a cost is partly personal, write down how you worked out the business share. The records do the arguing for you if the authority asks.` },
  { type: 'h2', text: 'The records that make tax easy' },
  { type: 'p', text: `The IRS's recordkeeping page says you may use any system that "clearly shows your income and expenses", and that you must keep your records "as long as needed to prove the income or deductions on a tax return". How long that is differs by country, so ask your tax authority. What you record is simple, and a spreadsheet is enough.` },
  { type: 'compare', caption: 'A minimal tutoring ledger. Invented rows. One line for each payment and each cost.', headers: ['Date', 'What', 'In or out', 'Amount', 'Method', 'Proof'], rows: [
    ['3 Nov 2026', 'Lesson, Student A', 'In', '$40.00', 'PayPal', 'PayPal receipt'],
    ['10 Nov 2026', '10-lesson package, Student B', 'In', '$360.00', 'Card link', 'Processor report'],
    ['12 Nov 2026', 'Processor fee on the package', 'Out', '$10.74', 'Deducted', 'Processor report'],
    ['15 Nov 2026', 'Video tool subscription', 'Out', '$14.99', 'Card', 'Email receipt'],
  ] },
  { type: 'p', text: `Four habits keep the ledger honest. Record each payment on the day it arrives. Keep a receipt for each cost, as a photo or a forwarded email, in one folder per year. Once a month, compare your ledger with your bank or payment account and fix any difference while you still remember. And keep your personal spending out of the business account, because mixing them is what turns a ten-minute job into a weekend.` },
  { type: 'p', text: `If a platform sends a form, compare it with your ledger. A 1099-K shows gross payments before fees, so it can be higher than what you kept. If the form differs from your records, find out why before you file, and keep the explanation with the form.` },
  { type: 'h2', text: 'A year in the life of a self-employed tutor' },
  { type: 'ul', items: [
    'Every payment: record it, and set aside a fixed share for tax in a separate account.',
    'Every month: compare the ledger with your accounts; save the receipts.',
    'Every quarter or when your authority asks: pay any instalment, and check whether you are near a registration threshold such as the Canadian small supplier line.',
    'After the end of the tax year: collect any forms you were sent, finish the ledger, register if you have to (in the UK, by 5 October after the tax year when over the trading allowance) and file.',
    'Once a year: review your prices. A rate that looked fine before tax and costs may not be after them; the guide on your real hourly rate shows how to work it out.',
  ] },
  { type: 'h2', text: 'Mistakes to avoid' },
  { type: 'ul', items: [
    'Assuming no form means no tax. The income is taxable either way.',
    'Reporting what the platform paid you instead of what you earned. Fees and costs belong in your calculation.',
    'Mixing personal and business money so that no one can tell which is which.',
    'Not setting money aside, then facing a bill you cannot pay.',
    'Missing a registration deadline, such as the UK Self Assessment date, because you did not know it applied to you.',
    'Copying another tutor\'s numbers. Their country, income and rules are not yours.',
    'Relying on a blog, including this one, for a decision that has money attached. Check the authority.',
  ] },
  { type: 'h2', text: 'Where Tutafy fits, and where it does not' },
  { type: 'p', text: `Tutafy is not tax software and does not prepare a return. It also does not handle your lesson payments: you bring your own PayPal or Stripe account, so the money goes to you, and Tutafy takes 0% commission on lessons. That means Tutafy sends no tax form for what students pay you, and your payment accounts are where the records of those payments live.` },
  { type: 'p', text: `What Tutafy does give you is a tidy record on your side. Each lesson carries a price and a payment status, and the Earnings page shows what you have earned and what is still owed for a period. It can export the payment history for the period and status you choose as a CSV file, on any plan. On the Pro plan, a Reports export turns completed, priced lessons into invoice files that import into Xero or QuickBooks Online. Treat those exports as a convenient starting point for your ledger, not as your tax return, and check them against your payment accounts.` },
  { type: 'p', text: `The Pro subscription itself may be a business cost, and whether and how you can deduct it depends on your country. Keep the receipt with your others.` },
  { type: 'image', src: '/blog/inline/tax-quiet-desk', alt: 'A white trestle desk against a white wall with a plain olive chair, a framed print, a small plant and a candle.', caption: 'Illustrative photo, not a Tutafy user. One quiet hour a month beats a weekend in spring.', credit: 'Photo: Bench Accounting (CC0), Wikimedia Commons', creditHref: 'https://commons.wikimedia.org/wiki/File:Bench_Accounting_2015-12-04_(Unsplash).jpg' },
  { type: 'cta', title: 'Keep a payment status on every lesson', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom, email reminders and a PayPal link. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start, cancel anytime.', button: 'Start free — no credit card', href: '/register' },
  { type: 'source', text: 'The official pages used for the figures in this guide, read on 31 Oct 2026. Rules and thresholds change every year, so read the current page.', links: [
    { label: 'IRS: Form 1099-K questions and answers', href: 'https://www.irs.gov/newsroom/form-1099-k-faqs-general-information' },
    { label: 'IRS: Form 1099-K threshold, IR-2025-107', href: 'https://irs.gov/newsroom/irs-issues-faqs-on-form-1099-k-threshold-under-the-one-big-beautiful-bill-dollar-limit-reverts-to-20000' },
    { label: 'IRS: instructions for Forms 1099-MISC and 1099-NEC', href: 'https://www.irs.gov/instructions/i1099mec' },
    { label: 'IRS: Schedule C (Form 1040)', href: 'https://www.irs.gov/forms-pubs/about-schedule-c-form-1040' },
    { label: 'IRS: self-employment tax', href: 'https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes' },
    { label: 'IRS: estimated taxes', href: 'https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes' },
    { label: 'IRS: recordkeeping', href: 'https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping' },
    { label: 'IRS: Form W-8BEN', href: 'https://www.irs.gov/forms-pubs/about-form-w-8-ben' },
    { label: 'GOV.UK: tax-free allowances on property and trading income', href: 'https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income' },
    { label: 'Canada Revenue Agency: when to register for and start charging the GST/HST', href: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to start an online tutoring business', href: '/blog/how-to-start-an-online-tutoring-business', text: 'Step 7 gives the short version of money, admin and tax for a new tutor.' },
    { label: 'Preply, iTalki or on your own? The real math', href: '/blog/marketplace-vs-independent-the-real-math', text: 'What a marketplace handles for you, including the paperwork, and what you take on.' },
    { label: 'Your real hourly rate as a tutor', href: '/blog/real-hourly-rate-for-tutors', text: 'Work out what you keep before tax, then plan for the tax.' },
    { label: 'Free tutoring invoice template', href: '/blog/free-tutoring-invoice-template', text: 'Invoices and a log you can keep for your records.' },
    { label: 'How to hire tutors and grow from solo to a small team', href: '/blog/how-to-hire-tutors-and-build-a-team', text: 'The 1099 against W-2 question, seen from the side of the person hiring.' },
  ] },
  { type: 'faq', items: [
    { q: 'Do tutors have to pay taxes?', a: `In most countries, yes. Money you earn from private lessons is taxable income whether or not a platform or payment app sends you a form. In the US the IRS says all income is taxable even if you do not receive a Form 1099-K. Check your own country's rules.` },
    { q: 'Do I have to pay tax on tutoring income if I earn very little?', a: `Often yes, but some countries have allowances. In the UK there is a trading allowance of £1,000 a year, and at or below it you generally do not need to tell HMRC unless an exception applies. In the US the IRS says all income is taxable no matter the amount, and self-employment tax applies from $400 of net earnings. Confirm with your authority.` },
    { q: 'Will I get a 1099 as a tutor?', a: `It depends on who pays you. A business that pays $2,000 or more for services in 2026 or later may send a 1099-NEC, and a payment app may send a 1099-K if your gross payments exceed $20,000 and you have more than 200 transactions. If you are paid by transfer or cash, you may get nothing, and the income is still taxable.` },
    { q: 'What is the 1099-K threshold for tutors in the US?', a: `The IRS said on 23 October 2025 that a third party settlement organization need not file a Form 1099-K unless the gross payments exceed $20,000 and the number of transactions exceeds 200. The page is marked historical and some states have lower limits, so check the current IRS page and your state.` },
    { q: 'Do I have to make estimated tax payments as a self-employed tutor?', a: `In the US, the IRS says individuals generally must if they expect to owe $1,000 or more when the return is filed. You use Form 1040-ES, with four payment periods a year. Other countries have their own rules on paying during the year.` },
    { q: 'Do I need to register as self-employed in the UK?', a: `If your gross trading income is more than £1,000 in a tax year, GOV.UK says you must register for Self Assessment, by 5 October in the following tax year. At or below £1,000 you generally do not need to tell HMRC unless an exception applies.` },
    { q: 'What records should a tutor keep?', a: `Every payment you receive, every business cost with its receipt, and any tax form you are sent. The IRS says to keep records as long as needed to prove the income or deductions on a return, and to use any system that clearly shows your income and expenses. How long varies by country.` },
    { q: 'Does Tutafy send me a tax form or handle my taxes?', a: `No. Tutafy is not tax software, and it does not process your lesson payments: you use your own PayPal or Stripe account, and Tutafy takes 0% commission. It can export your payment history as a CSV, on any plan, and on Pro it can export invoice files for Xero or QuickBooks Online.` },
  ] },
]
