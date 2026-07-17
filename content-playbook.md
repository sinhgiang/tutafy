# Tutafy Content Playbook — How We Publish High-Converting, SEO-Winning Articles (A → Z)

> **What this file is.** Tutafy's end-to-end system for producing blog articles that (a) rank on Google and get cited by AI answer engines (ChatGPT, Perplexity, Google AI Overviews), and (b) convert readers into free signups. The *method* is fixed; the entities, products, and voice are Tutafy's — all-in-one software for independent online tutors and small tutoring centers, with 0% commission. Feed this file to any writer or model and it will produce on-brand, on-method articles for us.

> **Our one honesty rule, above everything.** Tutafy is newly launched. We do **not** invent customer counts, star ratings, testimonials, or performance stats we cannot prove. Our credibility comes from *teaching the topic accurately* and from letting readers see **their own** number via the free Commission Calculator. Any sentence that fabricates proof gets cut — it also risks Google "misrepresentation" penalties, false-advertising exposure, and instant rejection from Google/Meta Ads.

Global variables, defined once for Tutafy:
- **BRAND** — Tutafy
- **NICHE** — tutor management software / running an independent online tutoring business: bookings, video classroom, payments, AI lesson tools, student & parent portals; escaping marketplace commissions
- **AUDIENCE** — independent online tutors (esp. language / ESL / test-prep) and small tutoring centers (2–5 tutors), worldwide, often price-sensitive and in emerging markets
- **PRODUCTS** — Free ($0, up to 10 students), Pro ($12/mo, unlimited + AI), Academy ($29/mo, up to 5 tutors + payroll). The **free plan** + the free **Commission Calculator** are our hooks.
- **AUTHOR** — a real, named person on the team (use the founder's real name + a short `/about`-linked bio). Never a faceless "Admin." Real byline = E-E-A-T. *(TODO: add an `author` field to `src/lib/blog.ts` and set the founder's real name.)*
- **PRIMARY CTA** — *Start free — no credit card* (tutafy.com/register). Secondary: *Run the free Commission Calculator*.
- **THE WEDGE (repeat everywhere, truthfully)** — cheapest all-in-one, **0% commission on your income at every tier**, free AI + built-in video, you own the student relationship.

---

## Part 1 — The Two Non-Negotiable Goals

Every decision on the page serves these two, **in this order**:

1. **CONVERSION.** A reader who likes what they see acts with near-zero friction: the offer (Free / $12 / $29, no card) is visible before the ask; the primary CTA (Start free) is one tap away; a trust signal (0% commission, free forever, your data is yours, cancel anytime) sits at the moment of doubt.
2. **SEO / AEO.** The page ranks for a real query *and* is structured so AI answer engines can quote it. Original, expert, honestly-grounded content wins; thin/derivative content is penalized.

If a section, sentence, visual, or widget advances neither goal, cut it. Write as if one real expert (AUTHOR) is talking to one real tutor who is tired of handing 20–33% to a marketplace or juggling five apps.

---

## Part 2 — Before You Write: Keyword, Intent, Cannibalization

1. **Pick one primary keyword** and 3–5 secondaries. The primary defines the H1, `<title>`, slug, and the first sentence.
   - Tutafy keyword tiers: **Comparison/commercial** ("Preply alternatives", "best tutor management software", "TutorCruncher vs Tutafy") → highest buying intent, prioritize. **How-to** ("how to get tutoring clients", "how to price tutoring lessons", "how to teach English online") → strong. **Definitional** ("what is a tutor booking page", "what is a take-rate / commission") → feeds AEO and top-of-funnel.
2. **Match search intent.** A "best/alternatives" query wants an honest comparison + table near the top. A "how-to" query wants numbered steps. A "what is" query wants a crisp definition in sentence one. A "cost/commission" query wants a numbers/ROI block first.
3. **Check cannibalization BEFORE creating.** We already publish */blog/marketplace-vs-independent-the-real-math* (a comparison) and */blog/get-your-first-tutoring-clients* (a how-to). Don't duplicate their query. Pick a *distinct angle* and cross-link.
4. **Write the differentiating angle in one sentence** ("This page is the *X* take on `<topic>`, unlike our existing *Y* page"). It governs structure and formats.

