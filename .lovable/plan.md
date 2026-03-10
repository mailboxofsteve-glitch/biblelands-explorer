

## Upgrade Coastline Resolution for Better Clipping

### Problem
The current land boundary data uses **Natural Earth 110m** resolution (`ne_110m_land`), which is the coarsest available. This produces visibly jagged, imprecise coastlines when clipping polygons — the Persian Gulf and Mediterranean shorelines don't match the actual map terrain.

### Solution
Replace `src/data/land-boundary.json` with **Natural Earth 50m** land polygons, cropped to the Bible Lands region (roughly 24E-56E, 12N-44N). This gives ~5x more coastline detail while keeping file size manageable by only including the relevant geographic area.

### Implementation

**1. Replace `src/data/land-boundary.json`**
- Source: Natural Earth 50m land polygons (`ne_50m_land`)
- Crop to bounding box covering the Bible Lands region (Mediterranean to Persian Gulf)
- This will produce more accurate coastline vertices along the Red Sea, Persian Gulf, and eastern Mediterranean
- Estimated size: ~80-120KB (vs current ~135KB for global 110m data — smaller because cropped)

**2. No code changes needed**
- `AdminMapPicker.tsx` already loads and clips against whatever is in `land-boundary.json`
- The clipping logic (`turf.intersect`) works the same regardless of resolution

### Files to modify
- **Replace**: `src/data/land-boundary.json` — swap from ne_110m global to ne_50m cropped to Bible Lands region

