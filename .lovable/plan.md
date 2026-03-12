

## Problem

The "Map not ready" error on scene save has two causes:

1. **Misleading error message**: The guard in `handleSave` lumps together three different failure conditions (no map, no lessonId, no user) under a single "Map not ready" toast. The actual failure is likely an invalid `lessonId` (the console shows `":lessonId"` being sent to the database).

2. **Invalid lessonId reaching the page**: The route `/lesson/:lessonId` is being accessed with a literal colon string instead of a real UUID. This could happen from a stale bookmark, direct URL entry, or a navigation edge case.

## Fix

### `src/components/Map/SceneList.tsx` — Improve error handling in `handleSave`
- Split the single guard into specific checks with distinct error messages:
  - `!lessonId || lessonId.startsWith(':')` → "No lesson loaded — open a lesson from the dashboard first"
  - `!user` → "Please sign in to save scenes"  
  - `!map` → "Map not ready — please wait for it to load"

### `src/pages/MapPage.tsx` — Same fix for `handleSaveScene`
- Apply the same specific error messages to the save guard on line 50

### `src/pages/MapPage.tsx` — Guard against invalid lessonId
- If `lessonId` is missing or starts with `:`, show an informational banner or redirect back to `/dashboard` instead of rendering a broken map page

