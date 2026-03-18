

## Improve Navigation Across All Pages

### Problem
The MapPage (lesson editor) has no back button or navigation to other pages. Other pages have inconsistent navigation patterns — some have full headers, some have minimal back buttons, and the Index landing page header links are not auth-aware.

### Approach
Create a shared `AppHeader` component used across all pages, and add a back-to-dashboard button to the MapPage sidebar.

### Changes

**New file: `src/components/AppHeader.tsx`** — Reusable header with:
- BibleLands logo/name (links to `/` or `/dashboard` based on auth)
- Nav links: Dashboard, Explore, Library
- Auth-aware right side: Sign Out (if logged in) or Log In/Sign Up (if not)
- Admin link (if admin)
- Compact variant prop for tight layouts (MapPage)

**`src/pages/MapPage.tsx`** — Add a back button at the top of the left sidebar (above "Controls") that navigates to `/dashboard`. On mobile, include it in the MobileToolbar area.

**`src/pages/Dashboard.tsx`** — Replace inline header with `<AppHeader />`. Keep the "New Lesson" button in the main content area.

**`src/pages/Index.tsx`** — Replace inline header with `<AppHeader />` (unauthenticated variant shows Log In / Sign Up).

**`src/pages/Explore.tsx`** — Replace inline back button + header with `<AppHeader />`.

**`src/pages/Library.tsx`** — Replace inline header with `<AppHeader />`.

**`src/pages/Lessons.tsx`** — Replace inline back button with `<AppHeader />`.

### AppHeader Design
Consistent with existing styling — border-b, BookOpen icon, font-serif brand name. Nav links use ghost buttons. Active page is subtly highlighted. The component reads auth state from `useAuth()` and admin status from `useProfile()`.

```text
┌─────────────────────────────────────────────────────────┐
│ 📖 BibleLands   [Dashboard] [Explore] [Library]   [SignOut] │
└─────────────────────────────────────────────────────────┘
```

### MapPage Navigation
Since MapPage is full-screen with a sidebar, instead of a full header, add a small back arrow + "Dashboard" link at the very top of the left sidebar (above "Controls"). This preserves screen real estate while solving the navigation gap.

### Files

| File | Change |
|------|--------|
| `src/components/AppHeader.tsx` | New shared header component |
| `src/pages/MapPage.tsx` | Add back-to-dashboard link in sidebar |
| `src/pages/Dashboard.tsx` | Use `AppHeader` |
| `src/pages/Index.tsx` | Use `AppHeader` |
| `src/pages/Explore.tsx` | Use `AppHeader` |
| `src/pages/Library.tsx` | Use `AppHeader` |
| `src/pages/Lessons.tsx` | Use `AppHeader` |

