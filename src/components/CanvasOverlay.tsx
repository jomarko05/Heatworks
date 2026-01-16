import React, { useRef, useEffect } from 'react'
import { Stage, Layer, Line, Text, Rect, Circle } from 'react-konva'
import { useStore } from '../store/useStore'
import { Point } from '../types'

export default function CanvasOverlay() {
  const { 
    pdf, 
    calibration, 
    measurement,
    rooms,
    roomDrawing,
    hoveredRoomId,
    selectedRoomId,
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
  } = useStore()
  const stageRef = useRef<any>(null)
  const setStageRef = useStore((state) => state.setStageRef)

  // Register stage ref with store (for PDF export)
  useEffect(() => {
    if (stageRef.current) {
      setStageRef(stageRef.current)
      console.log('✓ Stage ref registered with store')
    }
  }, [stageRef.current, setStageRef])

  // Debug: Log when component re-renders due to rooms change
  useEffect(() => {
    console.log('🎨 CanvasOverlay: Re-rendering, rooms count:', rooms?.length || 0)
    if (rooms && rooms.length > 0) {
      rooms.forEach(room => {
        console.log(`  Room ${room.id}: ${room.cdProfiles.length} profiles, ${room.heatPlates.length} plates`)
      })
    }
  }, [rooms])

  // Canvas dimensions in ORIGINAL coordinates (unscaled)
  // Stage will apply visual scaling via scale prop
  const canvasWidth = pdf.pageWidth
  const canvasHeight = pdf.pageHeight
  const scale = pdf.viewScale

  const handleStageClick = (e: any) => {
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
    if (calibration.isCalibrating) {
      // Block drawing if user is entering length (line drawn but not drawing)
      // This prevents starting a new line while the input modal is active
      if (calibration.line && !calibration.isDrawingLine) return

    if (!calibration.isDrawingLine || !calibration.line) {
      // Start new line
      setIsDrawingLine(true)
      updateCalibrationLineStart(point)
      updateCalibrationLineEnd(point)
    } else {
      // End line
      updateCalibrationLineEnd(point)
      setIsDrawingLine(false)
      }
    }
  }

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

    // Handle measurement mode
    if (measurement.isActive && measurement.isDrawing) {
      updateMeasurement(point)
      return
    }

    // Handle calibration mode
    if (calibration.isCalibrating && calibration.isDrawingLine) {
    updateCalibrationLineEnd(point)
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
  const handleStageDoubleClick = (e: any) => {
    if (roomDrawing.isActive && roomDrawing.currentPoints.length >= 3) {
      closeRoomPolygon()
    }
  }

  const isInteractive = calibration.isCalibrating || measurement.isActive || roomDrawing.isActive
  const cursorStyle = measurement.isActive ? 'crosshair' : roomDrawing.isActive ? 'crosshair' : 'default'

  return (
    <div className="absolute top-0 left-0 pointer-events-none z-10" style={{ width: '100%', height: '100%' }}>
      <Stage
        ref={stageRef}
        width={canvasWidth * scale}
        height={canvasHeight * scale}
        scaleX={scale}
        scaleY={scale}
        onClick={handleStageClick}
        onDblClick={handleStageDoubleClick}
        onMouseMove={handleStageMouseMove}
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
              
              console.log(`🔥 ALT+CLICK on room ${room.id} at (${clickX.toFixed(0)}, ${clickY.toFixed(0)})`)
              
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
              
              console.log(`✓ Inserting vertex at index ${closestSegmentIndex}`)
              updateRoomPoints(room.id, newPoints)
              finalizeRoomPoints(room.id)
            }

            return (
              <React.Fragment key={`${room.id}-${room.systemType}-${room.orientation}-${room.cdProfiles.length}-${room.heatPlates.length}`}>
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

                {/* Wall Dimension Labels (Live Updates) - ONLY FOR SELECTED ROOM */}
                {isSelected && pdf.pxPerMeter && room.points.map((point, index) => {
                  // Define wall segment from current point to next point
                  const nextIndex = (index + 1) % room.points.length
                  const pointA = room.points[index]
                  const pointB = room.points[nextIndex]
                  
                  // Calculate distance in pixels
                  const distPx = Math.sqrt(
                    Math.pow(pointB.x - pointA.x, 2) + 
                    Math.pow(pointB.y - pointA.y, 2)
                  )
                  
                  // Convert to millimeters
                  const distMm = (distPx / pdf.pxPerMeter) * 1000
                  
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
                      console.log(`🔥 ANCHOR ${index}: MOUSE DOWN`)
                      e.cancelBubble = true
                    }}
                    onDragStart={(e) => {
                      console.log(`🔥 ANCHOR ${index}: DRAG START`)
                      e.cancelBubble = true
                    }}
                    onDragMove={(e) => {
                      console.log(`🔥 ANCHOR ${index}: DRAGGING (x: ${e.target.x().toFixed(0)}, y: ${e.target.y().toFixed(0)})`)
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
                      console.log(`🔥 ANCHOR ${index}: DRAG END`)
                      e.cancelBubble = true
                      
                      console.log(`🎯 Anchor: Drag ended for room ${room.id}, regenerating grid`)
                      // SLOW UPDATE: Regenerate grid after dragging finishes
                      finalizeRoomPoints(room.id)
                    }}
                    onMouseEnter={(e) => {
                      console.log(`🔥 ANCHOR ${index}: HOVER ON`)
                      const container = e.target.getStage()?.container()
                      if (container) {
                        container.style.cursor = 'pointer'
                      }
                    }}
                    onMouseLeave={(e) => {
                      console.log(`🔥 ANCHOR ${index}: HOVER OFF`)
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
        </Layer>
      </Stage>
    </div>
  )
}
