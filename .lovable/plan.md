

## Add "Point of Interest" Classification

Add `poi` as a new location/pin type across all relevant locations in the codebase, with an exclamation mark (`❗`) as its map icon.

### Changes

| File | Change |
|------|--------|
| `src/pages/Admin.tsx` | Add `"poi"` to the `LOCATION_TYPES` array |
| `src/components/Map/TeacherTools.tsx` | Add `{ type: "poi", label: "POI", icon: AlertCircle }` to `PIN_ICONS` array (import `AlertCircle` from lucide-react) |
| `src/hooks/usePinMarkers.ts` | Add `poi: "❗"` to `ICON_MAP` |
| `src/hooks/useCustomPinMarkers.ts` | Add `poi: "❗"` to `ICON_MAP` |

Four files, one-line additions each. No database changes needed — `location_type` and `icon_type` are free-text string columns.

