/**
 * Core types for the Ceiling Heating Designer application
 */

export interface Point {
  x: number
  y: number
}

export interface CalibrationLine {
  start: Point
  end: Point
  realLengthMeters: number | null
}

export interface PDFState {
  file: File | null
  url: string | null
  numPages: number
  currentPage: number
  scale: number
  pxPerMeter: number | null // Calculated from calibration
  pagePosition: { x: number; y: number } | null // PDF page position for canvas alignment
  pageWidth: number // Natural PDF page width
  pageHeight: number // Natural PDF page height
  viewScale: number // User zoom level (1.0 = 100%)
}

export interface CalibrationState {
  isCalibrating: boolean
  line: CalibrationLine | null
  isDrawingLine: boolean
}

export interface Measurement {
  id: string
  start: Point
  end: Point
  distanceMeters: number
}

export interface MeasurementState {
  isActive: boolean
  isDrawing: boolean
  currentLine: { start: Point; end: Point } | null
  measurements: Measurement[]
}

export type SystemType = 'System 4' | 'System 6'
export type Orientation = 'Vertical' | 'Horizontal'
export type ConnectionSide = 'top' | 'bottom' | 'left' | 'right'

export interface PatternCalibration {
  rightSideMirrorOffset: number // Jobb oldali tükrözési távolság (mm) - Default: 320.335
  induloOffsetY: number // Induló Y eltolás (mm) - Default: 0
  svgInternalPaddingX: number // SVG belső X padding (mm) - Default: 40 (Compensates for empty space in SVG)
  effectivePipeWidth: number // Hatékony cső szélesség (mm) - Default: 303.85 (The width of actual pipes for mirroring)
  visualPipeLength: number // Vizuális cső hossz (mm) - Default: 300 (Overrides logical length for drawing)
  atforduloOffsetX: number // Átforduló X eltolás (mm) - Default: 0
  atforduloOffsetY: number // Átforduló Y eltolás (mm) - Default: 0
  vegeOffsetX: number // Vége X eltolás (mm) - Default: 0
  vegeOffsetY: number // Vége Y eltolás (mm) - Default: 0
}

export interface GlobalSettings {
  cdProfileWidth: number // CD profil szélesség (mm)
  cdProfileSpacing: number // CD profil tengelytáv (mm)
  wallBuffer: number // Szerelési távolság falaktól / Forduló zóna (mm)
  gridMargin: number // Raszter minimum margó (mm)
  plateWidth: number // Fűtőpanel szélesség (mm)
  system4Gap: number // Rendszer 4 hézag (mm)
  system6Gap: number // Rendszer 6 hézag (mm)
  visualOffset: number // Vizuális eltolás (mm)
  startPipeLength: number // Induló csőhossz (számításhoz) (mm)
  calibration: PatternCalibration // SVG minta kalibráció (finomhangolás)
}

export interface CDProfile {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  width: number // 60mm in pixels (Blue CD Profiles)
  orientation: Orientation
}

export interface HeatPlate {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  width: number // 50mm in pixels (Brown Heat Plates)
  orientation: Orientation
}

export interface ProfileStats {
  lengthCm: number
  count: number
}

export interface PlateMaterial {
  lengthMm: number
  count: number
}

export interface HeatingCircuit {
  id: string
  color: string // Distinct color for each loop (for visualization)
  pathData: string // SVG path data for the circuit (Konva.Path)
  pathPoints?: Point[] // Optional polyline fallback for legacy rendering
  length: number // Total length in mm
}

export interface PipePattern {
  id: string
  patternType: 'indulo' | 'atfordulo' | 'vege'
  position: Point // Position where the pattern should be rendered (endpoint of brown plate)
  scaleX: number // Scale factor X to convert Inkscape units to screen pixels
  scaleY: number // Scale factor Y (can be negative for flipping)
  rotation: number // Rotation angle in degrees (0 for vertical, 90 for horizontal)
  paths: string[] // SVG path data from asset definition
  orientation: Orientation // Orientation of the plate this pattern is attached to
}

export interface Room {
  id: string
  name: string
  points: Point[]
  systemType: SystemType
  orientation: Orientation
  connectionSide: ConnectionSide // Which side the pipes connect/exit from
  connectionPoint: { x: number; y: number } | null // Smart connection point where pipes enter
  cdProfiles: CDProfile[]
  heatPlates: HeatPlate[] // Brown plates between CD profiles
  area: number // in square meters
  profileStats: ProfileStats[] // Grouped profile counts by length
  plateMaterials: PlateMaterial[] // Grouped heat plate material list by length (mm)
  heatingCircuits: HeatingCircuit[] // Generated green pipe routes (register pattern)
  pipePatterns?: PipePattern[] // System 4 pipe patterns at plate ends
}

export interface RoomDrawingState {
  isActive: boolean
  currentPoints: Point[]
  pendingRoom: Room | null
}

/**
 * Manually placed CAD element (from Asset Menu)
 */
export interface ManualElement {
  id: string
  assetId: string // Reference to asset (e.g., 'system4-indulo')
  position: Point // Placement position on canvas
  scaleX: number // Scale factor X (for Inkscape to pixel conversion)
  scaleY: number // Scale factor Y (can be negative for mirroring)
  rotation: number // Rotation in degrees
  paths: string[] // SVG path data from asset
}

export interface AppState {
  pdf: PDFState
  calibration: CalibrationState
  measurement: MeasurementState
  rooms: Room[]
  roomDrawing: RoomDrawingState
  manualElements: ManualElement[] // Manually placed CAD elements
}
