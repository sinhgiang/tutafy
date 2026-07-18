// Generates on-brand blog hero images (SVG -> AVIF + WebP, 1200x630).
// Run: node scripts/gen-blog-images.mjs
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/blog', { recursive: true })

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
  <g transform="translate(64,64)">
    <rect x="0" y="0" width="40" height="40" rx="11" fill="#ffffff" opacity="0.95"/>
    <path d="M12 26 L20 12 L28 26 Z" fill="url(#g)"/>
    <text x="54" y="28" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">Tutafy</text>
  </g>
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
      <path d="M40 90 L20 12 L28 26 Z" fill="none"/>
      <path d="M60 70 L100 130 L60 130 L100 190" stroke="#0d9488" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
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
}

const out = []
for (const [slug, svg] of Object.entries(HEROES)) {
  const buf = Buffer.from(svg)
  await sharp(buf).resize(1200, 630).avif({ quality: 58 }).toFile(`public/blog/${slug}-hero.avif`)
  await sharp(buf).resize(1200, 630).webp({ quality: 76 }).toFile(`public/blog/${slug}-hero.webp`)
  out.push(slug)
}
console.log('generated heroes:', out.join(', '))
