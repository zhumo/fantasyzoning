# Your Zoning Plan Feature

## Overview
Allow users to create their own zoning plan by adding height increase rules. Each rule selects parcels by criteria and assigns a proposed height. The plan is evaluated through the projection calculator to show expected housing units.

## UI Design

### Left Sidebar - Rule Builder

The sidebar will contain a "Your Plan Rules" section with:

1. **Add Rule Button** - Adds a new rule card to the list

2. **Rule Card** - Each rule has:
   - **Parcel Selection Dropdown** - Choose selection method:
     - Parcel ID (open text field appears)
     - Neighborhood (exhaustive dropdown appears)
     - Zoning Code (exhaustive dropdown appears)
     - FZP Height (exhaustive dropdown appears)
   - **Selection Value** - The input that appears based on selection type
   - **Proposed Height** - Open text field for height in feet
   - **Delete Rule Button** - Remove this rule

3. **Results Display** - Updated after each rule change (already exists in table)

### Dropdown Options

**Neighborhoods (41 values):**
- Bayview Hunters Point, Bernal Heights, Castro/Upper Market, Chinatown, Excelsior, Financial District/South Beach, Glen Park, Golden Gate Park, Haight Ashbury, Hayes Valley, Inner Richmond, Inner Sunset, Japantown, Lakeshore, Lincoln Park, Lone Mountain/USF, Marina, McLaren Park, Mission, Mission Bay, Nob Hill, Noe Valley, North Beach, Oceanview/Merced/Ingleside, Outer Mission, Outer Richmond, Pacific Heights, Portola, Potrero Hill, Presidio, Presidio Heights, Russian Hill, Seacliff, South of Market, Sunset/Parkside, Tenderloin, Treasure Island, Twin Peaks, Visitacion Valley, West of Twin Peaks, Western Addition

**Zoning Codes (198 values):**
- Store unique primary zoning codes extracted from the pipe-separated values (e.g., "RH-1", "RH-2", "RM-1", "C-2", etc.)

**FZP Heights (24 values):**
- 0, 40, 45, 50, 55, 60, 65, 70, 80, 85, 100, 105, 120, 130, 140, 160, 180, 240, 250, 300, 350, 450, 500, 650

## Data Flow

### Rule Matching Logic

For each parcel, check all rules to find matching ones:

```javascript
function getProposedHeight(parcel, rules) {
  let maxHeight = null;

  for (const rule of rules) {
    if (ruleMatchesParcel(rule, parcel)) {
      const height = parseFloat(rule.proposedHeight);
      if (maxHeight === null || height > maxHeight) {
        maxHeight = height;
      }
    }
  }

  return maxHeight;
}

function ruleMatchesParcel(rule, parcel) {
  switch (rule.selectionType) {
    case 'parcelId':
      return parcel.mapblklot === rule.selectionValue;
    case 'neighborhood':
      return parcel.analysis_neighborhood === rule.selectionValue;
    case 'zoningCode':
      return parcel.zoning_code.split('|').includes(rule.selectionValue);
    case 'fzpHeight':
      return parcel.fzp_height_ft === rule.selectionValue;
  }
  return false;
}
```

### Height Priority
When multiple rules match a parcel, the **tallest proposed height wins**.

### Projection Calculation

After rules change, recalculate:

1. For each parcel in fzp-zoning.csv:
   - Check if any user rule applies
   - If yes, update `Height_Ft` and recalculate `Env_1000_Area_Height` = (Area_1000 * new_height)
   - If no, keep original FZP values

2. Run `UnitCalculator.calcTotalExpectedUnits(modifiedParcels, 'low')` and `('high')`

3. Update the "Your Plan" row in the table with new values

## Implementation Steps

### Step 1: Add Rule State Management
Add reactive state to MapView.vue:
- `userRules` - Array of rule objects
- `yourPlanLow` - Calculated low growth projection
- `yourPlanHigh` - Calculated high growth projection

### Step 2: Add Dropdown Data
Create constants for dropdown options:
- `NEIGHBORHOODS` - Array of neighborhood names
- `ZONING_CODES` - Array of unique zoning codes
- `FZP_HEIGHTS` - Array of height values

### Step 3: Create Rule Builder UI
Add to sidebar:
- Rule list with add/remove functionality
- Conditional inputs based on selection type
- Proposed height input

### Step 4: Load fzp-zoning.csv
Load the projection model data on app mount alongside parcels.csv.

### Step 5: Implement Rule Matching
Function to apply user rules to parcel data and determine effective heights.

### Step 6: Integrate UnitCalculator
Import and use UnitCalculator to compute projections after rule changes.

### Step 7: Update Map Visualization
Color parcels based on user's proposed heights (not just FZP heights).

## File Changes

1. **MapView.vue** - Add rule builder UI and state management
2. **unitCalculator.js** - Already exists, no changes needed
3. **fzp-zoning.csv** - Already exists in data/, needs to be served from public/data/

## Technical Notes

- The projection calculation can be expensive with ~200k parcels. Consider debouncing rule changes.
- fzp-zoning.csv has only parcels with height data (~40k parcels based on test file).
- Map colors should reflect effective height (max of FZP height and user proposed height).