---

## Part 3 — Content Architecture (the skeleton that ranks + gets cited)

**3.1 Answer-first introduction (≈180–200 words).** The first sentence must *directly answer the primary keyword* — this wins featured snippets and AI Overview citations. Paragraph two delivers the core promise. No three-paragraph warm-up.
- Open with a concrete, authoritative detail — never "Tutoring is competitive." Instead: "A tutor teaching 15 hours a week at $25 can lose $3,000–$4,900 a year to marketplace commission before a single dollar reaches them."

**3.2 One H1, clean H2 → H3 hierarchy (never skip a level).** Each `<h2>` **opens with 1–2 sentences that directly answer what the heading promises**, before any detail. This "answer-first per section" pattern is the single strongest AEO signal.

**3.3 Entity density: 15+ named entities per 1,000 words.** Name the specific things only a tutoring-business expert would name. Generic nouns read as AI filler; proper nouns read as lived expertise and feed the knowledge graph.

**Tutafy entity bank** (pull from these to hit density honestly):
- **Marketplaces:** Preply, iTalki, Wyzant, Superprof, Cambly, Verbling, Varsity Tutors, Outschool.
- **Tutor-management SaaS (competitors):** TutorCruncher, Teachworks, TutorBird, MyMusicStaff, Pike13, Workee, Tuton, Picktime, Fons, Oases; adjacent scheduling: Calendly, Acuity.
- **Tools tutors use:** Zoom, Google Meet, Jitsi, Skype, WhatsApp, Google Calendar, Google Sheets, Stripe, PayPal, Paddle, Zapier, QuickBooks, Xero.
- **Teaching concepts:** trial lesson, no-show, cancellation policy, buffer time, recurring lessons, timezone booking, group class, lesson packages, prepaid credits, homework, progress report, vocab quiz, student portal, parent portal, booking link, embed widget.
- **Credentials / exams / levels:** TEFL, TESOL, CELTA, DELTA; IELTS, TOEFL, TOEIC, SAT, ACT, GCSE, A-Level; CEFR A1–C2.
- **Business metrics:** commission / take-rate, MRR, LTV, CAC, churn, retention, occupancy/utilization, hourly rate, no-show rate, 1099 (US tutor tax form).
- **Benchmarks (state as ranges, honestly):** marketplace commissions typically 15–33%; Preply keeps 100% of the trial lesson then a sliding ~18–33%; iTalki ~15% flat; payment-processor fees ~2.9% + 30¢.

**3.4 Length by intent, not by quota.** Broad/commercial keywords → 2,500–4,000+ words; a focused sub-topic → 1,500–2,500. Never pad; earn length with real sub-sections (by platform, by subject taught, by tutor experience level, by persona, by use-case).

---

## Part 4 — The Voice: Honest-Broker Copywriting + E-E-A-T

**4.1 Speak as a real, named insider talking to one tutor.** Use "we / our team," address the reader as "you," let AUTHOR's point of view show. First-hand experience is the most scrutinized quality signal (the first "E" in E-E-A-T).

