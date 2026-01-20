import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppState, CalibrationLine, Point, Measurement, Room, SystemType, Orientation, ConnectionSide, GlobalSettings, ManualElement } from '../types'
import { GridCalculator } from '../utils/GridCalculator'
import { RegisteredAsset, getAssetById as getStaticAssetById } from '../data/assets/AssetRegistry'

interface Store extends AppState {
  // Settings
  settings: GlobalSettings
  updateSettings: (newSettings: Partial<GlobalSettings>) => void
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
  setPendingRoomProperties: (
    name: string,
    systemType: SystemType,
    orientation: Orientation,
    connectionSide?: ConnectionSide
  ) => void
  finishRoom: () => void
  deleteRoom: (roomId: string) => void
  updateRoom: (roomId: string, updates: Partial<Room>) => void
  updateRoomPoints: (roomId: string, newPoints: Point[]) => void
  finalizeRoomPoints: (roomId: string) => void
  setConnectionPoint: (roomId: string, point: { x: number; y: number }) => void
  setHoveredRoomId: (roomId: string | null) => void
  hoveredRoomId: string | null
  selectRoom: (roomId: string | null) => void
  selectedRoomId: string | null
  isSettingConnectionPoint: boolean
  setIsSettingConnectionPoint: (isActive: boolean) => void
  
  // Stage ref for PDF export
  stageRef: any
  setStageRef: (ref: any) => void
  exportToPDF: () => void
  
  // Multi-select & Clipboard (CAD Tools)
  selectedElementIds: string[] // Array of selected element IDs (rooms, patterns, etc.)
  setSelectedElementIds: (ids: string[]) => void
  addToSelection: (id: string) => void
  removeFromSelection: (id: string) => void
  clearSelection: () => void
  clipboard: any[] // Clipboard for copy/paste
  copyToClipboard: () => void
  pasteFromClipboard: () => void
  
  // Snapping
  snapEnabled: boolean
  setSnapEnabled: (enabled: boolean) => void
  snapThreshold: number // Distance in pixels for snapping (default: 20px)
  
  // DRAG STATE
  // =========================================================
  isDragging: boolean
  setIsDragging: (isDragging: boolean) => void
  dragStartPos: Point | null
  setDragStartPos: (pos: Point | null) => void
  
  // MARQUEE SELECTION
  // =========================================================
  selectionRect: { x: number; y: number; width: number; height: number } | null
  setSelectionRect: (rect: { x: number; y: number; width: number; height: number } | null) => void
  selectionMode: 'none' | 'marquee' | 'drag' | null
  setSelectionMode: (mode: 'none' | 'marquee' | 'drag' | null) => void
  
  // ASSET MENU & MANUAL PLACEMENT
  // =========================================================
  isAssetMenuOpen: boolean
  toggleAssetMenu: () => void
  openAssetMenu: () => void
  closeAssetMenu: () => void
  placingAsset: RegisteredAsset | null // Asset currently being placed
  setPlacingAsset: (asset: RegisteredAsset | null) => void
  manualElements: ManualElement[]
  addManualElement: (element: ManualElement) => void
  removeManualElement: (id: string) => void
  updateManualElement: (id: string, updates: Partial<ManualElement>) => void
  updateSelectedPositions: (dx: number, dy: number) => void // Move all selected elements by delta
  
  // Asset Overrides (for real-time snap anchor calibration)
  assetOverrides: Record<string, { 
    snapX?: number
    snapY?: number
    anchors90?: Array<{ x: number; y: number }>
  }>
  setAssetOverride: (id: string, config: { 
    snapX?: number
    snapY?: number
    anchors90?: Array<{ x: number; y: number }>
  }) => void
  
  // Mirror Mode & Rotation
  mirrorMode: boolean
  setMirrorMode: (enabled: boolean) => void
  mirrorSelected: (axis: 'x' | 'y') => void
  rotationMode: boolean
  setRotationMode: (enabled: boolean) => void
  setElementRotation: (id: string, angle: number) => void
  rotateSelected: (delta: number) => void
  
  // Axis Locking (Orthogonal Movement)
  activeAxisLock: 'x' | 'y' | null
  setAxisLock: (axis: 'x' | 'y' | null) => void
  
  // Placement Rotation (Manual V/H toggle)
  placementRotation: number // Global rotation for new elements (0° = Vertical, 90° = Horizontal)
  setPlacementRotation: (deg: number) => void
  
