# KiraayaBook PWA Design System

## Product Identity

KiraayaBook is a mobile-first Progressive Web App for PG owners, hostel owners, and small property managers.

The experience should feel like a polished installed mobile application while remaining true to modern web standards.

Users should never feel like they are using a desktop dashboard on a phone.

Inspiration:

* Airbnb Host
* Google Home
* PhonePe Business
* Razorpay Dashboard (Mobile)
* Notion Calendar

Avoid:

* Admin dashboard appearance
* Enterprise software aesthetics
* Desktop-first layouts
* Excessive whitespace
* Generic CRUD screens

---

## Design Principles

1. Mobile-first always
2. Clarity over creativity
3. Fast actions over complex workflows
4. Information visible at a glance
5. Every screen should provide value immediately

---

## Mobile Layout Rules

* Design for 390px width first
* Support 360px–430px widths
* Maximum content width: 100%
* Use safe-area padding
* Avoid horizontal scrolling
* Content should feel dense but never crowded

Avoid:

* Desktop dashboard grids
* Sidebars
* Multi-column layouts
* Large empty sections

---

## Spacing

Screen Padding:

* 16px–20px

Card Padding:

* 16px

Section Spacing:

* 24px

Component Spacing:

* 12px

List Item Spacing:

* 8px

---

## Typography

Page Title:

* 28px
* Weight 700

Section Title:

* 18px
* Weight 600

Card Title:

* 16px
* Weight 600

Body Text:

* 14px
* Weight 400

Metadata:

* 12px–13px
* Weight 400

Avoid oversized headings that waste vertical space.

---

## Color System

Primary:
#111827

Accent:
#2563EB

Success:
#16A34A

Warning:
#F59E0B

Danger:
#EF4444

Background:
Use subtle surface variations rather than pure white everywhere.

Only one accent color should dominate the interface.

---

## Cards

Cards are the primary UI pattern.

Use:

* Rounded corners (16px–20px)
* Soft backgrounds
* Subtle shadows
* Clear hierarchy

Avoid:

* Heavy borders
* Excessive outlines
* Empty decorative cards

Every card should communicate information or provide an action.

---

## Information Density

Every screen must contain:

1. Context
2. Key metrics
3. Main content
4. Quick actions

Avoid:

* Blank screens
* Large empty areas
* Cards with little information

Users should understand the state of their PG within seconds.

---

## Navigation

Bottom navigation is the primary navigation pattern.

Tabs:

* Home
* Rooms
* Tenants
* Rent
* More

Navigation should always remain consistent across screens.

---

## PWA Interaction Patterns

Prefer:

* Bottom sheets
* Drawers
* Floating action buttons
* Pull-to-refresh
* Contextual menus
* Sticky actions

Avoid:

* Complex modal stacks
* Hover-based interactions
* Desktop dropdown patterns

---

## Forms

Forms should be optimized for mobile devices.

Prefer:

* Short forms
* Logical grouping
* Progressive disclosure

Avoid:

* Long scrolling forms
* Too many visible fields at once

Large forms should be broken into sections.

---

## Empty States

Never show a blank screen.

Every empty state should contain:

* Helpful explanation
* Clear action
* Encouraging guidance

Example:

No Tenants Yet

Add your first tenant to start tracking rent and occupancy.

[ Add Tenant ]

---

## Animations

Use subtle animations only.

Preferred duration:

150ms–250ms

Use:

* Page transitions
* Card press feedback
* Bottom sheet transitions
* Loading skeletons

Avoid:

* Flashy effects
* Excessive motion
* Decorative animations

---

## Screen Structure

Every screen should begin with:

1. Page title
2. Summary metrics
3. Primary content
4. Quick action

Example:

Rooms

2 Rooms
1 Occupied
1 Vacant

Room List

[ Add Room ]

Never start a screen directly with a raw list.

---

## Performance Rules

The application must feel instant.

Prefer:

* Optimistic updates
* Skeleton loaders
* Cached data
* Smooth scrolling

Avoid:

* Unnecessary loading spinners
* Full-page refreshes
* Blocking interactions

Users should feel the application responds immediately.
