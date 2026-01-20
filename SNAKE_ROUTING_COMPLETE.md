# 🐍 SNAKE ROUTING - COMPLETE REFACTOR

**Date:** 2026-01-17  
**Status:** ✅ COMPLETE  
**Build:** ✅ PASSING

---

## 📋 SUMMARY

Completely reset the pipe routing logic to a simpler "Snake" pattern with **connection side selection**. Removed all manifold/Osztó placement logic and calculations.

---

## 🎯 KEY CHANGES

### 1. **REMOVED: Manifold System**
- ❌ Removed `manifoldLocation` from `Room` interface
- ❌ Removed `isPlacingManifold`, `manifoldRoomId` from store
- ❌ Removed `setIsPlacingManifold`, `placeManifold` actions
- ❌ Removed "Osztó" button from Toolbar
- ❌ Removed manifold circle and label rendering from CanvasOverlay

### 2. **ADDED: Connection Side Selection**
- ✅ Added `connectionSide: ConnectionSide` to `Room` interface
- ✅ Added `ConnectionSide` type: `'Top' | 'Bottom' | 'Left' | 'Right'`
- ✅ Default value: `'Bottom'` for new rooms
- ✅ UI selector added to RoomListItem
  - **Vertical Layout:** Shows "Felül" (Top) / "Alul" (Bottom)
  - **Horizontal Layout:** Shows "Bal" (Left) / "Jobb" (Right)

### 3. **REWRITTEN: PipeRouter.ts (Snake Logic)**

#### **Algorithm Steps:**

1. **SORT plates:**
   - **Vertical:** Left → Right (by X)
   - **Horizontal:** Top → Bottom (by Y)

2. **GROUP into 100m buckets:**
   - No circuit exceeds `100,000mm` (100 meters)
   - Accounts for plate length + turn length + stub length

3. **GENERATE snake path:**
   - Alternating flow direction to create continuous snake pattern
   - **Example (Vertical, Bottom connection):**
     - Entry stub from connection side
     - Plate 1: Flow UP
     - Turn at TOP
     - Plate 2: Flow DOWN
     - Turn at BOTTOM
     - Plate 3: Flow UP
     - ... continues ...
     - Exit stub to connection side

4. **HANDLE stagger (Lépcső):**
   - If plate ends are misaligned (>50mm), add straight extension
   - Then draw U-turn

5. **RENDER stubs (Csonk):**
   - **Entry stub:** 500mm line extending OUT from connection side at first plate
   - **Exit stub:** 500mm line extending OUT from connection side at last plate

#### **Rendering:**
- Multiple circuits rendered with distinct colors
- Colors cycle: Lime Green → Forest Green → Orange → Blue → Purple → Pink
- `strokeWidth: 16px` (representing 16mm pipe)
- `lineCap: 'round'`, `lineJoin: 'round'`
- `tension: 0.2` (smooth curves)

---

## 🔧 FILES MODIFIED

### **Core Logic:**
1. **`src/types/index.ts`**
   - Added `ConnectionSide` type
   - Replaced `manifoldLocation: Point | null` with `connectionSide: ConnectionSide`
   - Updated `Room` interface

2. **`src/utils/PipeRouter.ts`**
   - Complete rewrite
   - New function signature: `calculateCircuits(heatPlates, connectionSide, orientation, pxPerMeter)`
   - Implements snake pattern with side selection

3. **`src/utils/GridCalculator.ts`**
   - Updated `generateRoomGrid` to call `calculateCircuits` with `room.connectionSide` instead of `room.manifoldLocation`

### **Store:**
4. **`src/store/useStore.ts`**
   - Removed `isPlacingManifold`, `manifoldRoomId` state
   - Removed `setIsPlacingManifold`, `placeManifold` actions
   - Updated `closeRoomPolygon` to initialize `connectionSide: 'Bottom'`

### **UI Components:**
5. **`src/components/RoomListItem.tsx`**
   - Added `handleConnectionSideChange` handler
   - Added "Csatlakozási oldal" (Connection Side) select dropdown
   - Options change based on room orientation

6. **`src/components/Toolbar.tsx`**
   - Removed all manifold-related imports
   - Removed "Osztó" button and placement mode indicator

7. **`src/components/CanvasOverlay.tsx`**
   - Removed `isPlacingManifold`, `manifoldRoomId`, `placeManifold` from store destructuring
   - Removed manifold placement handler in `handleStageClick`
   - Removed manifold rendering (orange circle, "OSZTÓ" label)
   - Updated cursor style logic (removed manifold mode)
   - Kept `heatingCircuits` rendering with updated comment

