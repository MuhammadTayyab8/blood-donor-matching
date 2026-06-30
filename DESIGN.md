# BloodLink AI — Design System

A modern SaaS command center for emergency blood coordination. Inspired by Linear, Vercel, and Stripe Dashboard — not hospital portals or NGO templates.

---

## 1. Design Philosophy

**Concept:** Emergency Response Command Center
**Tone:** Calm authority. Clinical precision with human warmth.
**Reference points:** Linear (density + speed), Vercel (clean light theme), Stripe Dashboard (data clarity), Datadog (status indicators).

**Principles**
- **Clarity over decoration** — every pixel earns its place. Data first, chrome second.
- **Status is the hero** — color is reserved to signal state (urgent / confirmed / pending). Never decorative.
- **Quiet by default, loud when it matters** — neutral surfaces let red/amber/emerald cut through.
- **Operator speed** — keyboard-friendly, dense tables, scannable lists. Built for people under time pressure.

---

## 2. Color Palette

Light theme only. All values are defined as semantic tokens in `src/styles.css` (oklch) and consumed via Tailwind utilities (`bg-primary`, `text-foreground`, etc.). Never hardcode hex in components.

| Role           | Token                   | Hex       | Usage                                          |
| -------------- | ----------------------- | --------- | ---------------------------------------------- |
| Primary        | `--primary`             | `#DC2626` | Brand red. CTAs, urgent indicators, logo mark. |
| Success        | `--success` / secondary | `#10B981` | Confirmed donors, completed donations.         |
| Warning        | `--warning`             | `#F59E0B` | Pending responses, awaiting confirmation.      |
| Background     | `--background`          | `#FAFAFA` | App canvas.                                    |
| Card / Surface | `--card`                | `#FFFFFF` | Panels, modals, table rows.                    |
| Foreground     | `--foreground`          | `#111827` | Body and heading text.                         |
| Muted text     | `--muted-foreground`    | `#6B7280` | Captions, metadata, labels.                    |
| Border         | `--border`              | `#E5E7EB` | Hairlines, dividers, input outlines.           |

**Rules**
- Red is reserved for: primary CTA, logo, critical priority badges, active nav indicator.
- Never use red for decorative gradients or backgrounds.
- Status colors always appear with a subtle tinted background (e.g. `bg-success/10 text-success`) for badges.

---

## 3. Typography

| Use          | Font                  | Weight   | Size    | Tracking |
| ------------ | --------------------- | -------- | ------- | -------- |
| Display / H1 | Inter / system-ui     | 600      | 28–32px | -0.02em  |
| H2 section   | Inter                 | 600      | 20px    | -0.01em  |
| H3 card      | Inter                 | 600      | 16px    | -0.01em  |
| Body         | Inter                 | 400      | 14px    | normal   |
| Caption      | Inter                 | 500      | 12px    | normal   |
| Mono / IDs   | JetBrains Mono / mono | 500      | 12–13px | normal   |

Use mono for: request numbers (`#231`), donor IDs, timestamps in logs, hashes.

---

## 4. Spacing & Layout

- **Base unit:** 4px. Use Tailwind scale (`gap-2`, `p-4`, `space-y-6`).
- **Page padding:** `px-6 py-6` (24px). Cards: `p-5` or `p-6`.
- **Sidebar width:** 240px collapsed to icon-only at md.
- **Max content width:** none for dashboard pages (full-bleed tables). 1200px for settings/forms.
- **Card radius:** `rounded-lg` (8px). Buttons: `rounded-md` (6px). Badges: `rounded-full`.
- **Shadows:** minimal. `shadow-sm` for cards. No drop shadows on hover — use border color shift instead.

---

## 5. Components

### Sidebar
- Fixed left, white surface, `border-r border-border`.
- Brand row: 🩸 `BloodLink AI` in semibold.
- Nav items: 14px, `text-muted-foreground`, active = `bg-primary/5 text-primary` with 2px left red bar.
- Sections: Dashboard, Blood Requests, Donors, Hospitals, AI Activity, Analytics, Notifications, Settings.

### Header
- 56px height, white, bottom border.
- Left: breadcrumb / page title. Right: search (⌘K), notifications bell with red dot, user avatar.

### Cards / Stat tiles
- White, `border border-border`, `rounded-lg`, `p-5`.
- Label in `text-muted-foreground text-xs uppercase tracking-wide`.
- Value in `text-2xl font-semibold text-foreground`.
- Delta in success/warning color, small.

### Tables
- Zebra-free. Row hover = `bg-muted/40`.
- Header: `text-xs font-medium text-muted-foreground uppercase`.
- Dense rows (48px). Right-align numbers.

### Badges (status)
| State     | Class                                      |
| --------- | ------------------------------------------ |
| Urgent    | `bg-primary/10 text-primary`               |
| Confirmed | `bg-success/10 text-success`               |
| Pending   | `bg-warning/10 text-warning`               |
| Neutral   | `bg-muted text-muted-foreground`           |

### Buttons
- **Primary:** `bg-primary text-primary-foreground hover:bg-primary/90`. Reserved for one action per view.
- **Secondary:** `border border-border bg-card hover:bg-muted`.
- **Ghost:** transparent, for table row actions.
- **Destructive:** same as primary (red is already destructive in this palette).

### Inputs
- White, `border-border`, `rounded-md`, 40px height. Focus ring: `ring-2 ring-primary/20 border-primary`.

---

## 6. Iconography

- **Library:** `lucide-react` only. 16px in dense UI, 20px in headers, 1.5 stroke.
- Never mix icon libraries. Never use emoji as UI icons (🩸 is allowed only in the wordmark).

---

## 7. Motion

- **Duration:** 150ms (micro), 250ms (panel/modal), 400ms (page).
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (standard ease-out).
- Reserve motion for: sidebar collapse, modal/sheet entry, toast, AI activity feed item insert (slide-in + fade).
- No parallax, no decorative scroll animations.

---

## 8. Page Patterns

| Page          | Pattern                                                              |
| ------------- | -------------------------------------------------------------------- |
| Dashboard     | 4 stat tiles → split: live AI feed + active requests table.          |
| Blood Requests| Filter bar + dense table. Row click → detail page with timeline.     |
| Donors        | Searchable table + side filters (blood group, status, trust score).  |
| Hospitals     | Card grid (logo, name, active requests, response rate).              |
| AI Activity   | Chronological feed grouped by agent (Intake / Ranking / Wave / etc). |
| Analytics     | Chart grid using `recharts` with muted axes and primary-red lines.   |
| Notifications | Inbox-style list, unread = white card + left red bar.                |
| Settings      | Two-column: section nav + form panel.                                |
| Login         | Split screen: form left, brand panel right with live AI feed.        |

---

## 9. Voice & Microcopy

- Active voice, present tense. "Ahmed accepted." not "Has been accepted."
- Numbers before words: `4.2m avg match time`, `98% response rate`.
- Use `#231` (mono) for request numbers in copy.
- Empty states: one sentence + one CTA. No illustrations.

---

## 10. Do / Don't

**Do**
- Keep surfaces white on `#FAFAFA` canvas.
- Use red only for action and urgency.
- Lean on whitespace and hairline borders.

**Don't**
- Add purple/indigo gradients, glassmorphism, or AI-shimmer effects.
- Use red backgrounds for large surfaces (hero, sidebar).
- Introduce a second font family beyond Inter + mono.
- Add a dark theme unless explicitly requested.
