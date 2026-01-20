import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Line, Text, Circle, Path, Group, Rect } from 'react-konva'
import { useStore } from '../store/useStore'
import { Point, HeatPlate, ManualElement } from '../types'
import { isPointInRect, doRectsIntersect, normalizeRect, getElementBoundingBox, findPlateAtX } from '../utils/Geometry'
import { getAssetById } from '../store/useStore'

export default function CanvasOverlay() {
  const { 
    pdf, 
    calibration, 
    measurement,
    rooms,
    roomDrawing,
    hoveredRoomId,
    selectedRoomId,
    isSettingConnectionPoint,
    setIsDrawingLine, 
    updateCalibrationLineStart, 
    updateCalibrationLineEnd,
    startMeasurement,
    updateMeasurement,
    completeMeasurement,
    setMeasurementActive,
    addRoomPoint,
    closeRoomPolygon,
    updateRoomPoints,
    finalizeRoomPoints,
    setConnectionPoint,
    setIsSettingConnectionPoint,
    placingAsset,
    addManualElement,
    manualElements,
    updateManualElement,
    updateSelectedPositions,
    selectedElementIds,
    setSelectedElementIds,
    addToSelection,
    removeFromSelection,
    clearSelection,
    snapEnabled,
    setIsDragging,
    setDragStartPos,
    dragStartPos,
    selectionRect,
    setSelectionRect,
    selectionMode,
    setSelectionMode,
    setElementRotation,
    mirrorMode,
    rotationMode,
    activeAxisLock,
    placementRotation,
    setPlacementRotation,
    showSnapPoints,
  } = useStore()
  
  // Local state for drag tracking
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null)
  const [snapIndicator, setSnapIndicator] = useState<{ x: number; y: number } | null>(null)
  const [selectionStart, setSelectionStart] = useState<Point | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null) // Offset from mouse to element origin
  const [activeAnchorIndex, setActiveAnchorIndex] = useState<number | null>(null) // Index of the anchor closest to mouse click
  const [dragAnchorOffset, setDragAnchorOffset] = useState<{ x: number; y: number } | null>(null) // Selected anchor coordinates (local space)
  const [elementStartPos, setElementStartPos] = useState<{ x: number; y: number } | null>(null) // Element's initial position when drag starts
  const [snapLines, setSnapLines] = useState<{ vertical: number | null; horizontal: number | null }>({
    vertical: null,
    horizontal: null,
  })
  const [debugSnapPoints, setDebugSnapPoints] = useState<Array<{ x: number; y: number; type: string }>>([])
  const stageRef = useRef<any>(null)
  const setStageRef = useStore((state) => state.setStageRef)

  // Register stage ref with store (for PDF export)
  useEffect(() => {
    if (stageRef.current) {
      setStageRef(stageRef.current)
    }
  }, [stageRef.current, setStageRef])

  // Calculate all snap points for debug visualization (always visible)
  // TARGET THE "GREEN PIPE" (CENTER AXIS) - Ignore plate edges and corners
  // The goal is to snap ONLY to the ends of the 'Green Pipe' visual that runs through the center
  useEffect(() => {
    const allHeatPlatesForDebug: HeatPlate[] = rooms.flatMap(room => room.heatPlates || [])
    const snapPoints: Array<{ x: number; y: number; type: string }> = []
    
    allHeatPlatesForDebug.forEach(plate => {
      // Map HeatPlate properties to the raw coordinate system
      const p = {
        x: plate.x1,
        y: plate.y1,
        width: plate.width,
        height: plate.y2 - plate.y1
      }
      
      // 1. Calculate the geometric center (Axis position)
      const centerX = p.x + p.width / 2
      const centerY = p.y + p.height / 2
      
      // 2. Determine orientation (Is the pipe Horizontal or Vertical?)
      // Use Math.abs to handle negative drawing directions
      const isHorizontal = Math.abs(p.width) > Math.abs(p.height)
      
      if (isHorizontal) {
        // --- HORIZONTAL PIPE ---
        // The pipe runs along the Y-Center.
        // We need the two ends on the X-axis (Leftmost and Rightmost).
        const x1 = Math.min(p.x, p.x + p.width) // Absolute Left
        const x2 = Math.max(p.x, p.x + p.width) // Absolute Right
        
        // Add Snap Points at the ends of the Green Pipe
        snapPoints.push({ x: x1, y: centerY, type: 'plate' })
        snapPoints.push({ x: x2, y: centerY, type: 'plate' })
      } else {
        // --- VERTICAL PIPE ---
        // The pipe runs along the X-Center.
        // We need the two ends on the Y-axis (Topmost and Bottommost).
        const y1 = Math.min(p.y, p.y + p.height) // Absolute Top
        const y2 = Math.max(p.y, p.y + p.height) // Absolute Bottom
        
        // Add Snap Points at the ends of the Green Pipe
        snapPoints.push({ x: centerX, y: y1, type: 'plate' })
        snapPoints.push({ x: centerX, y: y2, type: 'plate' })
      }
    })
    
    setDebugSnapPoints(snapPoints)
  }, [rooms])

  // Canvas dimensions in ORIGINAL coordinates (unscaled)
  // Stage will apply visual scaling via scale prop
  const canvasWidth = pdf.pageWidth
  const canvasHeight = pdf.pageHeight
  const scale = pdf.viewScale

  // =========================================================
  // GEOMETRIC SELECTION - MouseDown Handler (Hybrid Workflow)
  // =========================================================
  const handleStageMouseDown = (e: any) => {
    if (!pdf.url) return

    const stage = stageRef.current
    if (!stage) return

    // CRITICAL: Use getRelativePointerPosition() 
    // This automatically handles (PointerPos - StagePos) / Scale
    const pointerPos = stage.getRelativePointerPosition()
    
    if (!pointerPos) return

    // Point is in ORIGINAL (unscaled) coordinates
    const point: Point = {
      x: pointerPos.x,
      y: pointerPos.y,
    }

    // Handle asset placement mode (highest priority)
    if (placingAsset) {
      // Calculate scale factor: Inkscape units (1 unit ≈ 0.26458mm) to pixels
      const scaleFactor = 0.26458 * (pdf.pxPerMeter ? pdf.pxPerMeter / 1000 : 1)
      
      // Get current placement rotation from store
      const placementRotation = useStore.getState().placementRotation || 0
      
      const element: ManualElement = {
        id: `manual-${placingAsset.id}-${Date.now()}`,
        assetId: placingAsset.id,
        position: point,
        scaleX: scaleFactor,
        scaleY: scaleFactor,
        rotation: placementRotation, // Use global placement rotation
        paths: placingAsset.paths,
      }
      
      addManualElement(element)
      return
    }

    // Handle connection point setting mode
    if (isSettingConnectionPoint && selectedRoomId) {
      setConnectionPoint(selectedRoomId, point)
      setIsSettingConnectionPoint(false)
      return
    }

    // Handle room drawing mode
    if (roomDrawing.isActive) {
      // Check if clicking near the first point to close polygon
      if (roomDrawing.currentPoints.length >= 3) {
        const firstPoint = roomDrawing.currentPoints[0]
        const distance = Math.sqrt(
          Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
        )
        
        // If within 10 pixels of first point, close the polygon
        if (distance < 10) {
          closeRoomPolygon()
          return
        }
      }
      
      // Add point to room
      addRoomPoint(point)
      return
    }

    // Handle measurement mode
    if (measurement.isActive) {
      if (!measurement.isDrawing) {
        // Start new measurement
        startMeasurement(point)
      } else {
        // Complete measurement
        completeMeasurement(point)
      }
      return
    }

    // Handle calibration mode
    if (calibration.isCalibrating && calibration.isDrawingLine) {
      updateCalibrationLineEnd(point)
      return
    }

    // =========================================================
    // BUFFERED HIT TEST (The "Fat Finger Fix")
    // Use a 10x10px click buffer instead of single point check
    // This makes single-click selection as reliable as marquee
    // =========================================================
    
    // 1. DEFINE A "CLICK BUFFER" (10x10px area around mouse)
    const clickTolerance = 10
    const mouseRect = {
      x: point.x - clickTolerance / 2,
      y: point.y - clickTolerance / 2,
      width: clickTolerance,
      height: clickTolerance,
    }
    
    // 2. HIT TEST (Loop backwards to find topmost element)
    let hitElementId: string | null = null
    let hitElement: ManualElement | null = null
    
    for (let i = manualElements.length - 1; i >= 0; i--) {
      const el = manualElements[i]
      const asset = getAssetById(el.assetId)
      if (!asset) continue
      
      // REWRITTEN: Robust Normalized Box Logic
      const width = asset.width || 400 // Use asset width, fallback to 400
      const height = 1200 // Height is consistent across assets
      
      // 1. Calculate Un-Transformed Corners relative to element position
      // Note: If scaleX is -1, the element extends to the LEFT of el.x
      const sX = el.scaleX || 1
      const sY = el.scaleY || 1
      
      // 2. Determine actual World Boundaries
      // If sX is positive: x to x+w. If sX is negative: x-w to x.
      let minX = el.position.x
      let maxX = el.position.x + (width * sX)
      let minY = el.position.y
      let maxY = el.position.y + (height * sY)
      
      // Normalize (Swap if min > max due to negative scale)
      if (minX > maxX) {
        const temp = minX
        minX = maxX
        maxX = temp
      }
      if (minY > maxY) {
        const temp = minY
        minY = maxY
        maxY = temp
      }
      
      // 3. Add Padding (Fat Finger Tolerance)
      const padding = 10
      minX -= padding
      maxX += padding
      minY -= padding
      maxY += padding
      
      // 4. CHECK HIT (Point-in-Box test)
      if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
        hitElementId = el.id
        hitElement = el
        break // Stop at first hit (topmost element)
      }
    }

    // =========================================================
    // DECISION MATRIX
    // =========================================================
    if (hitElementId && hitElement) {
      // CASE: HIT - Element selected
      e.evt.preventDefault() // Stop canvas panning
      
      // Handle Multi-Select (Shift) vs Single Select
      if (e.evt.shiftKey) {
        // Shift+Click: Toggle selection
        if (selectedElementIds.includes(hitElementId)) {
          removeFromSelection(hitElementId)
        } else {
          addToSelection(hitElementId)
        }
      } else {
        // Normal Click: Select only this element
        setSelectedElementIds([hitElementId])
      }
      
      // 1. FIND CLOSEST ANCHOR (Multi-Point Snapping) - SIMPLIFIED X-DISTANCE CHECK
      const el = hitElement
      const asset = getAssetById(hitElementId)
      
      // Get anchors based on rotation - use anchors90 if element is rotated 90° and available
      let anchors: Array<{ x: number; y: number }>
      if (el.rotation === 90 && asset?.anchors90 && asset.anchors90.length > 0) {
        anchors = asset.anchors90
      } else if (asset && asset.anchors && asset.anchors.length > 0) {
        anchors = asset.anchors
      } else {
        anchors = [{ x: 100, y: 1100 }]
      }
      
      // CALCULATE CLOSEST ANCHOR (Simple X-distance check for now)
      let bestAnchor = anchors[0]
      let bestAnchorIndex = 0
      let minDist = Infinity
      
      const sX = el.scaleX || 1
      
      // Loop through anchors to find closest to mouse
      anchors.forEach((anchor, index) => {
        // World X of this anchor (simplified - no rotation for now)
        const worldAnchorX = el.position.x + (anchor.x * sX)
        const dist = Math.abs(point.x - worldAnchorX) // Simple X distance check
        
        if (dist < minDist) {
          minDist = dist
          bestAnchor = anchor
          bestAnchorIndex = index
        }
      })
      
      // SAVE SELECTION
      setDragAnchorOffset(bestAnchor)
      setActiveAnchorIndex(bestAnchorIndex)
      // 2. CALCULATE OFFSET (The Anchor)
      // "How far is the mouse from the element's top-left corner?"
      const offsetX = point.x - hitElement.position.x
      const offsetY = point.y - hitElement.position.y
      
      // Store offset for smooth dragging
      setDragOffset({ x: offsetX, y: offsetY })
      setDragStartPos(point)
      
      // CRITICAL: Capture element's initial position for axis locking
      setElementStartPos({ x: hitElement.position.x, y: hitElement.position.y })
      
      // Prepare for potential drag
      setSelectionMode('drag')
      setDraggedElementId(hitElementId)
      setIsDragging(true)
      
    } else {
      // CASE: MISS (Empty Space) - Start Marquee Selection
      e.evt.preventDefault() // Stop canvas panning
      
      // Clear drag state
      setDragOffset(null)
      setSnapLines({ vertical: null, horizontal: null })
      
      // Only clear selection if NOT holding Shift
      if (!e.evt.shiftKey) {
        clearSelection()
      }
      
      // Start Marquee Selection
      setSelectionMode('marquee')
      setSelectionStart(point)
      setSelectionRect({ x: point.x, y: point.y, width: 0, height: 0 })
    }
  }

  // =========================================================
  // GEOMETRIC SELECTION - MouseMove Handler
  // =========================================================
  const handleStageMouseMove = (e: any) => {
    if (!pdf.url) return

    const stage = stageRef.current
    if (!stage) return

    // CRITICAL: Use getRelativePointerPosition()
    // This automatically handles (PointerPos - StagePos) / Scale
    const pointerPos = stage.getRelativePointerPosition()
    
    if (!pointerPos) return

    // Point is in ORIGINAL (unscaled) coordinates
    const point: Point = {
      x: pointerPos.x,
      y: pointerPos.y,
    }

    // Handle MARQUEE SELECTION mode
    if (selectionMode === 'marquee' && selectionStart) {
      const rect = normalizeRect(selectionStart.x, selectionStart.y, point.x, point.y)
      setSelectionRect(rect)
      return
    }

    // Handle DRAG mode - Offset-based positioning (smooth, no jitter)
    if (selectionMode === 'drag' && dragOffset && selectedElementIds.length > 0) {
      // Only move if we grabbed something
      const selectedId = selectedElementIds[0] // For single element drag
      const element = manualElements.find(el => el.id === selectedId)
      
      if (!element) {
        setDragOffset(null)
        return
      }
      
      // 1. CALCULATE RAW POSITION (Follow Mouse accurately with offset)
      // Use Start + Delta logic for axis locking stability
      const axisLock = activeAxisLock
      
      // Ensure elementStartPos was captured on MouseDown
      if (!elementStartPos) {
        // Fallback: capture current position if start pos not captured
        setElementStartPos({ x: element.position.x, y: element.position.y })
        return
      }
      
      // Calculate Delta relative to drag start
      if (!dragStartPos) {
        // Fallback: use offset-based calculation if dragStartPos not available
        setDragStartPos(point)
        return
      }
      
      let dx = point.x - dragStartPos.x
      let dy = point.y - dragStartPos.y
      
      // APPLY AXIS LOCK
      if (axisLock === 'x') {
        dy = 0 // No vertical movement - lock to X axis
      }
      if (axisLock === 'y') {
        dx = 0 // No horizontal movement - lock to Y axis
      }
      
      // Calculate New Position (Start Position + Delta)
      let newX = elementStartPos.x + dx
      let newY = elementStartPos.y + dy
      
      // 2. MAGNETIC SNAPPING (Using Custom Anchor Point)
      let activeSnap: number | null = null
      
      if (snapEnabled && !e.evt.shiftKey && selectedElementIds.length === 1) {
        // Get asset definition to check for custom snapX/snapY
        const asset = getAssetById(element.assetId)
        if (!asset) {
          setSnapLines({ vertical: null, horizontal: null })
          return
        }
        
        // USE ACTIVE ANCHOR (Multi-Point Snapping) - Use stored dragAnchorOffset
        // 1. Get current scale (default to 1 if undefined)
        const sX = element.scaleX || 1
        const sY = element.scaleY || 1
        
        // 2. Get the active anchor (stored during mouseDown in dragAnchorOffset)
        // CRITICAL: Use dragAnchorOffset which contains the anchor closest to the mouse click
        // Also check if element is rotated 90° to use anchors90 if available
        let activeAnchor = { x: 100, y: 1100 } // Default fallback (standard anchor position)
        
        if (dragAnchorOffset) {
          // Use the anchor that was selected during mouseDown (closest to click)
          activeAnchor = dragAnchorOffset
        } else {
          // Determine which anchor array to use based on rotation
          const anchors = (element.rotation === 90 && asset.anchors90 && asset.anchors90.length > 0)
            ? asset.anchors90
            : (asset.anchors && asset.anchors.length > 0 ? asset.anchors : [{ x: 100, y: 1100 }])
          
          // Fallback: use the active anchor index (set during mouseDown)
          const anchorIndex = activeAnchorIndex !== null ? activeAnchorIndex : 0
          activeAnchor = anchors[anchorIndex] || anchors[0] || { x: 100, y: 1100 }
        }
        
        // 3. Calculate Effective Anchor Point (Apply Mirroring)
        // If scale is -1, the snap offset must also flip sign.
        const anchorXPx = activeAnchor.x * sX // Multiply by scale (including sign for mirroring)
        const anchorYPx = activeAnchor.y * sY // Multiply by scale (including sign for mirroring)
        
        // 4. Calculate where the magnet "really" is in the world
        const elementSnapPointX = newX + anchorXPx
        const elementSnapPointY = newY + anchorYPx
        
        // Collect all HeatPlates from all rooms for snapping
        const allHeatPlates: HeatPlate[] = rooms.flatMap(room => room.heatPlates || [])
        
        // =========================================================
        // SNAPPING (TARGET THE "GREEN PIPE" CENTER AXIS)
        // =========================================================
        // Ignore plate edges and corners. Snap ONLY to the ends of the 'Green Pipe' visual
        // that runs through the center of the Heat Plate. We calculate the geometric center axis
        // and place snap points at the absolute start and end of that axis.
        const snapThresholdPx = 25
        let closestDistX = Infinity
        let snapTargetX: number | null = null
        let bestSnapY: number | null = null
        let minDistY = Infinity
        
        // Calculate element's geometric bounds for overlap checks
        const assetWidth = asset.width || 400
        const assetHeight = 1200
        let elWidthPx = Math.abs(element.scaleX) * assetWidth
        let elHeightPx = Math.abs(element.scaleY) * assetHeight
        let elTop = newY
        let elBottom = newY + elHeightPx
        let elLeft = newX
        let elRight = newX + elWidthPx
        
        // Normalize for negative scales
        if (element.scaleY < 0) {
          elTop = newY + elHeightPx
          elBottom = newY
        }
        if (element.scaleX < 0) {
          elLeft = newX + elWidthPx
          elRight = newX
        }
        
        allHeatPlates.forEach(plate => {
          // Map HeatPlate properties to the raw coordinate system
          const p = {
            x: plate.x1,
            y: plate.y1,
            width: plate.width,
            height: plate.y2 - plate.y1
          }
          
          // 1. Calculate the geometric center (Axis position)
          const centerX = p.x + p.width / 2
          const centerY = p.y + p.height / 2
          
          // 2. Determine orientation (Is the pipe Horizontal or Vertical?)
          // Use Math.abs to handle negative drawing directions
          const isHorizontal = Math.abs(p.width) > Math.abs(p.height)
          
          // Calculate plate boundaries (normalized for overlap checks)
          const plateLeftX = Math.min(p.x, p.x + p.width)
          const plateRightX = Math.max(p.x, p.x + p.width)
          const plateTopY = Math.min(p.y, p.y + p.height)
          const plateBottomY = Math.max(p.y, p.y + p.height)
          
          if (isHorizontal) {
            // --- HORIZONTAL PIPE ---
            // The pipe runs along the Y-Center.
            // We need the two ends on the X-axis (Leftmost and Rightmost).
            const x1 = Math.min(p.x, p.x + p.width) // Absolute Left
            const x2 = Math.max(p.x, p.x + p.width) // Absolute Right
            
            // Check vertical overlap (element must overlap plate vertically to snap)
            const isVerticallyOverlapping = elBottom > plateTopY && elTop < plateBottomY
            
            if (isVerticallyOverlapping) {
              // End 1: Left end of the Green Pipe (x1, centerY)
              const distX1 = Math.abs(elementSnapPointX - x1)
              if (distX1 < snapThresholdPx && distX1 < closestDistX) {
                closestDistX = distX1
                snapTargetX = x1
                
                // Also snap Y to center axis when X aligns
                const distY = Math.abs(elementSnapPointY - centerY)
                if (distY < snapThresholdPx && distY < minDistY) {
                  minDistY = distY
                  bestSnapY = centerY - anchorYPx
                }
              }
              
              // End 2: Right end of the Green Pipe (x2, centerY)
              const distX2 = Math.abs(elementSnapPointX - x2)
              if (distX2 < snapThresholdPx && distX2 < closestDistX) {
                closestDistX = distX2
                snapTargetX = x2
                
                // Also snap Y to center axis when X aligns
                const distY = Math.abs(elementSnapPointY - centerY)
                if (distY < snapThresholdPx && distY < minDistY) {
                  minDistY = distY
                  bestSnapY = centerY - anchorYPx
                }
              }
            }
          } else {
            // --- VERTICAL PIPE ---
            // The pipe runs along the X-Center.
            // We need the two ends on the Y-axis (Topmost and Bottommost).
            const y1 = Math.min(p.y, p.y + p.height) // Absolute Top
            const y2 = Math.max(p.y, p.y + p.height) // Absolute Bottom
            
            // Check horizontal overlap (element must overlap plate horizontally to snap)
            const isHorizontallyOverlapping = elRight > plateLeftX && elLeft < plateRightX
            
            if (isHorizontallyOverlapping) {
              // End 1: Top end of the Green Pipe (centerX, y1)
              const distY1 = Math.abs(elementSnapPointY - y1)
              if (distY1 < snapThresholdPx && distY1 < minDistY) {
                minDistY = distY1
                bestSnapY = y1 - anchorYPx
                
                // Also snap X to center when Y aligns
                const distX = Math.abs(elementSnapPointX - centerX)
                if (distX < snapThresholdPx && distX < closestDistX) {
                  closestDistX = distX
                  snapTargetX = centerX - anchorXPx
                }
              }
              
              // End 2: Bottom end of the Green Pipe (centerX, y2)
              const distY2 = Math.abs(elementSnapPointY - y2)
              if (distY2 < snapThresholdPx && distY2 < minDistY) {
                minDistY = distY2
                bestSnapY = y2 - anchorYPx
                
                // Also snap X to center when Y aligns
                const distX = Math.abs(elementSnapPointX - centerX)
                if (distX < snapThresholdPx && distX < closestDistX) {
                  closestDistX = distX
                  snapTargetX = centerX - anchorXPx
                }
              }
            }
          }
        })
        
        // APPLY X SNAP
        if (snapTargetX !== null) {
          // Adjust X so element's custom anchor point aligns with snap target
          newX = snapTargetX - anchorXPx
          activeSnap = snapTargetX // For visual guide line
        }
        
        // APPLY Y SNAP
        if (bestSnapY !== null) {
          newY = bestSnapY
        }
        
        // Update Visual Snap Lines
        setSnapLines({
          vertical: activeSnap, // X-axis snap (vertical line)
          horizontal: bestSnapY !== null ? (bestSnapY + anchorYPx) : null, // Y-axis snap (horizontal line)
        })
      } else {
        // No snapping - clear snap lines
        setSnapLines({ vertical: null, horizontal: null })
      }
      
      // 3. UPDATE STORE (Absolute position, not delta)
      updateManualElement(selectedId, {
        position: { x: newX, y: newY }
      })
      
      return
    }

    // Handle measurement mode
    if (measurement.isActive && measurement.isDrawing) {
      updateMeasurement(point)
      return
    }

    // Handle calibration mode
    if (calibration.isCalibrating && calibration.isDrawingLine) {
      updateCalibrationLineEnd(point)
      return
    }
  }

  // =========================================================
  // GEOMETRIC SELECTION - MouseUp Handler (Pure Math)
  // =========================================================
  const handleStageMouseUp = (e: any) => {
    if (!pdf.url) return

    const stage = stageRef.current
    if (!stage) return

    // CRITICAL: Use getRelativePointerPosition()
    const pointerPos = stage.getRelativePointerPosition()
    
    if (!pointerPos) return

    const mousePos: Point = {
      x: pointerPos.x,
      y: pointerPos.y,
    }

    // Handle MARQUEE SELECTION completion (only if we were in marquee mode)
    if (selectionMode === 'marquee' && selectionRect) {
      console.log('🖱️ MouseUp -> Complete MARQUEE selection')
      
      // Check if selection box is tiny (just a click)
      const isPointSelection = selectionRect.width < 5 && selectionRect.height < 5
      
      if (isPointSelection) {
        // Point selection was already handled in MouseDown, just clear state
      } else {
        // Marquee selection: Check which elements intersect the selection box
        // ROBUST: Use actual asset dimensions and handle mirroring correctly
        const selectedIds: string[] = []
        
        manualElements.forEach(element => {
          const asset = getAssetById(element.assetId)
          if (!asset) return // Skip if asset not found
          
          // Get actual asset dimensions
          const assetWidth = asset.width || 400
          const assetHeight = 1200 // Height is consistent across assets
          
          // Robust Bounding Box Calculation (Handle Mirroring)
          const rawW = assetWidth * (element.scaleX || 1)
          const rawH = assetHeight * (element.scaleY || 1)
          
          // Normalize: visual X/Y is always top-left of the box
          const x = rawW < 0 ? element.position.x + rawW : element.position.x
          const y = rawH < 0 ? element.position.y + rawH : element.position.y
          const w = Math.abs(rawW)
          const h = Math.abs(rawH)
          
          // Check Intersection with marquee selection box
          const intersects = (
            x < selectionRect.x + selectionRect.width &&
            x + w > selectionRect.x &&
            y < selectionRect.y + selectionRect.height &&
            y + h > selectionRect.y
          )
          
          // LOG DEBUG INFO (Only if intersects)
          if (intersects) {
            selectedIds.push(element.id)
          }
        })
        
        if (e.evt.shiftKey) {
          // Shift+Drag: Add to selection
          selectedIds.forEach(id => {
            if (!selectedElementIds.includes(id)) {
              addToSelection(id)
            }
          })
        } else {
          // Normal Drag: Replace selection
          setSelectedElementIds(selectedIds)
        }
      }
      
      // Clear selection state
      setSelectionRect(null)
      setSelectionStart(null)
      setSelectionMode('none')
      return
    }

    // Handle DRAG completion
    if (selectionMode === 'drag') {
      setSelectionMode('none')
      setIsDragging(false)
      setDragStartPos(null)
      setDragOffset(null) // Clear offset
      setDraggedElementId(null)
      setActiveAnchorIndex(null) // Clear active anchor
      setDragAnchorOffset(null) // Clear stored anchor
      setElementStartPos(null) // Clear element start position
      setSnapLines({ vertical: null, horizontal: null }) // Clear snap lines
      setSnapIndicator(null)
      return
    }
  }

  // ESC key handler to exit measurement mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && measurement.isActive) {
        setMeasurementActive(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [measurement.isActive, setMeasurementActive])

  if (!pdf.url || canvasWidth === 0 || canvasHeight === 0) {
    return null
  }

  const calibrationLine = calibration.line
  const showCalibrationLine = calibrationLine && calibration.isDrawingLine

  // Double-click handler to close room polygon
  const handleStageDoubleClick = (_e: any) => {
    if (roomDrawing.isActive && roomDrawing.currentPoints.length >= 3) {
      closeRoomPolygon()
    }
  }

  const cursorStyle = measurement.isActive ? 'crosshair' 
    : roomDrawing.isActive ? 'crosshair'
    : 'default'

  return (
    <div 
      className="absolute top-0 left-0 pointer-events-none z-10" 
      style={{ width: '100%', height: '100%' }}
      onContextMenu={(e) => e.preventDefault()} // Disable browser context menu on right-click
    >
      <Stage
        ref={stageRef}
        width={canvasWidth * scale}
        height={canvasHeight * scale}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onDblClick={handleStageDoubleClick}
        style={{ 
          pointerEvents: 'auto',
          cursor: cursorStyle,
        }}
      >
        <Layer>
          {/* Calibration line */}
          {showCalibrationLine && (
            <Line
              points={[
                calibrationLine.start.x,
                calibrationLine.start.y,
                calibrationLine.end.x,
                calibrationLine.end.y,
              ]}
              stroke="#FF0000"
              strokeWidth={2}
              lineCap="round"
              dash={[5, 5]}
            />
          )}
          
          {/* Current measurement line (while drawing) - with real-time distance */}
          {measurement.currentLine && measurement.isDrawing && pdf.pxPerMeter && (
            <>
              <Line
                points={[
                  measurement.currentLine.start.x,
                  measurement.currentLine.start.y,
                  measurement.currentLine.end.x,
                  measurement.currentLine.end.y,
                ]}
                stroke="#FF0000"
                strokeWidth={2}
                lineCap="round"
                dash={[8, 4]}
              />
              {(() => {
                // Calculate real-time distance
                const dx = measurement.currentLine.end.x - measurement.currentLine.start.x
                const dy = measurement.currentLine.end.y - measurement.currentLine.start.y
                const pixelLength = Math.sqrt(dx * dx + dy * dy)
                const distanceMeters = pixelLength / pdf.pxPerMeter
                
                const midX = (measurement.currentLine.start.x + measurement.currentLine.end.x) / 2
                const midY = (measurement.currentLine.start.y + measurement.currentLine.end.y) / 2
                
                return (
                  <>
                    {/* White background for readability */}
                    <Text
                      x={midX}
                      y={midY - 20}
                      text={`${distanceMeters.toFixed(2)} m`}
                      fontSize={16}
                      fill="#ffffff"
                      padding={8}
                      align="center"
                      offsetX={0}
                      offsetY={0}
                    />
                    {/* Red text on top */}
                    <Text
                      x={midX}
                      y={midY - 20}
                      text={`${distanceMeters.toFixed(2)} m`}
                      fontSize={16}
                      fill="#FF0000"
                      padding={8}
                      align="center"
                      offsetX={0}
                      offsetY={0}
                    />
                  </>
                )
              })()}
            </>
          )}

          {/* Completed measurements */}
          {measurement.measurements.map((m) => {
            const midX = (m.start.x + m.end.x) / 2
            const midY = (m.start.y + m.end.y) / 2
            
            return (
              <React.Fragment key={m.id}>
                <Line
                  points={[m.start.x, m.start.y, m.end.x, m.end.y]}
                  stroke="#FF0000"
                  strokeWidth={2}
                  lineCap="round"
                  dash={[8, 4]}
                />
                {/* White background for readability */}
                <Text
                  x={midX}
                  y={midY - 20}
                  text={`${m.distanceMeters.toFixed(2)} m`}
                  fontSize={16}
                  fill="#ffffff"
                  padding={8}
                  align="center"
                />
                {/* Red text on top */}
                <Text
                  x={midX}
                  y={midY - 20}
                  text={`${m.distanceMeters.toFixed(2)} m`}
                  fontSize={16}
                  fill="#FF0000"
                  padding={8}
                  align="center"
                />
              </React.Fragment>
            )
          })}
          
          {/* Completed Rooms */}
          {rooms && Array.isArray(rooms) && rooms.map((room) => {
            const isHovered = hoveredRoomId === room.id
            const isSelected = selectedRoomId === room.id

            // Handler for Alt+Click to insert vertex on wall
            const handlePolygonClick = (e: any) => {
              if (!e.evt.altKey) return
              
              e.cancelBubble = true
              const stage = e.target.getStage()
              const pointerPos = stage.getRelativePointerPosition()
              const clickX = pointerPos.x
              const clickY = pointerPos.y
              
              // Find the closest wall segment
              let closestSegmentIndex = 0
              let minDistance = Infinity
              
              for (let i = 0; i < room.points.length; i++) {
                const nextIndex = (i + 1) % room.points.length
                const p1 = room.points[i]
                const p2 = room.points[nextIndex]
                
                // Calculate distance from click point to line segment
                const dx = p2.x - p1.x
                const dy = p2.y - p1.y
                const lengthSquared = dx * dx + dy * dy
                
                if (lengthSquared === 0) continue
                
                // Calculate projection onto line segment
                const t = Math.max(0, Math.min(1, ((clickX - p1.x) * dx + (clickY - p1.y) * dy) / lengthSquared))
                const projX = p1.x + t * dx
                const projY = p1.y + t * dy
                
                // Distance from click to projection
                const distance = Math.sqrt(Math.pow(clickX - projX, 2) + Math.pow(clickY - projY, 2))
                
                if (distance < minDistance) {
                  minDistance = distance
                  closestSegmentIndex = nextIndex
                }
              }
              
              // Insert new point at closest segment
              const newPoints = [...room.points]
              newPoints.splice(closestSegmentIndex, 0, { x: clickX, y: clickY })
              
              updateRoomPoints(room.id, newPoints)
              finalizeRoomPoints(room.id)
            }

            return (
              <React.Fragment key={`${room.id}-${room.systemType}-${room.orientation}-${room.connectionSide}-${room.cdProfiles.length}-${room.heatPlates.length}`}>
                {/* Room Polygon - Highlight on hover, Alt+Click to add vertex */}
                <Line
                  points={room.points.flatMap((p) => [p.x, p.y])}
                  stroke={isHovered ? '#3b82f6' : 'transparent'}
                  strokeWidth={isHovered ? 3 : 0}
                  dash={isHovered ? [10, 5] : undefined}
                  closed
                  fill={isHovered ? 'rgba(59, 130, 246, 0.05)' : 'transparent'}
                  listening={isSelected}
                  onClick={handlePolygonClick}
                  hitStrokeWidth={20}
                />

                {/* CD Profiles (Blue Zones) - Sharp 'Butt-Capped' Lines (Vector CAD Style) */}
                {room.cdProfiles && Array.isArray(room.cdProfiles) && room.cdProfiles.map((profile) => (
                  <Line
                    key={profile.id}
                    points={[profile.x1, profile.y1, profile.x2, profile.y2]}
                    stroke="#4682B4"
                    strokeWidth={profile.width}
                    lineCap="butt"
                    listening={false}
                  />
                ))}

                {/* Heat Plates (Brown Plates) with Green Heating Pipes */}
                {room.heatPlates && Array.isArray(room.heatPlates) && room.heatPlates.map((plate) => {
                  // Convert 16mm pipe to pixels
                  const pipeWidthPx = pdf.pxPerMeter ? (16 / 1000) * pdf.pxPerMeter : 16
                  
                  return (
                    <React.Fragment key={plate.id}>
                      {/* Brown Plate (50mm wide) - Background Layer */}
                      <Line
                        points={[plate.x1, plate.y1, plate.x2, plate.y2]}
                        stroke="#8B4513"
                        strokeWidth={plate.width}
                        lineCap="butt"
                        opacity={0.8}
                        listening={false}
                      />
                      {/* Green Heating Pipe (16mm wide) - Top Layer */}
                      <Line
                        points={[plate.x1, plate.y1, plate.x2, plate.y2]}
                        stroke="#32CD32"
                        strokeWidth={pipeWidthPx}
                        lineCap="butt"
                        listening={false}
                      />
                    </React.Fragment>
                  )
                })}

                {/* Heating Circuits (Green Pipe Routes - REGISTER PATTERN) */}
                {room.heatingCircuits && Array.isArray(room.heatingCircuits) && room.heatingCircuits.map((circuit) => {
                  // Convert 16mm pipe to pixels
                  const pipeWidthPx = pdf.pxPerMeter ? (16 / 1000) * pdf.pxPerMeter : 16
                  if (circuit.pathData) {
                    return (
                      <Path
                        key={circuit.id}
                        data={circuit.pathData}
                        stroke={circuit.color}
                        strokeWidth={pipeWidthPx}
                        lineCap="round"
                        lineJoin="round"
                        opacity={0.9}
                        listening={false}
                      />
                    )
                  }

                  if (circuit.pathPoints && circuit.pathPoints.length > 0) {
                    const pathPointsFlat = circuit.pathPoints.flatMap(p => [p.x, p.y])
                    return (
                      <Line
                        key={circuit.id}
                        points={pathPointsFlat}
                        stroke={circuit.color}
                        strokeWidth={pipeWidthPx}
                        lineCap="round"
                        lineJoin="round"
                        opacity={0.9}
                        listening={false}
                        tension={0.2}
                      />
                    )
                  }

                  return null
                })}

                {/* System 4 Pipe Patterns (Asset-Based Rendering) */}
                {room.pipePatterns && Array.isArray(room.pipePatterns) && room.pipePatterns.map((pattern) => {
                  // Transform: translate(position) rotate(angle) scale(scaleX, scaleY)
                  // Konva applies transforms in order: scale, rotate, translate
                  // This works correctly for our use case
                  return (
                    <Group
                      key={pattern.id}
                      x={pattern.position.x}
                      y={pattern.position.y}
                      rotation={pattern.rotation}
                      scaleX={pattern.scaleX}
                      scaleY={pattern.scaleY}
                      listening={false}
                    >
                      {pattern.paths.map((pathData, pathIndex) => (
                        <Path
                          key={`${pattern.id}-path-${pathIndex}`}
                          data={pathData}
                          fill="#32CD32" // Lime Green, matching pipe color
                          stroke="none" // No stroke, only fill
                          lineCap="round"
                          lineJoin="round"
                          listening={false}
                        />
                      ))}
                    </Group>
                  )
                })}

                {/* Connection Point Visual Feedback (Red Circle) - ONLY FOR SELECTED ROOM */}
                {isSelected && room.connectionPoint && (
                  <Circle
                    x={room.connectionPoint.x}
                    y={room.connectionPoint.y}
                    radius={8}
                    fill="red"
                    stroke="white"
                    strokeWidth={2}
                    opacity={0.9}
                    listening={false}
                  />
                )}

                {/* Wall Dimension Labels (Live Updates) - ONLY FOR SELECTED ROOM */}
                {isSelected && pdf.pxPerMeter && room.points.map((_point, index) => {
                  // Define wall segment from current point to next point
                  const nextIndex = (index + 1) % room.points.length
                  const pointA = room.points[index]
                  const pointB = room.points[nextIndex]
                  
                  // Calculate distance in pixels
                  const distPx = Math.sqrt(
                    Math.pow(pointB.x - pointA.x, 2) + 
                    Math.pow(pointB.y - pointA.y, 2)
                  )
                  
                  // Convert to millimeters (with null safety)
                  const distMm = (distPx / (pdf.pxPerMeter || 1)) * 1000
                  
                  // Calculate midpoint for label position
                  const midX = (pointA.x + pointB.x) / 2
                  const midY = (pointA.y + pointB.y) / 2
                  
                  return (
                    <React.Fragment key={`wall-dim-${room.id}-${index}`}>
                      {/* White background for readability */}
                      <Text
                        x={midX}
                        y={midY}
                        text={`${Math.round(distMm)} mm`}
                        fontSize={14}
                        fontStyle="bold"
                        fill="white"
                        padding={4}
                        align="center"
                        offsetX={0}
                        offsetY={10}
                        listening={false}
                      />
                      {/* Black text on top */}
                      <Text
                        x={midX}
                        y={midY}
                        text={`${Math.round(distMm)} mm`}
                        fontSize={14}
                        fontStyle="bold"
                        fill="black"
                        padding={4}
                        align="center"
                        offsetX={0}
                        offsetY={10}
                        listening={false}
                      />
                    </React.Fragment>
                  )
                })}

                {/* Draggable Anchor Points (Vertex Editing) - ONLY FOR SELECTED ROOM */}
                {isSelected && room.points.map((point, index) => (
                  <Circle
                    key={`anchor-${room.id}-${index}`}
                    x={point.x}
                    y={point.y}
                    radius={8}
                    fill="rgba(255, 255, 255, 0.01)"
                    stroke="#333333"
                    strokeWidth={1}
                    hitStrokeWidth={20}
                    draggable={true}
                    listening={true}
                    onMouseDown={(e) => {
                      e.cancelBubble = true
                    }}
                    onDragStart={(e) => {
                      e.cancelBubble = true
                    }}
                    onDragMove={(e) => {
                      e.cancelBubble = true
                      
                      const newX = e.target.x()
                      const newY = e.target.y()
                      
                      // Create a copy of the points array with the updated point
                      const newPoints = [...room.points]
                      newPoints[index] = { x: newX, y: newY }
                      
                      // FAST UPDATE: Just update points without grid regeneration (for smooth dragging)
                      updateRoomPoints(room.id, newPoints)
                    }}
                    onDragEnd={(e) => {
                      e.cancelBubble = true
                      // SLOW UPDATE: Regenerate grid after dragging finishes
                      finalizeRoomPoints(room.id)
                    }}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) {
                        container.style.cursor = 'pointer'
                      }
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container()
                      if (container) {
                        container.style.cursor = cursorStyle
                      }
                    }}
                  />
                ))}
              </React.Fragment>
            )
          })}

          {/* Current room being drawn */}
          {roomDrawing.isActive && roomDrawing.currentPoints.length > 0 && (
            <>
              {/* Draw lines between points */}
              {roomDrawing.currentPoints.length > 1 && (
                <Line
                  points={roomDrawing.currentPoints.flatMap((p) => [p.x, p.y])}
                  stroke="#0000FF"
                  strokeWidth={2}
                  dash={[5, 5]}
                />
              )}

              {/* Draw points */}
              {roomDrawing.currentPoints.map((point, index) => (
                <React.Fragment key={index}>
                  <Line
                    points={[point.x - 5, point.y, point.x + 5, point.y]}
                    stroke="#0000FF"
                    strokeWidth={2}
                  />
                  <Line
                    points={[point.x, point.y - 5, point.x, point.y + 5]}
                    stroke="#0000FF"
                    strokeWidth={2}
                  />
                </React.Fragment>
              ))}

              {/* Hint text */}
              {roomDrawing.currentPoints.length >= 3 && (
                <Text
                  x={10}
                  y={50}
                  text="Click first point or double-click to close room"
                  fontSize={14}
                  fill="#0000FF"
                  padding={5}
                />
              )}
            </>
          )}
          
          {/* Scale info */}
          {pdf.pxPerMeter !== null && (
            <Text
              x={10}
              y={10}
              text={`Scale: ${pdf.pxPerMeter.toFixed(2)} px/m`}
              fontSize={14}
              fill="#333"
              padding={5}
            />
          )}

          {/* Placement Mode Indicator */}
          {placingAsset && (
            <Text
              x={canvasWidth / 2}
              y={30}
              text={`Placing: ${placingAsset.name} - Click on canvas to place`}
              fontSize={16}
              fill="#FF6600"
              padding={8}
              align="center"
              offsetX={200}
            />
          )}

          {/* Snap Indicator (Vertical line showing snap target) */}
          {snapIndicator && (
            <Line
              points={[
                snapIndicator.x,
                0,
                snapIndicator.x,
                canvasHeight,
              ]}
              stroke="#0066FF"
              strokeWidth={1}
              dash={[5, 5]}
              opacity={0.6}
              listening={false}
            />
          )}

          {/* Marquee Selection Box */}
          {selectionRect && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(0, 0, 255, 0.1)"
              stroke="#0066FF"
              strokeWidth={1}
              dash={[5, 5]}
              listening={false}
            />
          )}

          {/* Mirror Mode Indicator */}
          {mirrorMode && (
            <Text
              x={canvasWidth / 2}
              y={30}
              text="🪞 Mirror Mode: Press X (horizontal) or Y (vertical) to flip"
              fontSize={16}
              fill="#FF6600"
              padding={8}
              align="center"
              offsetX={200}
              listening={false}
            />
          )}

          {/* Placement Rotation Indicator */}
          {placingAsset && (
            <Text
              x={canvasWidth / 2}
              y={30}
              text={placementRotation === 0 
                ? '↕️ Placement: Vertical (0°) - Press H for Horizontal' 
                : '↔️ Placement: Horizontal (90°) - Press V for Vertical'}
              fontSize={14}
              fill="#0066FF"
              padding={6}
              align="center"
              offsetX={200}
              listening={false}
            />
          )}

          {/* Rotation Mode Indicator */}
          {rotationMode && (
            <Text
              x={canvasWidth / 2}
              y={mirrorMode ? 60 : (placingAsset ? 60 : 30)}
              text="🔄 Rotation Mode: Use Arrow Keys (Left/Right) to rotate in 45° steps."
              fontSize={16}
              fill="#0066FF"
              padding={8}
              align="center"
              offsetX={200}
              listening={false}
            />
          )}

          {/* Axis Lock Indicator */}
          {activeAxisLock && (
            <Text
              x={canvasWidth / 2}
              y={mirrorMode ? (rotationMode ? 90 : 60) : (rotationMode ? 60 : (placingAsset ? 60 : 30))}
              text={activeAxisLock === 'x' 
                ? '🔒 Axis Lock: X (Horizontal movement only)' 
                : '🔒 Axis Lock: Y (Vertical movement only)'}
              fontSize={16}
              fill="#FF6600"
              padding={8}
              align="center"
              offsetX={200}
              listening={false}
            />
          )}

          {/* ========================================================= */}
          {/* TOP LAYER: Manual Elements (Zöld csövek) - MUST BE LAST! */}
          {/* ========================================================= */}
          {/* Snap Guide Lines (Vertical and Horizontal Green Lines when snapping) */}
          {snapLines.vertical !== null && (
            <Line
              points={[snapLines.vertical, -1000, snapLines.vertical, 10000]}
              stroke="#00FF00"
              strokeWidth={2}
              dash={[10, 5]}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
          {snapLines.horizontal !== null && (
            <Line
              points={[-10000, snapLines.horizontal, 10000, snapLines.horizontal]}
              stroke="#00FF00"
              strokeWidth={2}
              dash={[10, 5]}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
          
          {/* DEBUG: SHOW SNAP POINTS (TOGGLEABLE) */}
          {showSnapPoints && debugSnapPoints.map((sp, i) => (
            <Circle
              key={`snap-debug-${i}`}
              x={sp.x}
              y={sp.y}
              radius={4}
              fill="#00BFFF" // Deep Sky Blue
              opacity={0.6}
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}
          
          {/* Manual Elements (Placed Assets) - Draggable & Selectable */}
          {manualElements.map((element) => {
            const isSelected = selectedElementIds.includes(element.id)
            
            // Collect all HeatPlates from all rooms for snapping
            const allHeatPlates: HeatPlate[] = rooms.flatMap(room => room.heatPlates || [])
            
            // Use asset width/height if defined, otherwise fallback to defaults
            const asset = getAssetById(element.assetId)
            const assetWidth = asset?.width || 400
            const assetHeight = 1200 // Height is consistent across assets
            const hitAreaWidth = Math.abs(element.scaleX) * assetWidth
            const hitAreaHeight = Math.abs(element.scaleY) * assetHeight
            
            return (
              <Group
                key={element.id}
                x={element.position.x}
                y={element.position.y}
                rotation={element.rotation}
                scaleX={element.scaleX}
                scaleY={element.scaleY}
                draggable={false} // Disable Konva drag - we handle it via Stage mouse events for better control
                listening={true} // CRITICAL: Enable event listening for clickability
                perfectDrawEnabled={false}
                // Transform order: translate -> rotate -> scale (correct for mirroring with rotation)
                // Drag is now handled by Stage's handleStageMouseMove which updates store positions directly
                // onClick/onTap removed - using geometric selection from Stage
              >
                {/* HIT BOX - FULL SIZE TRANSPARENT RECTANGLE FOR EASY SELECTION */}
                {/* This makes selection much easier by providing a large clickable area */}
                {/* Uses normalized bounds to match hit test logic */}
                {(() => {
                  const sX = element.scaleX || 1
                  const sY = element.scaleY || 1
                  
                  // Calculate normalized bounds (same logic as hit test)
                  let minX = 0
                  let maxX = assetWidth * sX
                  let minY = 0
                  let maxY = assetHeight * sY
                  
                  // Normalize (Swap if min > max)
                  if (minX > maxX) {
                    const temp = minX
                    minX = maxX
                    maxX = temp
                  }
                  if (minY > maxY) {
                    const temp = minY
                    minY = maxY
                    maxY = temp
                  }
                  
                  // Add padding (same as hit test)
                  const padding = 10
                  minX -= padding
                  maxX += padding
                  minY -= padding
                  maxY += padding
                  
                  return (
                    <Rect
                      x={minX}
                      y={minY}
                      width={maxX - minX}
                      height={maxY - minY}
                      fill="rgba(0, 0, 0, 0)" // Fully transparent but clickable
                      stroke="none"
                      listening={true} // CRITICAL: Hit area receives events
                      perfectDrawEnabled={false}
                      // Ensure pointer events are enabled for clickability
                      // Event handlers removed - using geometric selection from Stage
                    />
                  )
                })()}
                
                {/* DEBUG HITBOX - Visual proof of hit test bounds (Semi-Transparent Yellow) */}
                {(() => {
                  const sX = element.scaleX || 1
                  const sY = element.scaleY || 1
                  
                  // Calculate normalized bounds (same logic as hit test)
                  let minX = 0
                  let maxX = assetWidth * sX
                  let minY = 0
                  let maxY = assetHeight * sY
                  
                  // Normalize (Swap if min > max)
                  if (minX > maxX) {
                    const temp = minX
                    minX = maxX
                    maxX = temp
                  }
                  if (minY > maxY) {
                    const temp = minY
                    minY = maxY
                    maxY = temp
                  }
                  
                  // Add padding (same as hit test)
                  const padding = 10
                  minX -= padding
                  maxX += padding
                  minY -= padding
                  maxY += padding
                  
                  return (
                    <Rect
                      x={minX}
                      y={minY}
                      width={maxX - minX}
                      height={maxY - minY}
                      fill="rgba(255, 200, 0, 0.3)" // Transparent Yellow
                      stroke="orange"
                      strokeWidth={1}
                      listening={false} // Don't block clicks
                      perfectDrawEnabled={false}
                    />
                  )
                })()}
                
                {/* Selection Visual Feedback - Bright Blue Outline */}
                {isSelected && (
                  <Rect
                    x={-5}
                    y={-5}
                    width={hitAreaWidth + 10}
                    height={hitAreaHeight + 10}
                    stroke="#0066FF" // Bright Blue
                    strokeWidth={2}
                    fill="rgba(0, 100, 255, 0.1)" // Slight tint to show selection clearly
                    dash={[5, 5]}
                    listening={false} // Don't block clicks
                    perfectDrawEnabled={false}
                  />
                )}
                
                {/* SVG Paths */}
                {element.paths.map((pathData, pathIndex) => (
                  <Path
                    key={`${element.id}-path-${pathIndex}`}
                    data={pathData}
                    fill="#32CD32" // Lime Green, matching pipe color
                    stroke={isSelected ? "#0066FF" : "none"}
                    strokeWidth={isSelected ? 1 : 0}
                    lineCap="round"
                    lineJoin="round"
                    listening={false} // Paths don't handle events, Group and hit area do
                  />
                ))}
                
                {/* DEBUG ANCHOR POINTS - Render LAST (highest Z-index) - Bright Red, Always Visible */}
                {(() => {
                  const asset = getAssetById(element.assetId)
                  if (!asset) return null
                  
                  // Get current scale (default to 1 if undefined)
                  const sX = element.scaleX || 1
                  const sY = element.scaleY || 1
                  
                  // Get anchors array based on rotation - use anchors90 if rotated 90° and available
                  let anchors: Array<{ x: number; y: number }> = []
                  if (element.rotation === 90 && asset.anchors90 && asset.anchors90.length > 0) {
                    anchors = asset.anchors90
                  } else if (asset.anchors && asset.anchors.length > 0) {
                    anchors = asset.anchors
                  } else {
                    // Fallback: default anchor if missing
                    anchors = [{ x: 100, y: 1100 }]
                  }
                  
                  // Render all anchor points (ON TOP of everything)
                  return (
                    <>
                      {anchors.map((anchor, index) => {
                        // Calculate scale-aware anchor position (flip sign when mirrored)
                        const anchorXPx = anchor.x * sX
                        const anchorYPx = anchor.y * sY
                        
                        // Highlight the active anchor (if dragging this element)
                        const isActive = draggedElementId === element.id && activeAnchorIndex === index
                        
                        return (
                          <Circle
                            key={`anchor-${index}`}
                            x={anchorXPx}
                            y={anchorYPx}
                            radius={isActive ? 6 : 4} // Larger radius for visibility
                            fill={isActive ? "#00FF00" : "#FF0000"} // Bright Green if active, Bright Red otherwise
                            stroke="#FFFFFF" // White stroke for contrast
                            strokeWidth={2}
                            listening={false}
                            perfectDrawEnabled={false}
                            // Ensure it's on top by rendering last
                          />
                        )
                      })}
                    </>
                  )
                })()}
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}
