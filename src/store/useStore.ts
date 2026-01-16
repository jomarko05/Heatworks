import { create } from 'zustand'
import { AppState, CalibrationLine, Point, Measurement, Room, SystemType, Orientation } from '../types'
import { GridCalculator } from '../utils/GridCalculator'

interface Store extends AppState {
  // Persistence flag
  isLoaded: boolean
  setIsLoaded: (isLoaded: boolean) => void
  
  // PDF actions
  setPDFFile: (file: File | null) => void
  setPDFUrl: (url: string | null) => void
  setNumPages: (numPages: number) => void
  setCurrentPage: (page: number) => void
  setScale: (scale: number) => void
  setPxPerMeter: (pxPerMeter: number | null) => void
  setPagePosition: (position: { x: number; y: number } | null) => void
  setPageDimensions: (width: number, height: number) => void
  setViewScale: (scale: number) => void
  
  // Calibration actions
  setIsCalibrating: (isCalibrating: boolean) => void
  setCalibrationLine: (line: CalibrationLine | null) => void
  setIsDrawingLine: (isDrawing: boolean) => void
  updateCalibrationLineStart: (point: Point) => void
  updateCalibrationLineEnd: (point: Point) => void
  setRealLengthMeters: (meters: number) => void
  completeCalibration: () => void
  
  // Measurement actions
  setMeasurementActive: (isActive: boolean) => void
  startMeasurement: (point: Point) => void
  updateMeasurement: (point: Point) => void
  completeMeasurement: (point: Point) => void
  clearMeasurements: () => void
  
  // Room drawing actions
  setRoomDrawingActive: (isActive: boolean) => void
  addRoomPoint: (point: Point) => void
  closeRoomPolygon: () => void
  cancelRoomDrawing: () => void
  setPendingRoomProperties: (name: string, systemType: SystemType, orientation: Orientation) => void
  finishRoom: () => void
  deleteRoom: (roomId: string) => void
  updateRoom: (roomId: string, updates: Partial<Room>) => void
  updateRoomPoints: (roomId: string, newPoints: Point[]) => void
  finalizeRoomPoints: (roomId: string) => void
  setHoveredRoomId: (roomId: string | null) => void
  hoveredRoomId: string | null
  selectRoom: (roomId: string | null) => void
  selectedRoomId: string | null
  
  // Stage ref for PDF export
  stageRef: any
  setStageRef: (ref: any) => void
  exportToPDF: () => void
}

