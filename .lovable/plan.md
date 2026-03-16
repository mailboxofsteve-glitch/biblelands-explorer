

## Remove Tooltip Box Styling — Display as Plain Text

Both tooltip styles currently use a dark background, border, padding, and border-radius creating a "box" look. We'll strip those to show just plain text in dark brown.

### Changes

**`src/hooks/usePinMarkers.ts`** (line 52-61) — Update tooltip CSS:
- Remove `background`, `border`, `padding`, `border-radius`
- Change `color` from `#e8d5a0` to `#3a2a1a` (dark brown)
- Add `text-shadow: 0 1px 2px rgba(255,255,255,0.3)` for legibility against the map

**`src/hooks/useCustomPinMarkers.ts`** (line 50-58) — Same changes:
- Remove `background`, `border`, `padding`, `border-radius`
- Change `color` to `#3a2a1a`
- Add same text-shadow

Both tooltips become:
```css
position: absolute; bottom: 36px; left: 50%;
transform: translateX(-50%);
color: #3a2a1a;
font-size: 11px; white-space: nowrap;
pointer-events: none; text-shadow: 0 1px 2px rgba(255,255,255,0.3);
opacity: ...; transition: opacity 0.15s; z-index: 10;
```

