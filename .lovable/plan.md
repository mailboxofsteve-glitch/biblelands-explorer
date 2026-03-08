

## Plan: Remove Modern Labels, Borders, and Streets from Mapbox Map

### Approach

After the map style loads (both on initial load and on skin change), iterate through all map layers and hide ones that correspond to modern features. Mapbox styles use predictable layer ID naming conventions:

- **Labels to hide**: Layers with IDs containing `label` or `symbol` — EXCEPT those related to water (containing `water` in the ID)
- **Roads/streets to hide**: Layers with IDs containing `road`, `street`, `bridge`, `tunnel`, `turning`, `link`, `motorway`, `trunk`, `path`, `pedestrian`
- **Borders to hide**: Layers with IDs containing `boundary`, `border`, `admin`

### Implementation

**Single file change: `src/components/Map/MapCanvas.tsx`**

Add a helper function `hideModernLayers(map)` that loops through `map.getStyle().layers` and sets `visibility: 'none'` on matching layers. Call it:

1. In the `map.on("load")` callback
2. In a `map.on("style.load")` listener (triggered when skin changes via `setStyle`)

The filter logic:
```
for each layer:
  const id = layer.id.toLowerCase()
  if matches road/street/bridge/tunnel/path keywords → hide
  if matches admin/boundary/border keywords → hide  
  if matches label/symbol/place/poi keywords AND does NOT contain "water"/"sea"/"ocean"/"lake"/"river" → hide
```

This preserves terrain, landcover, hillshade, buildings, and water labels while removing all modern infrastructure and political labels.

