// T-1193. Article body for /blog/tutor-resume (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1230-tutafy-traffic-10-articles-plan.md, article 4; keyword data: reports/chief/2026-10-31-1315-keyword-data-sapa-tutafy.md
// (OpenSEO, US, English, 31 Oct 2026: "tutor resume" about 320 searches a month, difficulty 0, CPC about 8 USD).
// Step 0 (overlap with the articles on master and the four in the calendar branches, 31 Oct 2026): how-to-write-a-tutor-bio is the closest (the text STUDENTS read: a profile of 60 to 150 words);
// this guide is the document an EMPLOYER or a platform reads (a one or two page resume), so it starts by telling the two apart and links to the bio guide for the profile text. online-tutoring-jobs (T-1192, same day)
// says which platforms ask for what; this guide says what to put in the document they ask for. how-to-start-an-online-tutoring-business and get-your-first-tutoring-clients are about getting students, not a resume.
// Own angle: a resume for tutors, section by section, with bullets for different subjects (invented, said to be), what to do with no paid tutoring, how to tailor it, and when an independent tutor does not need one.
//
// Sources, read on 31 Oct 2026:
//   Read directly: National Careers Service (UK), How to write a CV: sections (contact details, an introduction, education history, work history, references); the introduction is "a few short lines that sum up who you are and what
//     you hope to do", placed just under your name and contact details; for each job give the employer, the job title and the dates and describe what you did in 2 to 3 lines using the STAR method; do not include age, date of birth,
//     whether you are married or nationality; do not include someone else's contact details (say references are available on request); remove outdated information; tailor the CV to the job.
//   Read directly: National Careers Service, Explain a gap in employment: "Having a gap in your CV is not a problem, but you might be asked about it."; be open and honest; volunteering or a short or online course can be mentioned.
//   From the search result of the official page (the page answered 403 to a script): CareerOneStop (US Department of Labor), Resumes, Formatting, Applicant tracking systems, Work experience: length 1 to 2 pages; up to the past 10 to 15 years of work
//     history; 5 to 8 bullet points under each job, each one or two lines; scan 10 to 15 job postings and use the posting's exact terms, each keyword about twice; match the top third of the resume to each posting; reviewers spend a few seconds
//     (the pages give figures from six or seven seconds to 15 to 20 seconds, so the text says "a few seconds"); avoid tables, text boxes, logos, columns, images and graphics because an applicant tracking system may scramble them.
//   From the search result of the official page: National Careers Service, How to write a cover letter: usually 3 to 5 paragraphs, write a new one for every job.
//   Read directly: US Bureau of Labor Statistics, Occupational Outlook Handbook, Tutors: typical entry education "some college, no degree"; most tutors work part time; self-employed workers 12% of tutor jobs.
//   From the platform pages as read for online-tutoring-jobs (31 Oct 2026): Varsity Tutors application covers contact information, education and work experience documentation (30 to 45 minutes), no prior teaching required;
//     Wyzant asks for a free response and a profile; Preply asks for a photo, a description and an introduction video; italki asks for ID and, for Professional Teachers, teaching qualifications.
// Not read, so not written: what any one employer's tracking software does with a file, any statistic on how many resumes are rejected, any salary figure for a tutor resume, other countries' resume customs beyond the UK pages.
// What it says about Tutafy comes from the code and the live site, read on 31 Oct 2026: a tutor profile on the booking page has a name, an introduction and languages (docs/features/T-1043-directory-setup.md); there is no resume
// builder, no upload or check of qualifications in the code (grep for "resume" and "credential" in src finds nothing); plans from src/lib/plans.ts. All people and numbers in the examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const TUTOR_RESUME_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'A tutor resume is the one or two page document an employer or platform reads. It is not the short profile your students read, which is a different job.',
    'Official career advice agrees on the shape: contact details, a short introduction, education, work history with results, and tailoring to each job. CareerOneStop says 1 to 2 pages, with 5 to 8 short bullets under each job.',
    'Write each bullet as a result: what you taught, to whom, and what changed. Use a number only when it is true, and never invent one.',
    'No paid tutoring yet? Say what you really did, such as volunteering, a course or peer tutoring. The UK National Careers Service says a gap is not a problem if you are open about it.',
    'An independent tutor with students rarely needs a resume. Keep one for applications, schools and clients who ask. Tutafy does not build resumes or check qualifications.',
  ] },
  { type: 'p', text: `A tutor resume is a one or two page document that shows an employer or a tutoring platform who you teach, what you have achieved and what qualifies you. It is read by someone deciding whether to hire or approve you, so it needs evidence, not slogans. CareerOneStop, the US Department of Labor's career site, gives the length as 1 to 2 pages, and the UK National Careers Service lists the same core parts: contact details, an introduction, education, work history and references.` },
  { type: 'p', text: `This guide covers which document you actually need, the sections in order, how to turn tutoring work into bullets that show results, an example for four subjects, what to do when you have never been paid to tutor, how to tailor the resume to each job, and the mistakes that sink it. The people and numbers in the examples are invented, and we say so each time. The advice is general: employers differ, so follow any instructions in the job post first.` },
  { type: 'image', src: '/blog/inline/resume-book-stacks', alt: 'A laptop with a dark screen on a wooden desk beside a black desk lamp and stacks of books, papers and a document holder against a white wall.', caption: 'Illustrative photo, not a Tutafy user. A resume is a working document you update often.', credit: 'Photo: freddie marriage (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Laptop_on_desk_book_stacks_(Unsplash).jpg' },
  { type: 'h2', text: 'Who asks for a tutor resume, and who does not' },
  { type: 'p', text: `Not every route needs a resume, and sending one where it is not asked for wastes your time. Here is what the platform pages we read on 31 October 2026 asked for.` },
  { type: 'ul', items: [
    `Varsity Tutors. Its application covers contact information, education and work experience documentation, takes 30 to 45 minutes and does not require prior teaching. This is the closest to a resume.`,
    `Wyzant. A free response and a profile, plus a short quiz for some subjects.`,
    `Preply. A profile photo, a description and an introduction video, with no resume mentioned on the pages we read.`,
    `italki. ID in onboarding, and teaching qualifications for its Professional Teacher type.`,
    `Schools, learning centres and universities. These usually ask for a resume or CV, and sometimes references. We did not read any one employer's requirements, so follow the job post.`,
    `Parents and students who find you directly. They rarely ask. They read a profile, a booking page and reviews.`,
  ] },
  { type: 'p', text: `The US Bureau of Labor Statistics lists the typical entry education for tutors as some college without a degree, and says most tutors work part time. So an employer reading a tutor resume is usually looking for evidence that you know the subject and can teach it, not a long career. That favours a short, specific document. Which platforms ask for what, and what each keeps or pays, is in our guide to online tutoring jobs.` },
  { type: 'h2', text: 'Resume, tutor bio or cover letter: which one are you writing?' },
  { type: 'p', text: `The three get mixed up, and each fails when written as one of the others.` },
  { type: 'compare', caption: 'Three documents tutors write. Lengths for the resume and cover letter are from CareerOneStop and the National Careers Service; the bio length is from our tutor bio guide.', headers: ['Document', 'Who reads it', 'Length', 'What it has to do'], rows: [
    ['Resume or CV', 'An employer or platform deciding whether to hire or approve you', '1 to 2 pages', 'Prove you can do the job: education, experience, results.'],
    ['Cover letter', 'The same reader, with your resume', 'Usually 3 to 5 paragraphs, new for each job', 'Say why this job and why you, in your own words.'],
    ['Tutor bio or profile', 'A student or parent choosing a tutor', 'Short, 80 to 150 words', 'Say who you help and what a lesson is like.'],
  ] },
  { type: 'p', text: `If you are applying to a company, write the resume first and the bio second. If you are building your own booking page, write the bio and skip the resume. Our guide to writing a tutor bio has a template and fifteen invented examples for the second case.` },
  { type: 'h2', text: 'The sections, in order' },
  { type: 'p', text: `The National Careers Service lists the sections as contact details, an introduction, your education history, your work history and references. For a tutor, five parts are enough, in this order.` },
  { type: 'ul', items: [
    `Header. Your name, a professional email address, a phone number or a messaging handle, your city and time zone, and a link to your profile or website if you have one. Give your time zone: for online work it answers a question the employer will have.`,
    `Introduction. Two or three lines under the header: who you teach, at what level, and what makes you suited to this job. The National Careers Service describes it as "a few short lines that sum up who you are and what you hope to do".`,
    `Tutoring and teaching experience. Most recent first, with the organisation or the words "Independent tutor", the dates and the bullets. This is the longest part.`,
    `Education and qualifications. Degrees, certificates and exam results relevant to what you teach, with dates. Put it above experience if you are a student with little work history.`,
    `Skills and tools. The subjects and levels you teach, languages, and the software you use for lessons. Keep it to what you could demonstrate.`,
  ] },
  { type: 'p', text: `Leave out what the National Careers Service says to leave out: age, date of birth, whether you are married and nationality. Do not put someone else's contact details on the page. Write that references are available on request instead, so that nobody is contacted without being asked. Remove anything out of date. This advice is from the UK, and some countries expect a photo or other details, so check the norm where you are applying.` },
  { type: 'h2', text: 'Write the introduction last, and make it specific' },
  { type: 'p', text: `The introduction sits at the top and is written after the rest, when you know what the page proves. It names the subject and level, one proof and what you want. Compare:` },
  { type: 'compare', caption: 'Invented introductions. The left column is the kind that says nothing.', headers: ['Vague', 'Specific'], rows: [
    ['Passionate and motivated tutor with experience in different subjects, looking for an opportunity to grow.', 'Maths tutor for ages 11 to 16, four years of one-to-one lessons, preparing students for GCSE exams. Looking for online part-time work around university.'],
    ['Dedicated English teacher who loves helping people.', 'Conversation-focused English tutor for adults who work in English but speak up less than they would like. Two years online, evenings and weekends.'],
    ['Hardworking graduate seeking a challenging tutoring role.', 'Computer science graduate teaching Python to beginners aged 14 and up. Three months of weekly volunteer lessons at a youth club.'],
  ] },
  { type: 'p', text: `The specific versions give a reader three things to check: a subject, a level and a length of time. Every claim in them must be true when you write it. If you would not say it out loud in an interview, do not print it.` },
  { type: 'h2', text: 'Turn tutoring into bullets that show results' },
  { type: 'p', text: `The experience section is where tutor resumes are won or lost. The National Careers Service says to describe each job in 2 to 3 lines using the STAR method: the situation, the task, the action you took and the result. CareerOneStop says each job usually needs 5 to 8 bullets, each one or two lines. For a tutor, a good bullet answers four questions: what did you teach, to whom, how, and what changed.` },
  { type: 'compare', caption: 'The same work written two ways. The examples and numbers are invented.', headers: ['Describes a duty', 'Shows a result'], rows: [
    ['Tutored students in maths.', 'Taught GCSE maths one-to-one to 9 students over two years, weekly; 7 of 9 improved by at least one grade between mock and final exams.'],
    ['Helped students with essays.', 'Coached 12 university students on essay structure with a shared feedback sheet; most moved from a pass to a merit on the next assignment, by their own reports.'],
    ['Taught programming online.', 'Built a six-week Python course for beginners and taught it twice; every student finished a small working project to show their parents.'],
    ['Prepared students for tests.', 'Ran a weekly SAT reading practice with a timed passage and a review of every wrong answer; students raised their practice scores over the term.'],
  ] },
  { type: 'p', text: `Three habits make bullets better. Start with a verb that says what you did: taught, built, coached, planned, tracked. Name the student or level, because "Year 9" tells a reader more than "students". And finish with a change, a number or a concrete outcome when you have one.` },
  { type: 'callout', variant: 'warn', title: 'Never invent a number', text: `A false grade improvement or student count can be checked, and a platform or school may ask for evidence, such as a reference or a letter from a parent. Use only what you can show. If you have no number, write the outcome in words: "students completed a project each". If your results come from the students' own reports, say so.` },
  { type: 'h3', text: 'Four short examples, by subject' },
  { type: 'p', text: `Each is invented to show the pattern, not to copy. Replace every detail with your own.` },
  { type: 'ul', items: [
    `Maths, GCSE. "Planned a 10-week revision course for one student at grade 4, using past papers and a mistake log; the student reached grade 5 in the summer exam." Tools: online whiteboard, shared documents.`,
    `English as a second language, adults. "Led 30-minute conversation sessions on work topics; recorded and reviewed each student's three most common errors every week, and tracked them over eight weeks."`,
    `Programming, beginners aged 14 and up. "Taught variables, loops and functions through small games; each learner finished and presented one project."`,
    `Music, piano. "Taught grade 1 to 3 pieces and sight-reading to six students aged 8 to 12; prepared three for a school concert."`,
  ] },
  { type: 'h2', text: 'No paid tutoring yet: what to put' },
  { type: 'p', text: `Most new tutors start here, and employers know it. The honest approach is to describe what you really did, and not dress it up as paid work. The National Careers Service says "having a gap in your CV is not a problem, but you might be asked about it", and that the important thing is to be open and honest. It also says you can mention volunteering or a short or online course: "even if you do not think it's relevant to the job, it shows you're willing to learn."` },
  { type: 'ul', items: [
    `Volunteer or peer tutoring: at a school club, a library, a community group or a university peer-support scheme. Name the place, the weekly hours and the age group.`,
    `Helping with a specific outcome: for example, a younger relative you taught for an exam, if you can describe the result honestly and a reference would confirm it. Do not present it as a business.`,
    `Courses and qualifications that relate to teaching, with the date you finished.`,
    `Your own results in the subject: degrees, grades, competitions. A tutor who knows the subject deeply is selling that.`,
    `Practice lessons you have recorded or taught to a friend, described as exactly that. A short sample can sit beside the resume if the employer accepts one.`,
  ] },
  { type: 'p', text: `Write "Independent tutor" only if you actually took on students. If you have not, put a heading such as "Teaching experience" or "Relevant experience" and be exact about what each item was. The fastest fix for thin experience is to take two or three real students, even at a low price, and record what you did and what happened, with their permission. After a term you have real bullets.` },
  { type: 'image', src: '/blog/inline/resume-typing-office', alt: 'A woman with glasses in a dark jacket types on a laptop at a desk under a lamp, with a red mug beside her.', caption: 'Illustrative photo, not a Tutafy user. Write the first draft fast, then tighten it.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Middle-aged_businesswoman_typing_on_laptop_at_home_office.jpg' },
  { type: 'h2', text: 'Tailor it to each job, in under half an hour' },
  { type: 'p', text: `A resume sent to ten employers unchanged reads as sent to none. CareerOneStop's method takes little time:` },
  { type: 'ul', items: [
    `Read ten to fifteen postings for the kind of job you want, and note the requirements that appear most. It suggests scanning 10 to 15.`,
    `Use the posting's own words where they are true of you. CareerOneStop says to use the exact terms, because a variation may not be recognised, and that about two uses of each keyword is enough.`,
    `Put the match in the top third of the page, the part read first. The posting says "GCSE and A level maths"? Your introduction should say "GCSE and A level maths".`,
    `Cut what the posting does not need. A job for a languages tutor does not need your first-year chemistry grade.`,
  ] },
  { type: 'p', text: `CareerOneStop also says reviewers spend only a few seconds on a resume at first, with its pages giving figures from six or seven seconds to 15 or 20 seconds. Put your strongest, most relevant lines where a quick reader sees them.` },
  { type: 'h3', text: 'A worked example of tailoring' },
  { type: 'p', text: `Suppose a posting asks for "an online tutor for primary maths, with experience of one-to-one lessons and patience with young learners". An untailored line reads: "Tutored maths to students of various ages." The tailored line reads: "Taught primary maths one-to-one online to 6 children aged 7 to 10, in 30-minute lessons, using short games and a weekly progress note for parents." The second uses the posting's terms (primary, one-to-one, online), is specific about age and format, and carries a result a parent can see. Both are invented, and the second is only honest if it is true of you.` },
  { type: 'h2', text: 'Length, layout and files' },
  { type: 'ul', items: [
    `Length: 1 to 2 pages, with two only if you need them, as CareerOneStop says. A new tutor fits on one.`,
    `History: CareerOneStop suggests up to the past 10 to 15 years. A tutor with long unrelated work can summarise it in one line.`,
    `Plain layout. CareerOneStop says to avoid tables, text boxes, logos, columns, images and graphics because an applicant tracking system may scramble them. A single column with standard headings such as "Experience" and "Education" is safest.`,
    `Fonts and spacing: a plain font and enough white space that it reads on a phone. There is no official rule here, so this is our advice.`,
    `File: a PDF keeps the layout, unless the employer asks for another format. Name it with your name, for example "Alex-Example-Tutor-Resume.pdf".`,
    `Check it by pasting it into a plain text file. If the order of the words survives, a tracking system will probably read it too. This is our test, not an official one.`,
  ] },
  { type: 'h2', text: 'A complete one-page example' },
  { type: 'p', text: `Here is the whole thing for an invented tutor, written in plain text. Every name, place and number is made up.` },
  { type: 'ul', items: [
    `Alex Example, Online maths tutor. London, UK (GMT). alex@example.com, 0900 000 000.`,
    `Introduction: Maths tutor for ages 11 to 16, two years of one-to-one online lessons, preparing students for GCSE. Looking for part-time online tutoring around university.`,
    `Tutoring experience, 2024 to now, independent online tutor: Taught GCSE maths to 9 students, weekly, 45 minutes. Planned each lesson from the student's mock exam errors, recorded in a shared mistake log. Reported progress to parents after every lesson. 7 of 9 students improved by at least one grade between mock and final exam, as reported by their families.`,
    `Volunteer, 2023 to 2024, youth club homework help: Helped six students aged 11 to 13 with maths homework, two evenings a week.`,
    `Education: BSc Mathematics, second year, an invented university, expected 2028. A-level Maths, Further Maths, Physics. Completed an online course in teaching and learning, 2024.`,
    `Skills and tools: Maths up to GCSE and A level, online whiteboards, screen sharing, scheduling and payment tools. References available on request.`,
  ] },
  { type: 'p', text: `That is about 200 words, one page and nothing to hide. It would be read in seconds and checked in minutes.` },
  { type: 'h2', text: 'Mistakes that cost interviews' },
  { type: 'ul', items: [
    `Duties instead of results. "Responsible for tutoring" says what the job was, not what you did.`,
    `A made-up number or a claim you cannot support when asked.`,
    `One resume for every job, with no tailoring to the subject or level.`,
    `Personal details the National Careers Service says to leave out, such as age, date of birth, marital status and nationality (check local norms).`,
    `Someone else's phone number or email in the references section, instead of "available on request".`,
    `A fancy layout with columns, icons or a skills chart that a tracking system may scramble.`,
    `Out-of-date items, such as a job from fifteen years ago that has nothing to do with teaching, or a broken link.`,
    `Typos. A tutor who teaches writing, or any tutor, is judged on a misspelt word. Read it aloud, then have someone else read it.`,
    `Treating the resume as the only thing: with no sample lesson or profile text to match, a good document still wins fewer replies.`,
  ] },
  { type: 'h2', text: 'Do independent tutors need a resume?' },
  { type: 'p', text: `If you teach your own students, a resume is rarely the thing that wins them. Parents and adult learners read a short profile, a booking page, reviews and your answer to a message. About 12% of tutor jobs are self-employed according to the Bureau of Labor Statistics, and for those tutors the resume is a side document. Keep one for four cases: applying to a school or company, a platform that asks for it, a corporate client who wants to see your background, and a parent who asks for your qualifications.` },
  { type: 'p', text: `A common mistake is to paste a resume onto a booking page. A student reading it wants to know what a lesson is like, not your job history. Pull two or three lines from the resume, such as the subject, the level and the best result, and put them in your profile text. Our tutor bio guide shows how.` },
  { type: 'h2', text: 'What Tutafy is, and what it is not' },
  { type: 'p', text: `Tutafy is a tool for tutors who run their own business: a public booking page that shows your hours in the student's time zone, a video classroom that opens in the browser, email reminders, student records, and payment through your own PayPal or Stripe account, with 0% commission. The Free plan is $0 for up to 10 students, Pro is $12 a month and Academy is $29 a month. Your profile on the booking page has a name, an introduction and languages.` },
  { type: 'ul', items: [
    `It does not build or store resumes, and it does not check or hold your qualifications.`,
    `It does not find you employers or send you students, and it has no job listings. The tutor directory is not open yet.`,
    `It does not write your profile for you. The tutor bio guide does that job by method, not by tool.`,
  ] },
  { type: 'p', text: `If you are applying to a company, you do not need Tutafy for that. If you also want your own students, a booking link and payments from them, that is what it is for. The Tutafy review explains it in detail.` },
  { type: 'image', src: '/blog/inline/resume-reading-card', alt: 'A woman with curly blond hair and a blue polka-dot blouse reads a small card held in her hand while looking toward a laptop, in front of a brick wall.', caption: 'Illustrative photo, not a Tutafy user. Read the posting and the resume side by side before you send.', credit: 'Photo: Shixart1985 (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Woman_reading_information_from_a_card_while_working_on_a_laptop.jpg' },
  { type: 'h2', text: 'A checklist before you send it' },
  { type: 'ul', items: [
    `The introduction names a subject, a level and a length of time.`,
    `Every bullet starts with a verb and carries a result or an outcome you can support.`,
    `No number you could not prove if asked.`,
    `Wording matches the posting where it is true of you, near the top of the page.`,
    `One or two pages, plain layout, standard headings.`,
    `No age, date of birth, marital status or nationality, unless the employer asks.`,
    `References "available on request", and a person who has agreed to be one.`,
    `Saved as the format the employer asked for, with a sensible file name.`,
    `Read aloud once, and read by one other person.`,
  ] },
  { type: 'source', text: 'The official pages used for the advice in this guide, read on 31 Oct 2026. The CareerOneStop pages answered 403 to our script, so those figures come from the search result of the official page. Check the current page before you rely on a number.', links: [
    { label: 'National Careers Service (UK): how to write a CV', href: 'https://nationalcareers.service.gov.uk/careers-advice/cv-sections' },
    { label: 'National Careers Service (UK): explain a gap in employment', href: 'https://nationalcareers.service.gov.uk/careers-advice/explain-gaps-in-work-history' },
    { label: 'National Careers Service (UK): how to write a cover letter', href: 'https://nationalcareers.service.gov.uk/careers-advice/covering-letter' },
    { label: 'CareerOneStop (US Department of Labor): resumes', href: 'https://www.careeronestop.org/JobSearch/Resumes/resumes.aspx' },
    { label: 'CareerOneStop: formatting', href: 'https://www.careeronestop.org/JobSearch/Resumes/ResumeGuide/formatting.aspx' },
    { label: 'CareerOneStop: applicant tracking systems', href: 'https://www.careeronestop.org/JobSearch/Resumes/ResumeGuide/TopResumeStrategies/applicant-tracking-systems.aspx' },
    { label: 'US Bureau of Labor Statistics: Tutors', href: 'https://www.bls.gov/ooh/education-training-and-library/tutors.htm' },
    { label: 'Varsity Tutors: tutoring jobs', href: 'https://www.varsitytutors.com/tutoring-jobs' },
    { label: 'Wyzant: tutor registration FAQs', href: 'https://support.wyzant.com/tutors/tutor-account/tutor-registration-faqs/' },
    { label: 'Preply: register to teach', href: 'https://help.preply.com/en/articles/4175138-register-to-teach-on-preply' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'Online tutoring jobs', href: '/blog/online-tutoring-jobs', text: 'Which platforms ask for what, and what each keeps or pays.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'The short profile your students read, with fifteen examples.' },
    { label: 'How to choose a tutoring niche', href: '/blog/how-to-choose-a-tutoring-niche', text: 'Pick the subject and level your resume will lead with.' },
    { label: 'How to teach English online', href: '/blog/how-to-teach-english-online', text: 'The qualification question for English tutors.' },
    { label: 'How to get your first 10 tutoring clients', href: '/blog/get-your-first-tutoring-clients', text: 'Where students come from when you work for yourself.' },
    { label: 'How to price tutoring lessons', href: '/blog/how-to-price-tutoring-lessons', text: 'Set a rate once you know what you offer.' },
  ] },
  { type: 'faq', items: [
    { q: 'What should a tutor resume include?', a: `Contact details with your time zone, a short introduction, tutoring and teaching experience with results, education and qualifications, and skills and tools. The National Careers Service lists contact details, an introduction, education, work history and references as the core parts of a CV.` },
    { q: 'How long should a tutor resume be?', a: `One to two pages. CareerOneStop says resume length should be 1 to 2 pages, with two only if your experience requires it. Most new tutors fit on one page.` },
    { q: 'How do I write a tutor resume with no experience?', a: `Describe what you have really done: volunteering, peer tutoring, courses and your own results in the subject, and be open about it. The National Careers Service says a gap is not a problem and that volunteering or a short or online course can be mentioned. Do not present unpaid help as a business.` },
    { q: 'What is the difference between a tutor resume and a tutor bio?', a: `A resume is for an employer or platform and proves you can do the job in one or two pages. A bio is the short text a student or parent reads on your profile and says who you help and what a lesson is like.` },
    { q: 'Should I put numbers on a tutor resume?', a: `Yes, if they are true: students taught, hours, grade changes, course length. Never invent a number. If you have none, describe the outcome in words, and say when a result comes from students' own reports.` },
    { q: 'Do I need a resume to tutor online?', a: `Not always. Of the platforms we read, Varsity Tutors asks for education and work experience documentation, and the others asked for a profile, a free response or ID. If you teach your own students, a profile and booking page matter more.` },
    { q: 'Does Tutafy build a resume for me?', a: `No. Tutafy does not build resumes, check qualifications or find you employers. It gives you a booking page with a profile, a video classroom, reminders and payment through your own account, with 0% commission and a Free plan for up to 10 students.` },
  ] },
  { type: 'cta', title: 'Got your own students? Give them one link', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not find you employers.', button: 'Start free, no credit card', href: '/register' },
]