  // Debug Visualization
  showSnapPoints: boolean // Toggle to show/hide debug snap point dots
  toggleSnapPoints: () => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
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
  manualElements: [], // Manually placed CAD elements
  hoveredRoomId: null,
  selectedRoomId: null,
  
  stageRef: null,

  // Global Settings with defaults
  settings: {
    cdProfileWidth: 60,
    cdProfileSpacing: 400,
    wallBuffer: 250,
    gridMargin: 100,
    plateWidth: 50,
    system4Gap: 45.33,
    system6Gap: 7.2,
    visualOffset: 30,
    startPipeLength: 1000, // Default: 1000mm
    calibration: {
      rightSideMirrorOffset: 320.335, // Default: 320.335mm (User adjusts this for Right side alignment)
      induloOffsetY: 0, // Default: 0mm (Vertical correction for Start)
      svgInternalPaddingX: 40, // Default: 40mm (Compensates for empty space in SVG on x-axis)
      effectivePipeWidth: 303.85, // Default: 303.85mm (The width of actual pipes for mirroring)
      visualPipeLength: 300, // Default: 300mm (Overrides logical length for drawing purposes)
      atforduloOffsetX: 0, // Default: 0mm (Horizontal offset for Turn)
      atforduloOffsetY: 0, // Default: 0mm (Vertical offset for Turn)
      vegeOffsetX: 0, // Default: 0mm (Horizontal offset for End)
      vegeOffsetY: 0, // Default: 0mm (Vertical offset for End)
    },
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }))
    
    // Recalculate all rooms when settings change
    const { rooms, pdf } = get()
    if (pdf.pxPerMeter && rooms.length > 0) {
      const calculator = new GridCalculator(pdf.pxPerMeter, get().settings)
      const updatedRooms = rooms.map((room) => calculator.generateRoomGrid(room))
      set({ rooms: updatedRooms })
    }
  },

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
      connectionSide: 'bottom', // Default connection side
      cdProfiles: [],
      heatPlates: [],
      area: 0,
      profileStats: [],
      plateMaterials: [],
      heatingCircuits: [],
    }

    set((state) => ({
      roomDrawing: {
        ...state.roomDrawing,
        pendingRoom,
      },
    }))
  },

  cancelRoomDrawing: () => {
    set(() => ({
      roomDrawing: {
        isActive: false,
        currentPoints: [],
        pendingRoom: null,
      },
    }))
  },

  setPendingRoomProperties: (name, systemType, orientation, connectionSide) => {
    const { roomDrawing } = get()
    if (roomDrawing.pendingRoom) {
      set(() => ({
        roomDrawing: {
          ...roomDrawing,
          pendingRoom: {
            ...roomDrawing.pendingRoom,
            name,
            systemType,
            orientation,
            connectionSide: connectionSide ?? roomDrawing.pendingRoom?.connectionSide,
          } as Room,
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


      // If system type or orientation changed, regenerate grid
      if (updates.systemType || updates.orientation || updates.connectionSide) {
        if (state.pdf.pxPerMeter) {
          const calculator = new GridCalculator(state.pdf.pxPerMeter, state.settings)
          const roomWithGrid = calculator.generateRoomGrid(updatedRoom)
          
          // FORCE NEW ARRAY REFERENCE with spread operator
          return {
            rooms: [...state.rooms.map((r, i) => i === roomIndex ? roomWithGrid : r)],
          }
        } else {
          console.warn(`⚠️ Store: No pxPerMeter set, cannot regenerate grid`)
        }
      }

      // Otherwise just update the room
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

      // Regenerate grid with new points
      if (state.pdf.pxPerMeter) {
        const calculator = new GridCalculator(state.pdf.pxPerMeter, state.settings)
        const roomWithGrid = calculator.generateRoomGrid(room)
        
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

  setConnectionPoint: (roomId, point) => {
    set((state) => {
      const roomIndex = state.rooms.findIndex((r) => r.id === roomId)
      
      if (roomIndex === -1) {
        console.warn(`❌ Room ${roomId} not found`)
        return state
      }

      const room = state.rooms[roomIndex]
      const updatedRoom = { ...room, connectionPoint: point }

      // Regenerate grid with new connection point
      if (state.pdf.pxPerMeter) {
        const calculator = new GridCalculator(state.pdf.pxPerMeter, state.settings)
        const roomWithGrid = calculator.generateRoomGrid(updatedRoom)
        
        return {
          rooms: [...state.rooms.map((r, i) => i === roomIndex ? roomWithGrid : r)],
        }
      } else {
        // Just update the connection point without regenerating grid
        return {
          rooms: [...state.rooms.map((r, i) => i === roomIndex ? updatedRoom : r)],
        }
      }
    })
  },

  isSettingConnectionPoint: false,
  setIsSettingConnectionPoint: (isActive) => set({ isSettingConnectionPoint: isActive }),

  setHoveredRoomId: (roomId) => {
    set({ hoveredRoomId: roomId })
  },

  selectRoom: (roomId) => {
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
      // Step 1: Load pdf-lib dynamically
      const { PDFDocument, rgb } = await import('pdf-lib')
      
      // Step 2: Fetch and load the original PDF
      const existingPdfBytes = await fetch(state.pdf.url).then(res => res.arrayBuffer())
      const pdfDoc = await PDFDocument.load(existingPdfBytes)
      
      // Step 3: Get the first page
      const pages = pdfDoc.getPages()
      const page = pages[0]
      const { width: pdfWidth, height: pdfHeight } = page.getSize()
      
      // Step 4: Calculate coordinate conversion scale
      // Canvas uses pixels, PDF uses points (1 point = 1/72 inch)
      // We need to map canvas coordinates to PDF coordinates
      const canvasWidth = state.pdf.pageWidth
      const canvasHeight = state.pdf.pageHeight
      const scaleX = pdfWidth / canvasWidth
      const scaleY = pdfHeight / canvasHeight
      
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
      
      let totalElements = 0
      
      // Step 5: Iterate through all rooms and draw elements
      for (const room of state.rooms) {
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
        }
      }
      
      // Step 6: Save the modified PDF
      const pdfBytes = await pdfDoc.save()
      
      // Step 7: Trigger download
      const timestamp = new Date().toISOString().slice(0, 10)
      const fileName = `mennyezetfutes_terv_${timestamp}.pdf`
      
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
      alert(`✓ Vektoros PDF sikeresen exportálva!\nFájl: ${fileName}\n\nElemek: ${totalElements} db`)
      
    } catch (error) {
      console.error('❌ PDF export failed:', error)
      alert('Hiba történt a PDF exportálás során.\nKérem telepítse: npm install pdf-lib')
    }
  },

  // =========================================================
  // MULTI-SELECT & CLIPBOARD (CAD Tools)
  // =========================================================
  selectedElementIds: [],
  setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),
  addToSelection: (id) => {
    const state = get()
    if (!state.selectedElementIds.includes(id)) {
      set({ selectedElementIds: [...state.selectedElementIds, id] })
    }
  },
  removeFromSelection: (id) => {
    const state = get()
    set({ selectedElementIds: state.selectedElementIds.filter(eid => eid !== id) })
  },
  clearSelection: () => set({ selectedElementIds: [] }),
  
  clipboard: [],
  copyToClipboard: () => {
    const state = get()
    // Copy selected elements to clipboard
    // For now, copy selected rooms
    const selectedRooms = state.rooms.filter(r => 
      state.selectedElementIds.includes(r.id) || r.id === state.selectedRoomId
    )
    set({ clipboard: selectedRooms })
  },
  pasteFromClipboard: () => {
    const state = get()
    if (state.clipboard.length === 0) {
      return
    }
    // TODO: Paste elements from clipboard with offset
  },

  // =========================================================
  // SNAPPING (The Magnet)
  // =========================================================
  snapEnabled: true,
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  snapThreshold: 20, // 20px snap distance

  // =========================================================
  // DRAG STATE
  // =========================================================
  isDragging: false,
  setIsDragging: (isDragging) => set({ isDragging }),
  dragStartPos: null,
  setDragStartPos: (pos) => set({ dragStartPos: pos }),

  // =========================================================
  // MARQUEE SELECTION
  // =========================================================
  selectionRect: null,
  setSelectionRect: (rect) => set({ selectionRect: rect }),
  selectionMode: null,
  setSelectionMode: (mode) => set({ selectionMode: mode }),

  // =========================================================
  // ASSET MENU & MANUAL PLACEMENT
  // =========================================================
  isAssetMenuOpen: false,
  toggleAssetMenu: () => set((state) => ({ isAssetMenuOpen: !state.isAssetMenuOpen })),
  openAssetMenu: () => set({ isAssetMenuOpen: true }),
  closeAssetMenu: () => set({ isAssetMenuOpen: false }),
  
  placingAsset: null,
  setPlacingAsset: (asset) => set({ placingAsset: asset }),
  
  addManualElement: (element) => {
    set((state) => ({
      manualElements: [...state.manualElements, element],
      placingAsset: null, // Clear placement mode after adding
    }))
  },
  removeManualElement: (id) => {
    set((state) => ({
      manualElements: state.manualElements.filter((el) => el.id !== id),
    }))
  },
  updateManualElement: (id, updates) => {
    set((state) => ({
      manualElements: state.manualElements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }))
  },
  updateSelectedPositions: (dx, dy) => {
    set((state) => ({
      manualElements: state.manualElements.map((el) =>
        state.selectedElementIds.includes(el.id)
          ? {
              ...el,
              position: {
                x: el.position.x + dx,
                y: el.position.y + dy,
              },
            }
          : el
      ),
    }))
  },
  
  // Asset Overrides
  assetOverrides: {},
  setAssetOverride: (id, config) => {
    set((state) => ({
      assetOverrides: {
        ...state.assetOverrides,
        [id]: {
          ...state.assetOverrides[id],
          ...config,
        },
      },
    }))
  },
  
  // Mirror Mode & Rotation
  mirrorMode: false,
  setMirrorMode: (enabled) => set({ mirrorMode: enabled }),
  mirrorSelected: (axis) => {
    set((state) => ({
      manualElements: state.manualElements.map((el) =>
        state.selectedElementIds.includes(el.id)
          ? {
              ...el,
              scaleX: axis === 'x' ? el.scaleX * -1 : el.scaleX,
              scaleY: axis === 'y' ? el.scaleY * -1 : el.scaleY,
            }
          : el
      ),
    }))
  },
  rotationMode: false,
  setRotationMode: (enabled) => set({ rotationMode: enabled }),
  setElementRotation: (id, angle) => {
    set((state) => ({
      manualElements: state.manualElements.map((el) =>
        el.id === id ? { ...el, rotation: angle } : el
      ),
    }))
  },
  rotateSelected: (delta) => {
    set((state) => ({
      manualElements: state.manualElements.map((el) =>
        state.selectedElementIds.includes(el.id)
          ? {
              ...el,
              rotation: ((el.rotation + delta) % 360 + 360) % 360, // Normalize to 0-360
            }
          : el
      ),
    }))
  },
  
  // Axis Locking (Orthogonal Movement)
  activeAxisLock: null,
  setAxisLock: (axis) => set({ activeAxisLock: axis }),
  
  // Placement Rotation (Manual V/H toggle)
  placementRotation: 0, // Default: Vertical (0°)
  setPlacementRotation: (deg) => set({ placementRotation: deg }),
  
  // Debug Visualization
  showSnapPoints: false,
  toggleSnapPoints: () => set((state) => ({ showSnapPoints: !state.showSnapPoints })),
    }),
    {
      name: 'heating-designer-storage',
      partialize: (state) => ({
        // Only save these fields (don't save temporary UI states like selection or drag)
        manualElements: state.manualElements,
        assetOverrides: state.assetOverrides,
        settings: state.settings, // Include grid settings
        rooms: state.rooms, // Include rooms (which contain heatPlates)
      }),
    }
  )
)

