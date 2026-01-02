# MapView.vue Refactoring Plan

## Analysis of Current State

The file is currently 1640 lines and handles **multiple distinct concerns**:

### 1. **State Management** (lines 20-49)
- Map state (`map`, `mapContainer`, `loading`, `mapRendering`)
- Hover state (`hoveredParcel`, `hoveredFeature`, `hoveredTransitStop`, `tooltipPosition`)
- Rules state (`userRules`, `newRule`, `editingRuleId`, `showModal`)
- Data state (`fzpZoningData`, `allParcelsData`, `parcelAttributes`)
- Projection state (`yourPlanLow`, `yourPlanHigh`, `calculating`)

### 2. **Domain Logic / Business Rules** (lines 7-18, 257-335)
- SDB qualification computation
- Rule matching logic
- Height calculation
- Unit projection calculations with caching

### 3. **Data Processing** (lines 115-170)
- CSV parsing utilities
- Numeric CSV parsing

### 4. **Map Rendering** (lines 360-586, 588-654)
- Map initialization
- Layer setup (parcels, transit, public parcels)
- Color schemes
- Hover/highlight interactions

### 5. **UI Components** (template lines 708-985)
- Sidebar with projections table
- Rules list and management
- Rule add/edit modal
- Info modal
- Parcel tooltip
- Transit tooltip
- Map legend

### 6. **Constants** (lines 80-112)
- Neighborhoods list
- Zoning codes list
- FZP heights list
- Dataset configuration

---

## Proposed Refactoring

Based on OOP best practices (Single Responsibility, Separation of Concerns, Encapsulation):

### 1. **Composables (Vue 3 composition API modules)**

| File | Responsibility |
|------|----------------|
| `composables/useMapInstance.js` | Map initialization, controls, bounds |
| `composables/useParcelData.js` | Load/parse parcel data, overlay, model data |
| `composables/useRules.js` | Rules CRUD, rule matching logic |
| `composables/useProjections.js` | Unit calculations, SDB logic, caching |
| `composables/useTooltip.js` | Tooltip position, hovered state |

### 2. **Utility Modules**

| File | Responsibility |
|------|----------------|
| `utils/csvParser.js` | `parseCSV`, `parseCSVLine`, `parseNumericCSV` |
| `utils/sdbCalculator.js` | SDB qualification logic |
| `constants/zoningOptions.js` | `NEIGHBORHOODS`, `ZONING_CODES`, `FZP_HEIGHTS` |
| `constants/mapConfig.js` | Color scales, layer configs, bounds |

### 3. **Child Components**

| Component | Responsibility |
|-----------|----------------|
| `Sidebar.vue` | Sidebar container with header |
| `ProjectionsTable.vue` | FZP vs Your Plan table |
| `RulesList.vue` | Display/manage list of rules |
| `RuleModal.vue` | Add/edit rule modal |
| `InfoModal.vue` | About modal |
| `ParcelTooltip.vue` | Parcel hover tooltip |
| `TransitTooltip.vue` | Transit stop tooltip |
| `MapLegend.vue` | Height color legend |
| `MapLoadingOverlay.vue` | Loading spinner overlay |

### 4. **Refactored MapView.vue**
The main component would then:
- Import and compose the composables
- Render child components
- Coordinate data flow between them

---

## Benefits

1. **Testability**: Business logic in composables can be unit tested independently
2. **Reusability**: Components like `RuleModal` or `MapLegend` could be reused
3. **Maintainability**: Each file has a single concern, easier to understand and modify
4. **Performance**: Smaller components enable better Vue reactivity optimization
5. **Team collaboration**: Multiple developers can work on different parts simultaneously

---

## Implementation Order (Suggested)

1. Extract utility modules first (csvParser, sdbCalculator, constants) - no UI changes
2. Extract composables one at a time, testing after each
3. Extract presentational components (tooltips, legend, loading overlay)
4. Extract modal components
5. Extract sidebar components
6. Final cleanup of MapView.vue
