

## Replace BookOpen Icon with Custom SVG Logo

### Overview
Copy the uploaded SVG logo into the project and replace all BookOpen icon instances with it, sized appropriately per location.

### Changes

**1. Copy the SVG file**
- Copy `user-uploads://BibleLandsExplorerLogo_c8a020.svg` to `src/assets/logo.svg`

**2. Create a reusable Logo component** (`src/components/Logo.tsx`)
- Accepts `className` prop for sizing
- Imports the SVG as an `<img>` element

**3. Replace BookOpen in each file**

| File | Current | New |
|------|---------|-----|
| `src/components/AppHeader.tsx` | `<BookOpen className="h-5 w-5">` | `<Logo className="h-5 w-5">` — same toolbar size |
| `src/pages/Login.tsx` | `<BookOpen className="h-10 w-10">` | `<Logo className="h-40 w-40">` — ~4x larger |
| `src/pages/Signup.tsx` | `<BookOpen className="h-10 w-10">` | `<Logo className="h-40 w-40">` — same as login |
| `src/pages/Admin.tsx` | `<BookOpen className="h-6 w-6">` | `<Logo className="h-6 w-6">` — same admin size |
| `src/pages/Lessons.tsx` | `<BookOpen className="h-16 w-16">` | `<Logo className="h-16 w-16">` — keep same |
| `src/pages/Index.tsx` | BookOpen used as a feature card icon | Keep as-is (it represents "Guided Lessons" feature, not branding) |

### Files Changed

| File | Change |
|------|--------|
| `src/assets/logo.svg` | New file (copy from upload) |
| `src/components/Logo.tsx` | New reusable logo component |
| `src/components/AppHeader.tsx` | Replace BookOpen with Logo |
| `src/pages/Login.tsx` | Replace BookOpen with larger Logo |
| `src/pages/Signup.tsx` | Replace BookOpen with larger Logo |
| `src/pages/Admin.tsx` | Replace BookOpen with Logo |
| `src/pages/Lessons.tsx` | Replace BookOpen with Logo |

