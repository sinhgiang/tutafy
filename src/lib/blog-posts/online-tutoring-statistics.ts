// T-1196. Article body for /blog/online-tutoring-statistics (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1315-keyword-data-sapa-tutafy.md ("online tutoring statistics", 210 searches a month, KD 7; OpenSEO, US, English). Calendar day: 5 Nov 2026.
// Step 0 (31 Oct 2026): the blog has no statistics post. Posts that already hold sourced numbers: online-tutoring-jobs (BLS pay and jobs, platform pay), tutor-resume and do-tutors-have-to-pay-taxes (BLS and IRS lines),
// real-hourly-rate-for-tutors and marketplace-vs-independent (our own worked examples, not statistics), ai-tools-for-tutors (no numbers). Own angle: a dated fact sheet of what we could source and open,
// and a plain list of the popular numbers we did NOT print and why (market-size forecasts, a 2016 price, two effect sizes for one study). Cross-links, not repeats: the BLS pay figure is repeated here in one row, the jobs
// guide keeps the platform detail.
//
// Sources, read on 31 Oct 2026:
//   Read directly: US Bureau of Labor Statistics, Occupational Outlook Handbook, Tutors, "Last modified: August 27, 2026": median pay $43,350 a year, $20.84 an hour (May 2025); 208,400 jobs in 2025; projected change 0%, about -500 jobs,
//     208,000 in 2035; about 34,200 openings a year, mostly to replace workers who leave; self-employed 12%; "Most tutors work part time" (no percentage given); entry education "some college, no degree";
//     "The introduction of generative artificial intelligence (AI) will somewhat reduce the need for tutors." No split for online tutors.
//   Read directly: Sutton Trust, "Private Tutoring 2026" web page, 20 February 2026: "29% of secondary school students in England and Wales have had private tutoring at some point"; Ipsos Young People Omnibus. The PDF
//     (suttontrust.com/wp-content/uploads/2026/02/Private-Tutoring-2026.pdf) is compressed and could not be read as text, so the sample size and the income split are not printed (secondary summaries disagree on the income split).
//   Read directly: Sutton Trust news item "parents pay private tutors 24 an hour", dated 11 September 2016: "The average cost of a private tutor to help your child, usually to pass an exam, is £24 an hour" (report "Shadow Schooling"; no sample).
//   Read directly: Stanford NSSA listing of Nickow, Oreopoulos and Quan, "The Promise of Tutoring for PreK-12 Learning", year shown 2024: 89 RCT studies; pooled effect 0.288 SD (SE 0.029); 0.290 for literacy and 0.268 for maths;
//     larger for teachers or paraprofessionals as tutors, earlier grades, at least 3 days a week and during school. The page does not name the journal. A search result describes the 2020 NBER working paper as 0.37 SD across 96 studies; not opened.
//   From a search result, not opened (page answered 403): Education Endowment Foundation, Teaching and Learning Toolkit, one to one tuition: up to five months of additional progress. Same wording and caution as in tutoring-lesson-plan-template.
//   Read directly: Pew Research Center, "How Teens Use and View AI", 24 February 2026: 54% of US teens 13 to 17 used chatbots for help with schoolwork; "One-in-ten teens say they do all or most of their schoolwork with chatbots' help";
//     survey 25 Sep to 9 Oct 2025, 1,458 US teens and their parents, margin of error plus or minus 3.3 points.
//   Read in a news report, official release not opened: Korea JoongAng Daily, 12 March 2026, 2025 private education survey (Ministry of Education and Ministry of Data and Statistics): participation 75.7%; total 27.5 trillion won,
//     down 5.7% (1.7 trillion won); 604,000 won a month per participating student, a record; households earning at least 8 million won a month spent 662,000 won per student, those under 3 million won spent 192,000 won.
//   Read directly: Grand View Research press release on PR Newswire, 13 March 2023: "Online Tutoring Services Market to be Worth $23.73 Billion by 2030", CAGR 14.9% from 2023 to 2030; no base-year figure; defines online tutoring as
//     "tutoring in an online, networked, or virtual environment".
//   From search results only: Fact.MR press release title (30 Nov 2023, page answered 403): "Online Tutoring Market Accelerates at 12.7% CAGR to Hit US$ 27.63 Billion by 2034"; a Market Glass listing of about $8.0 billion in 2024
//     and $18.2 billion by 2030 (14.6% CAGR); a Technavio listing of an increase of USD 518.3 billion at 22.4% CAGR for 2025 to 2030 (its report page showed no figures when opened: "This report is being upgraded").
//   Not readable by our script (HTTP 403): the Preply about page, the Wyzant about page, an italki support page, and the Education Endowment Foundation page. NCES pages did not open (connection refused); NCES numbers seen in search results disagree
//     (78%, 85% and, through EdChoice, 49% for the same 2024-25 school year), so none is printed.
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/app/(dashboard)/earnings/page.tsx (tabs Overview, Payments, Reports; period switch 30 days, 90 days, 12 months, all time; Earned, Still owed, Lessons,
// Cancellation rate with a trend against the period before; top students; Reports and exports are Pro). No market benchmarks and no comparison with other tutors. We publish no statistics about Tutafy tutors in this post.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const ONLINE_TUTORING_STATISTICS_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'The firmest official numbers about tutoring are not about online tutoring. The US Bureau of Labor Statistics puts median pay for all tutors at $20.84 an hour (2025) and expects no change in the number of tutor jobs from 2025 to 2035.',
    'Research on whether tutoring works is clearer than research on how big the market is. A 2024 review of 89 randomised trials found an average gain of 0.288 standard deviations, and bigger gains when sessions were frequent.',
    'Online tutoring market-size forecasts do not agree with each other. The ones we could see range from about $8 billion for 2024 to a forecast increase of $518 billion, and we print none of them as a fact.',
    'Every figure in this guide has a source, the date the data was collected and the day we checked it (31 October 2026). Where we could not open the original, we say so.',
    'Some popular numbers are left out on purpose, such as a £24 an hour price that comes from a 2016 page. The last part of this guide lists them and shows how to check a statistic yourself.',
  ] },
  { type: 'p', text: `People who search for online tutoring statistics usually want one of three things: how big the market is, what tutors earn, or whether tutoring works. This guide answers each with the numbers we could trace to an original source, gives the date of each one, and says what the number does not tell you.` },
  { type: 'p', text: `We are a tutoring-software company, so we have a reason to like big numbers about tutoring. That is why the guide is strict. A figure goes in only if we opened the page or the study it comes from, or if we say clearly that we only saw it in a search result. If a figure circulates widely and we could not trace it, it goes in the section on numbers we would not print.` },
  { type: 'image', src: '/blog/inline/stats-video-call', alt: 'A black laptop on a wooden desk showing a video call with two participants whose faces are blurred.', caption: 'Illustrative photo, not a Tutafy user. No figure here separates online lessons from other tutoring unless we say so.', credit: 'Photo: Project Kei (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Video_Conference_Using_Laptop.jpg' },
  { type: 'h2', text: 'Online tutoring statistics at a glance' },
  { type: 'statCards', cards: [
    { value: '$20.84', label: 'median hourly pay for US tutors in 2025 (all tutors, not only online)' },
    { value: '0%', label: 'projected change in US tutor jobs from 2025 to 2035' },
    { value: '29%', label: 'of secondary pupils in England and Wales have had private tutoring at some point' },
    { value: '0.288 SD', label: 'average learning gain across 89 randomised trials of tutoring' },
  ] },
  { type: 'p', text: `The table has the same numbers, plus the ones that did not fit in four cards. Read the last column before you quote any of them. It says how we know.` },
  { type: 'compare', caption: 'Tutoring numbers we could source, checked 31 Oct 2026. None of these is specific to online tutoring unless it says so.', headers: ['Number', 'What it measures', 'Source and date of data', 'How we know'], rows: [
    ['$43,350 a year, $20.84 an hour', 'Median pay for all tutors in the United States, May 2025', 'US Bureau of Labor Statistics, Occupational Outlook Handbook, page modified 27 Aug 2026', 'Opened the page'],
    ['208,400', 'US tutor jobs in 2025', 'Same BLS page', 'Opened the page'],
    ['0%, about 500 fewer jobs', 'Projected change in tutor employment from 2025 to 2035 (208,000 jobs in 2035)', 'Same BLS page', 'Opened the page'],
    ['34,200', 'Average yearly openings, mostly to replace workers who leave the job', 'Same BLS page', 'Opened the page'],
    ['12%', 'Share of tutor jobs held by self-employed workers', 'Same BLS page', 'Opened the page'],
    ['29%', 'Secondary school pupils in England and Wales who have had private tutoring at some point', 'Sutton Trust, Private Tutoring 2026, published 20 Feb 2026, Ipsos Young People Omnibus', 'Opened the web page; could not read the PDF text'],
    ['0.288 SD', 'Average effect of tutoring programmes on learning, 89 randomised trials, preK to 12', 'Nickow, Oreopoulos and Quan, 2024 version, abstract on the Stanford NSSA site', 'Opened the abstract'],
    ['Up to 5 months', 'Extra progress from one to one tuition in England', 'Education Endowment Foundation toolkit', 'Seen in a search result; the page refused our script'],
    ['54% and 10%', 'US teens aged 13 to 17 who used chatbots for help with schoolwork, and who do all or most of it that way', 'Pew Research Center, published 24 Feb 2026; survey 25 Sep to 9 Oct 2025, 1,458 teens and parents, margin of error 3.3 points', 'Opened the report page'],
    ['75.7%, 27.5 trillion won', 'South Korea, 2025: pupils taking private education, and total spending', 'Ministry of Education and Ministry of Data and Statistics, released 12 Mar 2026', 'Read in a news report; official release not opened'],
  ] },
  { type: 'h2', text: 'Jobs and pay: what the US government counts' },
  { type: 'p', text: `The best official source on tutor pay in the United States is the Bureau of Labor Statistics. Its Occupational Outlook Handbook page for tutors, last modified on 27 August 2026, gives a median annual wage of $43,350 in May 2025, which it also states as $20.84 an hour. It counts 208,400 tutor jobs in 2025 and projects "little or no change" to 2035, which is 0%, or about 500 fewer jobs. About 34,200 openings a year are expected, mostly from people leaving the job and being replaced.` },
  { type: 'p', text: `Two details matter for anyone running their own practice. Self-employed workers hold 12% of tutor jobs, so most counted tutors work for someone else, such as a school, a learning centre or a company. And the page says only that "most tutors work part time", without a percentage. It does not split out online tutors, so no pay figure on that page is an online-tutoring figure.` },
  { type: 'p', text: `The same page has a sentence about artificial intelligence: it says generative AI "will somewhat reduce the need for tutors". We include it because it is the official view and because it sits beside the first number you will want to quote. Our guide to online tutoring jobs covers what particular platforms pay, with dates, and our guide to the real hourly rate shows what a median like $20.84 becomes after unpaid time.` },
  { type: 'callout', variant: 'info', title: 'What a median does not say', text: 'A median is the middle of everyone counted. Half of tutors earn less and half earn more. The BLS figure mixes school tutors, centre staff and private tutors, and it comes from the United States. It is a fair anchor for a conversation, not a price list for your subject.' },
  { type: 'h2', text: 'Who buys tutoring: two countries, two kinds of number' },
  { type: 'p', text: `For how many families pay for tutoring, there is no single worldwide figure we could trace. What we found are national surveys, and they measure different things, so they are not comparable with each other.` },
  { type: 'h3', text: 'England and Wales: a share of pupils' },
  { type: 'p', text: `The Sutton Trust, a UK education charity, published Private Tutoring 2026 on 20 February 2026. Its page reports that 29% of secondary school students in England and Wales have had private tutoring at some point, using the Ipsos Young People Omnibus. "At some point" is a lifetime measure. It is not the share having lessons this month, and it counts all subjects and all formats. It does not say how many were online.` },
  { type: 'p', text: `The PDF of the full report would give the sample size and the breakdown by family income, but our script could not read its text. The secondary summaries we found disagree about the income split, so we print only the headline.` },
  { type: 'h3', text: 'South Korea: how much is spent' },
  { type: 'p', text: `South Korea runs a yearly survey of private education. A report in the Korea JoongAng Daily on 12 March 2026 describes the 2025 results, released by the Ministry of Education and the Ministry of Data and Statistics: 75.7% of pupils took private education, total spending was 27.5 trillion won, down 5.7% on the year, and spending per participating pupil reached a record 604,000 won a month. Households earning at least 8 million won a month spent 662,000 won per student, against 192,000 won for those under 3 million won.` },
  { type: 'p', text: `We read this in the news report and did not open the ministries' own release, so treat the figures as reported, not as checked at the source. They show one thing clearly: spending on tutoring follows household income, in a country with a large and well-measured private education market. They say very little about your market, which is probably not South Korea.` },
  { type: 'image', src: '/blog/inline/stats-calculator', alt: 'A grey desktop calculator with a large display, seen from the front on a plain light background.', caption: 'Illustrative photo. Do the arithmetic on your own lessons before you rely on anyone else’s average.', credit: 'Photo: Anton Ehrola (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Calculator_Office.jpg' },
  { type: 'h2', text: 'Does tutoring work? The research numbers' },
  { type: 'p', text: `This is the part of the statistics where the evidence is strongest, and also where a number is most often repeated wrongly. A 2024 systematic review by Andre Nickow, Philip Oreopoulos and Vincent Quan collected 89 randomised controlled trials of tutoring in preK to 12 education. The abstract, on the Stanford National Student Support Accelerator site, reports an overall pooled effect of 0.288 standard deviations, with 0.290 for literacy and 0.268 for maths.` },
  { type: 'p', text: `A standard deviation is a measure of spread in test scores, so 0.288 means the average tutored pupil scored a little over a quarter of a spread above the average untutored pupil. It is a good result by education standards. The abstract adds that effects "tend to be largest" for programmes that use teachers or paraprofessionals as tutors, that run in earlier grades, that meet at least three days a week, and that are held during school.` },
  { type: 'p', text: `Read that last list as a description of what the trials found, and not as a promise for a private lesson. A private lesson is often one hour a week, after school, with a tutor who may be neither a teacher nor a paraprofessional. The abstract does not say that such lessons fail. It says the largest effects came from a different dose.` },
  { type: 'p', text: `The Education Endowment Foundation, an English charity, reports in its Teaching and Learning Toolkit that one to one tuition can add up to five months of additional progress. We saw that in a search result, because the page itself refused our script. Read the page before you quote it, and note that it measures months of school progress, a different yardstick from standard deviations.` },
  { type: 'h2', text: 'Teens and AI: the number that changes how you describe your service' },
  { type: 'p', text: `The Pew Research Center asked 1,458 US teens and their parents about AI between 25 September and 9 October 2025, and published the results on 24 February 2026. It found that 54% of teens aged 13 to 17 have used chatbots to get help with schoolwork, and that one in ten say they do all or most of their schoolwork with that help. The overall margin of error is plus or minus 3.3 percentage points.` },
  { type: 'p', text: `What this tells a tutor is limited, and worth stating exactly. It counts use of chatbots for schoolwork help, not use instead of tutors, and it does not say whether the help worked. What it does show is that a student who books you has probably already tried a chatbot, and for that reason we think a tutor should plan for it. Our guide to AI tools for tutors covers what to do with that.` },
  { type: 'h2', text: 'Online tutoring market size: why we print none of it as fact' },
  { type: 'p', text: `This is the number most people expect in a statistics article, and it is the one we trust least. Market-research firms publish forecasts for "the online tutoring market", and the figures differ by large factors, because each firm defines the market differently and keeps its method behind a paywall. Here is what we could see, and what we could actually open.` },
  { type: 'compare', caption: 'Market-size claims about online tutoring, checked 31 Oct 2026. We print them to show the spread, not to use them.', headers: ['Publisher', 'What it says', 'What we opened'], rows: [
    ['Grand View Research', 'Press release of 13 Mar 2023: $23.73 billion by 2030, growing 14.9% a year from 2023 to 2030. No base-year figure in the release.', 'The press release'],
    ['Fact.MR', 'Press release of 30 Nov 2023 with the headline "Online Tutoring Market Accelerates at 12.7% CAGR to Hit US$ 27.63 Billion by 2034".', 'Only the headline, from a search result; the page refused our script'],
    ['Market Glass (Global Industry Analysts)', 'A reseller listing gives about $8.0 billion in 2024 and $18.2 billion by 2030, 14.6% a year.', 'A search snippet only'],
    ['Technavio', 'A search result says the market will increase by USD 518.3 billion from 2025 to 2030, 22.4% a year.', 'The report page, which showed no figures'],
  ] },
  { type: 'p', text: `Put those side by side. One firm forecasts $23.73 billion for 2030. Another lists $18.2 billion for the same year. A third lists an increase of $518.3 billion. These are very unlikely to be different measurements of the same thing. The most likely reason is different definitions, and we could not read the definitions of three of the four. The Grand View release gives one line: online tutoring is "tutoring in an online, networked, or virtual environment". It does not say what is counted inside that.` },
  { type: 'p', text: `So if you need a market-size number for a plan, do not copy one from a blog. Take a figure from a report you have paid for or read in full, name the publisher and the year, and write the definition next to the number. The honest summary of what we could verify is short: several firms forecast double-digit yearly growth, and no two agree on a base.` },
  { type: 'image', src: '/blog/inline/stats-magnifier', alt: 'A round magnifying glass with a brass rim and a handle made from a horn, lying on a white surface.', caption: 'Illustrative photo. Look at the original before you repeat the number.', credit: 'Photo: PLBechly (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:A_magnifying_glass.jpg' },
  { type: 'h2', text: 'Numbers we would not print, and why' },
  { type: 'p', text: `Some figures travel widely in articles about tutoring. We looked for each one, and left it out. This list is the most useful part of the guide for anyone who quotes statistics.` },
  { type: 'ul', items: [
    `"Private tutors cost £24 an hour." The Sutton Trust page that carries this line is dated 11 September 2016. It says the average cost "usually to pass an exam" is £24 an hour, gives no sample size and no survey date, and refers to a report called Shadow Schooling. It is a decade old and from a different country than most readers.`,
    `"Tutoring improves results by 0.37 standard deviations." A search result describes the 2020 working paper by the same authors as reporting 0.37 across 96 studies. The 2024 version we read says 0.288 across 89 trials. Both numbers are online. Use the published one, and say which version you mean.`,
    `"Most US schools offer tutoring." The figures we saw in search results for one school year were 78%, 85% and 49%, from different summaries of National Center for Education Statistics data. The NCES pages would not open for us, so we cannot say which measure is which. None is printed.`,
    `"The platform has millions of students." Platform pages for Preply, Wyzant and italki returned errors to our script, so we could not date their user counts. Whatever they say, they are the platform's own figures about itself.`,
    `"Online tutors earn $X an hour." The BLS says nothing about online tutors separately, and an article that gives a single online rate is quoting a marketplace listing or an average of its own choice. Our guide to online tutoring jobs lists what named platforms say they pay, with dates.`,
    `"The tutoring market will reach $X billion." See the previous section.`,
  ] },
  { type: 'h2', text: 'How to check a tutoring statistic in five minutes' },
  { type: 'p', text: `You can apply the same tests that we used. They take little time, and they catch most bad numbers.` },
  { type: 'ul', items: [
    `Find the first publisher. Who ran the survey or kept the records: a government office, a university, a charity, a company that sells reports, or a tutoring platform? Another website quoting the number is not the first publisher.`,
    `Find the date of the data, not the date of the page. The Pew survey ran in autumn 2025 and was published in February 2026. The £24 line was published in 2016.`,
    `Find who was counted. Tutors or pupils? Schools or households? Which country, which ages, which year groups? "29% of secondary pupils in England and Wales" is not "29% of students".`,
    `Find the definition. "Tutoring" can mean school programmes, exam preparation, language lessons or any support. "Online tutoring" can mean live lessons or any digital learning product.`,
    `Look for the sample and the margin of error. Pew gives 1,458 teens and parents and a margin of 3.3 points. A figure with no sample and no margin deserves less weight.`,
    `Ask who gains from the number. A market forecast is a product that the publisher sells, and a platform's user count is advertising.`,
    `Write the figure with its source and date. If you cannot, do not use it.`,
  ] },
  { type: 'h2', text: 'What these numbers mean if you tutor on your own' },
  { type: 'p', text: `Statistics about a whole country are poor guides to one tutor's week, but several of the figures above change what we would do. These are our readings, not findings.` },
  { type: 'h3', text: 'Do not plan around growth' },
  { type: 'p', text: `The official US projection is flat, and the official note on AI points down. Forecasts from firms that sell reports point up. We would plan on the evidence we can open: a mature market with a small self-employed share, where the way to grow is to keep the students you have and be easy to find, not to wait for a rising tide.` },
  { type: 'h3', text: 'Use the median as a floor to question, not a price to copy' },
  { type: 'p', text: `A median of $20.84 an hour across all US tutors is a useful number to hold against your own rate. If you charge a lot less, ask why. If you charge a lot more, make sure your page says what the student gets for it, such as an exam specialism, a qualification or results you can show. Our guide to pricing your lessons works through this.` },
  { type: 'h3', text: 'Be careful what you promise about results' },
  { type: 'p', text: `The research finds that tutoring works on average, with the largest effects from frequent sessions. If a student wants an exam result and sees you once a week, tell them what extra practice between lessons they will need. Do not quote 0.288 or five months to a parent as a forecast for their child. They are averages from programmes, and one child's progress can be far above or below one.` },
  { type: 'p', text: `A lesson package is one honest way to deal with frequency. A block of lessons booked twice a week for six weeks has a different structure from a lesson a week with no end. Our guide to lesson packages explains how to price and write that.` },
  { type: 'h3', text: 'Expect students to have used a chatbot already' },
  { type: 'p', text: `With 54% of US teens saying they have used chatbots for schoolwork, assume the student in front of you has. Your edge is the parts a chatbot does not do well in a text box: checking the student's own working, hearing them speak, keeping them to a routine, and noticing when they have stopped understanding. That is our opinion, not a finding, and it will not apply to every subject.` },
  { type: 'h2', text: 'Track your own numbers, which are the ones you can trust' },
  { type: 'p', text: `A tutor can learn more from four numbers of their own than from any forecast: what you earned, what you are still owed, how many lessons you taught, and what share of booked lessons were cancelled. Compare each with the previous period, not with a stranger's average.` },
  { type: 'p', text: `We build Tutafy, so here is what it does and does not do, read from the code on 31 October 2026. The Earnings page shows Earned, Still owed, Lessons and Cancellation rate for the last 30 days, 90 days, 12 months or all time, each with a trend against the period before, and a list of your top students by money paid. Exporting accounting reports is part of the Pro plan.` },
  { type: 'compare', caption: 'Statistics in Tutafy, as of 31 Oct 2026.', headers: ['What you might want', 'Tutafy', 'Plan'], rows: [
    ['Your own earnings, lessons and cancellation rate, with a trend', 'Yes: the Earnings page, for 30 days, 90 days, 12 months or all time', 'All plans'],
    ['Your top students by money paid', 'Yes', 'All plans'],
    ['Accounting exports and attendance reports', 'Yes', 'Pro, $12 a month'],
    ['Market benchmarks, or a comparison with other tutors', 'No', '-'],
    ['Statistics about how many online lessons happen in your subject or country', 'No', '-'],
  ] },
  { type: 'p', text: `We do not publish figures about Tutafy tutors in this guide, because we have no source to cite for them that would pass the tests above. The numbers on your Earnings page are your own records, and nothing in them is a statement about the market.` },
  { type: 'source', text: 'Sources opened or seen on 31 Oct 2026. Where a page refused our script or the full text could not be read, the table and the text say so.', links: [
    { label: 'US Bureau of Labor Statistics: Tutors', href: 'https://www.bls.gov/ooh/education-training-and-library/tutors.htm' },
    { label: 'Sutton Trust: Private Tutoring 2026', href: 'https://www.suttontrust.com/our-research/private-tutoring-2026/' },
    { label: 'Sutton Trust: parents pay private tutors £24 an hour (2016)', href: 'https://www.suttontrust.com/news-opinion/all-news-opinion/parents-pay-private-tutors-24-an-hour' },
    { label: 'Stanford NSSA: The Promise of Tutoring for PreK-12 Learning', href: 'https://nssa.stanford.edu/studies/promise-tutoring-prek-12-learning-systematic-review-and-metaanalysis-experimental-evidence' },
    { label: 'EEF Teaching and Learning Toolkit: one to one tuition', href: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/one-to-one-tuition' },
    { label: 'Pew Research Center: How Teens Use and View AI', href: 'https://www.pewresearch.org/internet/2026/02/24/how-teens-use-and-view-ai/' },
    { label: 'Korea JoongAng Daily: private education spending in 2025', href: 'https://www.koreajoongangdaily.com/korea/private-education-spending-for-grade-school-students-hits-record-high-in-2025/12560246' },
    { label: 'Grand View Research press release, 13 March 2023', href: 'https://prnewswire.co.uk/news-releases/online-tutoring-services-market-to-be-worth-23-73-billion-by-2030-grand-view-research-inc-301769929.html' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'What named platforms say they pay, with dates.' },
    { label: 'The real hourly rate for tutors', href: '/blog/real-hourly-rate-for-tutors', text: 'What a headline rate becomes after commission and unpaid time.' },
    { label: 'How to price your tutoring lessons', href: '/blog/how-to-price-tutoring-lessons', text: 'Set a rate you can explain.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'Structure frequent lessons honestly.' },
    { label: 'AI tools for tutors', href: '/blog/ai-tools-for-tutors', text: 'Where a chatbot helps and where a tutor still matters.' },
    { label: 'How to start an online tutoring business', href: '/blog/how-to-start-an-online-tutoring-business', text: 'The first steps, in order.' },
  ] },
  { type: 'faq', items: [
    { q: 'How big is the online tutoring market?', a: `Nobody agrees. Market-research firms publish forecasts that differ by large factors because they define the market differently. Grand View Research's 2023 release forecasts $23.73 billion by 2030, and another listing we saw gives $18.2 billion for the same year. We could not verify a base figure and print none as fact.` },
    { q: 'How much do tutors earn in the United States?', a: `The US Bureau of Labor Statistics reports median pay of $43,350 a year, or $20.84 an hour, for tutors in May 2025. It covers all tutors, not only online ones, and the median is the middle of everyone counted.` },
    { q: 'Is the number of tutor jobs growing?', a: `The BLS projects little or no change from 2025 to 2035, about 500 fewer jobs from 208,400, and says generative AI will somewhat reduce the need for tutors. That is the official view for the United States and does not cover other countries.` },
    { q: 'Does tutoring actually work?', a: `On average, yes. A 2024 review of 89 randomised trials found a pooled effect of 0.288 standard deviations. Effects tended to be larger for frequent sessions, for earlier grades and for tutoring held during school. They are averages from programmes, not a promise for one student.` },
    { q: 'How many students use private tutors?', a: `It depends on the country and the question. The Sutton Trust found that 29% of secondary pupils in England and Wales have had private tutoring at some point, published in February 2026. South Korea reported 75.7% participation in private education in 2025. The two measure different things.` },
    { q: 'How do I know whether a tutoring statistic is reliable?', a: `Find who first published it, the date of the data, who was counted, how the term was defined and the sample size. If a number has no source and no date, do not use it. The checklist above takes about five minutes.` },
  ] },
  { type: 'cta', title: 'Know your own numbers first', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and an Earnings page with your own totals. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy has no market benchmarks.', button: 'Start free, no credit card', href: '/register' },
]
