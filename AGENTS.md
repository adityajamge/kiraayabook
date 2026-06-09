<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design System

@Docs/MOBILE_DESIGN_SYSTEM.md

Before building any new page, component, or feature: read the design system above and apply it. Every decision — layout, spacing, typography, color, animation, skeleton, empty state — must conform to it. Do not invent patterns that aren't in the system.

## Design Checklist for New Pages

Every new page must have:
- Page title at 28px / font-bold
- Summary metrics card (dark `bg-gray-900` pill/card) immediately below the title
- Primary content (list, grid) after the summary
- Quick action (FAB or header `+` button)
- A matching `loading.tsx` whose structure mirrors the real page section-by-section
- An empty state with explanation + action button
- All conditionally-rendered sections (stats, summary cards) always mounted with skeleton inside — never toggled into existence after load

## CLS / Performance Rules

- Never use `{!loading && data.length > 0 && <Card>}` — always render the container; put skeleton content inside it
- Never use `window.location.reload()` — use `router.refresh()`
- Memoize all filtered lists and computed stats with `useMemo`
- Pre-fetch background data on page mount, not on user interaction
- Skeleton shapes must structurally match the real layout at the section level
