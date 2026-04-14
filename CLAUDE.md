# KiraciYonet — Project Guidelines

## Tech Stack
- **Framework:** React 19 + Vite 8 (SPA, no SSR)
- **Styling:** Tailwind CSS v4 + custom CSS variables for legacy components
- **Components:** shadcn/ui pattern (CVA + clsx + tailwind-merge) in `src/components/ui/`
- **Animations:** Motion (Framer Motion) — use `motion/react` import
- **Icons:** Lucide React — never use inline SVGs for new components
- **Backend:** Supabase (PostgreSQL + RLS + Auth)
- **Deploy:** Vercel (auto-deploy on push to master)
- **Language:** JavaScript (JSX), not TypeScript

## Design System — Kurumsal Kimlik
- **Primary (Teal):** `#025864` — sidebar, hero cards, headings, primary actions
- **Accent (Green):** `#00D47E` — success states, CTA buttons, badges, highlights
- **Dark Teal:** `#03363D` — gradients, dark backgrounds
- **Sidebar BG:** `#0B1D23`
- **Page BG:** `#F0F2F5`
- **Font:** Plus Jakarta Sans (Google Fonts) — weights 400, 500, 600, 700, 800

## Style Rules
- Always use Tailwind utility classes for new components, avoid writing custom CSS
- Use `style={{ color: 'var(--text)' }}` for colors that reference existing CSS variables
- Bold typography: prefer `font-extrabold` or `font-black` for headings, `tracking-tight` always
- Use `@/` path alias for imports (e.g., `@/components/ui/card`)
- Avoid generic card layouts — use asymmetric grids, varying card sizes
- Motion: stagger animations on page load, spring-based hover effects
- No Inter font override needed — it's already loaded globally

## File Structure
- `src/components/ui/` — shadcn/ui style reusable components (Card, Badge, Button)
- `src/components/` — app-level components (Sidebar, Topbar, Layout, AuthOverlay)
- `src/pages/` — route pages
- `src/lib/utils.js` — `cn()` utility for class merging
- `src/lib/supabase.js` — Supabase client
- `src/context/AuthContext.jsx` — auth state

## Migration Status
- Dashboard: migrated to Tailwind + Motion
- Sidebar, Topbar, AuthOverlay: still using legacy CSS (planned migration)
- Properties, TenantsList, RentPayments, PaymentHistory: still using legacy CSS
- `src/index.css` contains both Tailwind import and legacy CSS (~2200 lines)

## Skills Workflow
Every new feature, page, or significant change MUST follow this order:
1. **brainstorming** — clarifying questions → 2-3 approaches → design spec
2. **writing-plans** — implementation plan from approved spec
3. **frontend-design** — invoke during UI implementation for professional aesthetics

Never skip skills. For small UI tweaks, frontend-design alone may suffice.

## Build & Dev
- `npm run dev` — Vite dev server (localhost:5173)
- `npm run build` — production build
- Chunk size warning is expected (single bundle), not a blocker
