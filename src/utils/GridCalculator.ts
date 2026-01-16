import { Point, CDProfile, HeatPlate, Orientation, Room, SystemType } from '../types'

interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

export class GridCalculator {
  private pxPerMeter: number
  private readonly CD_PROFILE_WIDTH_MM = 60 // 6cm width (Blue Profiles)
  private readonly CD_PROFILE_SPACING_MM = 400 // 40cm spacing (axis to axis)
  private readonly WALL_BUFFER_MM = 250 // 25cm minimum buffer (Turning Zone)
  private readonly LENGTH_STEP_MM = 100 // 10cm quantization step
  private readonly GRID_MARGIN_MM = 100 // 10cm minimum margin from walls (perpendicular to profiles)
  private readonly MIN_PROFILE_LENGTH_MM = 1000 // 1m minimum profile length

  constructor(pxPerMeter: number) {
    this.pxPerMeter = pxPerMeter
  }

  /**
   * Convert millimeters to pixels
   */
  private mmToPx(mm: number): number {
    return (mm / 1000) * this.pxPerMeter
  }

  /**
   * Calculate the bounding box of a polygon
   */
  private getBoundingBox(points: Point[]): BoundingBox {
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  /**
   * Calculate the area of a polygon using the Shoelace formula
   */
  calculatePolygonArea(points: Point[]): number {
    if (points.length < 3) return 0

    let area = 0
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      area += points[i].x * points[j].y
      area -= points[j].x * points[i].y
    }
    
    area = Math.abs(area) / 2
    
    // Convert from square pixels to square meters
    const areaInMeters = area / (this.pxPerMeter * this.pxPerMeter)
    return areaInMeters
  }

  /**
   * Quantize length to stepped increments
   * Round DOWN to nearest step (e.g., 100mm)
   */
  private quantizeLength(lengthMM: number): number {
    return Math.floor(lengthMM / this.LENGTH_STEP_MM) * this.LENGTH_STEP_MM
  }

  /**
   * Calculate line-line intersection point
   * Returns null if lines don't intersect
   */
  private lineIntersection(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): Point | null {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    
    if (Math.abs(denom) < 0.0001) {
      return null // Lines are parallel
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      }
    }

