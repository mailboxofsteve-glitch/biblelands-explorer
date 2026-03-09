

## Problem

Custom pins saved via the Pin Drop tool are inserted into the `pins` table, but **nothing ever fetches or renders them**. The `usePins` hook only queries the `locations` table (preloaded biblical sites). There is no code to read from `pins` and display those markers on the map.

## Plan

### 1. Create `useCustomPins` hook (`src/hooks/useCustomPins.ts`)

- Fetch rows from the `pins` table where `created_by = auth.uid()` (or by `lesson_id` from the current route)
- Parse the `coordinates` JSONB field (`[lng, lat]`) into a typed array
- Re-fetch whenever `customPinIds` in the map store changes (to pick up newly added pins)
- Return an array of custom pins with `id`, `label`, `popup_title`, `popup_body`, `icon_type`, `coordinates`, `scripture_refs`

### 2. Create `useCustomPinMarkers` hook (`src/hooks/useCustomPinMarkers.ts`)

- Similar to `usePinMarkers` but for custom pins from the `pins` table
- Creates Mapbox markers with the same teardrop style, using the `icon_type` field for the icon
- Shows popup with `popup_title`, `popup_body`, and `scripture_refs`
- Supports selection via the map store

### 3. Integrate in `MapCanvas.tsx`

- Call `useCustomPins(lessonId)` to fetch custom pins
- Call `useCustomPinMarkers(map, customPins, ...)` to render them
- Pass `lessonId` down from `MapPage` as a prop to `MapCanvas`

### 4. Update `MapPage.tsx`

- Pass `lessonId` prop to `MapCanvas`

This keeps preloaded location pins and custom teacher pins as separate data flows while rendering both on the same map.