/**
 * Get asset by ID with store overrides merged in
 * This is a wrapper around the static getAssetById that merges runtime overrides
 * RECONNECT SLIDERS: Applies overrides to the first anchor dynamically
 */
export function getAssetById(id: string): RegisteredAsset | undefined {
  const store = useStore.getState()
  const staticAsset = getStaticAssetById(id)
  
  if (!staticAsset) return undefined
  
  const override = store.assetOverrides[id]
  if (!override) return staticAsset
  
  // Clone to avoid mutating base
  const asset = { 
    ...staticAsset, 
    anchors: staticAsset.anchors ? [...staticAsset.anchors] : [{ x: 100, y: 1100 }],
    anchors90: staticAsset.anchors90 ? [...staticAsset.anchors90] : undefined
  }
  
  // Apply Slider Overrides to First Anchor (for 0° rotation)
  if (asset.anchors.length > 0) {
    if (override.snapX !== undefined) {
      asset.anchors[0] = { ...asset.anchors[0], x: override.snapX }
    }
    if (override.snapY !== undefined) {
      asset.anchors[0] = { ...asset.anchors[0], y: override.snapY }
    }
  }
  
  // Apply anchors90 override if provided
  if (override.anchors90) {
    asset.anchors90 = override.anchors90
  }
  
  return asset
}
