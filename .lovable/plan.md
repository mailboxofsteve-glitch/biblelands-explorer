

## Add Location Types: Battle, Event, People

The `ICON_MAP` in the two marker hooks (`usePinMarkers.ts` for historical locations, `useCustomPinMarkers.ts` for teacher pins) needs the three new types. The custom pin markers hook already has `battle` and `tent`/`temple`, but the historical locations hook (`usePinMarkers`) is missing all three. Neither has `event` or `people`/`person`.

### Changes

#### 1. `src/hooks/usePinMarkers.ts` — Add 3 entries to `ICON_MAP`
```
battle: "⚔"
event: "📌"
people: "👥"
```

#### 2. `src/hooks/useCustomPinMarkers.ts` — Add 2 missing entries to `ICON_MAP`
```
event: "📌"
people: "👥"
```
(Already has `battle: "⚔"`)

These are the only two files that need changes. The `TeacherTools.tsx` PIN_ICONS list already includes battle, person, and event for the custom pin picker UI. The historical `locations` table uses `location_type` which will now render correctly with these new mappings.

