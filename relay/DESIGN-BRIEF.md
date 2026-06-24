# Huru Design Brief — Full Redesign

## For use with Claude Design. Read this codebase first, then redesign every screen.

---

## 1. What Huru Is

Huru is a developer-facing REST API gateway for decentralized AI compute on the 0G Network. Developers get an API key, buy credits, and call OpenAI-compatible endpoints (chat completions, audio transcription, image generation) — all verified by Trusted Execution Environments (TEE). No wallets, no blockchain overhead.

**Tagline:** "AI inference on 0G"
**Audience:** Backend developers, startup founders, AI builders who want decentralized compute without crypto complexity.

---

## 2. Current Design System

### Colors (CSS custom properties)
```
Light mode:
  --og-bg: #FEFEFE (near-white background)
  --og-surface: #FFFFFF
  --og-surface-2: #F7F7F8
  --og-surface-3: #EFEFEF
  --og-border: rgba(0, 0, 0, 0.08)
  --og-black: #000000 (primary text + CTA fill)
  --og-text-2: #525252 (secondary text)
  --og-text-3: #9a9a9a (tertiary / muted)
  --og-green: #16a34a
  --og-red: #dc2626
  --og-code-bg: #0f0f1a (dark code blocks)

Dark mode:
  --og-bg: #0a0a0a
  --og-surface: #141414
  --og-surface-2: #1a1a1a
  --og-black: #f0f0f0
  --og-text-2: #a3a3a3
  --og-text-3: #666666
```

### Typography
- Font: Inter (400, 500, 600, 700, 800)
- Monospace: SFMono-Regular, Cascadia Code, Menlo
- Hero headline: `clamp(3.5rem, 8vw, 7rem)`, -0.05em tracking, 0.9 line-height
- Section headings: text-2xl to text-4xl, font-bold, tight tracking
- Body: 15px, relaxed leading
- Labels: 10-12px uppercase, 0.15-0.2em letter-spacing

### Spacing & Layout
- Max width: max-w-6xl (1152px)
- Horizontal padding: px-5 / sm:px-8 / lg:px-12
- Section gaps: gap-10 / sm:gap-28
- Border radius: rounded-xl to rounded-3xl
- Cards: border border-og-border, bg-og-surface

