// Generates on-brand blog hero images (SVG -> AVIF + WebP, 1200x630).
// Run: node --import ./tests/register.mjs scripts/gen-blog-images.mjs   (the register hook lets it read the brand source in src/lib)
// T-0969: the corner logo is the brand logo D2, one colour in white (a full-colour tile would vanish on the indigo backgrounds); BRAND.md section 1.
import sharp from 'sharp'
import { iconShapes, logoSvg } from '@/lib/brand-svg'
import { mkdirSync } from 'node:fs'

mkdirSync('public/blog', { recursive: true })

// The logo in the top left corner, drawn from the brand source (white, one colour).
const CORNER_LOGO = logoSvg('mono-white', 48).replace('<svg ', '<svg x="64" y="58" ')

// Shared frame: gradient background, dot grid, Tutafy wordmark, category label.
function base({ from, to, label, motif }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="2" fill="#ffffff" opacity="0.10"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  ${motif}
  ${CORNER_LOGO}
  <g transform="translate(64,520)">
    <rect x="0" y="0" width="${28 + label.length * 12}" height="40" rx="20" fill="#ffffff" opacity="0.20"/>
    <text x="18" y="27" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff" letter-spacing="1">${label.toUpperCase()}</text>
  </g>
</svg>`
}

// Distinct motif per topic (abstract + on-brand).
const HEROES = {
  // Growth — rising bars + arrow
  'get-your-first-tutoring-clients': base({ from: '#7c3aed', to: '#4f46e5', label: 'Growth', motif: `
    <g transform="translate(760,180)" opacity="0.9">
      <rect x="0" y="180" width="60" height="120" rx="8" fill="#ffffff" opacity="0.25"/>
      <rect x="90" y="120" width="60" height="180" rx="8" fill="#ffffff" opacity="0.35"/>
      <rect x="180" y="60" width="60" height="240" rx="8" fill="#ffffff" opacity="0.55"/>
      <rect x="270" y="10" width="60" height="290" rx="8" fill="#ffffff" opacity="0.85"/>
      <path d="M20 200 L120 150 L220 90 L320 40" stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M300 30 L330 40 L322 70 Z" fill="#ffffff"/>
    </g>` }),

  // Business — coins / dollar
  'marketplace-vs-independent-the-real-math': base({ from: '#059669', to: '#0d9488', label: 'Business', motif: `
    <g transform="translate(800,150)" opacity="0.92">
      <ellipse cx="150" cy="300" rx="150" ry="42" fill="#ffffff" opacity="0.18"/>
      <g>
        <ellipse cx="150" cy="80" rx="110" ry="40" fill="#ffffff" opacity="0.9"/>
        <rect x="40" y="80" width="220" height="150" fill="#ffffff" opacity="0.9"/>
        <ellipse cx="150" cy="230" rx="110" ry="40" fill="#ffffff" opacity="0.7"/>
        <text x="150" y="175" font-family="Segoe UI, Arial" font-size="130" font-weight="800" fill="#0d9488" text-anchor="middle">$</text>
      </g>
    </g>` }),

  // Comparison (marketplaces) — two panels / vs
  'preply-alternatives-for-tutors': base({ from: '#f59e0b', to: '#ea580c', label: 'Comparison', motif: `
    <g transform="translate(740,150)" opacity="0.95">
      <rect x="0" y="30" width="200" height="270" rx="18" fill="#ffffff" opacity="0.28"/>
      <rect x="240" y="30" width="200" height="270" rx="18" fill="#ffffff" opacity="0.9"/>
      <circle cx="220" cy="165" r="46" fill="#ffffff"/>
      <text x="220" y="182" font-family="Segoe UI, Arial" font-size="34" font-weight="800" fill="#ea580c" text-anchor="middle">VS</text>
    </g>` }),

  // Comparison (software) — grid of app tiles
  'best-tutor-management-software': base({ from: '#e11d48', to: '#ea580c', label: 'Comparison', motif: `
    <g transform="translate(770,150)" opacity="0.95">
      ${[0,1,2,3].map(i => {
        const x = (i % 2) * 170, y = Math.floor(i / 2) * 170
        const op = [0.35, 0.6, 0.9, 0.5][i]
        return `<rect x="${x}" y="${y}" width="140" height="140" rx="24" fill="#ffffff" opacity="${op}"/>`
      }).join('')}
      <circle cx="215" cy="215" r="34" fill="#e11d48"/>
      <path d="M200 215 l10 10 l18 -20" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // How-to — price tag + steps
  'how-to-price-tutoring-lessons': base({ from: '#0ea5e9', to: '#2563eb', label: 'How-to', motif: `
    <g transform="translate(780,150)" opacity="0.95">
      <path d="M60 20 L250 20 L320 120 L180 300 L20 180 Z" fill="#ffffff" opacity="0.9"/>
      <circle cx="120" cy="95" r="26" fill="#2563eb"/>
      <text x="205" y="175" font-family="Segoe UI, Arial" font-size="120" font-weight="800" fill="#2563eb" text-anchor="middle" transform="rotate(-33 205 155)">$</text>
    </g>` }),

  // Teaching English — speech bubbles + ABC
  'how-to-teach-english-online': base({ from: '#0d9488', to: '#0ea5e9', label: 'Teaching', motif: `
    <g transform="translate(760,150)" opacity="0.95">
      <path d="M20 30 h240 a24 24 0 0 1 24 24 v120 a24 24 0 0 1 -24 24 h-150 l-50 46 v-46 h-40 a24 24 0 0 1 -24 -24 v-120 a24 24 0 0 1 24 -24 Z" fill="#ffffff" opacity="0.92"/>
      <text x="150" y="140" font-family="Segoe UI, Arial" font-size="86" font-weight="800" fill="#0d9488" text-anchor="middle">ABC</text>
      <g transform="translate(230,150)">
        <path d="M0 40 h150 a20 20 0 0 1 20 20 v70 a20 20 0 0 1 -20 20 h-90 l-40 34 v-34 h-20 a20 20 0 0 1 -20 -20 v-70 a20 20 0 0 1 20 -20 Z" fill="#ffffff" opacity="0.55"/>
      </g>
    </g>` }),

  // Operations — calendar + check (no-shows prevented)
  'stop-tutoring-no-shows': base({ from: '#4338ca', to: '#7c3aed', label: 'Operations', motif: `
    <g transform="translate(790,140)" opacity="0.95">
      <rect x="20" y="30" width="300" height="280" rx="24" fill="#ffffff" opacity="0.92"/>
      <rect x="20" y="30" width="300" height="66" rx="24" fill="#7c3aed" opacity="0.55"/>
      <rect x="70" y="10" width="20" height="46" rx="10" fill="#ffffff"/>
      <rect x="250" y="10" width="20" height="46" rx="10" fill="#ffffff"/>
      ${[0,1,2,3,4,5].map(i => {
        const x = 50 + (i % 3) * 90, y = 130 + Math.floor(i / 3) * 80
        return `<circle cx="${x}" cy="${y}" r="20" fill="#7c3aed" opacity="0.18"/>`
      }).join('')}
      <circle cx="230" cy="210" r="46" fill="#7c3aed"/>
      <path d="M208 210 l14 14 l26 -30" stroke="#ffffff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // Getting started — rocket / launch
  'how-to-start-an-online-tutoring-business': base({ from: '#7c3aed', to: '#db2777', label: 'Getting started', motif: `
    <g transform="translate(820,140)" opacity="0.95">
      <path d="M150 20 C205 60 220 140 200 220 L100 220 C80 140 95 60 150 20 Z" fill="#ffffff" opacity="0.92"/>
      <circle cx="150" cy="110" r="30" fill="#db2777"/>
      <circle cx="150" cy="110" r="14" fill="#ffffff"/>
      <path d="M100 220 L70 270 L110 250 Z" fill="#ffffff" opacity="0.7"/>
      <path d="M200 220 L230 270 L190 250 Z" fill="#ffffff" opacity="0.7"/>
      <path d="M150 235 q-14 34 0 66 q14 -32 0 -66 Z" fill="#fbbf24" opacity="0.95"/>
    </g>` }),

  // Pricing / commission — pie chart (slice taken)
  'how-much-does-preply-take': base({ from: '#ea580c', to: '#e11d48', label: 'Pricing', motif: `
    <g transform="translate(830,160)" opacity="0.96">
      <circle cx="150" cy="150" r="130" fill="#ffffff" opacity="0.9"/>
      <path d="M150 150 L150 20 A130 130 0 0 1 260 205 Z" fill="#e11d48" opacity="0.85"/>
      <circle cx="150" cy="150" r="58" fill="url(#g)"/>
      <text x="150" y="165" font-family="Segoe UI, Arial" font-size="46" font-weight="800" fill="#ffffff" text-anchor="middle">33%</text>
    </g>` }),

  // Software / free — price tag $0 + app tiles
  'free-tutor-management-software': base({ from: '#059669', to: '#0d9488', label: 'Software', motif: `
    <g transform="translate(800,150)" opacity="0.95">
      <path d="M60 20 L250 20 L320 120 L180 300 L20 180 Z" fill="#ffffff" opacity="0.92"/>
      <circle cx="120" cy="95" r="26" fill="#059669"/>
      <text x="200" y="185" font-family="Segoe UI, Arial" font-size="96" font-weight="800" fill="#059669" text-anchor="middle" transform="rotate(-33 200 165)">$0</text>
    </g>` }),

  // Comparison (vs) — versus panels
  'tutafy-vs-alternatives': base({ from: '#0d9488', to: '#4f46e5', label: 'Comparison', motif: `
    <g transform="translate(760,150)" opacity="0.95">
      <rect x="0" y="30" width="200" height="270" rx="20" fill="#ffffff" opacity="0.9"/>
      <rect x="240" y="30" width="200" height="270" rx="20" fill="#ffffff" opacity="0.32"/>
      <g transform="translate(50,95) scale(1.6)">${iconShapes('light')}</g>
      <circle cx="220" cy="165" r="46" fill="#ffffff"/>
      <text x="220" y="182" font-family="Segoe UI, Arial" font-size="30" font-weight="800" fill="#4f46e5" text-anchor="middle">VS</text>
      <rect x="280" y="90" width="120" height="16" rx="8" fill="#ffffff" opacity="0.6"/>
      <rect x="280" y="126" width="90" height="16" rx="8" fill="#ffffff" opacity="0.45"/>
      <rect x="280" y="162" width="110" height="16" rx="8" fill="#ffffff" opacity="0.45"/>
    </g>` }),

  // Review — star rating badge
  'tutafy-review': base({ from: '#4f46e5', to: '#0d9488', label: 'Review', motif: `
    <g transform="translate(800,150)" opacity="0.96">
      <rect x="20" y="40" width="320" height="230" rx="26" fill="#ffffff" opacity="0.92"/>
      <g transform="translate(52,90)">
        ${[0,1,2,3,4].map(i => {
          const cx = i * 58 + 24
          return `<path d="M${cx} 0 l13 27 l30 4 l-22 21 l6 30 l-27 -15 l-27 15 l6 -30 l-22 -21 l30 -4 Z" fill="#fbbf24"/>`
        }).join('')}
      </g>
      <rect x="60" y="160" width="240" height="16" rx="8" fill="#4f46e5" opacity="0.25"/>
      <rect x="60" y="192" width="180" height="16" rx="8" fill="#4f46e5" opacity="0.18"/>
      <rect x="60" y="224" width="210" height="16" rx="8" fill="#4f46e5" opacity="0.18"/>
    </g>` }),

  // Business plan — clipboard with checklist
  'how-to-write-a-tutoring-business-plan': base({ from: '#4338ca', to: '#2563eb', label: 'Business', motif: `
    <g transform="translate(810,130)" opacity="0.95">
      <rect x="20" y="10" width="260" height="320" rx="20" fill="#ffffff" opacity="0.92"/>
      <rect x="80" y="0" width="140" height="34" rx="12" fill="#2563eb"/>
      ${[0,1,2,3].map(i => `<g transform="translate(50,${80 + i * 62})"><rect width="30" height="30" rx="8" fill="#2563eb" opacity="${i === 3 ? 0.25 : 0.85}"/>${i < 3 ? '<path d="M6 15 l8 8 l14 -18" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' : ''}<rect x="46" y="9" width="150" height="14" rx="7" fill="#2563eb" opacity="0.2"/></g>`).join('')}
    </g>` }),

  // Tutor website — browser window
  'how-to-build-a-tutor-website': base({ from: '#0284c7', to: '#0891b2', label: 'Growth', motif: `
    <g transform="translate(790,150)" opacity="0.95">
      <rect x="0" y="0" width="330" height="240" rx="18" fill="#ffffff" opacity="0.94"/>
      <rect x="0" y="0" width="330" height="38" rx="18" fill="#0891b2" opacity="0.35"/>
      <circle cx="24" cy="19" r="6" fill="#0891b2"/><circle cx="46" cy="19" r="6" fill="#0891b2" opacity="0.6"/><circle cx="68" cy="19" r="6" fill="#0891b2" opacity="0.4"/>
      <rect x="26" y="60" width="180" height="20" rx="6" fill="#0891b2" opacity="0.7"/>
      <rect x="26" y="94" width="278" height="12" rx="6" fill="#0891b2" opacity="0.2"/>
      <rect x="26" y="116" width="220" height="12" rx="6" fill="#0891b2" opacity="0.2"/>
      <rect x="26" y="160" width="120" height="36" rx="18" fill="#0891b2"/>
    </g>` }),

  // Student retention — loop / cycle arrows
  'how-to-retain-tutoring-students': base({ from: '#be185d', to: '#e11d48', label: 'Growth', motif: `
    <g transform="translate(840,160)" opacity="0.95">
      <circle cx="140" cy="140" r="120" fill="none" stroke="#ffffff" stroke-width="20" stroke-dasharray="18 14" opacity="0.5"/>
      <circle cx="140" cy="140" r="70" fill="#ffffff" opacity="0.92"/>
      <path d="M115 118 l12 12 l32 -34" stroke="#e11d48" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M240 60 l20 -6 l6 20" stroke="#ffffff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // Group classes — cluster of people circles
  'group-tutoring-classes-pricing': base({ from: '#d97706', to: '#f59e0b', label: 'Business', motif: `
    <g transform="translate(800,150)" opacity="0.95">
      ${[[80,60,34,0.55],[190,50,30,0.75],[280,90,26,0.4],[70,180,40,0.9],[210,190,32,0.6]].map(([x,y,r,op]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${op}"/>`).join('')}
    </g>` }),

  // Tutoring niche — magnifying glass over book
  'how-to-choose-a-tutoring-niche': base({ from: '#7e22ce', to: '#a855f7', label: 'Growth', motif: `
    <g transform="translate(820,150)" opacity="0.95">
      <rect x="0" y="60" width="220" height="170" rx="14" fill="#ffffff" opacity="0.88"/>
      <rect x="0" y="60" width="220" height="30" rx="14" fill="#a855f7" opacity="0.4"/>
      <circle cx="230" cy="120" r="62" fill="none" stroke="#ffffff" stroke-width="16"/>
      <line x1="273" y1="163" x2="320" y2="210" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
    </g>` }),

  // Contracts / cancellation policy — document with signature line
  'tutoring-cancellation-policy-and-contracts': base({ from: '#334155', to: '#475569', label: 'Operations', motif: `
    <g transform="translate(830,120)" opacity="0.95">
      <rect x="0" y="0" width="240" height="310" rx="18" fill="#ffffff" opacity="0.93"/>
      <rect x="30" y="34" width="180" height="14" rx="7" fill="#475569" opacity="0.5"/>
      <rect x="30" y="64" width="140" height="10" rx="5" fill="#475569" opacity="0.22"/>
      <rect x="30" y="84" width="160" height="10" rx="5" fill="#475569" opacity="0.22"/>
      <rect x="30" y="104" width="120" height="10" rx="5" fill="#475569" opacity="0.22"/>
      <path d="M30 250 q30 -24 60 0 t60 0 t60 0" stroke="#475569" stroke-width="5" fill="none" opacity="0.5"/>
      <path d="M150 190 l50 -50 l20 20 l-50 50 l-24 4 Z" fill="#fbbf24"/>
    </g>` }),

  // AI tools — sparkle / spark
  'ai-tools-for-tutors': base({ from: '#a21caf', to: '#c026d3', label: 'Productivity', motif: `
    <g transform="translate(820,150)" opacity="0.95">
      <path d="M150 0 q18 90 108 108 q-90 18 -108 108 q-18 -90 -108 -108 q90 -18 108 -108 Z" fill="#ffffff" opacity="0.92"/>
      <circle cx="280" cy="40" r="16" fill="#ffffff" opacity="0.6"/>
      <circle cx="30" cy="220" r="12" fill="#ffffff" opacity="0.5"/>
    </g>` }),

  // Leave Preply migration — arrow moving box A to box B
  'how-to-leave-preply-migration-guide': base({ from: '#c2410c', to: '#ea580c', label: 'Business', motif: `
    <g transform="translate(770,160)" opacity="0.95">
      <rect x="0" y="30" width="150" height="150" rx="18" fill="#ffffff" opacity="0.35"/>
      <rect x="230" y="30" width="150" height="150" rx="18" fill="#ffffff" opacity="0.92"/>
      <path d="M150 105 L230 105" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
      <path d="M210 85 L232 105 L210 125" stroke="#ffffff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M270 80 l10 22 l24 4 l-18 16 l4 24 l-20 -12 l-20 12 l4 -24 l-18 -16 l24 -4 Z" fill="#ea580c"/>
    </g>` }),

  // Video call tools — camera + avatar tiles
  'best-video-call-tool-for-tutors': base({ from: '#0f766e', to: '#0891b2', label: 'Comparison', motif: `
    <g transform="translate(790,150)" opacity="0.95">
      <rect x="0" y="0" width="330" height="230" rx="20" fill="#ffffff" opacity="0.92"/>
      ${[0,1,2,3].map(i => { const x = (i % 2) * 165, y = Math.floor(i / 2) * 115; return `<rect x="${x + 14}" y="${y + 14}" width="137" height="87" rx="12" fill="#0891b2" opacity="${[0.6,0.3,0.4,0.75][i]}"/><circle cx="${x + 82}" cy="${y + 57}" r="24" fill="#ffffff" opacity="0.9"/>` }).join('')}
    </g>` }),

  // Parent portal — chat bubble + family
  'parent-communication-and-parent-portal': base({ from: '#be123c', to: '#ec4899', label: 'Operations', motif: `
    <g transform="translate(800,140)" opacity="0.95">
      <path d="M20 20 h220 a24 24 0 0 1 24 24 v110 a24 24 0 0 1 -24 24 h-140 l-46 40 v-40 h-34 a24 24 0 0 1 -24 -24 v-110 a24 24 0 0 1 24 -24 Z" fill="#ffffff" opacity="0.93"/>
      <circle cx="80" cy="95" r="16" fill="#ec4899" opacity="0.6"/>
      <circle cx="130" cy="95" r="16" fill="#ec4899" opacity="0.8"/>
      <circle cx="180" cy="95" r="16" fill="#ec4899" opacity="0.4"/>
    </g>` }),

  // Hiring tutors / team — overlapping avatars + plus badge
  'how-to-hire-tutors-and-build-a-team': base({ from: '#0891b2', to: '#4338ca', label: 'Team', motif: `
    <g transform="translate(770,150)" opacity="0.95">
      <circle cx="70" cy="120" r="58" fill="#ffffff" opacity="0.35"/>
      <circle cx="170" cy="100" r="58" fill="#ffffff" opacity="0.6"/>
      <circle cx="270" cy="130" r="58" fill="#ffffff" opacity="0.9"/>
      <circle cx="270" cy="130" r="24" fill="#4338ca"/>
      <path d="M270 118 v24 M258 130 h24" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
    </g>` }),

  // Referral program — connected network nodes + share arrow
  'how-to-build-a-tutor-referral-program': base({ from: '#16a34a', to: '#65a30d', label: 'Growth', motif: `
    <g transform="translate(780,140)" opacity="0.95">
      <line x1="60" y1="150" x2="200" y2="60" stroke="#ffffff" stroke-width="6" opacity="0.6"/>
      <line x1="60" y1="150" x2="200" y2="240" stroke="#ffffff" stroke-width="6" opacity="0.6"/>
      <line x1="200" y1="60" x2="320" y2="130" stroke="#ffffff" stroke-width="6" opacity="0.6"/>
      <line x1="200" y1="240" x2="320" y2="130" stroke="#ffffff" stroke-width="6" opacity="0.6"/>
      <circle cx="60" cy="150" r="42" fill="#ffffff" opacity="0.95"/>
      <circle cx="200" cy="60" r="30" fill="#ffffff" opacity="0.7"/>
      <circle cx="200" cy="240" r="30" fill="#ffffff" opacity="0.7"/>
      <circle cx="320" cy="130" r="34" fill="#ffffff" opacity="0.85"/>
    </g>` }),

  // Stripe Payment Link — a payment card with a chain link beside it
  'how-to-take-card-payments-with-a-stripe-payment-link': base({ from: '#4f46e5', to: '#0ea5e9', label: 'How-to', motif: `
    <g transform="translate(720,150)" opacity="0.95">
      <rect x="0" y="40" width="300" height="190" rx="22" fill="#ffffff" opacity="0.92"/>
      <rect x="0" y="80" width="300" height="38" fill="#4f46e5" opacity="0.35"/>
      <rect x="28" y="150" width="70" height="46" rx="8" fill="#4f46e5" opacity="0.55"/>
      <rect x="120" y="164" width="150" height="14" rx="7" fill="#4f46e5" opacity="0.30"/>
      <rect x="120" y="188" width="90" height="14" rx="7" fill="#4f46e5" opacity="0.30"/>
      <g transform="translate(230,230)" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round">
        <rect x="0" y="0" width="92" height="46" rx="23"/>
        <rect x="64" y="40" width="92" height="46" rx="23"/>
      </g>
    </g>` }),

  // Calendly alternatives (T-1141) — a calendar grid with one slot picked and three loose pieces around it
  'calendly-alternatives-for-tutors': base({ from: '#2563eb', to: '#4f46e5', label: 'Comparison', motif: `
    <g transform="translate(760,130)" opacity="0.95">
      <rect x="0" y="30" width="300" height="250" rx="22" fill="#ffffff" opacity="0.93"/>
      <rect x="0" y="30" width="300" height="58" rx="22" fill="#4f46e5" opacity="0.45"/>
      ${[0,1,2,3,4,5,6,7,8].map(i => `<rect x="${28 + (i % 3) * 86}" y="${112 + Math.floor(i / 3) * 52}" width="70" height="38" rx="8" fill="#4f46e5" opacity="${i === 4 ? 0.95 : 0.16}"/>`).join('')}
      <rect x="320" y="60" width="64" height="64" rx="14" fill="#ffffff" opacity="0.5"/>
      <rect x="320" y="146" width="64" height="64" rx="14" fill="#ffffff" opacity="0.35"/>
      <rect x="320" y="232" width="64" height="64" rx="14" fill="#ffffff" opacity="0.22"/>
    </g>` }),

  // Time zones (T-1141) — a clock face with a second, offset clock hand ring
  'schedule-tutoring-lessons-across-time-zones': base({ from: '#0f766e', to: '#2563eb', label: 'How-to', motif: `
    <g transform="translate(790,150)" opacity="0.95">
      <circle cx="120" cy="150" r="120" fill="#ffffff" opacity="0.93"/>
      <circle cx="120" cy="150" r="120" fill="none" stroke="#0f766e" stroke-width="8" opacity="0.35"/>
      <path d="M120 150 L120 70" stroke="#0f766e" stroke-width="9" stroke-linecap="round"/>
      <path d="M120 150 L180 180" stroke="#0f766e" stroke-width="9" stroke-linecap="round"/>
      <circle cx="120" cy="150" r="10" fill="#0f766e"/>
      <circle cx="270" cy="230" r="72" fill="#ffffff" opacity="0.55"/>
      <path d="M270 230 L270 186 M270 230 L300 246" stroke="#2563eb" stroke-width="7" stroke-linecap="round" fill="none"/>
    </g>` }),

  // Lesson packages (T-1141) — a stack of three tickets
  'tutoring-lesson-packages-explained': base({ from: '#b45309', to: '#db2777', label: 'Pricing', motif: `
    <g transform="translate(770,150)" opacity="0.95">
      ${[0,1,2].map(i => `<g transform="translate(${i * 26},${i * 62})"><rect x="0" y="0" width="290" height="110" rx="16" fill="#ffffff" opacity="${[0.4,0.65,0.93][i]}"/><circle cx="0" cy="55" r="16" fill="#b45309" opacity="0.5"/><circle cx="290" cy="55" r="16" fill="#b45309" opacity="0.5"/><line x1="86" y1="14" x2="86" y2="96" stroke="#b45309" stroke-width="3" stroke-dasharray="7 6" opacity="0.5"/><rect x="112" y="38" width="130" height="14" rx="7" fill="#b45309" opacity="0.4"/><rect x="112" y="64" width="86" height="14" rx="7" fill="#b45309" opacity="0.25"/></g>`).join('')}
    </g>` }),

  // Real hourly rate (T-1143) — one tall bar and a shorter one beside it, with a coin
  'real-hourly-rate-for-tutors': base({ from: '#047857', to: '#0f766e', label: 'Pricing', motif: `
    <g transform="translate(770,130)" opacity="0.95">
      <rect x="0" y="40" width="110" height="240" rx="14" fill="#ffffff" opacity="0.93"/>
      <rect x="150" y="150" width="110" height="130" rx="14" fill="#ffffff" opacity="0.6"/>
      <rect x="150" y="150" width="110" height="50" rx="14" fill="#047857" opacity="0.35"/>
      <rect x="300" y="110" width="110" height="170" rx="14" fill="#ffffff" opacity="0.4"/>
      <circle cx="205" cy="96" r="40" fill="#ffffff" opacity="0.9"/>
      <circle cx="205" cy="96" r="28" fill="none" stroke="#047857" stroke-width="6" opacity="0.6"/>
      <line x1="-20" y1="280" x2="430" y2="280" stroke="#ffffff" stroke-width="4" opacity="0.7"/>
    </g>` }),

  // Reschedule requests (T-1143) — a calendar tile with an arrow moving a lesson block to another day
  'how-to-handle-tutoring-reschedule-requests': base({ from: '#4338ca', to: '#0e7490', label: 'Operations', motif: `
    <g transform="translate(760,140)" opacity="0.95">
      <rect x="0" y="20" width="400" height="250" rx="22" fill="#ffffff" opacity="0.92"/>
      <rect x="0" y="20" width="400" height="54" rx="22" fill="#4338ca" opacity="0.4"/>
      ${[0,1,2,3,4,5,6,7,8,9].map(i => `<rect x="${24 + (i % 5) * 72}" y="${96 + Math.floor(i / 5) * 76}" width="58" height="56" rx="10" fill="#4338ca" opacity="${i === 1 ? 0.12 : 0.16}"/>`).join('')}
      <rect x="96" y="96" width="58" height="56" rx="10" fill="none" stroke="#4338ca" stroke-width="4" stroke-dasharray="6 5" opacity="0.7"/>
      <rect x="312" y="172" width="58" height="56" rx="10" fill="#4338ca" opacity="0.95"/>
      <path d="M160 112 C 230 40, 300 60, 330 160" stroke="#0e7490" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.9"/>
      <path d="M330 160 l-14 -16 m14 16 l16 -12" stroke="#0e7490" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.9"/>
    </g>` }),

  // Asking for payment (T-1143) — a message bubble with a check mark and a small bill
  'how-to-ask-for-tutoring-payment': base({ from: '#b45309', to: '#be123c', label: 'Payments', motif: `
    <g transform="translate(770,130)" opacity="0.95">
      <rect x="0" y="40" width="270" height="170" rx="24" fill="#ffffff" opacity="0.93"/>
      <path d="M40 210 L40 262 L96 210 Z" fill="#ffffff" opacity="0.93"/>
      <rect x="34" y="78" width="170" height="14" rx="7" fill="#b45309" opacity="0.4"/>
      <rect x="34" y="108" width="200" height="14" rx="7" fill="#b45309" opacity="0.25"/>
      <rect x="34" y="138" width="120" height="14" rx="7" fill="#b45309" opacity="0.25"/>
      <rect x="250" y="150" width="170" height="130" rx="16" fill="#ffffff" opacity="0.6"/>
      <circle cx="335" cy="205" r="30" fill="#047857" opacity="0.75"/>
      <path d="M319 205 l11 12 l21 -25" stroke="#ffffff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // Tool stack (T-1143) — five loose app tiles gathering into one
  'tutoring-tech-stack-for-online-tutors': base({ from: '#6d28d9', to: '#2563eb', label: 'Software', motif: `
    <g transform="translate(760,130)" opacity="0.95">
      ${[[0,10],[110,0],[220,26],[40,130],[170,150]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="86" height="86" rx="18" fill="#ffffff" opacity="${[0.5,0.4,0.6,0.35,0.5][i]}"/>`).join('')}
      <rect x="150" y="250" width="200" height="60" rx="16" fill="#ffffff" opacity="0.93"/>
      <rect x="176" y="272" width="148" height="14" rx="7" fill="#6d28d9" opacity="0.45"/>
    </g>` }),

  // Tutor bio (T-1166) — a profile card: a round photo spot, a name line, three text lines and a button
  'how-to-write-a-tutor-bio': base({ from: '#0f766e', to: '#4338ca', label: 'How-to', motif: `
    <g transform="translate(770,120)" opacity="0.95">
      <rect x="0" y="0" width="340" height="330" rx="26" fill="#ffffff" opacity="0.93"/>
      <circle cx="70" cy="74" r="38" fill="#0f766e" opacity="0.35"/>
      <rect x="130" y="52" width="150" height="16" rx="8" fill="#4338ca" opacity="0.55"/>
      <rect x="130" y="82" width="100" height="12" rx="6" fill="#4338ca" opacity="0.25"/>
      <rect x="34" y="148" width="270" height="14" rx="7" fill="#0f766e" opacity="0.35"/>
      <rect x="34" y="178" width="240" height="14" rx="7" fill="#0f766e" opacity="0.25"/>
      <rect x="34" y="208" width="200" height="14" rx="7" fill="#0f766e" opacity="0.25"/>
      <rect x="34" y="262" width="150" height="42" rx="21" fill="#4338ca" opacity="0.85"/>
      <path d="M300 20 l8 8 l16 -18" stroke="#047857" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // Invoice template (T-1167) — an invoice page: title bar, three rows, a total line and a download arrow
  'free-tutoring-invoice-template': base({ from: '#0369a1', to: '#4338ca', label: 'Payments', motif: `
    <g transform="translate(790,110)" opacity="0.95">
      <rect x="0" y="0" width="300" height="360" rx="22" fill="#ffffff" opacity="0.93"/>
      <rect x="28" y="30" width="120" height="22" rx="8" fill="#4338ca" opacity="0.6"/>
      <rect x="28" y="80" width="244" height="12" rx="6" fill="#0369a1" opacity="0.25"/>
      ${[0,1,2].map(i => `<rect x="28" y="${122 + i * 44}" width="244" height="30" rx="6" fill="#4338ca" opacity="0.12"/><rect x="38" y="${132 + i * 44}" width="130" height="10" rx="5" fill="#4338ca" opacity="0.4"/><rect x="214" y="${132 + i * 44}" width="48" height="10" rx="5" fill="#4338ca" opacity="0.4"/>`).join('')}
      <rect x="150" y="272" width="122" height="14" rx="7" fill="#047857" opacity="0.55"/>
      <rect x="28" y="306" width="90" height="30" rx="15" fill="#4338ca" opacity="0.85"/>
      <circle cx="268" cy="326" r="26" fill="#047857"/>
      <path d="M268 312 v20 m-9 -8 l9 9 l9 -9" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // Online whiteboard (T-1168) — a board with a drawn curve and a pen, a check mark in the corner
  'online-whiteboard-for-tutoring': base({ from: '#047857', to: '#1d4ed8', label: 'Software', motif: `
    <g transform="translate(760,120)" opacity="0.95">
      <rect x="0" y="0" width="360" height="270" rx="22" fill="#ffffff" opacity="0.93"/>
      <path d="M40 200 C 100 60, 170 60, 200 140 S 290 210, 320 70" stroke="#1d4ed8" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.7"/>
      <path d="M40 232 L150 232" stroke="#047857" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.5"/>
      <rect x="230" y="248" width="120" height="14" rx="7" fill="#9ca3af" opacity="0.55"/>
      <rect x="196" y="300" width="170" height="16" rx="8" fill="#ffffff" opacity="0.85" transform="rotate(-18 280 308)"/>
      <circle cx="326" cy="34" r="22" fill="#047857"/>
      <path d="M316 34 l7 8 l14 -16" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // Tutor taxes (T-1170) — a form page with lines, a coin and a check mark
  'do-tutors-have-to-pay-taxes': base({ from: '#374151', to: '#0f766e', label: 'Business', motif: `
    <g transform="translate(790,110)" opacity="0.95">
      <rect x="0" y="0" width="300" height="370" rx="20" fill="#ffffff" opacity="0.93"/>
      <rect x="28" y="30" width="110" height="20" rx="8" fill="#0f766e" opacity="0.6"/>
      ${[0,1,2,3,4].map(i => `<rect x="28" y="${86 + i * 40}" width="244" height="12" rx="6" fill="#374151" opacity="${i % 2 ? 0.2 : 0.32}"/>`).join('')}
      <rect x="28" y="304" width="120" height="30" rx="15" fill="#0f766e" opacity="0.8"/>
      <circle cx="244" cy="320" r="34" fill="#fbbf24"/>
      <text x="244" y="334" font-family="Segoe UI, Arial" font-size="40" font-weight="800" fill="#92400e" text-anchor="middle">$</text>
      <circle cx="262" cy="30" r="22" fill="#047857"/>
      <path d="M252 30 l7 8 l14 -16" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // Online tutoring jobs (T-1192) — three job cards with a pay tag and one ticked
  'online-tutoring-jobs': base({ from: '#334155', to: '#0e7490', label: 'Growth', motif: `
    <g transform="translate(760,96)" opacity="0.96">
      ${[0,1,2].map(i => `<g transform="translate(0,${i * 132})">
        <rect x="0" y="0" width="340" height="108" rx="18" fill="#ffffff" opacity="0.93"/>
        <circle cx="48" cy="54" r="24" fill="#0e7490" opacity="${0.35 + i * 0.2}"/>
        <rect x="92" y="34" width="120" height="14" rx="7" fill="#334155" opacity="0.5"/>
        <rect x="92" y="60" width="170" height="12" rx="6" fill="#334155" opacity="0.22"/>
        <rect x="256" y="28" width="64" height="30" rx="15" fill="#fbbf24"/>
        <text x="288" y="49" font-family="Segoe UI, Arial" font-size="18" font-weight="800" fill="#92400e" text-anchor="middle">$</text>
      </g>`).join('')}
      <circle cx="326" cy="20" r="22" fill="#047857"/>
      <path d="M316 20 l7 8 l14 -16" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // Tutor resume (T-1193) — a resume page with a header block, lines and a ticked box
  'tutor-resume': base({ from: '#3f3f46', to: '#b45309', label: 'Growth', motif: `
    <g transform="translate(800,90)" opacity="0.96">
      <rect x="0" y="0" width="290" height="400" rx="18" fill="#ffffff" opacity="0.94"/>
      <circle cx="52" cy="58" r="26" fill="#b45309" opacity="0.55"/>
      <rect x="92" y="40" width="150" height="16" rx="8" fill="#3f3f46" opacity="0.55"/>
      <rect x="92" y="66" width="100" height="12" rx="6" fill="#3f3f46" opacity="0.25"/>
      ${[0,1,2,3,4,5].map(i => `<rect x="28" y="${120 + i * 40}" width="${i % 3 === 2 ? 160 : 230}" height="12" rx="6" fill="#3f3f46" opacity="${i % 2 ? 0.2 : 0.32}"/>`).join('')}
      <circle cx="262" cy="20" r="22" fill="#047857"/>
      <path d="M252 20 l7 8 l14 -16" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // IELTS Speaking Part 2 (T-1194) — a speech bubble, a timer and a tick
  'ielts-speaking-part-2-topics': base({ from: '#1e3a5f', to: '#0f766e', label: 'Teaching', motif: `
    <g transform="translate(780,100)" opacity="0.96">
      <path d="M20 0 H300 a24 24 0 0 1 24 24 V200 a24 24 0 0 1 -24 24 H150 L80 290 V224 H20 a24 24 0 0 1 -24 -24 V24 A24 24 0 0 1 20 0 Z" fill="#ffffff" opacity="0.94"/>
      ${[0,1,2].map(i => `<rect x="28" y="${40 + i * 44}" width="${i === 2 ? 150 : 250}" height="12" rx="6" fill="#1e3a5f" opacity="${i % 2 ? 0.2 : 0.34}"/>`).join('')}
      <circle cx="250" cy="340" r="54" fill="#ffffff" opacity="0.94"/>
      <circle cx="250" cy="340" r="40" fill="none" stroke="#0f766e" stroke-width="8"/>
      <path d="M250 340 V312 M250 340 L268 352" stroke="#1e3a5f" stroke-width="7" stroke-linecap="round"/>
      <circle cx="316" cy="12" r="22" fill="#047857"/>
      <path d="M306 12 l7 8 l14 -16" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // Online tutoring statistics (T-1196) — three bars of different heights, a magnifying glass and a tick
  'online-tutoring-statistics': base({ from: '#3730a3', to: '#0f766e', label: 'Business', motif: `
    <g transform="translate(770,90)" opacity="0.96">
      <rect x="0" y="0" width="330" height="340" rx="20" fill="#ffffff" opacity="0.94"/>
      <rect x="40" y="200" width="56" height="100" rx="8" fill="#3730a3" opacity="0.40"/>
      <rect x="126" y="130" width="56" height="170" rx="8" fill="#3730a3" opacity="0.60"/>
      <rect x="212" y="70" width="56" height="230" rx="8" fill="#3730a3" opacity="0.85"/>
      <rect x="40" y="316" width="228" height="8" rx="4" fill="#3730a3" opacity="0.25"/>
      <circle cx="250" cy="372" r="46" fill="none" stroke="#ffffff" stroke-width="12" opacity="0.95"/>
      <path d="M284 406 L324 446" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.95"/>
      <circle cx="318" cy="12" r="22" fill="#047857"/>
      <path d="M308 12 l7 8 l14 -16" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),

  // ESL speaking activities (T-1197) — two speech bubbles, a timer and a tick
  'esl-speaking-activities': base({ from: '#0f766e', to: '#6d28d9', label: 'Teaching', motif: `
    <g transform="translate(760,90)" opacity="0.96">
      <path d="M20 0 H250 a22 22 0 0 1 22 22 V150 a22 22 0 0 1 -22 22 H110 L56 214 V172 H20 a22 22 0 0 1 -22 -22 V22 A22 22 0 0 1 20 0 Z" fill="#ffffff" opacity="0.94"/>
      ${[0,1].map(i => `<rect x="26" y="${36 + i * 40}" width="${i ? 120 : 200}" height="12" rx="6" fill="#0f766e" opacity="${i ? 0.2 : 0.34}"/>`).join('')}
      <path d="M340 220 H110 a22 22 0 0 0 -22 22 V350 a22 22 0 0 0 22 22 H160 L214 414 V372 H340 a22 22 0 0 0 22 -22 V242 A22 22 0 0 0 340 220 Z" fill="#ffffff" opacity="0.82"/>
      ${[0,1].map(i => `<rect x="124" y="${258 + i * 40}" width="${i ? 110 : 190}" height="12" rx="6" fill="#6d28d9" opacity="${i ? 0.2 : 0.34}"/>`).join('')}
      <circle cx="316" cy="12" r="22" fill="#047857"/>
      <path d="M306 12 l7 8 l14 -16" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` }),
}

const only =process.argv.slice(2) // optional: draw only the heroes named on the command line, so the older files are not touched
const out = []
for (const [slug, svg] of Object.entries(HEROES)) {
  if (only.length && !only.includes(slug)) continue
  const buf = Buffer.from(svg)
  await sharp(buf).resize(1200, 630).avif({ quality: 58 }).toFile(`public/blog/${slug}-hero.avif`)
  await sharp(buf).resize(1200, 630).webp({ quality: 76 }).toFile(`public/blog/${slug}-hero.webp`)
  out.push(slug)
}
console.log('generated heroes:', out.join(', '))
