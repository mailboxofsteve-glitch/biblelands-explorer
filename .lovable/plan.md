

## Plan: Editable Coordinates in Pin Drop Modal

### Change

Replace the static coordinate display (line 85-87) with two editable input fields for Latitude and Longitude, initialized from the clicked map coordinates.

### Implementation — Single file: `src/components/Map/PinDropModal.tsx`

1. Add two state variables initialized from `coords`:
   - `lng` initialized to `coords[0]`
   - `lat` initialized to `coords[1]`

2. Replace the static `<p>📍 ...</p>` with two side-by-side `<Input>` fields:
   - **Lat** (number input, step 0.0001)
   - **Lng** (number input, step 0.0001)
   - Show the icon type as a small label beside them

3. Update `handleSave` to use `[lng, lat]` instead of `coords` when inserting into the database.

