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

export interface Room {
  id: string
  name: string
  points: Point[]
  systemType: SystemType
  orientation: Orientation
  cdProfiles: CDProfile[]
  heatPlates: HeatPlate[] // Brown plates between CD profiles
  area: number // in square meters
  profileStats: ProfileStats[] // Grouped profile counts by length
  plateMaterials: PlateMaterial[] // Grouped heat plate material list by length (mm)
}

export interface RoomDrawingState {
  isActive: boolean
  currentPoints: Point[]
  pendingRoom: Room | null
}

export interface AppState {
  pdf: PDFState
  calibration: CalibrationState
  measurement: MeasurementState
  rooms: Room[]
  roomDrawing: RoomDrawingState
}
