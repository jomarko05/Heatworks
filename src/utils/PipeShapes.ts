/**
 * PipeShapes.ts
 * 
 * Utility functions for generating heating pipe turn geometries.
 * Handles System 4 specific turn shapes with nesting levels.
 */

import { Point } from '../types'

/**
 * Get the appropriate turn shape based on nesting level
 * 
 * @param p1 - Start point (end of previous plate)
 * @param p2 - End point (start of next plate)
 * @param nestingIndex - 0 = outermost (near wall), 1 = middle, 2+ = inner
 * @param orientation - 'Vertical' or 'Horizontal'
 * @returns Array of points forming a smooth turn path
 */
export function getTurnShape(
  p1: Point,
  p2: Point,
  nestingIndex: number,
  orientation: 'Vertical' | 'Horizontal'
): Point[] {
  // Calculate the distance and direction
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  
  // Determine turn parameters based on nesting level
  let turnDepth: number
  // let controlPointOffset: number  // Reserved for future cubic bezier implementation
  
  if (nestingIndex === 0) {
    // OUTERMOST: Flattened/Squashed U-shape (wide and shallow)
    // Fits near walls, gentle curve
    turnDepth = 0.15 // 15% of span
    // controlPointOffset = 0.4 // More control points for wider curve
  } else if (nestingIndex === 1) {
    // MIDDLE: Standard U-shape
    turnDepth = 0.25 // 25% of span
    // controlPointOffset = 0.35
  } else {
    // INNER (2+): Deeper/Tighter U-shape
    turnDepth = 0.35 // 35% of span
    // controlPointOffset = 0.3
  }
  
  const points: Point[] = []
  
  // Start point
  points.push({ x: p1.x, y: p1.y })
  
  if (orientation === 'Vertical') {
    // Vertical plates: Turn horizontally (U-shape opens left/right)
    const span = Math.abs(dx)
    const depth = span * turnDepth
    const direction = dx > 0 ? 1 : -1
    
    // Create smooth curve with control points
    // Note: cp1x and cp2x are for potential future use with cubic bezier
    // const _cp1x = p1.x + (span * controlPointOffset * direction)
    // const _cp2x = p2.x - (span * controlPointOffset * direction)
    
    // Generate curved path using quadratic bezier-like segments
    const segments = 8 // Smooth curve
    for (let i = 1; i <= segments; i++) {
      const t = i / segments
      
      // Quadratic bezier interpolation
      const x = (1 - t) * (1 - t) * p1.x + 
                2 * (1 - t) * t * (p1.x + direction * depth) + 
                t * t * p2.x
      
      const y = (1 - t) * (1 - t) * p1.y + 
                2 * (1 - t) * t * (p1.y + dy / 2) + 
                t * t * p2.y
      
      points.push({ x, y })
    }
  } else {
    // Horizontal plates: Turn vertically (U-shape opens up/down)
    const span = Math.abs(dy)
    const depth = span * turnDepth
    const direction = dy > 0 ? 1 : -1
    
    // Note: cp1y and cp2y are for potential future use with cubic bezier
    // const _cp1y = p1.y + (span * controlPointOffset * direction)
    // const _cp2y = p2.y - (span * controlPointOffset * direction)
    
    const segments = 8
    for (let i = 1; i <= segments; i++) {
      const t = i / segments
      
      const x = (1 - t) * (1 - t) * p1.x + 
                2 * (1 - t) * t * (p1.x + dx / 2) + 
                t * t * p2.x
      
      const y = (1 - t) * (1 - t) * p1.y + 
                2 * (1 - t) * t * (p1.y + direction * depth) + 
                t * t * p2.y
      
      points.push({ x, y })
    }
  }
  
  return points
}

/**
 * Create a straight extension line to handle stagger (lépcső)
 * When plate ends are not aligned, this creates a straight connector
 * 
 * @param from - Start point
 * @param to - End point
 * @returns Array with two points (straight line)
 */
export function createStaggerExtension(from: Point, to: Point): Point[] {
  return [
    { x: from.x, y: from.y },
    { x: to.x, y: to.y }
  ]
}

/**
 * Calculate the length of a path defined by points
 * 
 * @param points - Array of points forming a path
 * @returns Total length in pixels
 */
export function calculatePathLength(points: Point[]): number {
  let length = 0
  
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x
    const dy = points[i + 1].y - points[i].y
    length += Math.sqrt(dx * dx + dy * dy)
  }
  
  return length
}

/**
 * Calculate straight-line distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Determine if two plate ends require a stagger extension
 * Threshold: if offset > 50mm (converted to pixels)
 * 
 * @param p1 - End of first plate
 * @param p2 - Start of second plate
 * @param pxPerMeter - Pixels per meter calibration
 * @param orientation - Plate orientation
 * @returns true if stagger extension is needed
 */
export function needsStaggerExtension(
  p1: Point,
  p2: Point,
  pxPerMeter: number,
  orientation: 'Vertical' | 'Horizontal'
): boolean {
  const thresholdMm = 50
  const thresholdPx = (thresholdMm / 1000) * pxPerMeter
  
  if (orientation === 'Vertical') {
    // Check Y-axis offset
    return Math.abs(p1.y - p2.y) > thresholdPx
  } else {
    // Check X-axis offset
    return Math.abs(p1.x - p2.x) > thresholdPx
  }
}

/**
 * Create alignment point for stagger extension
 * Extends p1 to align with p2's start plane
 * 
 * @param p1 - End of first plate
 * @param p2 - Start of second plate
 * @param orientation - Plate orientation
 * @returns Alignment point
 */
export function getAlignmentPoint(
  p1: Point,
  p2: Point,
  orientation: 'Vertical' | 'Horizontal'
): Point {
  if (orientation === 'Vertical') {
    // Align Y, keep X
    return { x: p1.x, y: p2.y }
  } else {
    // Align X, keep Y
    return { x: p2.x, y: p1.y }
  }
}