**4.2 Be an honest broker, not a hype machine.** Acknowledge trade-offs openly ("Marketplaces are worth their cut when you're brand-new and have zero audience — here's when that flips," "a spreadsheet is free, but it doesn't send reminders or take payment"). Give the fair comparison **including when a competitor is the better fit** (e.g., TutorCruncher for a large multi-branch agency; a marketplace for discovery when you're starting out). Candor before the soft sell is what converts.

**4.3 Specific + concrete in every paragraph.** Each paragraph carries a detail only someone who has run a tutoring business would know: why an 8:30am-local reminder beats a 3am one, why a 24-hour cancellation policy protects your income, how a trial-lesson commission of 100% actually works, why timezone auto-detection kills no-shows. Delete any paragraph that could apply to any other SaaS.

**4.4 Rotate your openings.** Rotate opener types: the hard number, the concrete scenario, the honest challenge, the technical frame, the "what nobody tells you," the specific comparison. Never reuse a stock sentence like "Most tools do X; we do Y."

**4.5 What Google's AI detectors flag — avoid:**
- Generic superlatives ("game-changing," "world-class," "revolutionary," "#1," "best-ever").
- Passive-voice overuse; identical sentence structures repeated across pages.
- Bullet-only pages with no flowing prose.
- Fake urgency/scarcity that is not literally true.
- **Fabricated proof** — invented customer counts, ratings, testimonials, or "our tutors earn X% more." Cardinal sin (see honesty rule up top).
- Contradictions across our own channels — plan names, prices (Free / $12 / $29), the support email (tubxeebyajtube@gmail.com), the "0% commission" promise, and competitor facts must match everywhere (site, blog, schema, footer).

**4.6 E-E-A-T signals to include on-page:** real bylined author linked to `/about`, real product screenshots (dashboard, booking page, video classroom, student portal), accurate outbound links to authoritative sources (a marketplace's own commission help page, a Stripe fees page), and — instead of fake reviews — the *free Commission Calculator* as verifiable, first-party proof the reader generates themselves.

---

## Part 5 — Page Anatomy (our reusable article layout)

Keep the *structure*; restyle freely. This maps to our Next.js blog (`src/lib/blog.ts`, `src/app/blog/[slug]/page.tsx`).

```
Global header / nav (Tutafy · Blog · Find tutors · Start free)
Category tag → H1
Byline: real author name (linked to /about) · read time · date
"Key Takeaways" box (3–4 conclusion bullets)         ← snippet + skimmer bait
Article body (single readable column)
   → answer-first intro (keyword in sentence 1)
   → H2 sections, each answer-first, interleaved with:
        · visual formats (Part 7)
        · inline product CTAs (Part 8)
        · product screenshots / SVG diagrams (Part 10)
        · one Commission Calculator / lead widget (Part 9)
   → FAQ block (6+ Q, matching FAQPage schema exactly)
   → Final CTA banner (Start free)
Related-articles strip (topic cluster, once ≥3 posts)
Global footer + JSON-LD (BlogPosting + Breadcrumb)
```

**Rules that matter:**
- Read time should be **computed** (`round(words / 250)`), not hardcoded. *(TODO: our current posts hardcode `readTime`; move to computed once the content model is richer.)*
- Author is a real linked name, never "Admin."
- "Key Takeaways" box near the top doubles as snippet bait and skim-path.
- **Infra we still need to build to hit full playbook grade** (add when writing these articles): a `Key Takeaways` component, a `FAQ` + `faqPageSchema()` pair (visible FAQ and schema from one source), reusable visual-format components (`StatCards`, `CompareTable`, `ProsCons`, `Callout`, `InlineCTA`), the Commission Calculator widget, and a hero-image pipeline. Until then, extend the `PostBlock` union in `src/lib/blog.ts` and render new block types in `[slug]/page.tsx`.

---

## Part 6 — The Vary-Layout Rule (avoid scaled-content penalties)

**Every article must look individually authored.** If all posts share one skeleton, answer engines flag the site as templated and suppress it. For each new article, deliberately change at least:
1. **Which visual formats** you use (rotate through Part 7).
2. **The organizing axis** — by platform, by subject, by tutor experience level, by persona, by "should I?" decision, by step-by-step. Don't always sort the same way.
3. **Where screenshots / CTAs / callouts sit** — vary position and count.
4. **Heading voice, intro angle, and takeaways** — never copy stock sentences.

Keep a running log (in `src/lib/blog.ts` comments) of what each article used, so the next is provably different.

---

## Part 7 — Visual Formats Library (mandatory: 3–4 per article)

**Hard rule (minimum images):** every article ships **at least 2 images/graphics — aim 3–4 — of different types**, all **relevant to the actual topic** (no generic filler). Source each either (a) downloaded free and legally (Openverse, Wikimedia, Unsplash, Pexels) → convert to AVIF+WebP with real dimensions, or (b) designed in code — an on-brand SVG hero or a responsive inline SVG diagram. Baseline mix: **1 hero + ≥1 relevant inline graphic**. Use **3–4 distinct visual *formats*** overall; **≥1 in the first third**; a data table never stands alone; never repeat one format twice.

The toolbox, re-mapped to tutoring uses:

| # | Format | Use for (Tutafy) |
|---|--------|------------------|
| 01 | **Stat Cards** | hard numbers: % commission, $ lost/year, no-show rate, hours saved |
| 02 | **Commission Breakdown** | what a marketplace takes at a given hours×rate |
| 03 | **Pros / Cons** | honest per-platform or per-approach comparisons |
| 04 | **Score Bars** | scoring tools across criteria (price, commission, video, AI) |
| 05 | **Icon Cards** | features, tutor tasks, subjects, booking steps |
| 06 | **Flow Diagram (SVG)** | "student books → pays → joins class → gets homework" pipeline |
| 07 | **Step Flow** | how-to setup, how to get your first client |
| 08 | **Horizontal Timeline** | a tutor's week, or an onboarding sequence |
| 09 | **Comparison Table** | multi-tool / multi-marketplace data (pair with a visual) |
| 10 | **Callout Box** (tip / warn / info) | insider tips, honest warnings |
| 11 | **Income-Kept Curve** | earnings kept over a year: independent vs 25% commission |
| 12 | **"Is This For You?"** fit grid | Free vs Pro vs Academy vs "stay on a marketplace for now" |
| 13 | **ROI / Cost Breakdown** | what commission costs vs the $12/$29 flat price |
| 14 | **Quick Facts Box** | at-a-glance after an H2 |
| 15 | **Setup Checklist Grid** | what you need to start taking bookings |
| 16 | **Persona Cards** | "which plan for which tutor" (solo vs small center) |
| 17 | **Comparison Spectrum** | Marketplace ↔ Independent, Cheap ↔ Premium sliders |
| 18 | **Subject/Level Cards** | ESL vs test-prep vs music, each with the right fit |
| 19 | **Mini Dashboard Mock** | an illustrative (clearly-labelled) metrics snapshot |
| 20 | **Radar Chart** | 2–3 tools across 6 criteria |
| 21 | **Before / After** | a chaotic 5-app stack vs one dashboard |

Selection heuristics by article type: *Comparison* → 03 + 09 + 20/17 · *How-to* → 07 + 10 + 15 · *Definitional* → 14 + 06 + 05 · *ROI/commission* → 13 + 01 + 11 · *Fit/pricing* → 12 + 16 + 02.

---

## Part 8 — Inline Conversion / Soft CTAs

Blend the offer into the read *contextually* — never a wall of ads. Our "triad":

**Minimums per article:**
- **2–3 primary product placements** inside the body, dropped where the text already discusses running your business or choosing a tool. Show **the offer before the button** (Free / $12 Pro / $29 Academy, no card) and the risk-reversal (free forever, cancel anytime, 0% commission).
- **One "free calculator / get started" placement** — the Commission Calculator, near the "how much am I losing?" or "how to start" section. Highest-converting, most honest CTA: value first.
- **One "specific feature" placement** — a deeper feature relevant to the article (built-in video classroom, 10 AI tools, parent portal, team payroll), typically right before the FAQ.

**Rules:**
- Buttons say "Start free / Run the calculator / See pricing," never a hard "Buy now" mid-article.
- Wrap product/feature names in running prose as styled inline links (one per feature per section) so the page is quietly shoppable.
- Place each CTA by context: the plan CTA near "which tool to choose," the calculator CTA near "how much you're losing," the feature CTA near "what you get."
- **Vary CTA positions between articles** (Part 6).

---

## Part 9 — Lead Capture (value-first)

Every article should offer **one value-first, email-worthy interaction**. For Tutafy this is:

- **Primary — the Commission Calculator** *(to build)*: inputs (hours/week + hourly rate + current marketplace commission %) → outputs, immediately on-page: **$/year you're losing to commission** and **what you'd keep on Tutafy (0%)**. This is our honest, first-party proof — the reader generates their own number. Link to it wherever "how much am I losing?" comes up. Give each article a unique `source` tag so leads are attributable. Keep the widget self-contained.
- Results should funnel honestly toward Free/Pro while being genuinely useful even to non-signups.

---

## Part 10 — Images & Diagrams: Real, Not Faked

Tutoring-business articles lean on *diagrams and real screenshots*, not stock photos.

1. **≥2 images/graphics per article — aim 3–4 — varied types, all relevant (mandatory).** Add real product screenshots (dashboard, booking page, video classroom, student/parent portal, reports) where they help, plus inline SVG diagrams (booking flow, commission-kept curve, a tutor's week timeline).
2. **Never fabricate.** Screenshots must be of the real product (a demo/sample account is fine, labelled illustrative). Do not mock up numbers we present as real results.
3. **Format:** next-gen (WebP/AVIF) on-page; keep a PNG/JPG for `og:image` / `twitter:image`. Always set real `width`/`height` to prevent CLS. *(TODO: add a hero-image + OG-image pipeline; per-article OG is a future enhancement.)*
4. **Diagrams beat photos** for our topic — a clean "book → pay → join → homework" SVG earns more trust than a stock laptop photo.
5. **Alt text + captions** describe the real asset and carry a specific detail (a feature name, a real number range).
6. **Vary placement** between articles (Part 6).

---

## Part 11 — SEO Technical

**11.1 `<head>` (unique per page):** meta description (150–160 chars, primary keyword), title (`Primary Keyword · Tutafy` via the layout template), canonical (`/blog/<slug>`), Open Graph + Twitter card. We handle these in `generateMetadata` in `src/app/blog/[slug]/page.tsx` — keep them page-specific.

**11.2 Structured data (JSON-LD) — ship and validate:**
- **BlogPosting** (author, publisher, dates, canonical) — already emitted per post.
- **FAQPage** — **must match the on-page FAQ word-for-word** (6+ Q&A). Keep the visible FAQ and the schema from one source so they never drift. *(TODO: add FAQ support to the content model.)*
- **BreadcrumbList** — visible breadcrumb text matches position-3 of the JSON-LD.
- SoftwareApplication already ships from the landing page — don't duplicate per post.
- **Trap:** keep JSON-LD values plain; avoid stray back-ticks/unescaped characters in TS.

**11.3 Internal + external links.** Link every new article to a money page (`/register`, `/upgrade`) and to sibling articles (topic cluster). Verify every internal link resolves. Add 1–2 outbound links to authoritative sources.

**11.4 Sitemap.** Every new post is added automatically because `src/app/sitemap.ts` maps `POSTS` — just make sure the post exists in `src/lib/blog.ts`. Verify it appears at `tutafy.com/sitemap.xml` after deploy.

---

## Part 12 — Performance & Accessibility

- **Targets:** Lighthouse Accessibility / Best-Practices / SEO all ≥ 90 (aim 95–100).
- **Core Web Vitals:** LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 (always set image dimensions).
- **Speed tactics:** next-gen images, keep the article a mostly-static server component (posts are statically generated via `generateStaticParams` — keep them that way).
- **Accessibility:** correct heading order (no skips), real alt text, labelled controls, sufficient contrast.
- **Deploy note:** `vercel --prod` deploys; a new `/blog/<slug>` route needs a build to appear (a fresh URL 404s until the build finishes, then serves 200).

---

## Part 13 — Publish & Sync Checklist (Definition of Done)

Do all of these in **one pass**:

- [ ] Add the post to `src/lib/blog.ts` `POSTS[]` (slug, title, description, date, readTime, category, content).
- [ ] One H1; H2→H3 hierarchy; every H2 answer-first.
- [ ] Answer-first intro (~180–200 words), keyword in sentence 1.
- [ ] Entity density ≥ 15 / 1,000 words (Part 3 bank); honest voice; **zero fabricated proof**; no AI-flag phrases.
- [ ] **≥2 images/graphics (aim 3–4), varied types, all relevant**; 3–4 visual formats overall (≥1 in first third; table never alone).
- [ ] Inline CTAs: 2–3 plan + 1 calculator + 1 feature, contextually placed, offer before button.
- [ ] A value-first lead path (Commission Calculator link).
- [ ] Real product screenshots / SVG diagrams where they help; dimensions set; nothing faked.
- [ ] Schemas: BlogPosting + FAQPage (matches on-page FAQ) + Breadcrumb (visible text matches).
- [ ] Internal links to `/register` + `/upgrade` + sibling posts; 1–2 outbound authority links; all resolve.
- [ ] Read time computed and matched; byline is a real linked author.
- [ ] Verify (tsc + probe `/blog` and the new post), then deploy.
- [ ] After deploy, confirm the post + sitemap entry return 200 on `tutafy.com`.

---

## Part 14 — Quality Gates (say "done" only when all pass)

1. **Snippet test:** does the intro's first sentence answer the query well enough to be quoted alone?
2. **Skim test:** can a reader get the answer from headings + Key Takeaways + visuals without reading prose?
3. **Expert test:** could a rival brand publish this verbatim? If yes, it's too generic — add real specifics (a decline/commission mechanic, platform behavior, honest trade-offs).
4. **Trust test:** are the price, an honest downside, and verifiable proof (the free calculator) all present before the ask — with **no fabricated stats**?
5. **Uniqueness test:** is the layout provably different from the last article (formats, axis, positions)?
6. **Tech test:** schemas parse, links resolve, sitemap has the URL, build is green, no leftover placeholders.

---

## Part 15 — Article Backlog (re-usable angles for Tutafy)

Each is a distinct keyword/intent, cross-linkable into one topic cluster around "run your tutoring business independently."

| Angle | Primary keyword | Intent | Lead format |
|-------|-----------------|--------|-------------|
| Comparison (published) | teaching independently vs marketplace | comparison | table + income-kept curve |
| How-to (published) | how to get tutoring clients | how-to | step flow + checklist |
| Preply alternatives | preply alternatives for tutors | comparison | tool cards + spectrum |
| Best tutor software | best tutor management software | comparison | table + radar |
| Pricing lessons | how to price tutoring lessons | how-to | steps + persona cards |
| No-shows | how to stop tutoring no-shows | how-to | callouts + cadence |
| Commission ROI | how much does Preply take from tutors | commercial | commission breakdown + calculator |
| Teach English online | how to teach English online and get paid | how-to | step flow + fit grid |

**What must survive into every article (the invariants):**
1. Conversion-then-SEO priority order.
2. Answer-first intro and answer-first H2 sections.
3. High named-entity density (proof of expertise) from the Part 3 bank.
4. Honest-broker voice with real specifics; **no fabricated proof**; no AI-flag phrases.
5. 3–4 varied visual formats; layout varied per article.
6. Contextual, offer-first CTAs + one value-first calculator/lead path.
7. Real screenshots/diagrams, nothing faked.
8. Full schema set (BlogPosting/FAQ/Breadcrumb), validated and matching visible content.
9. Post added to `src/lib/blog.ts`; appears in sitemap; read time computed.
10. Verify, deploy, confirm 200 on production.

---

## Appendix — Condensed Master Prompt (copy-paste to brief a model)

> You are the senior content lead for **Tutafy**, expert in **running an independent online tutoring business** (bookings, video classroom, payments, AI lesson tools, student/parent portals) writing for **independent online tutors and small tutoring centers**. Produce a publish-ready article on `<primary keyword>` that serves conversion first and SEO/AEO second. Open with a 180–200-word answer-first intro whose first sentence directly answers the keyword. Use one H1 and answer-first H2→H3 sections. Write in the honest, first-hand voice of a named team member, naming 15+ real entities per 1,000 words (marketplaces like Preply/iTalki/Wyzant/Superprof, SaaS like TutorCruncher/Teachworks/TutorBird, tools like Zoom/Google Meet/Stripe/Zapier, concepts like trial lesson/no-show/cancellation policy/CEFR/CELTA/IELTS, metrics like commission/MRR/LTV/churn), acknowledging trade-offs and **never fabricating customer counts, ratings, testimonials, or performance stats**. Include 3–4 distinct visual formats (≥1 in the first third; never a lone table), 2–3 contextual plan CTAs with the offer before the button (Free / $12 Pro / $29 Academy, no card, 0% commission), one free Commission Calculator CTA, one feature CTA, and real screenshots/diagrams (nothing faked). Vary the layout from prior articles. Add validated BlogPosting + FAQPage (matching the on-page FAQ) + BreadcrumbList schema, unique meta/title/canonical/OG, internal links to `/register` and `/upgrade` and sibling posts, and ensure the post is added to `src/lib/blog.ts` (so it enters the sitemap). Finish only when the snippet, skim, expert, trust, uniqueness, and tech quality gates all pass.

---

*Method distilled from a proven editorial content system and re-targeted to Tutafy (all-in-one software for independent online tutors, 0% commission). The method is fixed; the entities, products, and voice are ours.*
