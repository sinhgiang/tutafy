// T-1201. Article body for /blog/tutoring-business-names (title, date and author are in the POSTS list in src/lib/blog.ts).
// Keyword: "tutoring business names" (170 searches a month in the US, difficulty 0; OpenSEO, reports/chief/2026-10-31-1315-keyword-data-sapa-tutafy.md). Calendar date 6 Nov 2026.
// Step 0 (31 Oct 2026): no blog post is about naming. A search of src/lib/blog.ts for "business name", "trademark", "DBA" and "domain name" finds only passing uses ("nobody knows your name") and one
// line in the cancellation guide about putting "your legal or business name" in a contract. Nearest posts: how-to-start-an-online-tutoring-business, how-to-write-a-tutoring-business-plan,
// how-to-choose-a-tutoring-niche, how-to-build-a-tutor-website, how-to-write-a-tutor-bio. Own angle: how to choose a name AND how to check, by official lookups only, that it is free to use as a
// business name, a trademark and a web address. Nothing is bought or registered; every check here is a lookup. No overlap, so no rewrite of an old post; the five posts above are linked.
//
// Sources, read on 31 Oct 2026:
//   Read directly: SBA, "Choose your business name" (sba.gov/business-guide/launch-your-business/choose-your-business-name): pick a name that reflects your brand; check the state registry
//     ("Most states don't allow you to register a name that's already been registered by someone else"), the USPTO trademark database, and the domain; four ways to register or protect a name
//     (entity name, federal trademark, DBA or trade name, domain); a DBA "doesn't provide legal protection by itself" but "most states require you to register your DBA if you use one"; "Multiple businesses can go by
//     the same DBA in one state"; a domain "doesn't actually need to be the same as your legal business name"; "Once you register your domain name, no one else can use it for as long as you continue to own it";
//     "some states require your entity name to reflect the kind of business it represents". The page shows no last-updated date.
//   Read directly: USPTO, "Federal trademark searching": "Before applying for a federal trademark registration, it's important to do a clearance search"; "If your trademark creates a likelihood of confusion
//     with even one live trademark, it's a barrier to your application"; "After we receive your application, we do our own database search as part of our examination process".
//   Read directly: USPTO, "Comprehensive clearance search for similar trademarks": sources to check are the federal database and the Trademark Official Gazette, state trademark registries, common-law use found by searching
//     the internet, and domain names; "Common-law rights are based solely on someone using their trademark in commerce within the United States"; "An attorney can provide a clearance search and interpret the search results".
//   Read directly: USPTO, "Possible grounds for refusal of a mark": merely descriptive marks are refused; "Similarity in sound, appearance, or meaning may be sufficient to support a finding of likelihood of confusion";
//     goods or services "do not have to be identical" to be related.
//   Read directly: USPTO, "Trademark search" landing page: it links to the Trademark Search system and a "Transitioning from TESS handout". We do not say TESS was shut down; the page does not.
//   Read directly: GOV.UK, "Set up a private limited company: Choose a company name": ends in Limited or Ltd; cannot be the same as another registered company's name; cannot be offensive; cannot contain a
//     "sensitive" word or expression without permission; check the Companies House register; "If your name is too similar to another company's trade mark you may have to change it".
//   Read directly: GOV.UK, "Search for a trade mark": helps you "check if a similar trade mark to your brand already exists in the UK" and "find out who owns a trade mark".
//   NOT read: the ICANN Lookup page (lookup.icann.org) loaded with a title only, and the USPTO "do I need to register" page returned 404. The article does not describe either.
// What it says about Tutafy comes from the code, read on 31 Oct 2026: src/components/settings/sections/ProfileSection.tsx (one field, "Full name"), src/app/auth/callback/route.ts line 7 and src/app/api/auth/register/route.ts line 5
// (the booking link slug is the name in lower case with spaces turned into hyphens and other characters removed, plus a hyphen and four random characters; we found no screen that edits it),
// src/components/settings/sections/BookingSection.tsx (the link is shown as tutafy.com/book/<slug>), src/app/(dashboard)/settings/CustomDomainCard.tsx and src/app/api/custom-domain/route.ts (a custom domain you already own, Pro plan,
// connected in Settings), src/lib/plans.ts (Pro $12 a month). Tutafy has no business-name field, no name or trademark checker and does not sell domains.
// All business names used as examples are invented by us and have NOT been searched; some may be taken. Nothing in the article claims otherwise.
// Length: written to 3,500 to 4,000 words (scripts/count-post-words.mjs).
import type { PostBlock } from '@/lib/blog'

