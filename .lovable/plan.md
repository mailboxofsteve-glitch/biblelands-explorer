

## Timeline Slider with Era Markers

Replace the vertical era button list with a horizontal timeline slider that shows era boundaries. Dragging or clicking the slider switches eras and updates overlays/pins accordingly.

### Design

```text
Desktop (bottom of sidebar or bottom of map):
┌─────────────────────────────────────────────┐
│ Patriarchs  Exodus  Judges  UK  DK  Exile NT EC │
│ ●───────────●───────●──────●──●──●─────●──●──●  │
│         ▲ (draggable thumb)                      │
└─────────────────────────────────────────────┘

Mobile: same slider in the bottom sheet or as a fixed bar above the mobile toolbar.
```

Each era occupies an equal segment. Era labels sit above the track with tick marks at boundaries. The active era segment is highlighted. Dragging the thumb past a boundary triggers `setEra()`.

### Files to create/modify

#### 1. New: `src/components/Map/TimelineSlider.tsx`
- Horizontal slider with `ERAS.length` stops (values 0–7).
- Renders era labels above the track with small tick marks at each stop.
- Active era label is highlighted (bold + accent color).
- On value change → calls `useMapStore.setEra(ERAS[value].id)`.
- Subscribes to `currentEra` from store so external changes (keyboard shortcuts, scene loads) keep it in sync.
- Uses Radix `Slider` primitive for accessibility, styled with custom track segments.
- Compact height (~50px total including labels).

#### 2. Modify: `src/pages/MapPage.tsx`
- Import and render `TimelineSlider` at the bottom of the left sidebar (replacing or alongside `EraSelector`).
- Keep `EraSelector` as-is for now (can remove later), or replace it entirely with the slider.

#### 3. Modify: `src/pages/Explore.tsx`
- Add `TimelineSlider` to the desktop sidebar and mobile sheet, replacing `EraSelector`.

#### 4. Modify: `src/components/Map/MobileToolbar.tsx`
- Add `TimelineSlider` in the controls sheet, replacing `EraSelector`.

### No backend changes needed
The slider is purely a UI control that maps to the existing `setEra()` store action. All overlay/pin filtering already reacts to era changes.