export const useStore = create<Store>((set, get) => ({
  // Persistence flag (CRITICAL: prevents saving before data loads)
  isLoaded: false,
  setIsLoaded: (isLoaded) => set({ isLoaded }),
  
  // Initial state
  pdf: {
    file: null,
    url: null,
    numPages: 0,
    currentPage: 1,
    scale: 1.0,
    pxPerMeter: null,
    pagePosition: null,
    pageWidth: 0,
    pageHeight: 0,
    viewScale: 1.0,
  },
  calibration: {
    isCalibrating: false,
    line: null,
    isDrawingLine: false,
  },
  measurement: {
    isActive: false,
    isDrawing: false,
    currentLine: null,
    measurements: [],
  },
  rooms: [],
  roomDrawing: {
    isActive: false,
    currentPoints: [],
    pendingRoom: null,
  },
  hoveredRoomId: null,
  selectedRoomId: null,
  stageRef: null,

  // PDF actions
  setPDFFile: (file) => {
    if (file) {
      const url = URL.createObjectURL(file)
      set((state) => ({
        pdf: { ...state.pdf, file, url },
      }))
    } else {
      set((state) => {
        if (state.pdf.url) {
          URL.revokeObjectURL(state.pdf.url)
        }
        return {
          pdf: { ...state.pdf, file: null, url: null, numPages: 0, currentPage: 1 },
        }
      })
    }
  },

  setPDFUrl: (url) => set((state) => ({ pdf: { ...state.pdf, url } })),

  setNumPages: (numPages) =>
    set((state) => ({ pdf: { ...state.pdf, numPages } })),

  setCurrentPage: (currentPage) =>
    set((state) => ({ pdf: { ...state.pdf, currentPage } })),

  setScale: (scale) => set((state) => ({ pdf: { ...state.pdf, scale } })),

  setPxPerMeter: (pxPerMeter) =>
    set((state) => ({ pdf: { ...state.pdf, pxPerMeter } })),

  setPagePosition: (pagePosition) =>
    set((state) => ({ pdf: { ...state.pdf, pagePosition } })),

  setPageDimensions: (width, height) =>
    set((state) => ({ pdf: { ...state.pdf, pageWidth: width, pageHeight: height } })),

  setViewScale: (viewScale) =>
    set((state) => ({ pdf: { ...state.pdf, viewScale } })),

  // Calibration actions
  setIsCalibrating: (isCalibrating) =>
    set((state) => ({
      calibration: { ...state.calibration, isCalibrating },
    })),

  setCalibrationLine: (line) =>
    set((state) => ({
      calibration: { ...state.calibration, line },
    })),

  setIsDrawingLine: (isDrawing) =>
    set((state) => ({
      calibration: { ...state.calibration, isDrawingLine: isDrawing },
    })),

  updateCalibrationLineStart: (point: Point) => {
    const { calibration } = get()
    const line: CalibrationLine = {
      start: point,
      end: calibration.line?.end || point,
      realLengthMeters: calibration.line?.realLengthMeters || null,
    }
    set({ calibration: { ...calibration, line } })
  },

  updateCalibrationLineEnd: (point: Point) => {
    const { calibration } = get()
    const line: CalibrationLine = {
      start: calibration.line?.start || point,
      end: point,
      realLengthMeters: calibration.line?.realLengthMeters || null,
    }
    set({ calibration: { ...calibration, line } })
  },

  setRealLengthMeters: (meters: number) => {
    const { calibration } = get()
    const line: CalibrationLine = {
      start: calibration.line?.start || { x: 0, y: 0 },
      end: calibration.line?.end || { x: 0, y: 0 },
      realLengthMeters: meters,
    }
    set({ calibration: { ...calibration, line } })
  },

  completeCalibration: () => {
    const { calibration, setPxPerMeter } = get()
    if (calibration.line && calibration.line.realLengthMeters) {
      const dx = calibration.line.end.x - calibration.line.start.x
      const dy = calibration.line.end.y - calibration.line.start.y
      const pixelLength = Math.sqrt(dx * dx + dy * dy)
      const pxPerMeter = pixelLength / calibration.line.realLengthMeters
      setPxPerMeter(pxPerMeter)
      set({
        calibration: {
          isCalibrating: false,
          line: null,
          isDrawingLine: false,
        },
      })
    }
  },

  // Measurement actions
  setMeasurementActive: (isActive) => {
    set((state) => ({
      measurement: {
        ...state.measurement,
        isActive,
        isDrawing: false,
        currentLine: null,
      },
    }))
  },

  startMeasurement: (point) => {
    set((state) => ({
      measurement: {
        ...state.measurement,
        isDrawing: true,
        currentLine: { start: point, end: point },
      },
    }))
  },

  updateMeasurement: (point) => {
    const { measurement } = get()
    if (measurement.currentLine) {
      set((state) => ({
        measurement: {
          ...state.measurement,
          currentLine: { ...measurement.currentLine!, end: point },
        },
      }))
    }
  },

  completeMeasurement: (point) => {
    const { measurement, pdf } = get()
    if (measurement.currentLine && pdf.pxPerMeter) {
      const dx = point.x - measurement.currentLine.start.x
      const dy = point.y - measurement.currentLine.start.y
      const pixelLength = Math.sqrt(dx * dx + dy * dy)
      const distanceMeters = pixelLength / pdf.pxPerMeter

      const newMeasurement: Measurement = {
        id: Date.now().toString(),
        start: measurement.currentLine.start,
        end: point,
        distanceMeters,
      }

      set((state) => ({
        measurement: {
          ...state.measurement,
          isDrawing: false,
          currentLine: null,
          measurements: [...state.measurement.measurements, newMeasurement],
        },
      }))
    }
  },

  clearMeasurements: () => {
    set((state) => ({
      measurement: {
        ...state.measurement,
        measurements: [],
        currentLine: null,
        isDrawing: false,
      },
    }))
  },

  // Room drawing actions
  setRoomDrawingActive: (isActive) => {
    set((state) => ({
      roomDrawing: {
        ...state.roomDrawing,
        isActive,
        currentPoints: isActive ? [] : state.roomDrawing.currentPoints,
      },
    }))
  },

  addRoomPoint: (point) => {
    set((state) => ({
      roomDrawing: {
        ...state.roomDrawing,
        currentPoints: [...state.roomDrawing.currentPoints, point],
      },
    }))
  },

  closeRoomPolygon: () => {
    const { roomDrawing } = get()
    if (roomDrawing.currentPoints.length < 3) {
      alert('A room needs at least 3 points')
      return
    }

    // Create pending room (without properties set yet)
    const pendingRoom: Room = {
      id: Date.now().toString(),
      name: '',
      points: roomDrawing.currentPoints,
      systemType: 'System 4',
      orientation: 'Vertical',
      cdProfiles: [],
      heatPlates: [],
      area: 0,
      profileStats: [],
      plateMaterials: [],
    }

    set((state) => ({
      roomDrawing: {
        ...state.roomDrawing,
        pendingRoom,
      },
    }))
  },

  cancelRoomDrawing: () => {
    set((state) => ({
      roomDrawing: {
        isActive: false,
        currentPoints: [],
        pendingRoom: null,
      },
    }))
  },

  setPendingRoomProperties: (name, systemType, orientation) => {
    const { roomDrawing } = get()
    if (roomDrawing.pendingRoom) {
      set((state) => ({
        roomDrawing: {
          ...state.roomDrawing,
          pendingRoom: {
            ...roomDrawing.pendingRoom,
            name,
            systemType,
            orientation,
          },
        },
      }))
    }
  },

  finishRoom: () => {
    const { roomDrawing, rooms } = get()
    if (roomDrawing.pendingRoom) {
      set({
        rooms: [...rooms, roomDrawing.pendingRoom],
        roomDrawing: {
          isActive: false,
          currentPoints: [],
          pendingRoom: null,
        },
      })
    }
  },

  deleteRoom: (roomId) => {
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
    }))
  },

  updateRoom: (roomId, updates) => {
    set((state) => {
      const roomIndex = state.rooms.findIndex((r) => r.id === roomId)
      
      if (roomIndex === -1) {
        console.warn(`❌ Room ${roomId} not found`)
        return state
      }

      const room = state.rooms[roomIndex]
      const updatedRoom = { ...room, ...updates }

      console.log(`🔥 STORE: UPDATING ROOM ${roomId}:`, updates)
      console.log(`   📊 Before:`, { system: room.systemType, orientation: room.orientation })
      console.log(`   📊 After:`, { system: updatedRoom.systemType, orientation: updatedRoom.orientation })
      
      if (updates.systemType) {
        console.log(`   🎯 UPDATING SYSTEM: ${room.systemType} → ${updates.systemType}`)
      }
      if (updates.orientation) {
        console.log(`   🎯 UPDATING ORIENTATION: ${room.orientation} → ${updates.orientation}`)
      }

      // If system type or orientation changed, regenerate grid
      if (updates.systemType || updates.orientation) {
        if (state.pdf.pxPerMeter) {
          const calculator = new GridCalculator(state.pdf.pxPerMeter)
          const roomWithGrid = calculator.generateRoomGrid(updatedRoom)
          
          console.log(`✓ Store: Grid regenerated for room ${roomId}`)
          console.log(`   CD Profiles: ${roomWithGrid.cdProfiles.length}`)
          console.log(`   Heat Plates: ${roomWithGrid.heatPlates.length}`)
          
          // FORCE NEW ARRAY REFERENCE with spread operator
          return {
            rooms: [...state.rooms.map((r, i) => i === roomIndex ? roomWithGrid : r)],
          }
        } else {
          console.warn(`⚠️ Store: No pxPerMeter set, cannot regenerate grid`)
        }
      }

      // Otherwise just update the room
      console.log(`✓ Store: Room ${roomId} updated (no grid recalc)`)
      
      // FORCE NEW ARRAY REFERENCE with spread operator
      return {
        rooms: [...state.rooms.map((r, i) => i === roomIndex ? updatedRoom : r)],
      }
    })
  },

  updateRoomPoints: (roomId, newPoints) => {
    // FAST UPDATE: Just update points without grid regeneration (for live dragging)
    set((state) => ({
      rooms: [...state.rooms.map((r) =>
        r.id === roomId ? { ...r, points: newPoints } : r
      )],
    }))
  },

  finalizeRoomPoints: (roomId) => {
    // SLOW UPDATE: Regenerate grid after dragging ends
    set((state) => {
      const roomIndex = state.rooms.findIndex((r) => r.id === roomId)
      
      if (roomIndex === -1) {
        console.warn(`❌ Room ${roomId} not found`)
        return state
      }

      const room = state.rooms[roomIndex]

      console.log(`🔄 Store: Finalizing points for room ${roomId}, regenerating grid`)

      // Regenerate grid with new points
      if (state.pdf.pxPerMeter) {
        const calculator = new GridCalculator(state.pdf.pxPerMeter)
        const roomWithGrid = calculator.generateRoomGrid(room)
        
        console.log(`✓ Store: Grid regenerated after dragging`)
        console.log(`   CD Profiles: ${roomWithGrid.cdProfiles.length}`)
        console.log(`   Heat Plates: ${roomWithGrid.heatPlates.length}`)
        
        // FORCE NEW ARRAY REFERENCE with spread operator
        return {
          rooms: [...state.rooms.map((r, i) => i === roomIndex ? roomWithGrid : r)],
        }
      } else {
        console.log(`⚠️ Store: No pxPerMeter set, cannot regenerate grid`)
        return state
      }
    })
  },

  setHoveredRoomId: (roomId) => {
    set({ hoveredRoomId: roomId })
  },

  selectRoom: (roomId) => {
    console.log('🎯 Selecting room:', roomId)
    set({ selectedRoomId: roomId })
  },

  setStageRef: (ref) => {
    set({ stageRef: ref })
  },

  exportToPDF: async () => {
    const state = get()
    
    if (!state.pdf.url) {
      console.error('❌ Export failed: No PDF uploaded')
      alert('Kérem először töltsön fel egy PDF alaprajzot!')
      return
    }

    if (state.rooms.length === 0) {
      console.error('❌ Export failed: No rooms defined')
      alert('Kérem először rajzoljon legalább egy helyiséget!')
      return
    }

    try {
      console.log('📄 Starting vector-based PDF export...')
      
      // Step 1: Load pdf-lib dynamically
      const { PDFDocument, rgb } = await import('pdf-lib')
      console.log('✓ pdf-lib loaded')
      
      // Step 2: Fetch and load the original PDF
      console.log('📥 Fetching original PDF...')
      const existingPdfBytes = await fetch(state.pdf.url).then(res => res.arrayBuffer())
      const pdfDoc = await PDFDocument.load(existingPdfBytes)
      console.log('✓ Original PDF loaded')
      
      // Step 3: Get the first page
      const pages = pdfDoc.getPages()
      const page = pages[0]
      const { width: pdfWidth, height: pdfHeight } = page.getSize()
      console.log(`✓ PDF page dimensions: ${pdfWidth.toFixed(2)} x ${pdfHeight.toFixed(2)} points`)
      
      // Step 4: Calculate coordinate conversion scale
      // Canvas uses pixels, PDF uses points (1 point = 1/72 inch)
      // We need to map canvas coordinates to PDF coordinates
      const canvasWidth = state.pdf.pageWidth
      const canvasHeight = state.pdf.pageHeight
      const scaleX = pdfWidth / canvasWidth
      const scaleY = pdfHeight / canvasHeight
      
      console.log(`📐 Coordinate scale: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)}`)
      
      // Helper: Convert canvas coordinates to PDF coordinates
      // PDF uses bottom-left origin, canvas uses top-left
      const toPdfX = (canvasX: number) => canvasX * scaleX
      const toPdfY = (canvasY: number) => pdfHeight - (canvasY * scaleY)
      
      // Helper: Convert millimeters to PDF points
      const mmToPoints = (mm: number) => {
        if (!state.pdf.pxPerMeter) return mm * 2.83465 // fallback: 1mm ≈ 2.83 points
        const pixels = (mm / 1000) * state.pdf.pxPerMeter
        return pixels * scaleX
      }
      
      console.log('🎨 Drawing heating system elements...')
      let totalElements = 0
      
      // Step 5: Iterate through all rooms and draw elements
      for (const room of state.rooms) {
        console.log(`  Processing room: ${room.name}`)
        
        // Draw Blue CD Profiles (60mm width)
        if (room.cdProfiles && room.cdProfiles.length > 0) {
          const profileWidth = mmToPoints(60)
          
          for (const profile of room.cdProfiles) {
            const x1 = toPdfX(profile.x1)
            const y1 = toPdfY(profile.y1)
            const x2 = toPdfX(profile.x2)
            const y2 = toPdfY(profile.y2)
            
            page.drawLine({
              start: { x: x1, y: y1 },
              end: { x: x2, y: y2 },
              thickness: profileWidth,
              color: rgb(0.27, 0.51, 0.71), // #4682B4 Steel Blue
              opacity: 1.0,
            })
            totalElements++
          }
          console.log(`    ✓ Drew ${room.cdProfiles.length} blue CD profiles`)
        }
        
        // Draw Brown Heat Plates (50mm width)
        if (room.heatPlates && room.heatPlates.length > 0) {
          const plateWidth = mmToPoints(50)
          
          for (const plate of room.heatPlates) {
            const x1 = toPdfX(plate.x1)
            const y1 = toPdfY(plate.y1)
            const x2 = toPdfX(plate.x2)
            const y2 = toPdfY(plate.y2)
            
            page.drawLine({
              start: { x: x1, y: y1 },
              end: { x: x2, y: y2 },
              thickness: plateWidth,
              color: rgb(0.545, 0.271, 0.075), // #8B4513 Saddle Brown
              opacity: 0.8,
            })
            totalElements++
          }
          console.log(`    ✓ Drew ${room.heatPlates.length} brown heat plates`)
        }
        
        // Draw Green Heating Pipes (16mm width)
        if (room.heatPlates && room.heatPlates.length > 0) {
          const pipeWidth = mmToPoints(16)
          
          for (const plate of room.heatPlates) {
            // Pipes follow the same path as heat plates
            const x1 = toPdfX(plate.x1)
            const y1 = toPdfY(plate.y1)
            const x2 = toPdfX(plate.x2)
            const y2 = toPdfY(plate.y2)
            
            page.drawLine({
              start: { x: x1, y: y1 },
              end: { x: x2, y: y2 },
              thickness: pipeWidth,
              color: rgb(0.196, 0.804, 0.196), // #32CD32 Lime Green
              opacity: 1.0,
            })
          }
          console.log(`    ✓ Drew ${room.heatPlates.length} green heating pipes`)
        }
      }
      
      console.log(`✓ Total elements drawn: ${totalElements}`)
      
      // Step 6: Save the modified PDF
      console.log('💾 Saving modified PDF...')
      const pdfBytes = await pdfDoc.save()
      
      // Step 7: Trigger download
      const timestamp = new Date().toISOString().slice(0, 10)
      const fileName = `mennyezetfutes_terv_${timestamp}.pdf`
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
      
      console.log(`✓ PDF saved: ${fileName}`)
      alert(`✓ Vektoros PDF sikeresen exportálva!\nFájl: ${fileName}\n\nElemek: ${totalElements} db`)
      
    } catch (error) {
      console.error('❌ PDF export failed:', error)
      alert('Hiba történt a PDF exportálás során.\nKérem telepítse: npm install pdf-lib')
    }
  },
}))
