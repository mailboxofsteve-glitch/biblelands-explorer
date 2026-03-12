

## Add Missing Location Types to Admin

The `LOCATION_TYPES` array on line 21 of `src/pages/Admin.tsx` is missing `"battle"`, `"people"`, and `"event"`. These need to be added so the Type dropdown in the Add/Edit Location modal includes them.

### Change

**`src/pages/Admin.tsx` line 21** — expand the array:
```typescript
const LOCATION_TYPES = ["city", "mountain", "river", "region", "sea", "desert", "road", "battle", "people", "event"];
```

Single-line fix, no other files affected.