    return null
  }

  /**
   * Cast a vertical ray and find intersections with polygon
   * Returns sorted intersection Y coordinates (top to bottom)
   */
  private castVerticalRay(x: number, polygon: Point[]): number[] {
    const intersections: number[] = []
    const rayTop = -1e9
    const rayBottom = 1e9

    // Check intersection with each polygon edge
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i]
      const p2 = polygon[(i + 1) % polygon.length]

      const intersection = this.lineIntersection(
        x, rayTop, x, rayBottom,  // Vertical ray
        p1.x, p1.y, p2.x, p2.y    // Polygon edge
      )

      if (intersection) {
        intersections.push(intersection.y)
      }
    }

    // Sort intersections top to bottom
    return intersections.sort((a, b) => a - b)
  }

  /**
   * Cast a horizontal ray and find intersections with polygon
   * Returns sorted intersection X coordinates (left to right)
   */
  private castHorizontalRay(y: number, polygon: Point[]): number[] {
    const intersections: number[] = []
    const rayLeft = -1e9
    const rayRight = 1e9

    // Check intersection with each polygon edge
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i]
      const p2 = polygon[(i + 1) % polygon.length]

      const intersection = this.lineIntersection(
        rayLeft, y, rayRight, y,  // Horizontal ray
        p1.x, p1.y, p2.x, p2.y    // Polygon edge
      )

      if (intersection) {
        intersections.push(intersection.x)
      }
    }

    // Sort intersections left to right
    return intersections.sort((a, b) => a - b)
  }

  /**
   * Generate CD Profiles (Blue Forbidden Zones) for a room
   * 
   * CENTERED GRID ALGORITHM (10cm Rule):
   * - Minimum 10cm margin from walls (perpendicular to profiles)
   * - 400mm spacing (axis to axis)
   * - Grid is CENTERED in room
   * - Raycasting for exact intersections
   * - 250mm buffer (parallel to profiles)
   * - Quantize to 100mm steps
   */
  generateCDProfiles(room: Room): CDProfile[] {
    const { points, orientation } = room
    const bbox = this.getBoundingBox(points)
    
    const profileWidth = this.mmToPx(this.CD_PROFILE_WIDTH_MM)
    const spacing = this.mmToPx(this.CD_PROFILE_SPACING_MM)
    const bufferPx = this.mmToPx(this.WALL_BUFFER_MM)
    const gridMarginPx = this.mmToPx(this.GRID_MARGIN_MM)

    const profiles: CDProfile[] = []

    if (orientation === 'Vertical') {
      // Profiles run vertically (top to bottom)
      // Calculate centered grid with 10cm margins
      
      const roomWidth = bbox.maxX - bbox.minX
      const roomWidthMM = (roomWidth / this.pxPerMeter) * 1000
      
      // Usable width (minus 10cm on both sides)
      const usableWidthMM = roomWidthMM - (2 * this.GRID_MARGIN_MM)
      
      // Count profiles: floor(usableWidth / spacing) + 1
      const profileCount = Math.floor(usableWidthMM / this.CD_PROFILE_SPACING_MM) + 1
      
      if (profileCount < 1) {
        console.warn('Room too narrow for vertical profiles with 10cm margins')
        return []
      }
      
      // Total grid span
      const totalGridSpanMM = (profileCount - 1) * this.CD_PROFILE_SPACING_MM
      const totalGridSpanPx = this.mmToPx(totalGridSpanMM)
      
      // Calculate start offset (centered)
      const remainderPx = roomWidth - totalGridSpanPx
      const startOffsetPx = remainderPx / 2
      
      console.log('Vertical Grid Calculation:', {
        roomWidthMM: roomWidthMM.toFixed(0) + 'mm',
        usableWidthMM: usableWidthMM.toFixed(0) + 'mm',
        profileCount,
        totalGridSpanMM: totalGridSpanMM.toFixed(0) + 'mm',
        startOffsetMM: ((startOffsetPx / this.pxPerMeter) * 1000).toFixed(0) + 'mm',
        marginsMM: ((startOffsetPx / this.pxPerMeter) * 1000).toFixed(0) + 'mm (equal on both sides)',
      })
      
      // Generate profiles with centered spacing
      for (let i = 0; i < profileCount; i++) {
        const currentX = bbox.minX + startOffsetPx + (i * spacing)
        
        // ========================================
        // DOUBLE-RAY EDGE CHECKING (The "Tightest Spot" Algorithm)
        // ========================================
        
        // Profile width is 50mm, so edges are at ±25mm from center
        const halfWidth = profileWidth / 2  // 25mm in pixels
        
        // STEP 1: Cast Ray A (Left Edge at X - 25mm)
        const intersectionsLeft = this.castVerticalRay(currentX - halfWidth, points)
        
        // STEP 2: Cast Ray B (Right Edge at X + 25mm)
        const intersectionsRight = this.castVerticalRay(currentX + halfWidth, points)

        if (intersectionsLeft.length < 2 || intersectionsRight.length < 2) {
          console.log(`Profile ${i + 1} at X=${currentX.toFixed(0)}: Insufficient intersections`)
          continue
        }

        // STEP 3: Find the "Tightest Spot" (Most Restrictive Intersection)
        // Top Limit: Take the LOWER (larger Y) of the two top intersections
        const topLimit = Math.max(intersectionsLeft[0], intersectionsRight[0])
        
        // Bottom Limit: Take the HIGHER (smaller Y) of the two bottom intersections
        const bottomLimit = Math.min(intersectionsLeft[1], intersectionsRight[1])

        // STEP 4: Determine Raw Segment (strictest available space)
        const rawLengthPx = bottomLimit - topLimit
        const rawLengthMM = (rawLengthPx / this.pxPerMeter) * 1000

        if (rawLengthPx < 0) {
          console.log(`Profile ${i + 1} at X=${currentX.toFixed(0)}: No valid space (edges cross)`)
          continue
        }

        // STEP 5: Pre-calculate Max Possible Length
        // MaxPossibleLength = (Max - Min) - 500mm (250mm buffer on both ends)
        const maxPossibleLengthPx = rawLengthPx - (2 * bufferPx)
        const maxPossibleLengthMM = (maxPossibleLengthPx / this.pxPerMeter) * 1000

        if (maxPossibleLengthMM < 100) {
          console.log(`Profile ${i + 1} at X=${currentX.toFixed(0)} discarded: MaxLength=${maxPossibleLengthMM.toFixed(0)}mm < 100mm`)
          continue
        }

        // STEP 6: Apply Quantization (Round DOWN to 100mm steps)
        const steppedLengthMM = this.quantizeLength(maxPossibleLengthMM)
        const steppedLengthPx = this.mmToPx(steppedLengthMM)

        // STEP 7: FIXED ANCHOR PLACEMENT (BOTTOM anchored for VERTICAL)
        // Rule: Bottom gap = exactly 250mm, Top gap takes the remainder
        const finalYEnd = bottomLimit - bufferPx         // Anchor to bottom: 250mm from bottom
        const finalYStart = finalYEnd - steppedLengthPx  // Extend upward

        // Verification: Calculate actual gaps from TIGHTEST boundaries
        const topGapMM = ((finalYStart - topLimit) / this.pxPerMeter) * 1000
        const bottomGapMM = ((bottomLimit - finalYEnd) / this.pxPerMeter) * 1000

        console.log(`✓ Profile ${i + 1} at X=${currentX.toFixed(0)} [BOTTOM-ANCHORED]:`, {
          rawMM: rawLengthMM.toFixed(0),
          maxPossibleMM: maxPossibleLengthMM.toFixed(0),
          steppedMM: steppedLengthMM.toFixed(0),
          topGap: topGapMM.toFixed(0) + 'mm (remainder)',
          bottomGap: bottomGapMM.toFixed(0) + 'mm (fixed 250mm)',
          edgeCheck: '✓ Both edges clear',
        })

        // Minimum length filter: Only add profiles >= 1000mm
        if (steppedLengthMM >= this.MIN_PROFILE_LENGTH_MM) {
          profiles.push({
            id: `profile-v-${profiles.length}`,
            x1: currentX - profileWidth / 2,
            y1: finalYStart,
            x2: currentX - profileWidth / 2,
            y2: finalYEnd,
            width: profileWidth,
            orientation: 'Vertical',
          })
        } else {
          console.log(`⚠️ Skipping profile (too short: ${steppedLengthMM.toFixed(0)}mm < ${this.MIN_PROFILE_LENGTH_MM}mm)`)
        }
      }
    } else {
      // Profiles run horizontally (left to right)
      // Calculate centered grid with 10cm margins
      
      const roomHeight = bbox.maxY - bbox.minY
      const roomHeightMM = (roomHeight / this.pxPerMeter) * 1000
      
      // Usable height (minus 10cm on both sides)
      const usableHeightMM = roomHeightMM - (2 * this.GRID_MARGIN_MM)
      
      // Count profiles: floor(usableHeight / spacing) + 1
      const profileCount = Math.floor(usableHeightMM / this.CD_PROFILE_SPACING_MM) + 1
      
      if (profileCount < 1) {
        console.warn('Room too short for horizontal profiles with 10cm margins')
        return []
      }
      
      // Total grid span
      const totalGridSpanMM = (profileCount - 1) * this.CD_PROFILE_SPACING_MM
      const totalGridSpanPx = this.mmToPx(totalGridSpanMM)
      
      // Calculate start offset (centered)
      const remainderPx = roomHeight - totalGridSpanPx
      const startOffsetPx = remainderPx / 2
      
      console.log('Horizontal Grid Calculation:', {
        roomHeightMM: roomHeightMM.toFixed(0) + 'mm',
        usableHeightMM: usableHeightMM.toFixed(0) + 'mm',
        profileCount,
        totalGridSpanMM: totalGridSpanMM.toFixed(0) + 'mm',
        startOffsetMM: ((startOffsetPx / this.pxPerMeter) * 1000).toFixed(0) + 'mm',
        marginsMM: ((startOffsetPx / this.pxPerMeter) * 1000).toFixed(0) + 'mm (equal on both sides)',
      })
      
      // Generate profiles with centered spacing
      for (let i = 0; i < profileCount; i++) {
        const currentY = bbox.minY + startOffsetPx + (i * spacing)
        
        // ========================================
        // DOUBLE-RAY EDGE CHECKING (The "Tightest Spot" Algorithm)
        // ========================================
        
        // Profile width is 50mm, so edges are at ±25mm from center
        const halfWidth = profileWidth / 2  // 25mm in pixels
        
        // STEP 1: Cast Ray A (Top Edge at Y - 25mm)
        const intersectionsTop = this.castHorizontalRay(currentY - halfWidth, points)
        
        // STEP 2: Cast Ray B (Bottom Edge at Y + 25mm)
        const intersectionsBottom = this.castHorizontalRay(currentY + halfWidth, points)

        if (intersectionsTop.length < 2 || intersectionsBottom.length < 2) {
          console.log(`Profile ${i + 1} at Y=${currentY.toFixed(0)}: Insufficient intersections`)
          continue
        }

        // STEP 3: Find the "Tightest Spot" (Most Restrictive Intersection)
        // Left Limit: Take the RIGHTMOST (larger X) of the two left intersections
        const leftLimit = Math.max(intersectionsTop[0], intersectionsBottom[0])
        
        // Right Limit: Take the LEFTMOST (smaller X) of the two right intersections
        const rightLimit = Math.min(intersectionsTop[1], intersectionsBottom[1])

        // STEP 4: Determine Raw Segment (strictest available space)
        const rawLengthPx = rightLimit - leftLimit
        const rawLengthMM = (rawLengthPx / this.pxPerMeter) * 1000

        if (rawLengthPx < 0) {
          console.log(`Profile ${i + 1} at Y=${currentY.toFixed(0)}: No valid space (edges cross)`)
          continue
        }

        // STEP 5: Pre-calculate Max Possible Length
        // MaxPossibleLength = (Max - Min) - 500mm (250mm buffer on both ends)
        const maxPossibleLengthPx = rawLengthPx - (2 * bufferPx)
        const maxPossibleLengthMM = (maxPossibleLengthPx / this.pxPerMeter) * 1000

        if (maxPossibleLengthMM < 100) {
          console.log(`Profile ${i + 1} at Y=${currentY.toFixed(0)} discarded: MaxLength=${maxPossibleLengthMM.toFixed(0)}mm < 100mm`)
          continue
        }

        // STEP 6: Apply Quantization (Round DOWN to 100mm steps)
        const steppedLengthMM = this.quantizeLength(maxPossibleLengthMM)
        const steppedLengthPx = this.mmToPx(steppedLengthMM)

        // STEP 7: FIXED ANCHOR PLACEMENT (LEFT anchored for HORIZONTAL)
        // Rule: Left gap = exactly 250mm, Right gap takes the remainder
        const finalXStart = leftLimit + bufferPx         // Anchor to left: 250mm from left
        const finalXEnd = finalXStart + steppedLengthPx  // Extend rightward

        // Verification: Calculate actual gaps from TIGHTEST boundaries
        const leftGapMM = ((finalXStart - leftLimit) / this.pxPerMeter) * 1000
        const rightGapMM = ((rightLimit - finalXEnd) / this.pxPerMeter) * 1000

        console.log(`✓ Profile ${i + 1} at Y=${currentY.toFixed(0)} [LEFT-ANCHORED]:`, {
          rawMM: rawLengthMM.toFixed(0),
          maxPossibleMM: maxPossibleLengthMM.toFixed(0),
          steppedMM: steppedLengthMM.toFixed(0),
          leftGap: leftGapMM.toFixed(0) + 'mm (fixed 250mm)',
          rightGap: rightGapMM.toFixed(0) + 'mm (remainder)',
          edgeCheck: '✓ Both edges clear',
        })

        // Minimum length filter: Only add profiles >= 1000mm
        if (steppedLengthMM >= this.MIN_PROFILE_LENGTH_MM) {
          profiles.push({
            id: `profile-h-${profiles.length}`,
            x1: finalXStart,
            y1: currentY - profileWidth / 2,
            x2: finalXEnd,
            y2: currentY - profileWidth / 2,
            width: profileWidth,
            orientation: 'Horizontal',
          })
        } else {
          console.log(`⚠️ Skipping profile (too short: ${steppedLengthMM.toFixed(0)}mm < ${this.MIN_PROFILE_LENGTH_MM}mm)`)
        }
      }
    }

    return profiles
  }

  /**
   * Generate Heat Plates (Brown Plates) between CD Profiles
   * Based on System Type (4 or 6 plates per gap)
   */
  private generateHeatPlates(profiles: CDProfile[], systemType: SystemType, orientation: Orientation): HeatPlate[] {
    if (profiles.length < 2) {
      console.log('Not enough profiles to generate heat plates')
      return []
    }

    const plates: HeatPlate[] = []
    
    // ============================================
    // FIXED CONSTANTS (The 'Recipes' - CORRECTED)
    // ============================================
    const BROWN_PLATE_WIDTH_MM = 50 // Brown plate width
    const BLUE_PROFILE_WIDTH_MM = 60 // Blue CD profile width
    
    // System-specific spacing (User-Provided, UPDATED for 2mm side margins)
    const SYSTEM_4_GAP_MM = 45.333333  // Gap between plates for System 4: (4×50) + (3×45.33) = 336mm
    const SYSTEM_6_GAP_MM = 7.2        // Gap between plates for System 6: (6×50) + (5×7.2) = 336mm
    const TOTAL_SPAN_MM = 336.0        // Total span for both systems (allows 2mm margins each side)
    const VISUAL_OFFSET_MM = 30.0      // Global shift to compensate for coordinate origin mismatch (RETAINED)
    
    const plateWidthPx = this.mmToPx(BROWN_PLATE_WIDTH_MM)
    const blueProfileWidthPx = this.mmToPx(BLUE_PROFILE_WIDTH_MM)
    const totalSpanPx = this.mmToPx(TOTAL_SPAN_MM)
    const visualOffsetPx = this.mmToPx(VISUAL_OFFSET_MM)
    
    // Determine plate count based on system type
    const plateCount = systemType === 'System 4' ? 4 : 6

    // Calculate system-specific spacing
    const gapBetweenPlatesMM = systemType === 'System 4' ? SYSTEM_4_GAP_MM : SYSTEM_6_GAP_MM
    const gapBetweenPlatesPx = this.mmToPx(gapBetweenPlatesMM)
    const stridePx = plateWidthPx + gapBetweenPlatesPx // Distance between plate starts
    
    console.log(`\n=== Generating Heat Plates (${systemType}, ${plateCount} plates per gap) ===`)
    console.log(`Physical Gap Center Method (2mm side margins, -30mm offset)`)
    console.log(`Recipe: ${plateCount}×50mm + ${plateCount - 1}×${gapBetweenPlatesMM.toFixed(2)}mm = ${TOTAL_SPAN_MM}mm | Stride: ${(stridePx / this.pxPerMeter * 1000).toFixed(2)}mm`)

    // Iterate through pairs of adjacent profiles
    for (let i = 0; i < profiles.length - 1; i++) {
      const P_i = profiles[i]
      const P_i_next = profiles[i + 1]

      // ============================================================
      // COMMON INTERSECTION ALGORITHM (The 'Safe Zone' Logic)
      // ============================================================
      // Brown plates MUST strictly reside within the longitudinal 
      // overlap of the two adjacent Blue Profiles
      
      let safeStart: number
      let safeEnd: number
      
      if (orientation === 'Vertical') {
        // For VERTICAL profiles:
        // SafeY_Start = Math.max(StartA, StartB) - Take the LATER start (higher Y)
        // SafeY_End = Math.min(EndA, EndB) - Take the EARLIER end (lower Y)
        safeStart = Math.max(P_i.y1, P_i_next.y1)  // Later start
        safeEnd = Math.min(P_i.y2, P_i_next.y2)    // Earlier end
      } else {
        // For HORIZONTAL profiles:
        // SafeX_Start = Math.max(StartA, StartB) - Take the LATER start (higher X)
        // SafeX_End = Math.min(EndA, EndB) - Take the EARLIER end (lower X)
        safeStart = Math.max(P_i.x1, P_i_next.x1)  // Later start
        safeEnd = Math.min(P_i.x2, P_i_next.x2)    // Earlier end
      }
      
      // Calculate safe length (only where BOTH profiles exist)
      const safeLength = safeEnd - safeStart
      
      // Safety check: If there is no overlap, skip this gap
      if (safeLength <= 0) {
        console.warn(`Gap ${i + 1}: No longitudinal overlap between profiles (SafeLength=${safeLength.toFixed(0)}px), skipping plates`)
        continue
      }
      
      const safeLengthMM = (safeLength / this.pxPerMeter) * 1000
      console.log(`Gap ${i + 1}: SafeZone=${safeLengthMM.toFixed(0)}mm (Common overlap of both profiles)`)
      
      // Use the safe length for plates (not the longer profile)
      const plateLength = safeLength

      if (orientation === 'Vertical') {
        // =================================================================
        // PHYSICALLY CENTERED IN THE GAP (No Axes, Only Edges)
        // =================================================================
        
        // Step 1: Identify Gap Boundaries (CRITICAL: Must use correct edges)
        // Profile_A (left profile): drawn from x1 (left corner), width 60mm
        const profileA_LeftEdge = P_i.x1
        const profileA_RightEdge = profileA_LeftEdge + blueProfileWidthPx  // +60mm
        
        // Profile_B (right profile): drawn from x1 (left corner)
        const profileB_LeftEdge = P_i_next.x1
        
        // Physical gap between the two blue profiles
        const gapStart = profileA_RightEdge  // Where gap begins (right edge of A)
        const gapEnd = profileB_LeftEdge     // Where gap ends (left edge of B)
        const gapSize = gapEnd - gapStart
        const gapSizeMM = (gapSize / this.pxPerMeter) * 1000
        
        // Step 2: Calculate Gap Center (Geometric Center)
        const gapCenter = (gapStart + gapEnd) / 2  // Midpoint formula
        
        // Step 3: Safety Check
        if (gapSizeMM < TOTAL_SPAN_MM) {
          console.warn(`Gap ${i + 1}: Size ${gapSizeMM.toFixed(0)}mm < ${TOTAL_SPAN_MM}mm required, skipping`)
          continue
        }
        
        // Step 4: Determine Block Start Position (Center 336mm block in gap, then apply offset)
        const originalBlockStart = gapCenter - (totalSpanPx / 2)  // Center 336mm block
        
        // Apply -30mm visual offset correction (compensates for coordinate origin mismatch - RETAINED)
        const blockStart = originalBlockStart - visualOffsetPx
        
        // Use SAFE ZONE coordinates (Common Intersection of both profiles)
        const plateYStart = safeStart  // Later start (where BOTH profiles exist)
        const plateYEnd = safeEnd      // Earlier end (where BOTH profiles exist)
        
        // CRITICAL: Konva renders stroke CENTERED on line position
        const plateHalfWidth = plateWidthPx / 2 // 25mm
        
        // Step 5: Render Loop (Place plates with fixed spacing)
        for (let j = 0; j < plateCount; j++) {
          // Calculate START position (left edge of plate) with fixed stride
          const plateStartX = blockStart + (j * stridePx)
          
          // Convert to CENTER position for Konva rendering
          const plateCenterX = plateStartX + plateHalfWidth
          
          plates.push({
            id: `plate-v-${plates.length}`,
            x1: plateCenterX,
            y1: plateYStart,
            x2: plateCenterX,
            y2: plateYEnd,
            width: plateWidthPx,
            orientation: 'Vertical',
          })
        }
        
        // Verification (measure physical margins)
        const leftMarginMM = ((blockStart - gapStart) / this.pxPerMeter) * 1000
        const blockEnd = blockStart + totalSpanPx
        const rightMarginMM = ((gapEnd - blockEnd) / this.pxPerMeter) * 1000
        
        console.log(`✓ Gap ${i + 1} (V): GapSize=${gapSizeMM.toFixed(1)}mm, ${plateCount} plates, Margins: L=${leftMarginMM.toFixed(2)}mm R=${rightMarginMM.toFixed(2)}mm`)
      } else {
        // =================================================================
        // PHYSICALLY CENTERED IN THE GAP (No Axes, Only Edges)
        // =================================================================
        
        // Step 1: Identify Gap Boundaries (CRITICAL: Must use correct edges)
        // Profile_A (top profile): drawn from y1 (top corner), width 60mm
        const profileA_TopEdge = P_i.y1
        const profileA_BottomEdge = profileA_TopEdge + blueProfileWidthPx  // +60mm
        
        // Profile_B (bottom profile): drawn from y1 (top corner)
        const profileB_TopEdge = P_i_next.y1
        
        // Physical gap between the two blue profiles
        const gapStart = profileA_BottomEdge  // Where gap begins (bottom edge of A)
        const gapEnd = profileB_TopEdge       // Where gap ends (top edge of B)
        const gapSize = gapEnd - gapStart
        const gapSizeMM = (gapSize / this.pxPerMeter) * 1000
        
        // Step 2: Calculate Gap Center (Geometric Center)
        const gapCenter = (gapStart + gapEnd) / 2  // Midpoint formula
        
        // Step 3: Safety Check
        if (gapSizeMM < TOTAL_SPAN_MM) {
          console.warn(`Gap ${i + 1}: Size ${gapSizeMM.toFixed(0)}mm < ${TOTAL_SPAN_MM}mm required, skipping`)
          continue
        }
        
        // Step 4: Determine Block Start Position (Center 336mm block in gap, then apply offset)
        const originalBlockStart = gapCenter - (totalSpanPx / 2)  // Center 336mm block
        
        // Apply -30mm visual offset correction (compensates for coordinate origin mismatch - RETAINED)
        const blockStart = originalBlockStart - visualOffsetPx
        
        // Use SAFE ZONE coordinates (Common Intersection of both profiles)
        const plateXStart = safeStart  // Later start (where BOTH profiles exist)
        const plateXEnd = safeEnd      // Earlier end (where BOTH profiles exist)
        
        // CRITICAL: Konva renders stroke CENTERED on line position
        const plateHalfWidth = plateWidthPx / 2 // 25mm
        
        // Step 5: Render Loop (Place plates with fixed spacing)
        for (let j = 0; j < plateCount; j++) {
          // Calculate START position (top edge of plate) with fixed stride
          const plateStartY = blockStart + (j * stridePx)
          
          // Convert to CENTER position for Konva rendering
          const plateCenterY = plateStartY + plateHalfWidth
          
          plates.push({
            id: `plate-h-${plates.length}`,
            x1: plateXStart,
            y1: plateCenterY,
            x2: plateXEnd,
            y2: plateCenterY,
            width: plateWidthPx,
            orientation: 'Horizontal',
          })
        }
        
        // Verification (measure physical margins)
        const topMarginMM = ((blockStart - gapStart) / this.pxPerMeter) * 1000
        const blockEnd = blockStart + totalSpanPx
        const bottomMarginMM = ((gapEnd - blockEnd) / this.pxPerMeter) * 1000
        
        console.log(`✓ Gap ${i + 1} (H): GapSize=${gapSizeMM.toFixed(1)}mm, ${plateCount} plates, Margins: T=${topMarginMM.toFixed(2)}mm B=${bottomMarginMM.toFixed(2)}mm`)
      }
    }

    console.log(`Total heat plates generated: ${plates.length}`)
    return plates
  }

  /**
   * Calculate profile statistics (grouped by length)
   */
  private calculateProfileStats(profiles: CDProfile[]): { lengthCm: number; count: number }[] {
    const lengthCounts = new Map<number, number>()

    for (const profile of profiles) {
      // Calculate length in pixels
      const dx = profile.x2 - profile.x1
      const dy = profile.y2 - profile.y1
      const lengthPx = Math.sqrt(dx * dx + dy * dy)
      
      // Convert to cm (rounded to integer)
      const lengthMM = (lengthPx / this.pxPerMeter) * 1000
      const lengthCm = Math.round(lengthMM / 10) // Convert mm to cm
      
      // Count occurrences
      lengthCounts.set(lengthCm, (lengthCounts.get(lengthCm) || 0) + 1)
    }

    // Convert to array and sort by length (descending)
    return Array.from(lengthCounts.entries())
      .map(([lengthCm, count]) => ({ lengthCm, count }))
      .sort((a, b) => b.lengthCm - a.lengthCm)
  }

  /**
   * Calculate material list for heat plates (grouped by STANDARDIZED length)
   * 
   * THE '5CM RULE' (CRITICAL):
   * - Heat plates are available in 50mm (5cm) increments
   * - Always round DOWN to nearest 50mm
   * - Formula: StandardLength = Math.floor(ActualLength / 50) * 50
   * - Example: 899mm → 850mm, 1240mm → 1200mm
   */
  private calculateHeatPlateMaterials(plates: HeatPlate[]): { lengthMm: number; count: number }[] {
    const lengthCounts = new Map<number, number>()

    console.log('\n=== Material List Calculation (5cm Rule) ===')

    for (const plate of plates) {
      // Calculate actual length in pixels
      const dx = plate.x2 - plate.x1
      const dy = plate.y2 - plate.y1
      const lengthPx = Math.sqrt(dx * dx + dy * dy)
      
      // Convert to mm (actual length)
      const actualLengthMM = (lengthPx / this.pxPerMeter) * 1000
      
      // THE 5CM RULE: Round DOWN to nearest 50mm
      const standardLengthMM = Math.floor(actualLengthMM / 50) * 50
      
      // Skip plates that round down to 0 or negative (shouldn't happen, but safety check)
      if (standardLengthMM <= 0) {
        console.warn(`Plate with actual length ${actualLengthMM.toFixed(0)}mm rounds down to 0mm, skipping`)
        continue
      }
      
      // Count occurrences of this standardized length
      lengthCounts.set(standardLengthMM, (lengthCounts.get(standardLengthMM) || 0) + 1)
    }

    // Convert to array and sort by length (descending)
    const materialList = Array.from(lengthCounts.entries())
      .map(([lengthMm, count]) => ({ lengthMm, count }))
      .sort((a, b) => b.lengthMm - a.lengthMm)
    
    console.log('Material List (Standardized 50mm increments):')
    materialList.forEach(item => {
      console.log(`  ${item.lengthMm} mm: ${item.count} db`)
    })
    
    const totalMeters = materialList.reduce((sum, item) => sum + (item.lengthMm * item.count / 1000), 0)
    console.log(`Total: ${totalMeters.toFixed(2)} m`)

    return materialList
  }

  /**
   * Generate complete room with grid and statistics
   */
  generateRoomGrid(room: Room): Room {
    const cdProfiles = this.generateCDProfiles(room)
    const heatPlates = this.generateHeatPlates(cdProfiles, room.systemType, room.orientation)
    const area = this.calculatePolygonArea(room.points)
    const profileStats = this.calculateProfileStats(cdProfiles)
    const plateMaterials = this.calculateHeatPlateMaterials(heatPlates)

    return {
      ...room,
      cdProfiles,
      heatPlates,
      area,
      profileStats,
      plateMaterials,
    }
  }
}
