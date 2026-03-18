

## Add Era Icons to Bottom Timeline

### Summary
Add a unique icon to each era tab in the BottomTimeline. When an era is **expanded/active**, show the icon beside the era name. When **collapsed**, show only the icon (replacing the current abbreviation).

### Icon Mapping
| Era | Lucide Icon | Import Name |
|-----|------------|-------------|
| Patriarchs | Tent | `Tent` |
| Exodus | Footprints | `Footprints` |
| Judges | Scales | `Scale` |
| United Kingdom | Crown | `Crown` |
| Divided Kingdom | Branch/split | `GitBranch` |
| Exile | Chains | `Link` |
| NT Ministry | Cross | `Cross` |
| Early Church | Scroll/letter | `ScrollText` |

### Changes

**`src/components/Map/BottomTimeline.tsx`**:
- Import the 8 Lucide icons
- Create an `ERA_ICONS` map from era ID to icon component
- In the era bar rendering:
  - **Expanded tab**: Show `<Icon size={18} />` + `era.label` side by side
  - **Collapsed tab**: Show only `<Icon size={16} />` (remove the abbreviation text)

Single file change, ~15 lines added.