export const TUTORING_BUSINESS_NAMES_CONTENT: PostBlock[] = [
  { type: 'takeaways', items: [
    'You can name a tutoring business after yourself, after what you teach, after a place, or with an invented word. A name that is only a description is the easiest to say and the hardest to protect, and a name with your own name in it is the easiest to keep unique.',
    'Checking a name costs nothing, because every check is a lookup: your state business registry, the USPTO trademark search, a domain search, and a search of the places students look. We buy nothing in this guide.',
    'The USPTO says one live, conflicting trademark can block your application. It judges conflicts by sound, appearance and meaning, and by whether the services are related, so a similar tutoring name can conflict even if it is spelled differently.',
    'A trade name registration does not protect the name by itself. The SBA says a DBA gives no legal protection by itself, and that most states require you to register one if you use one.',
    'Tutafy has no business-name field and no name checker. Your booking link is built from your full name, and you can connect a domain you already own on the Pro plan.',
  ] },
  { type: 'p', text: `A tutoring business name is the name students and parents see on your website, your invoices and your booking link. To choose one, pick a naming style, write a short list, and check each name in four places: your state's business registry, the US trademark database, the domain system and the social networks. If you are in the UK, check Companies House and the trade mark register as well.` },
  { type: 'p', text: `Most tutors need no business name in the first month and can teach under their own name. A separate name starts to matter when you want a website, a logo, invoices or more than one tutor. This guide uses the official pages of the US Small Business Administration, the US Patent and Trademark Office and the UK government, read on 31 Oct 2026. It is not legal advice, and every example name is invented and unchecked.` },
  { type: 'image', src: '/blog/inline/names-signpost', alt: 'A white wooden signpost with black and blue arrow signs pointing to three towns, standing in front of green bushes and trees.', caption: 'Illustrative photo. A good name works like a sign: read at a glance, then remembered.', credit: 'Photo: Roger Geach (CC BY-SA 2.0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Dartmoor_names_on_a_signpost_-_geograph.org.uk_-_2303564.jpg' },
  { type: 'h2', text: 'Do you need a business name at all?' },
  { type: 'p', text: `If you work alone and sell lessons under your own name, your own name can be your business name. A name other than your own legal name is a "DBA", short for "doing business as", and the SBA says most US states require you to register a DBA if you use one. So teaching as "Maria Lopez" may need no registration, and teaching as "Lakeside Latin" may need one. That is our reading and the rules vary by state and country, so check yours.` },
  { type: 'p', text: `A separate name earns its keep in four cases.` },
  { type: 'ul', items: [
    `You want a website and a web address that is not your personal name, for example because your name is common or hard to spell.`,
    `You expect to hire other tutors or to sell the business one day, since a name that is your own is hard to hand over.`,
    `You teach a narrow subject and want the name to say so, so that a parent searching for it knows at once.`,
    `You want to keep the work separate from your personal profile on social networks.`,
  ] },
  { type: 'p', text: `If none of these applies yet, start with your own name and a plain description, such as "Ana Costa, Maths Tutor". You can change later, though changing has a cost, which we cover near the end.` },
  { type: 'h2', text: 'Five kinds of tutoring business name' },
  { type: 'p', text: `Most names fall into one of five kinds. Each has a different trade-off between how fast people understand it and how well you can claim it. The example names are invented, and we have not searched any of them.` },
  { type: 'compare', caption: 'Five naming styles, with invented and unchecked examples. "Easy to protect" is our judgement, based on the USPTO\'s rule against merely descriptive marks.', headers: ['Style', 'Example', 'Easy to understand', 'Easy to protect', 'Watch out for'], rows: [
    ['Your own name + what you teach', 'Ana Costa Maths', 'Very', 'Fairly', 'A common name will have many matches. Hard to sell later.'],
    ['What you teach, plainly', 'Online Maths Tutoring', 'Very', 'Poorly', 'Merely descriptive names can be refused as trademarks, and many people use them.'],
    ['A place or a feeling', 'Lakeside Latin', 'Fairly', 'Fairly', 'Check that the place does not box you in if you move or grow.'],
    ['A word with a link to learning', 'Pencil and Pi', 'Fairly', 'Better', 'Check for a similar name in education, even in another spelling.'],
    ['An invented word', 'Quillo', 'Not at first', 'Best', 'It needs a short line beside it to say what it is. Check what it means in other languages.'],
  ] },
  { type: 'p', text: `The USPTO's page on grounds for refusing a mark says that examiners refuse a mark that is "merely descriptive", meaning it immediately describes a quality, feature, function, purpose or use of the services. "Online Maths Tutoring" describes exactly what you do, so it makes a weak trademark. That does not make it a bad business name, because parents search by description. It means you should not expect to stop others from using something close.` },
  { type: 'p', text: `Our advice, which is not a rule: if you plan to stay a one-person practice, use a style that says what you do, because clarity brings students. If you plan to build something you could sell or grow, lean toward the two styles in the middle or the last one, add a short descriptor beside the name, and then check it carefully.` },
  { type: 'h2', text: 'Eight tests a tutoring name should pass' },
  { type: 'p', text: `Before you check availability, filter your list with these tests. They are our own working rules, not official ones.` },
  { type: 'ul', items: [
    `The phone test. Say it aloud once. Can the listener write it down correctly? If you have to spell it, you lose a few people every time.`,
    `The length test. Two or three words is easier to say and to fit on an invoice or a profile than five.`,
    `The room-to-grow test. "Algebra Hero" is a fine name until you also teach chemistry.`,
    `The hyphen and number test. A name with a hyphen or a digit is hard to say aloud and easy to mistype in a web address.`,
    `The big-brand test. Do not use the name of a well-known tutoring or test-preparation company, or a close variation of it, in your own.`,
    `The exam-name test. The name of an exam, such as a test you prepare students for, may be owned by someone else. Use it in your description ("IELTS speaking coach" as a tagline) and check before putting it in the business name itself.`,
    `The meaning test. Search the name with a few common words in other languages you or your students speak, to avoid an unwelcome meaning.`,
  ] },
  { type: 'h2', text: 'Name ideas by pattern' },
  { type: 'p', text: `Patterns help when you are stuck. Each one below is a recipe. The examples are invented, and none of them has been checked.` },
  { type: 'ul', items: [
    `Name + subject. "[First name] [Surname] Chemistry". Simple and honest. Add the level if it helps: "Primary Maths", "Adult English".`,
    `Place + subject. "Northgate Maths", "Harbour French". A place makes the name local, and it fits well if you also teach in person.`,
    `Result + subject. "Ready for Boards", "Clear Essays". A name that promises an outcome is clear, but never write a promise you cannot keep.`,
    `Object + subject. "Pencil and Pi", "Red Pen Writing". Concrete words are easy to picture and to remember.`,
    `Studio, lab, desk or club. "Second Language Studio". These words feel small and friendly. Avoid "university" or "college" for a one-person practice, because they suggest an institution.`,
    `A short invented word, plus a descriptor. "Quillo Maths". Easy to claim, and the descriptor tells people what you do.`,
  ] },
  { type: 'p', text: `Write twenty names in ten minutes without judging them. Then run the eight tests and keep the survivors. Check afterwards, because checking is slow and writing is not.` },
  { type: 'h2', text: 'The checks: is the name free to use?' },
  { type: 'p', text: `There are five checks, in this order, because each one is quicker than the next and a failure early on saves the later work. All five are lookups. You buy or register nothing until all of them pass.` },
  { type: 'h3', text: 'Check 1: a plain search' },
  { type: 'p', text: `Search for the name in quotes on a search engine, then with the word "tutor" or "tutoring" added. Look at the first two pages. The USPTO's clearance-search page tells you to search the internet for other people's uses of a name, because rights can come from use alone. If another tutor, a school or a company already uses a name like yours for similar services, a different name is the cheapest answer.` },
  { type: 'h3', text: 'Check 2: your state or country business registry' },
  { type: 'p', text: `The SBA says that "most states don't allow you to register a name that's already been registered by someone else", and tells you to check with your state for the rules. Each state has its own business search, usually on the website of the Secretary of State or a similar office. Search the exact name, then variations: with and without "tutoring", with "and" and "&", and in the singular and plural.` },
  { type: 'p', text: `Two details. The SBA notes that "multiple businesses can go by the same DBA in one state", so a DBA search can show a match that is still legal to repeat, and a missing match does not make the name yours. And it says that "some states require your entity name to reflect the kind of business it represents", so read your state's rules before you choose a company name that includes your subject.` },
  { type: 'p', text: `In the UK, GOV.UK says a limited company name usually has to end in "Limited" or "Ltd", cannot be the same as another registered company's name, cannot be offensive, and cannot include a "sensitive" word or expression without permission. It tells you to check the Companies House register before you commit.` },
  { type: 'image', src: '/blog/inline/names-cafe-menu', alt: 'A small chalkboard sign with handwritten menu lines stands on the right of the frame, with blurred walkers and a bicycle handlebar behind it.', caption: 'Illustrative photo. A small business sign has a few seconds to say who you are.', credit: 'Photo: Peter Miranda (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Cafe_menu_(Unsplash).jpg' },
  { type: 'h3', text: 'Check 3: the trademark database' },
  { type: 'p', text: `The USPTO's Trademark Search system covers federally registered and pending trademarks. The USPTO says that "before applying for a federal trademark registration, it's important to do a clearance search", and that "if your trademark creates a likelihood of confusion with even one live trademark, it's a barrier to your application". You do not have to apply for anything to search it.` },
  { type: 'p', text: `How do you read the results? The USPTO's page on grounds for refusal says that "similarity in sound, appearance, or meaning may be sufficient to support a finding of likelihood of confusion", and that services "do not have to be identical" to count as related. So do not search only the exact spelling.` },
  { type: 'ul', items: [
    `Search the name, its sound-alike spellings ("Kwillo" for "Quillo"), its plural, and the words in a different order.`,
    `Look for marks used for education, tutoring, training or test preparation, not only for tutoring in exactly your subject.`,
    `Note whether a match is live or dead. A dead one has been abandoned or cancelled, and a live one is a possible barrier.`,
    `Write down every near match and the date you searched. If you ask for advice later, the list saves time.`,
  ] },
  { type: 'p', text: `A clean result is not a guarantee. The USPTO says that after you apply, "we do our own database search as part of our examination process", so the examiner may find something you missed. The USPTO's clearance page also says that "an attorney can provide a clearance search and interpret the search results". For a name you plan to build on, that is worth considering.` },
  { type: 'p', text: `In the UK, GOV.UK's trade mark search tool helps you check whether a similar trade mark exists and who owns it. GOV.UK also says that if your company name is too similar to another company's trade mark, you may have to change it if someone complains.` },
  { type: 'h3', text: 'Check 4: the web address' },
  { type: 'p', text: `The SBA says a domain name "doesn't actually need to be the same as your legal business name". That is helpful, because the exact match is often taken. It also says that once you register a domain, "no one else can use it for as long as you continue to own it". So registering a domain protects a web address and does not protect a name.` },
  { type: 'p', text: `To check, type the name followed by a dot and an ending into the search box of any domain registrar. We did not read the registrars' pages, and we are not recommending one. Try the ending ".com" first, then your country's ending. Look at what is on the page if the domain is taken: an active tutoring site is a reason to change the name, and an empty parked page is not.` },
  { type: 'ul', items: [
    `Pick a web address you can read aloud and spell from hearing it.`,
    `Avoid hyphens and numbers.`,
    `If the exact name is taken, adding "tutor", "tutoring" or "lessons" is a common fix. Check that the result does not look like the other site.`,
  ] },
  { type: 'h3', text: 'Check 5: social handles and profiles' },
  { type: 'p', text: `Check the same name on the networks where your students are. We have no official source for this check, and it matters less than the first four, but a different handle on each network makes you harder to find.` },
  { type: 'h2', text: 'A one-page check sheet' },
  { type: 'p', text: `Print or copy this table for each name on your short list. The right-hand column says what a pass looks like, in our judgement.` },
  { type: 'compare', caption: 'A check sheet for one candidate name. Fill in one row per check and keep the date.', headers: ['Check', 'Where', 'A pass looks like', 'Date and result'], rows: [
    ['Plain search', 'A search engine, tutor marketplaces', 'No other tutor or school uses a similar name for similar services', ''],
    ['State or country registry', 'Your state business search, or Companies House in the UK', 'No registered business with the same or a very close name', ''],
    ['Trademark search', 'USPTO Trademark Search, or the UK trade mark search', 'No live mark that sounds, looks or means the same for related services', ''],
    ['Web address', 'A domain registrar\'s search box', 'The domain is free, or taken by a parked or unrelated page', ''],
    ['Social handles', 'The networks your students use', 'The handle is free or can be made close with one added word', ''],
    ['Say it, spell it', 'A friend, by phone', 'They write it down right the first time', ''],
  ] },
  { type: 'h2', text: 'Registering and protecting the name' },
  { type: 'p', text: `After the checks pass, you decide how much protection you want. The SBA lists four ways to register or protect a name, and they do different things.` },
  { type: 'compare', caption: 'The four options on the SBA page "Choose your business name", in our words. Fees and rules differ and change, so we give none.', headers: ['Option', 'What it does, per the SBA', 'What it does not do'], rows: [
    ['Entity name (state)', 'Protects the name at the state level, and each state has its own rules for the name and for suffixes.', 'It does not give a national right.'],
    ['Trademark (federal)', 'Protects the name nationally.', 'The SBA warns that infringement lawsuits can be costly.'],
    ['DBA or trade name (state, county or city)', 'Registers the name you use. Most states require it if you use one.', 'It "doesn\'t provide legal protection by itself", and others can use the same DBA in a state.'],
    ['Domain name', 'No one else can use the address while you own it.', 'It does not protect the name itself.'],
  ] },
  { type: 'p', text: `For many solo tutors, the sensible order is: use your own name or register a DBA if your state requires it, register the domain you will use, and think about a trademark only when the name has become worth defending, such as when students ask for you by name or when you hire. The USPTO says that "common-law rights are based solely on someone using their trademark in commerce within the United States". We could not read the USPTO page on whether you need to register, so we say no more about it.` },
  { type: 'callout', variant: 'warn', title: 'Not legal advice', text: `We are not lawyers. This guide describes what official pages say, and we read them on 31 Oct 2026. Rules and fees change, and differ by state and country. If you plan to invest in a name, spend money on a short consultation with a trademark attorney, who can interpret search results for you.` },
  { type: 'h2', text: 'Your name, your web address and your booking link' },
  { type: 'p', text: `A tutoring name is used in three places that students see together: the name on the page, the web address and the booking link. They do not have to match, but they should not fight each other. A parent who sees "Lakeside Latin" on a page, "ana-costa-k3x9" in the link and a different name on the invoice may hesitate before paying.` },
  { type: 'image', src: '/blog/inline/names-pen-notebook', alt: 'A closed dark cloth-bound notebook on a desk with a silver pen lying across the cover.', caption: 'Illustrative photo. Write your short list down and date each check.', credit: 'Photo: Thomas Martinsen (CC0)', creditHref: 'https://commons.wikimedia.org/wiki/File:Pen_on_a_notebook_(Unsplash).jpg' },
  { type: 'p', text: `Here is what Tutafy does, read from the code on 31 October 2026. You enter one name in Settings, labelled "Full name", and it is shown on your profile and booking page. When you sign up, Tutafy builds your booking link from that name: lower case, spaces turned into hyphens, other characters removed, then a hyphen and four random characters. So a tutor who signs up as "Ana Costa" gets a link that begins "ana-costa-" and ends in four characters. The link is shown as tutafy.com/book/ followed by that text. We found no screen where you can edit it.` },
  { type: 'p', text: `If you want a link under your own name, you can connect a domain you already own. It is a Pro feature at $12 a month, set in Settings under "Custom Domain". The page suggests a subdomain such as booking.yourbrand.com as the easiest, and the root domain also works. Tutafy does not sell domains, so you register the domain with a registrar first.` },
  { type: 'h2', text: 'If your first choice is taken' },
  { type: 'p', text: `This happens to most good names. You have five options, from the least to the most work.` },
  { type: 'ul', items: [
    `Use another name from your short list. This is why you wrote five.`,
    `Add a distinctive word, such as a place or a subject. "Harbour French" can become "Harbour French Tutoring", but if the other name is a live trademark for similar services, adding "Tutoring" may not remove the conflict, because the USPTO looks at sound, appearance and meaning together.`,
    `Change the spelling only if it still sounds different. A sound-alike spelling does little against a likelihood-of-confusion test, which includes sound.`,
    `Start again with a different pattern. It is faster than fighting for a name.`,
  ] },
  { type: 'h2', text: 'Changing the name later' },
  { type: 'p', text: `You can rename a tutoring business, and it costs time. You would change your profile, booking page, invoices, contract, web address (with a redirect from the old one), email sign-off and any marketplace profile. Parents who found you under the old name have to recognise you under the new one, so say "formerly" for a few months. That is the case for some care at the start, and for starting with your own name, which is correct the day you begin.` },
  { type: 'h2', text: 'Mistakes we would avoid' },
  { type: 'ul', items: [
    `Paying for a domain, a logo and business cards before the checks. Every check in this guide is free.`,
    `Checking only the exact spelling. The USPTO looks at sound and meaning too.`,
    `Assuming a domain or a DBA gives you the name. The SBA says a DBA gives no legal protection by itself, and a domain protects the address only.`,
    `Not writing down the date of each search. A result that is clean today can change.`,
  ] },
  { type: 'h2', text: 'What Tutafy has for names, and what it does not' },
  { type: 'p', text: `We build Tutafy, so here is a short list of what the app does about names, read from the code on 31 October 2026.` },
  { type: 'compare', caption: 'Business names in Tutafy, as of 31 Oct 2026.', headers: ['What you might want', 'Tutafy', 'Plan'], rows: [
    ['A place to put your name on your profile and booking page', 'Yes: one field, "Full name", in Settings, Profile.', 'All plans'],
    ['A separate business name next to your own', 'No: there is one name field. Put the business name in your introduction and in your invoices.', '-'],
    ['A booking link under your own name', 'Partly: the link is built from your sign-up name plus four random characters, and we found no screen to edit it.', 'All plans'],
    ['Your own domain for the booking page', 'Yes, if you already own the domain: Settings, Custom Domain. Tutafy does not sell domains.', 'Pro, $12 a month'],
    ['A name or trademark checker', 'No. Use the official lookups above.', '-'],
    ['A business registration or a DBA filing', 'No. That is filed with your state or country.', '-'],
  ] },
  { type: 'source', text: 'Sources read on 31 Oct 2026. The SBA, USPTO and GOV.UK pages were read directly, and quotes are from them. We could not read the ICANN lookup page (it loaded with a title only) or the USPTO page on whether to register (it returned an error), so we say nothing about them. No name in this guide has been searched; every example is invented. Nothing here is legal advice.', links: [
    { label: 'SBA: Choose your business name', href: 'https://www.sba.gov/business-guide/launch-your-business/choose-your-business-name' },
    { label: 'USPTO: Federal trademark searching', href: 'https://www.uspto.gov/trademarks/search/federal-trademark-searching' },
    { label: 'USPTO: Comprehensive clearance search for similar trademarks', href: 'https://www.uspto.gov/trademarks/search/comprehensive-clearance-search-similar-trademarks' },
    { label: 'USPTO: Possible grounds for refusal of a mark', href: 'https://www.uspto.gov/trademarks/additional-guidance-and-resources/possible-grounds-refusal-mark' },
    { label: 'GOV.UK: Choose a company name', href: 'https://www.gov.uk/limited-company-formation/choose-company-name' },
    { label: 'GOV.UK: Search for a trade mark', href: 'https://www.gov.uk/search-for-trademark' },
  ] },
  { type: 'links', title: 'Related guides', items: [
    { label: 'How to start an online tutoring business', href: '/blog/how-to-start-an-online-tutoring-business', text: 'The steps after the name: price, tools and first students.' },
    { label: 'How to write a tutoring business plan', href: '/blog/how-to-write-a-tutoring-business-plan', text: 'A one-page plan that the name fits into.' },
    { label: 'How to choose a tutoring niche', href: '/blog/how-to-choose-a-tutoring-niche', text: 'A narrow subject suggests a name.' },
    { label: 'How to build a tutor website', href: '/blog/how-to-build-a-tutor-website', text: 'Use the web address you just checked.' },
    { label: 'How to write a tutor bio', href: '/blog/how-to-write-a-tutor-bio', text: 'Say who you are beside the name.' },
    { label: 'A tutoring contract template', href: '/blog/tutoring-contract-template', text: 'Put your name or business name in clause 1.' },
  ] },
  { type: 'faq', items: [
    { q: 'How do I choose a name for my tutoring business?', a: `Pick a naming style, write about twenty names, and keep the few that pass these tests: easy to say and spell, short, room to grow, and no famous brand or exam name in it. Then check each one in a plain search, your state registry, the USPTO trademark search and a domain search.` },
    { q: 'Do I need to register a tutoring business name?', a: `It depends on your state and country. The SBA says most states require you to register a DBA if you use one, and a DBA gives no legal protection by itself. Teaching under your own legal name often needs none, but check your state's rules.` },
    { q: 'How do I check if a business name is taken?', a: `Search it in quotes online, then in your state's business registry, then in the USPTO's Trademark Search, then as a domain. Search spelling variations too, because the USPTO judges conflicts by sound, appearance and meaning, not by exact spelling.` },
    { q: 'Should my domain match my business name?', a: `The SBA says a domain "doesn't actually need to be the same as your legal business name". Match it if you can and keep it easy to spell, but a close variation is fine. A domain protects the address, not the name.` },
    { q: 'Do I need a trademark for a tutoring business?', a: `Not at the start. A trademark is worth thinking about when the name has real value, and a trademark attorney can advise you. The USPTO refuses merely descriptive names.` },
    { q: 'Can I change my booking link or name on Tutafy?', a: `You can change the name shown on your profile in Settings. The booking link is built from your name at sign-up with four random characters, and we found no screen to edit it. On Pro you can connect a domain you already own.` },
  ] },
  { type: 'cta', title: 'Put your name on a booking page', text: 'The Free plan covers up to 10 students with a booking page, a built-in video classroom, lesson notes and email reminders. Pro is $12 a month and adds a custom domain, Academy $29. 0% commission on every plan, no card to start. Tutafy does not check or register business names.', button: 'Start free, no credit card', href: '/register' },
]
