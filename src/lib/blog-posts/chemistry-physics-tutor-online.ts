// T-1245. Article body for /blog/chemistry-physics-tutor-online (title, date and author are in the POSTS list in src/lib/blog.ts).
// Plan: reports/chief/2026-10-31-1610-tutafy-batch3-10-articles-plan.md, article 10 (calendar day 17 Nov 2026). Keywords (OpenSEO, US, English, 31 Oct 2026): "chemistry tutor online" about 590 searches a month, difficulty 7; "physics tutor online" about 480, difficulty 0.
// Step 0 (31 Oct 2026): the first page of results for "chemistry tutor online" and "physics tutor online" is marketplace and agency pages (Preply, TeachMe2, TutorChase, MyEngineeringBuddy), freelancer pages (Fiverr, Contra) and a few promotional posts on a Google Groups page.
// They list tutors and rates and say the same thing: pick a tutor with subject and teaching experience, compare rates, try a trial. None says what a good SESSION looks like in these two subjects, none says how to judge a tutor in them (diagrams, units, the maths, what to do about labs), and none puts safety at home next to the choice.
// On this site no article is about chemistry or physics ("chemistry" and "physics" appear only as example subjects, for instance "GCSE chemistry revision", in a few tutor-side posts in blog.ts and in tutor-resume and online-whiteboard-for-tutoring). The nearest are how-to-find-an-online-tutor (ten checks for any tutor, learner side)
// and online-whiteboard-for-tutoring (tools). The sister article of the same day is gre-gmat-tutor-online. This guide links both ways with the whiteboard guide and links to the others.
// Own angle: what a good session LOOKS LIKE in chemistry and physics, minute by minute, with two worked examples (checked by us), six signs of a good tutor in these subjects, the two AP exam formats, what the research on active learning does and does not say about tutoring, and a plain rule on experiments at home.
// Tutafy is NOT an authority on chemistry or physics: every fact about an exam, a simulation or lab safety is from an official page and says so; our own advice is marked as ours.
//
// Sources, read on 31 Oct 2026 (all from search results of the official pages; our script could not open collegeboard.org, acs.org or the journals, so no figure below is from a page we opened):
//   College Board, AP Chemistry exam page: 3 hours 15 minutes; Section I 60 multiple-choice questions in 1 hour 30 minutes, 50%; Section II 7 free-response questions in 1 hour 45 minutes, 50% (3 long, 10 points each, about 23 minutes each; 4 short, 4 points each, about 9 minutes each);
//     hybrid digital (Bluebook app), free-response answers handwritten in paper booklets; a periodic table and a formula sheet are provided; the pages disagree on calculators for Section I (an older overview says not permitted, newer pages say a scientific or graphing calculator is recommended for both sections), so we say to check.
//   College Board, AP Physics 1: Algebra-Based exam page and course overview: 42 multiple-choice questions in 85 minutes, 50%; 4 free-response questions in 95 minutes, 50%; the four free-response types are mathematical routines (10 points), translation between representations (12), experimental design and analysis (10),
//     qualitative/quantitative translation (8); hybrid, handwritten free response; the College Board says the number of multiple-choice questions and the timing are updated from the May 2027 exam and our search did not return the new figures, so we say so.
//   University of Colorado Boulder, PhET Interactive Simulations: free interactive math and science simulations in physics, chemistry and other subjects, founded in 2002 by Carl Wieman; one paper counts over 150. We did not confirm how they run (an older paper says Java and Flash, which is outdated), so we say only that they are free and tell the reader to check the site.
//   American Chemical Society, Student Laboratory Code of Conduct and chemical safety manuals: eye protection that meets ANSI/ISEA Z87.1 +D3 (indirectly vented chemical splash goggles) whenever chemicals, heat or glassware are in use; ordinary eyeglasses do not protect against splashes; do not perform experiments the teacher has not authorised;
//     ACS's activity pages for children say they are for use under the direct supervision of an adult. We found no ACS guidance written for home experiments, and we say so.
//   Freeman and others, PNAS 111(23), 8410-8415, 2014 (doi 10.1073/pnas.1319030111): a meta-analysis of 225 studies of undergraduate STEM courses; active learning raised exam scores by about half a standard deviation (about half a letter grade) and failure rates were 21.8% with active learning against 33.8% with traditional lecturing.
//   Hake, American Journal of Physics 66(1), 64-74, 1998 (doi 10.1119/1.18809): a survey of 62 introductory physics courses and 6,542 students on mechanics tests; courses with interactive engagement had an average normalised gain of 0.48, traditional courses 0.23; a survey of pretest and posttest data, not a controlled experiment.
//   Education Endowment Foundation (UK), one to one tuition: about five additional months' progress on average, evidence rated moderate, mostly school pupils; tuition should be linked with normal teaching (also used in how-to-find-an-online-tutor).
//   Marketplace pages seen in a search on 31 Oct 2026, not a study: Preply showed chemistry tutors from about $3 to $40 or more an hour and physics tutors from about $5 to $10 for a 50-minute lesson; TutorChase listed chemistry tutors at 30 to 80 pounds an hour; one specialist service said $20 to $40 an hour for most physics tutoring. We give no market price.
// Not read, so not written: GCSE, A-level, IB or state exam rules, any figure on how many students improve with a tutor, any price survey, whether any one tutor's claims are true, how the PhET simulations run on a given device.
// Two worked examples are our own arithmetic, checked on 31 Oct 2026: 4.0 g of hydrogen at 2.016 g/mol is 1.98 mol, which makes 1.98 mol of water at 18.015 g/mol, 35.7 g, about 36 g; a block on a frictionless 30 degree slope has a = g sin 30 = 9.8 x 0.5 = 4.9 m/s^2, whatever its mass.
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/components/VideoRoom.tsx lines 68-71 (the classroom toolbar is microphone, camera, closed captions, screen share, full screen, hang up, chat, tile view, settings; no drawing tool);
// DIRECTORY_OPENS_AT = 6 in src/lib/directory.ts (the directory lists no tutors today); the directory search matches a tutor's name and languages and has no subject filter (src/lib/directory.ts lines 486-487). We could not check which subjects the tutors on Tutafy teach (the Tutafy database is not in the account this agent can read).
// All names, scores and prices in the examples are invented and said to be.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const CHEM_PHYSICS_TUTOR_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'A good chemistry or physics session is a student doing the work with a tutor listening: the student tries a problem aloud, the tutor finds where the reasoning breaks (idea, algebra, units or reading), a diagram fixes it, and the student does a new version alone.',
    'Judge a tutor by their first fifteen minutes. Do they ask you to try first, name the kind of mistake, draw, and leave you a next step? A profile cannot show any of that.',
    'Do not do chemistry experiments at home because a tutor suggests it. The American Chemical Society asks for splash goggles and an authorised plan whenever chemicals are used. Use simulations such as the free PhET ones, and do physics measurements that need no chemicals.',
    'Check what the course asks. The College Board gives AP Chemistry 60 multiple-choice and 7 free-response questions, and AP Physics 1 42 multiple-choice and 4 free-response questions, with the free response handwritten.',
    'Tutafy is where tutors run their own bookings. Its classroom has no whiteboard, its tutor directory lists no tutors today, and we do not know which subjects its tutors teach.',
  ] },
  { type: 'p', text: `A good online chemistry or physics tutor makes you do the thinking. You try a problem, say what you are doing, and the tutor listens for the exact place your reasoning goes wrong, then fixes that with a diagram, a smaller problem or a question. A tutor who solves problem after problem while you watch gives you a feeling of progress and little else. That is simple to describe and hard to see from a profile, so this guide describes the session instead.` },
  { type: 'p', text: `It is written for students and for parents who are choosing a tutor. It covers what a session looks like minute by minute, two worked examples, six signs of a good tutor, the exam formats from the College Board, what research on active learning does and does not show, a plain rule about experiments at home, and how to set up the call. We make Tutafy, software that tutors use to run their own bookings. We are not a source on chemistry or physics, so every fact about an exam or about safety comes from an official page, and our own advice is marked as ours. Everything was checked on 31 October 2026.` },
  { type: 'image', src: '/blog/inline/phys-whiteboard', alt: 'A man in a dark shirt with his back to the camera writing on a whiteboard that has the word physics, an atom, field lines around two charges and a decaying wave drawn on it.', caption: 'Illustrative photo, not a Tutafy user. Physics and chemistry are taught with drawings, so the call needs somewhere to draw.', credit: 'Photo: Preply.com Images (CC BY 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Physics_Tutor.jpg' },
  { type: 'h2', text: 'Why these two subjects are different to tutor online' },
  { type: 'p', text: `Most subjects can be taught with a voice and a shared document. Chemistry and physics cannot, for four reasons. They run on drawings: a particle diagram, a free-body diagram, a graph. They run on symbols and units, where one lost exponent or one mixed-up unit ruins an answer. They need algebra, and many students who say they are bad at physics are really weak at rearranging equations. And they have labs, which are hard to do on a video call.` },
  { type: 'p', text: `So the useful questions about an online tutor in these subjects are about method. Can they see and draw on your work? Do they separate a problem with the idea from a problem with the algebra? Do they say what to do about practical work? The rest of this guide takes those in turn.` },
  { type: 'h2', text: 'What a good session looks like' },
  { type: 'p', text: `This is our description, based on how tutoring works and not on a study of tutoring. It is a sixty-minute lesson, and the times are a guide.` },
  { type: 'compare', caption: 'A sixty-minute chemistry or physics session. Our own outline, not a standard.', headers: ['Minutes', 'What happens', 'What to look for'], rows: [
    ['0 to 10', 'You bring one problem you could not solve. You say where you got stuck.', 'The tutor asks what you tried, and does not start a new topic.'],
    ['10 to 25', 'You try the problem aloud on a shared page while the tutor listens.', 'You hold the pen. The tutor asks short questions, not long answers.'],
    ['25 to 40', 'The tutor finds the kind of mistake and fixes it with a drawing or a simpler case.', 'They name it: idea, algebra, units or reading.'],
    ['40 to 55', 'You solve a similar problem with new numbers or a new setting, alone.', 'You do it without the tutor filling in the hard step.'],
    ['55 to 60', 'You say the method back in your own words. The tutor sets two or three problems.', 'You leave with a next step and the problems written down.'],
  ] },
  { type: 'h3', text: 'Step one: you try first' },
  { type: 'p', text: `The lesson should start from something you could not do. If the tutor opens with a prepared topic, they are teaching a plan and not you. Then you try the problem aloud. Hearing you say "I multiply by the mole ratio" or "I take the component along the slope" tells the tutor exactly what you think is going on, which a finished answer on paper does not.` },
  { type: 'h3', text: 'Step two: the tutor names the kind of mistake' },
  { type: 'p', text: `When a problem goes wrong, we group the causes into four: you do not hold the idea, you hold it but the algebra fails, the units or the arithmetic slip, or you misread what was asked. Each needs a different fix. A tutor who says "let's go over Newton's second law again" when the real trouble is rearranging an equation wastes your hour. Ask your tutor to say which of the four it was, every time.` },
  { type: 'h3', text: 'Step three: a drawing, then a smaller problem' },
  { type: 'p', text: `Most mistakes in these subjects clear up when the situation is drawn. In physics that is a diagram of the object with the forces on it, or a bar chart of energy. In chemistry it is a picture of the particles before and after a reaction, or a table of moles under the equation. When the drawing does not help, a smaller problem does: the same question with one force or one reactant.` },
  { type: 'h3', text: 'Step four: you do a new one alone' },
  { type: 'p', text: `The test of whether the fix worked is a similar problem with new numbers or a new setting, done without help. If you cannot, the idea has not moved, and the tutor should try another way and not another problem of the same kind. This is the part of a session that parents can ask about afterwards: "What did you solve on your own today?"` },
  { type: 'h2', text: 'Two worked examples, to see the method' },
  { type: 'p', text: `Both examples use arithmetic we checked ourselves. They are here to show how a tutor asks, not to teach the topic.` },
  { type: 'h3', text: 'Chemistry: how much water from 4.0 grams of hydrogen?' },
  { type: 'p', text: `The question: hydrogen burns in excess oxygen, 2H2 + O2 gives 2H2O. How many grams of water form from 4.0 g of hydrogen? A weak tutor says "convert to moles, use the ratio, convert back" and shows the steps. A good one asks questions. What does the 2 in front of H2O tell you? Why do you convert grams to moles before you compare anything? What is the molar mass of H2, and why is it not 1?` },
  { type: 'p', text: `The working: 4.0 g of H2 at about 2.016 g/mol is 1.98 mol. The equation gives 2 mol of water for every 2 mol of hydrogen, so 1.98 mol of water forms. At about 18.015 g/mol that is 35.7 g, so about 36 g. The tutor then changes the problem: "now there is only 8.0 g of oxygen. Which runs out first?" That is the new problem done alone, and it tests whether you understood the ratio or only followed the steps.` },
  { type: 'image', src: '/blog/inline/chem-lab-glassware', alt: 'A top view of a toy-sized microscope, a rack of test tubes holding coloured liquids, and a flask and two beakers of green, yellow, red and blue liquid on a pale blue surface.', caption: 'Illustrative photo, not a Tutafy user. Chemistry at home should stay on paper and screen unless an adult has a safe plan.', credit: 'Photo: Belikov Maxim (CC BY 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Laboratory_equipment_of_modern_chemistry_classroom.jpg' },
  { type: 'h3', text: 'Physics: a block on a slope' },
  { type: 'p', text: `The question: a 2.0 kg block slides down a frictionless slope of 30 degrees. What is its acceleration? The good tutor starts with a drawing, and asks you to draw the block and every force on it. Then: which force pulls it down the slope, and how do you find that part of the weight? What happens to the answer if the mass doubles?` },
  { type: 'p', text: `The working: the part of the weight along the slope is mg sin 30 degrees, so the acceleration is g sin 30, which is 9.8 times 0.5, or 4.9 m/s2. The mass cancels, and that surprises many students, so a good tutor lets you find that out by doubling the mass in the equation and watching it disappear. Then the new problem: a slope of 45 degrees, or a slope with friction.` },
  { type: 'h2', text: 'Six signs of a good chemistry or physics tutor' },
  { type: 'p', text: `Our guide on how to find an online tutor gives ten checks that apply to every subject, including the goal, the price, the trial lesson, how you pay and safety. These six are specific to chemistry and physics, and you can see them in a trial lesson.` },
  { type: 'ul', items: [
    `They ask you to try first. A tutor who talks for the first ten minutes has no idea where you are.`,
    `They name the kind of mistake: idea, algebra, units or reading. A tutor who only says "wrong" or "right" is checking answers, not teaching.`,
    `They draw, or ask you to draw. If the call has no way to draw, they have a plan for it, such as a phone over a sheet of paper.`,
    `They tie the lesson to your course or exam, and ask for your syllabus, your textbook or last month's quiz.`,
    `They are honest about limits and about safety. They say what cannot be done on a call, and they do not ask you to handle chemicals at home.`,
    `They leave a next step: problems written down, a drawing to finish, a topic for next time.`,
  ] },
  { type: 'p', text: `And some warning signs. A promised grade by a date is one. So is a tutor who does your homework and not the thinking, a request to pay outside the platform, and a long package sold before a trial. Our find-a-tutor guide covers the payment and safety checks, including the NSPCC advice for children, so we do not repeat them here.` },
  { type: 'h2', text: 'The maths underneath' },
  { type: 'p', text: `Many students who say they cannot do physics or chemistry are losing marks to algebra and units, not to the science. If that is you, tell the tutor in the first lesson, because it changes the plan. Three habits help, and a good tutor will insist on them.` },
  { type: 'ul', items: [
    `Rearrange the equation for the unknown before you put in any numbers. It is faster to check and shows the structure, as in the slope example where the mass cancels.`,
    `Carry the units through every line. If the answer to an acceleration question comes out in metres, something went wrong, and you can see it before you finish.`,
    `Estimate first. If 4.0 g of hydrogen cannot give less than the mass of the hydrogen itself, an answer of 3 g of water is wrong at once.`,
  ] },
  { type: 'p', text: `Ask the tutor to spend ten minutes of a lesson on this if the mistakes keep coming from here. It is cheaper than another hour on the topic.` },
  { type: 'h2', text: 'What the exams ask' },
  { type: 'p', text: `Ask which course you are in before you ask a tutor anything. We read the College Board's pages for the two AP courses that most US students meet, and we did not read GCSE, A-level, IB or state exam rules, so for those ask your teacher for the specification. The figures below come from search results of the College Board pages, which did not open for our script. Read the current exam page, because the College Board says the physics exam changes from May 2027.` },
  { type: 'compare', caption: 'The AP Chemistry and AP Physics 1 exams by the College Board pages, checked 31 Oct 2026.', headers: ['', 'AP Chemistry', 'AP Physics 1: Algebra-Based'], rows: [
    ['Multiple choice', '60 questions, 1 hour 30 minutes, 50% of the score', '42 questions, 85 minutes, 50% of the score'],
    ['Free response', '7 questions, 1 hour 45 minutes: 3 long (10 points each) and 4 short (4 points each)', '4 questions, 95 minutes: 10, 12, 10 and 8 points'],
    ['Question types', 'Single questions and sets built on data', 'Mathematical routines; translating between representations; experimental design and analysis; qualitative and quantitative translation'],
    ['Delivery', 'Questions in the Bluebook app, free response handwritten in a paper booklet', 'The same'],
    ['Given to you', 'A periodic table and a formula sheet', 'Check the exam page for the current list'],
    ['Calculator', 'Pages disagree for Section I; newer ones recommend a scientific or graphing calculator on both sections', 'Check the exam page'],
  ] },
  { type: 'p', text: `Two things follow for a tutor. Free response is handwritten, so you need to practise writing out a full solution on paper, with units, not only getting the number. And the physics free response includes experimental design and analysis, which means practice with graphs and measurements, not only formulas. A tutor who knows the format will use past free-response questions from the College Board and will mark you against how they are scored.` },
  { type: 'h2', text: 'What the research says about learning by doing' },
  { type: 'p', text: `We found no study of whether online tutoring improves chemistry or physics results, so we cannot tell you what a tutor will do for your grade. We found two findings about how students learn these subjects in classes, and we use them as a hint about what to look for in a tutor. They are not about tutoring, and that is our inference.` },
  { type: 'ul', items: [
    `Freeman and colleagues combined 225 studies of undergraduate STEM courses in 2014. Active learning, where students solve problems and discuss instead of listening, raised exam scores by about half a standard deviation, which they put at about half a letter grade. Failure rates were 21.8% with active learning and 33.8% with traditional lectures.`,
    `Hake surveyed 62 introductory physics courses with 6,542 students in 1998. Courses built on interactive engagement had an average normalised gain on a mechanics test of 0.48, and traditional courses 0.23. It was a survey of test data, not a controlled experiment, and the author noted its limits.`,
  ] },
  { type: 'p', text: `Both point the same way: students who do the work learn more than students who watch it. That is why the session above puts the pen in your hand. A related result is about tutoring in general. The Education Endowment Foundation, a UK charity that reviews education research, rates one to one tuition at about five additional months' progress, with moderate evidence, mostly from school pupils, and says tuition should be linked to what you are learning in class. So bring your own homework to a lesson.` },
  { type: 'h2', text: 'Labs and experiments, online' },
  { type: 'p', text: `Practical work is where online tutoring is weakest, and honesty about it is a sign of a good tutor. There are three ways to handle it, in order of how much we would recommend them.` },
  { type: 'h3', text: 'Simulations' },
  { type: 'p', text: `PhET Interactive Simulations, from the University of Colorado Boulder, are free interactive simulations in physics, chemistry and other subjects, founded in 2002 by the physicist Carl Wieman. One paper counts over 150 of them. You can change a variable, such as the angle of a slope or the concentration of a solution, and see the result at once, and a tutor can share the screen and ask "what do you predict before I move the slider?" We did not confirm how they run on each device, so check the PhET site.` },
  { type: 'h3', text: 'Physics measurements that need no chemicals' },
  { type: 'p', text: `Some physics practicals can be done at a kitchen table: timing a swinging pendulum with a phone stopwatch, measuring the stretch of a spring or an elastic band against a ruler, rolling a ball down a ramp. These are our suggestions and are low risk, but a parent should still check them. They are useful because AP Physics 1 asks you to design and analyse experiments, and the habit of recording data and drawing a graph is what is tested.` },
  { type: 'image', src: '/blog/inline/phys-spring-measure', alt: 'A young man in a light shirt and a blue lanyard leaning toward a hanging coil spring in front of a ruler, adjusting a small pointer at the bottom of the spring.', caption: 'Illustrative photo, not a Tutafy user. Measuring a spring against a ruler is the kind of practical a kitchen table can hold.', credit: 'Photo: Notre Dame English Club (CC BY-SA 4.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:A_student_calculating_spring_constant_at_NDC_physics_lab.jpg' },
  { type: 'h3', text: 'Chemistry experiments: leave them to the lab' },
  { type: 'callout', variant: 'warn', title: 'A rule for chemistry at home', text: `Do not do chemistry experiments at home because an online tutor suggests them. The American Chemical Society's student lab code asks for chemical splash goggles that meet ANSI/ISEA Z87.1 +D3 whenever chemicals, heat or glassware are in use, says ordinary glasses do not protect against splashes, and says students should not do experiments their teacher has not authorised. We found no ACS guidance written for home experiments. If your school sends a kit, follow the teacher's instructions, with an adult present.` },
  { type: 'p', text: `A good tutor will offer a safe alternative: a video of the experiment with questions to answer, a simulation, or a data set from the experiment for you to analyse. For exams that ask about practicals, the analysis is usually what is marked.` },
  { type: 'h2', text: 'Setting up the call' },
  { type: 'ul', items: [
    `Choose how you will draw. A shared whiteboard, a tablet with a pen, or a phone propped over a sheet of paper all work. Our guide to online whiteboards for tutoring compares free ones.`,
    `Practise with what you will be given. The College Board says a periodic table and a formula sheet are provided in the AP Chemistry exam, so ask the tutor to use them in lessons.`,
    `Write full solutions on paper, with units, because the free response is handwritten.`,
    `Keep a mistakes notebook: the problem, which of the four kinds of error it was, and the fix. Bring it to every lesson.`,
    `Fix the time zone. If your tutor lives in another country, a weekly slot can move by an hour when the clocks change. Our guide to time zones lists the dates.`,
  ] },
  { type: 'h2', text: 'For parents: how to tell if it is working' },
  { type: 'p', text: `After about four lessons, ask your child to solve a problem they have not seen, of a type they were taught, without help. If they can, the tutoring is working, whatever the last quiz said. Ask them to explain a recent topic in their own words. Check that the homework the tutor sets is problems, not a request for a finished answer. And ask which of the four kinds of mistake they make most, because a child who can say "mostly units" is already learning from the lessons.` },
  { type: 'p', text: `Four is a rule of thumb, not a figure from a study. If your child cannot do any of this after a month of regular lessons, say so to the tutor and ask what will change. If nothing does in a lesson or two, try another tutor.` },
  { type: 'h2', text: 'What Tutafy can and cannot do for you' },
  { type: 'p', text: `Tutafy is a set of tools that tutors use to run their own bookings: a booking page that shows free hours in the visitor's time zone, a video classroom in the browser, reminders and payment through the tutor's own account. Here is what that means for you, said plainly.` },
  { type: 'ul', items: [
    `The classroom has no whiteboard. Its toolbar has the microphone, camera, captions, screen sharing, full screen, chat and tile view, and no drawing tool. A tutor on Tutafy shares a screen from any whiteboard or tablet, or adds a Zoom or Google Meet link.`,
    `The tutor directory is not open yet. Its page says it opens once six tutors are ready, and today it lists none, so we cannot point you to a chemistry or physics tutor on Tutafy.`,
    `We do not know which subjects the tutors on Tutafy teach. The directory's search matches names and languages, not subjects. If you know a tutor who uses Tutafy and teaches your course, you can book through that tutor's own link.`,
    `A tutor may offer a 30-minute trial lesson at a price the tutor sets, for a first lesson only.`,
    `Tutafy does not check qualifications, run background checks or guarantee grades. The six signs above are yours to check on any tutor.`,
  ] },
  { type: 'source', text: 'Official and research pages, read on 31 Oct 2026. They did not open for our script, so the figures come from search results of those pages. Read the current page before you decide.', links: [
    { label: 'College Board: AP Chemistry exam', href: 'https://apcentral.collegeboard.org/courses/ap-chemistry/exam' },
    { label: 'College Board: AP Physics 1 exam', href: 'https://apcentral.collegeboard.org/courses/ap-physics-1/exam' },
    { label: 'PhET Interactive Simulations', href: 'https://phet.colorado.edu/' },
    { label: 'ACS: student laboratory code of conduct', href: 'https://www.acs.org/content/acs/en/chemical-safety/teach-and-learn/sample-guidelines.html' },
    { label: 'Freeman and others, PNAS 2014: active learning', href: 'https://doi.org/10.1073/pnas.1319030111' },
    { label: 'Hake, American Journal of Physics 1998', href: 'https://doi.org/10.1119/1.18809' },
    { label: 'Education Endowment Foundation: one to one tuition', href: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/one-to-one-tuition' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to find a good online tutor', href: '/blog/how-to-find-an-online-tutor', text: 'Ten checks that apply to any subject.' },
    { label: 'Online whiteboard for tutoring', href: '/blog/online-whiteboard-for-tutoring', text: 'Free whiteboards for drawing diagrams on a call.' },
    { label: 'GRE and GMAT tutor online', href: '/blog/gre-gmat-tutor-online', text: 'Choosing a tutor for an admissions test.' },
    { label: 'Tutoring lesson packages explained', href: '/blog/tutoring-lesson-packages-explained', text: 'The terms to ask about before you buy a block.' },
    { label: 'Schedule lessons across time zones', href: '/blog/schedule-tutoring-lessons-across-time-zones', text: 'The clock-change dates that move a weekly slot.' },
  ] },
  { type: 'faq', items: [
    { q: 'What does a good online chemistry or physics session look like?', a: `You bring a problem you could not solve and try it aloud. The tutor finds whether the mistake is the idea, the algebra, the units or the reading, fixes it with a drawing or a smaller problem, and you solve a new version alone. You leave with a next step.` },
    { q: 'How do I find a good online chemistry or physics tutor?', a: `Ask for a trial lesson and watch the first fifteen minutes. A good tutor asks you to try first, names the kind of mistake, draws, ties the lesson to your course and leaves a next step. Read the refund rules before you pay.` },
    { q: 'Can chemistry be taught online?', a: `The theory, problem solving and data analysis can. Practical work cannot be done safely by a video call alone. Use simulations, videos and data from experiments, and do not do chemistry experiments at home without a safe plan and an adult.` },
    { q: 'Are online physics tutors worth it?', a: `We found no study of online tutoring in physics. Studies of classes suggest students learn more when they solve problems and discuss than when they only listen, so choose a tutor who has you do the work. Check progress after about four lessons.` },
    { q: 'What do AP Chemistry and AP Physics 1 ask?', a: `By the College Board pages, AP Chemistry has 60 multiple-choice questions in 90 minutes and 7 free-response questions in 105 minutes. AP Physics 1 has 42 multiple-choice questions in 85 minutes and 4 free-response questions in 95 minutes. The College Board says the physics exam changes from May 2027.` },
    { q: 'Does Tutafy have chemistry or physics tutors?', a: `We do not know. Tutafy's tutor directory is not open yet and lists no tutors, and its search matches names and languages, not subjects. Tutafy does not vet tutors, and its classroom has no whiteboard.` },
  ] },
  { type: 'cta', title: 'Teach? Take bookings on your own page', text: 'If you are a tutor, the Free plan covers up to 10 students with a booking page, a built-in video classroom and email reminders. Pro is $12 a month, Academy $29. 0% commission on every plan, no card to start. Tutafy does not find you students yet.', button: 'Start free, no credit card', href: '/register' },
]
