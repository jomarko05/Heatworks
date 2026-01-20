# 🐍 SNAKE ROUTING - VISUAL GUIDE

## Pattern Overview

### Vertical Layout (Bottom Connection)

```
Connection Side = BOTTOM

     WALL
═══════════════════════════
         
    ║    ║    ║    ║
    ║    ║    ║    ║
    ║ 1  ╚═══╗║ 3  ║
    ║       ╚╝    ║
    ║ UP    DOWN   ║  UP
    ║             ║
    ▲    ╔═══╝    ║
  ENTRY  ║ 2      EXIT
  STUB   ║        STUB
    │    ║        │
    │  DOWN       │
    │             │
═══════════════════════════
     WALL
```

**Flow:**
1. Entry stub (500mm) from **BOTTOM**
2. Plate 1: Flow **UP** ⬆️
3. U-turn at **TOP**
4. Plate 2: Flow **DOWN** ⬇️
5. U-turn at **BOTTOM**
6. Plate 3: Flow **UP** ⬆️
7. Exit stub (500mm) to **BOTTOM**

---

### Vertical Layout (Top Connection)

```
Connection Side = TOP

═══════════════════════════
     WALL
    │             │
    │  UP         │
    ▼    ║        EXIT
  ENTRY  ║ 2      STUB
  STUB   ║        ║
    ║    ╚═══╗    ║
    ║       ╚╝   ║
    ║ DOWN   UP   ║  DOWN
    ║             ║
    ║ 1  ╔═══╝║ 3  ║
    ║    ║    ║    ║
    ║    ║    ║    ║
         
═══════════════════════════
     WALL
```

**Flow:**
1. Entry stub (500mm) from **TOP**
2. Plate 1: Flow **DOWN** ⬇️
3. U-turn at **BOTTOM**
4. Plate 2: Flow **UP** ⬆️
5. U-turn at **TOP**
6. Plate 3: Flow **DOWN** ⬇️
7. Exit stub (500mm) to **TOP**

---

## Stagger Handling (Lépcső)

### Normal Turn (Aligned Ends)

```
Plate 1          Plate 2
   ║                ║
   ║                ║
   ║═══════╗        ║
   END    ╚════START
           U-TURN
```

### Staggered Turn (Misaligned > 50mm)

```
Plate 1          Plate 2
   ║                ║
   ║             START
   ║═══════╗        ║
   END    ║        ║
          ╚════════╝
        EXTENSION  U-TURN
```

**Logic:**
1. Detect stagger: `|Y1 - Y2| > 50mm`
2. Add **straight extension** to align
3. Then add **U-turn**

---

## 100m Circuit Buckets

### Example: 15 Plates, Each 2m Long

```
Circuit 1 (Green):
┌────────────────────────────────────┐
│ Plates 1-20                        │
│ Length: 98.5m                      │
│ (Entry stub + 20 plates + 19 turns │
│  + Exit stub)                      │
└────────────────────────────────────┘

Circuit 2 (Forest Green):
┌────────────────────────────────────┐
│ Plates 21-40                       │
│ Length: 99.2m                      │
└────────────────────────────────────┘

Circuit 3 (Orange):
┌────────────────────────────────────┐
│ Plates 41-50 (Last 10)             │
│ Length: 45.8m                      │
└────────────────────────────────────┘
```

**Cost Calculation:**
```typescript
Entry stub:     500mm
Plate 1 length: 2000mm
Turn 1:         400mm
Plate 2 length: 2000mm
Turn 2:         400mm
...
Exit stub:      500mm
─────────────────────
Total:          < 100,000mm
```

---

## Connection Side Options

### Vertical Layout (Pipes horizontal)
| Option | Hungarian | Flow Direction |
|--------|-----------|----------------|
| Top    | Felül     | Downward ⬇️     |
| Bottom | Alul      | Upward ⬆️       |

### Horizontal Layout (Pipes vertical)
| Option | Hungarian | Flow Direction |
|--------|-----------|----------------|
| Left   | Bal       | Rightward ➡️    |
| Right  | Jobb      | Leftward ⬅️     |

---

## Color Coding

```typescript
Circuit 1: #32CD32 (Lime Green)
Circuit 2: #228B22 (Forest Green)
Circuit 3: #FF6600 (Orange)
Circuit 4: #0066FF (Blue)
Circuit 5: #9933FF (Purple)
Circuit 6: #FF3399 (Pink)
// Colors repeat after 6 circuits
```

---

## UI Flow

1. **User draws room** ✏️
2. **Set properties:**
   - System Type: 4 or 6
   - Orientation: Vertical or Horizontal
   - **Connection Side:** Top/Bottom or Left/Right
3. **Grid auto-generates** ⚙️
   - Blue CD profiles
   - Brown heat plates
   - **Green snake circuits** 🐍
4. **User can edit:**
   - Change connection side → **Circuits regenerate**
   - Drag room vertices → **Circuits regenerate**
5. **Export to PDF** 📄
   - Vector-based
   - Circuits included

---

## Key Advantages

✅ **No manual placement** - Automatic snake pattern  
✅ **Enforces 100m limit** - Multiple circuits as needed  
✅ **Handles stagger** - Straight extensions when misaligned  
✅ **Visual clarity** - Distinct colors per circuit  
✅ **Simple UI** - Just select connection side  
✅ **Realistic flow** - Alternating up/down pattern  

---

**Last Updated:** 2026-01-17  
**Status:** Production Ready