8. **`src/components/RoomPropertiesModal.tsx`**
   - Updated `generateRoomGrid` call to pass `connectionSide` instead of `manifoldLocation`

---

## 📐 ALGORITHM DETAILS

### **100m Bucket Logic:**
```typescript
// For each plate:
const plateLengthMm = (plateLengthPx / pxPerMeter) * 1000
const stubCost = currentCircuit.length === 0 ? 500 : 0
const turnCost = currentCircuit.length > 0 ? 400 : 0
const totalCost = stubCost + turnCost + plateLengthMm + 500 // exit stub

if (currentLengthMm + totalCost <= 100000) {
  // Add to current circuit
} else {
  // Start new circuit
}
```

### **Flow Direction Logic:**
```typescript
// Vertical plates (horizontal flow):
// - Bottom connection: UP flow (forward)
// - Top connection: DOWN flow (reverse)

// Horizontal plates (vertical flow):
// - Left connection: RIGHT flow (forward)
// - Right connection: LEFT flow (reverse)
```

### **Stagger Detection:**
```typescript
const staggerThresholdMm = 50

if (Math.abs(p1.y - p2.y) > staggerThreshold) {
  // Add straight extension to align
  alignmentPoint = { x: p1.x, y: p2.y }
  path.push(alignmentPoint)
}

// Then add U-turn
path.push(...createUTurn(alignmentPoint, p2, orientation))
```

### **U-Turn Shape:**
- 6 segments for smooth arc
- Linear interpolation with sine curve factor (0.15)
- Flattened U-shape for clearance

---

## 🎨 UI/UX

### **Room Properties:**
```
┌─────────────────────────────────────┐
│ Nappali                       [🗑️]  │
│ 33.4 m²                             │
├─────────────────────────────────────┤
│ Rendszer: [System 4 ▼]  [↕️]       │
├─────────────────────────────────────┤
│ Csatlakozási oldal                  │
│ [Alul ▼]                            │
├─────────────────────────────────────┤
│ ▼ Anyaglista                        │
│   1200 mm ....... 14 db             │
│   850 mm ........ 8 db              │
│   Összesen: 23.2 m                  │
└─────────────────────────────────────┘
```

### **Options Based on Orientation:**
- **Vertical Layout:**
  - "Felül" (Top)
  - "Alul" (Bottom) [DEFAULT]
  
- **Horizontal Layout:**
  - "Bal" (Left)
  - "Jobb" (Right)

---

## 🚀 TESTING CHECKLIST

- [x] TypeScript build passes (`npm run build`)
- [x] No linter errors
- [x] Store state updated correctly
- [x] UI selector renders and responds
- [x] Room editing triggers circuit regeneration
- [x] Multiple circuits render with distinct colors
- [x] 100m limit enforced
- [x] Stagger handling works
- [x] Entry/exit stubs render correctly

---

## 📊 CONSTANTS

```typescript
MAX_CIRCUIT_LENGTH_MM = 100000  // 100 meters
STUB_LENGTH_MM = 500            // Entry/exit stub (Csonk)
STANDARD_TURN_LENGTH_MM = 400   // U-turn connection estimate
PIPE_WIDTH_MM = 16              // Green pipe visual width
```

---

## 🎯 NEXT STEPS (IF NEEDED)

1. **Fine-tune U-turn geometry** based on user feedback
2. **Adjust stub length** if 500mm is too long/short
3. **Add circuit length display** in UI (already calculated)
4. **Export circuits to PDF** (already integrated via existing exportToPDF)
5. **Material list for pipes** (by circuit length)

---

## ✅ VALIDATION

**Build Status:**
```bash
$ npm run build
✓ 2222 modules transformed.
✓ built in 5.48s
```

**No Errors. Ready for deployment.**

---

## 📝 NOTES

- **Manifold system completely removed:** No more manual placement
- **Snake pattern is automatic:** Based on plate position and connection side
- **Simpler logic:** Easier to understand and maintain
- **100m rule enforced:** No circuit exceeds maximum length
- **Visually distinct circuits:** Multiple colors for clarity
- **Ready for production**

---

**Generated:** 2026-01-17  
**Version:** Snake Routing v1.0  
**Status:** ✅ Production Ready