### Components
- **Pill navbar:** Floating, rounded-full, sticky top-4, blur backdrop, shrinks on scroll
- **CTA buttons:** Black fill (#0a0a0a), rounded-full, shimmer gradient on hover
- **Ghost buttons:** Border + transparent fill, blur backdrop
- **Feature cards:** Bento grid, cursor-tracking spotlight radial gradient on hover
- **Code blocks:** Dark (#0f0f1a) with terminal dots, tab switcher (curl/Python/Node)
- **Pricing cards:** 3-column grid, "Popular" badge, check-icon feature lists
- **Charts:** Recharts AreaChart + BarChart with dark tooltips

### Animation (GSAP + CSS)
- Hero: staggered word reveals, 3D flame logo with facet shimmer, orbiting particles, ember rise
- Scroll: fromTo fade-up on cards/sections via ScrollTrigger
- Hover: cursor spotlight, icon color inversion, shimmer sweep on buttons
- Marquee: infinite horizontal scroll for model pills (28s linear)

---

## 3. Current Pages

### Landing Page (/)
1. **Navbar** — floating pill with logo, "Beta" badge, Docs/Dashboard links, theme toggle, "Get started" CTA
2. **Hero** — giant "Huru" headline + beta sup, separator line, subtitle paragraph, 3 inline stats (< 200ms / 99.9% / 0 wallets), 2 CTAs ("Get your API key" + "Read the docs"), cinematic 3D flame with particle effects
3. **Geometry Section** — "How it works" with 3 isometric SVG illustrations: Verified inference, One API key, Built for speed
4. **Motion Panels** — "Built for developers, not crypto enthusiasts" — 4 bento feature cards (Verified by default, Standard API keys, Usage tracking, OpenAI-compatible)
5. **Footer** — minimal one-line with Docs/Dashboard links

**Missing from landing page (currently not rendered but components exist):**
- Models Marquee section
- Pricing section
- Stats strip
- Code quickstart block
- CTA banner + full footer with link columns

### Docs Page (/docs)
- Monolithic single page with all API documentation
- Custom primitive components (Badge, Endpoint, Param, Code, Note)
- Sidebar-less — pure vertical scroll
- Covers: Quickstart, Auth, Models, Credits, Consumer Billing, all API endpoints, Idempotency, Streaming, Rate Limits, Errors

### Dashboard (/dashboard)
- **Pre-auth state:** Centered card with Google OAuth + email magic link
- **Local demo mode:** Shows test API key, curl example, "Run demo request" button
- **Authenticated state:** Sidebar tabs (Overview, API Keys, Usage, Billing, Playground)
  - **Overview:** Project selector, credit balance, recent requests table
  - **API Keys:** Key display with copy, reveal/hide toggle
  - **Usage:** Line chart (credits/requests over time), bar chart (endpoint breakdown), burn rate card, verification rate badge
  - **Billing:** Credit pack cards (Starter through Scale, NGN pricing), Paystack checkout
  - **Playground:** Chat interface with message history, model selector, code snippet tabs

### Auth Pages
- Consumer sign-in (/auth/consumer/[path])
- OAuth callback handler

---

## 4. What's Wrong — Honest Assessment

### Visual Identity
- **Too generic.** The black/white monochrome palette with Inter is indistinguishable from hundreds of SaaS landing pages. There's no memorable color, no signature visual element beyond the flame logo.
- **The flame logo is strong but underutilized.** It's beautiful in the hero with its 3D faceted treatment, but it shrinks to a tiny navbar icon and disappears from the rest of the product. The prismatic/faceted aesthetic should be the design language, not just a hero trick.
- **No color accent.** Everything is grayscale. The green (#16a34a) and red (#dc2626) are only used for status indicators. There's no brand color that says "this is Huru."

### Landing Page
- **Hero is impressive but heavy.** 8 orbiting particles, 5 ember particles, 3 glow layers, lens flare, micro-shake — all running simultaneously. Beautiful on a MacBook Pro, potentially janky on a $300 laptop.
- **Geometry section SVGs are over-engineered.** 697 lines of hand-coded isometric SVGs with individual GSAP draw-in animations. Visually they're fine but the ROI on that complexity is low — most users will scroll past them.
- **Missing sections.** The pricing, marquee, stats, quickstart code, and CTA/footer components exist but aren't rendered on the page. The landing page feels incomplete — it ends abruptly after the feature cards.
- **No social proof.** No testimonials, no logos, no usage numbers, no GitHub stars. For a beta product asking developers to trust it with their AI inference, this is a gap.
- **Stats are aspirational.** "99.9% uptime" and "< 200ms avg latency" on a beta product with no public status page.

### Dashboard
- **The 1,439-line auth panel is doing too much.** Auth, project management, API keys, usage, billing, playground — all in one component. This creates a maintenance burden and makes it hard to give each section the design attention it deserves.
- **Tab navigation feels flat.** Plain text tabs with an underline indicator. No visual hierarchy between sections, no icons, no progress indicators.
- **Billing is NGN-only.** Credit packs are priced in Nigerian Naira. This is fine for the target market but the UI doesn't acknowledge it — no currency selector, no conversion info.
- **Playground is basic.** A simple chat input with hardcoded model. No parameter controls (temperature, max_tokens), no response timing, no credit cost preview.

### Docs
- **No sidebar navigation.** 771 lines of documentation in a single scrolling page. Finding a specific endpoint requires Ctrl+F. This doesn't scale.
- **No interactive examples.** Code samples are static. No "Try it" buttons, no response previews.
- **No versioning indicator.** API is in beta but there's no version badge or changelog link.

### Mobile
- **Navbar links are hidden below sm breakpoint.** Only the logo, theme toggle, and CTA are visible on mobile. No hamburger menu, no way to reach Docs from the mobile landing page nav.
- **Dashboard is not mobile-optimized.** The sidebar tab layout doesn't adapt. Charts and tables overflow.
- **Hero 3D logo is scaled but still runs all particle animations.** Performance concern on mobile.

### Technical
- **All pages are "use client".** The landing page, which is mostly static content, is a client component running GSAP. This means no SSR for the marketing content, slower FCP, and worse SEO.
- **No loading/skeleton states.** Dashboard data fetches show nothing while loading.
- **No error boundaries.** If a chart component fails, the entire dashboard crashes.

---

## 5. Design Direction — "Prismatic Infrastructure"

### Concept
Take the faceted flame logo's aesthetic and turn it into the entire design language. Huru sits at the intersection of clean developer tooling and decentralized infrastructure. The design should feel like **precision-cut glass** — minimal, sharp, with light playing across surfaces. Not crypto-bro neon. Not corporate gray. Something that feels engineered and trustworthy, with moments of unexpected beauty.

### Color System
Keep the monochrome base but introduce a **signature accent**: a warm amber/flame tone pulled from the logo's implied heat.

```
Primary accent:  #E8890C (warm amber — "huru flame")
Accent light:    #FBD38D (soft gold for highlights)
Accent subtle:   rgba(232, 137, 12, 0.08) (tinted surfaces)

Keep:
  Background:    #FEFEFE / #0a0a0a
  Surface:       #FFFFFF / #141414
  Text primary:  #000000 / #f0f0f0
  Text secondary: #525252 / #a3a3a3

Add:
  Success:       #10B981 (emerald, softer than current)
  Warning:       #F59E0B
  Error:         #EF4444
  Info/accent:   #E8890C
```

Dark mode: the amber becomes a glowing ember against the dark surfaces. Subtle `amber/5%` tints on hover states. The flame logo gets a faint amber glow.

### Typography
- **Keep Inter** but tighten usage: 400 for body, 600 for labels/UI, 700 for headings. Drop 800.
- **Introduce JetBrains Mono** for code blocks and technical values (API keys, credit amounts, request IDs). More readable than SFMono at small sizes.
- **Hero headline:** Reduce from 7rem max to 5rem max. The current size is overwhelming. Let the 3D logo carry the visual weight.

### Layout Principles
- **Wider max-width for dashboard:** Move from max-w-6xl to max-w-7xl. The dashboard is cramped.
- **Persistent sidebar on dashboard** instead of top tabs. Vertical nav with icons + labels. Collapses to icons on narrow viewports.
- **Landing page:** Full-width hero, then constrained content. Clear section rhythm with generous vertical spacing.
- **Card system:** Three tiers:
  1. `Surface` — flush with background, subtle border (current)
  2. `Elevated` — 1px border + shadow-sm, for interactive cards
  3. `Prominent` — border-accent + glow, for highlighted items (popular pricing tier, active nav)

### Motion
- **Reduce GSAP to scroll reveals only.** Remove the 3D flame particles, orbiting rings, and ember effects. Replace with a simpler, more elegant treatment: the flame SVG with a subtle CSS shimmer on facets (keep the `huru-f1` through `huru-f6` opacity animations, they're beautiful) and a slow `rotateY` drift. No particles. No lens flare.
- **Micro-interactions via CSS only.** Button press scales, card hover lifts, tab indicator slides. No GSAP for hover states.
- **Page transitions:** Subtle fade-in on route change using Next.js layout transitions.

---

## 6. Page-by-Page Redesign Specs

### Landing Page

**Section 1 — Hero**
- Split layout: left text, right 3D flame (keep this)
- Headline: "Decentralized AI, one API call away" (shorter, clearer value prop)
- Sub: "Drop-in REST endpoints for chat, speech, and image generation. TEE-verified. No wallets."
- Stats strip below subtitle: 3 compact stat badges
- Two CTAs: "Get API Key" (solid amber) + "Read Docs" (ghost)
- Right: Simplified flame — just the SVG with facet animations + single ambient glow. No particles.
- Background: subtle noise texture + faint radial gradient from upper-right

**Section 2 — Trusted By / Social Proof**
- "Trusted by developers building on 0G" with logo/avatar strip
- Even if early-stage, show the 0G Network logo, any partner logos, or developer count

**Section 3 — Code Quickstart**
- "Three lines to your first request"
- Dark code block with curl/Python/Node tabs (already built, just render it)
- Next to it: animated response preview showing the JSON coming back with `huru.verified: true` highlighted in amber

**Section 4 — How It Works**
- 3-step horizontal flow with connecting lines
- Simplified icons (not isometric SVGs — they're over-engineered)
- "Get a key" → "Make a request" → "Verified response"
- Each step: icon, title, one-line description

**Section 5 — Features Bento**
- Keep the 4-card bento layout but refine:
- Remove cursor-tracking spotlight (gimmick)
- Add the amber accent: icon backgrounds use amber/10% on hover
- Each card: icon (amber-tinted), title, description, subtle "Learn more →"

**Section 6 — Models Marquee**
- Render the existing marquee component
- Add section heading + count: "16+ models, one API key"

**Section 7 — Pricing**
- 3 columns with the existing plans but refreshed design
- Popular plan (Builder): amber border + "Popular" badge
- Feature lists with amber check icons
- Add a "Compare all features" expandable row

**Section 8 — CTA Banner**
- Full-width amber-tinted background (subtle)
- "Start building with Huru" + two CTAs
- Show the "100 free credits" (updated from 10) prominently

**Section 9 — Footer**
- 4-column layout with Product, Developers, Company, Legal
- Logo + tagline in the first column
- Copyright + social links at bottom

### Docs Page

**Layout:** Sidebar + content
- Left sidebar (240px): collapsible section nav with smooth scroll-to anchors
- Section groups: Getting Started, Authentication, Models, Credits, API Reference, Errors
- Active section highlighted with amber indicator
- Right content: same documentation content but with better component styling
- Sticky header showing current section breadcrumb
- "Try it" button next to each endpoint that opens a slide-over panel with an interactive request builder
- Search bar at top of sidebar (Cmd+K shortcut)

### Dashboard

**Layout:** Persistent left sidebar + main content area
- Sidebar: Logo at top, nav items with icons (Overview, API Keys, Usage, Billing, Playground, Docs), user/project selector at bottom
- Active item: amber background tint + bold text
- Sidebar collapses to icon-only below lg breakpoint

**Overview tab:**
- Top: Project name + environment badge (test/live) + credit balance (large, prominent)
- Quick actions row: "Copy API Key", "View Docs", "Buy Credits"
- Two-column below: Recent requests table (left), Usage sparkline + burn rate (right)
- If low credits: amber warning banner with "Top up" CTA

**API Keys tab:**
- Card per key: name, prefix display, created date, last used
- Copy button with confirmation animation
- "Reveal full key" toggle (shows for 10s then auto-hides)
- "Create new key" button at top
- "Revoke" with confirmation dialog

**Usage tab:**
- Date range selector (7d / 30d / 90d / custom)
- Main chart: credits used over time (area chart with amber gradient fill)
- Below: 3-column metric cards (Total requests, Total credits, Avg per request)
- Endpoint breakdown bar chart
- Verification rate donut chart
- Consumer breakdown table (if consumers exist)

**Billing tab:**
- Current balance: large number with credit icon
- Credit pack grid: 5 packs with clear pricing
- Purchase history table
- "Need more?" → custom volume inquiry CTA

**Playground tab:**
- Left: Chat interface with proper message bubbles (user = right-aligned, assistant = left-aligned)
- Right panel: Configuration
  - Model selector dropdown
  - Temperature slider (0-2)
  - Max tokens input
  - Stream toggle
- Below config: Live credit estimate ("This request will cost ~3 credits")
- Response metadata: latency, tokens used, credits charged, verification status
- "Copy as code" button that generates curl/fetch/python snippet for the current conversation

### Consumer Auth Page
- Clean centered card
- Project branding at top (project name from URL params)
- Google OAuth + email magic link
- "Powered by Huru" footer link

---

## 7. Interaction Details

### Button States
```
Default:   bg-amber-600, text-white, rounded-full, px-6 py-3
Hover:     bg-amber-700, shadow-md, scale-[1.01]
Active:    bg-amber-800, scale-[0.99]
Disabled:  bg-amber-600/50, cursor-not-allowed
Loading:   Spinner icon replaces text, same background
```

### Card Hover
```
Default:   border-og-border, shadow-none
Hover:     border-og-border-hover, shadow-sm, translateY(-1px)
Transition: 200ms ease-out
```

### Toast Notifications
- Slide in from top-right
- Auto-dismiss after 4s
- Types: success (green), error (red), info (amber), neutral (gray)
- "Copied to clipboard" → green toast with check icon

### Empty States
- Centered illustration + text + CTA
- "No requests yet" → flame icon + "Make your first API call" + code snippet
- "No consumers yet" → people icon + "Set up consumer billing" + docs link

### Loading States
- Skeleton pulses matching content shape
- Dashboard cards: gray shimmer rectangles
- Tables: animated row placeholders
- Charts: pulsing placeholder with axis lines

---

## 8. Responsive Breakpoints

```
Mobile (< 640px):
  - Single column everything
  - Navbar: logo + CTA only, hamburger menu for links
  - Hero: stacked, smaller headline (3rem), flame above text
  - Feature cards: vertical stack
  - Dashboard: bottom tab bar (mobile-native pattern), no sidebar
  - Charts: horizontal scroll

Tablet (640-1024px):
  - 2-column grids where applicable
  - Sidebar collapses to icons
  - Hero: side-by-side but smaller

Desktop (1024px+):
  - Full layouts as designed
  - Dashboard sidebar expanded
  - 3-column pricing grid
```

---

## 9. Accessibility Requirements

- All interactive elements must have visible focus rings (2px amber outline, 2px offset)
- Color contrast: WCAG AA minimum (4.5:1 for text, 3:1 for large text)
- Reduced motion: respect `prefers-reduced-motion` — disable all GSAP, marquee, and CSS animations
- Screen reader: proper heading hierarchy (h1 → h2 → h3), ARIA labels on icon-only buttons
- Keyboard navigation: all functionality accessible without mouse

---

## 10. Assets Available in Codebase

- Flame logo SVG (6 faceted paths) — `huru-icons.tsx > HuruLogo`
- 8 UI icons (Arrow, Shield, Key, Spark, Chart, Document, Terminal, plus inline SVGs in feature cards)
- Full dark mode token set
- GSAP registered and configured
- Recharts installed for dashboard charts
- Supabase auth integration (Google OAuth, magic link)
- Paystack payment integration
- next-themes for dark mode switching

---

## 11. Design Deliverables Needed

1. **Landing page** — Full responsive layout (mobile + desktop)
2. **Docs page** — With sidebar navigation
3. **Dashboard** — All 5 tabs (Overview, API Keys, Usage, Billing, Playground)
4. **Auth screens** — Sign in, consumer auth
5. **Component library** — Buttons, cards, inputs, badges, tables, modals, toasts
6. **Dark mode** — Every screen in both themes
7. **Empty + loading states** — For all dashboard views
8. **Error states** — 404, 500, rate limit, insufficient credits (402)

---

## 12. Technical Constraints

- Next.js 16 App Router (server components preferred for static content)
- Tailwind CSS v4
- Must support dark mode via `next-themes` class strategy
- Charts: Recharts (already installed)
- Animations: prefer CSS, use GSAP only for complex scroll-triggered sequences
- Must work in Chrome, Firefox, Safari (latest 2 versions)
- Bundle size matters — no heavy animation libraries beyond GSAP

---

## 13. Inspiration References

For the overall feel, think:
- **Linear** — Clean developer tool with personality
- **Vercel** — Dark-first, precise typography, subtle gradients
- **Stripe** — Information density done right, beautiful docs
- **Raycast** — Warm accent color against monochrome base
- **Resend** — Minimal SaaS with developer focus

But Huru should be warmer than all of these. The flame identity should come through — not as literal fire imagery, but as warmth in the color system, as angular/faceted shapes in the geometry, as the sense that there's energy behind the surface.

---

*This brief covers everything needed to redesign Huru end-to-end. Import this project's codebase to inherit the existing token system, then build from the direction above.*
