/**
 * Geometry - Pure Geometric Hit-Testing Utilities
 * 
 * Provides geometric calculations for selection, hit-testing, and spatial queries.
 * Bypasses DOM pointer-events issues by using pure coordinate math.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Check if a point is inside a rectangle
 * Supports both {x, y, width, height} and {x, y, w, h} formats
 */
export function isPointInRect(
  x: number, 
  y: number, 
  rect: { x: number; y: number; width?: number; height?: number; w?: number; h?: number }
): boolean {
  const w = rect.width ?? rect.w ?? 0
  const h = rect.height ?? rect.h ?? 0
  return x >= rect.x && 
         x <= rect.x + w &&
         y >= rect.y && 
         y <= rect.y + h
}

/**
 * Check if two rectangles intersect
 */
export function doRectsIntersect(r1: Rect, r2: Rect): boolean {
  return !(
    r2.x > r1.x + r1.width || 
    r2.x + r2.width < r1.x || 
    r2.y > r1.y + r1.height || 
    r2.y + r2.height < r1.y
  )
}

/**
 * Check if a rectangle completely contains another rectangle
 */
export function doesRectContain(container: Rect, contained: Rect): boolean {
  return container.x <= contained.x &&
         container.y <= contained.y &&
         container.x + container.width >= contained.x + contained.width &&
         container.y + container.height >= contained.y + contained.height
}

/**
 * Normalize a rectangle (ensure width/height are positive)
 */
export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

/**
 * Calculate bounding box for a manual element
 * Approximates the element's bounds based on its position and scale
 */
export function getElementBoundingBox(
  elementX: number,
  elementY: number,
  scaleX: number,
  scaleY: number,
  approximateWidthInkscape: number = 400,
  approximateHeightInkscape: number = 1200
): BoundingBox {
  // Calculate True Bounding Box (Handle negative scales from mirroring)
  let effectiveX = elementX
  let effectiveY = elementY
  let effectiveW = scaleX * approximateWidthInkscape
  let effectiveH = scaleY * approximateHeightInkscape
  
  // Normalize negative width/height (adjust origin when flipped)
  if (effectiveW < 0) {
    effectiveX += effectiveW // Shift origin left when X is flipped
    effectiveW = Math.abs(effectiveW)
  }
  if (effectiveH < 0) {
    effectiveY += effectiveH // Shift origin up when Y is flipped
    effectiveH = Math.abs(effectiveH)
  }
  
  return {
    x: effectiveX,
    y: effectiveY,
    width: effectiveW,
    height: effectiveH,
  }
}

/**
 * Find heat plate at a given X coordinate
 * Returns the plate that overlaps the X coordinate (horizontal overlap check)
 * For horizontal plates: plate extends from x1 to x2, with width as stroke thickness
 */
export function findPlateAtX(x: number, plates: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }>): typeof plates[0] | undefined {
  return plates.find(p => {
    // For horizontal plates, check if X is within the plate's X range
    // Plate extends from min(x1, x2) to max(x1, x2)
    const plateLeft = Math.min(p.x1, p.x2)
    const plateRight = Math.max(p.x1, p.x2)
    return x >= plateLeft && x <= plateRight
  })
}
