/**
 * SnapHelper - Smart Snapping Utility
 * 
 * Provides snapping functionality for CAD elements to align with HeatPlates.
 * Snaps to the vertical center axis of HeatPlates within a threshold distance.
 */

import { Point, HeatPlate } from '../types'

export interface SnapResult {
  snapped: boolean
  position: Point
  snapTarget?: HeatPlate
}

/**
 * Find the nearest snap point (vertical center of HeatPlates)
 * 
 * @param position - Current position to snap
 * @param heatPlates - Array of HeatPlates to snap to
 * @param threshold - Maximum distance in pixels for snapping (default: 20px)
 * @param snapEnabled - Whether snapping is enabled (SHIFT override)
 * @returns SnapResult with snapped position and target plate
 */
export function snapToPlateCenter(
  position: Point,
  heatPlates: HeatPlate[],
  threshold: number = 20,
  snapEnabled: boolean = true
): SnapResult {
  if (!snapEnabled || heatPlates.length === 0) {
    return {
      snapped: false,
      position,
    }
  }

  let nearestDistance = Infinity
  let nearestPlate: HeatPlate | undefined
  let snappedX = position.x
  let snappedY = position.y

  // Check each HeatPlate's vertical center axis
  for (const plate of heatPlates) {
    // Calculate vertical center X coordinate
    const centerX = plate.x1 + (plate.width / 2)
    
    // Calculate distance from position to center line
    const distance = Math.abs(position.x - centerX)
    
    // Only consider if within threshold
    if (distance < threshold && distance < nearestDistance) {
      nearestDistance = distance
      nearestPlate = plate
      snappedX = centerX
      snappedY = position.y // Keep Y unchanged (only snap X to center)
    }
  }

  return {
    snapped: nearestPlate !== undefined,
    position: {
      x: snappedX,
      y: snappedY,
    },
    snapTarget: nearestPlate,
  }
}

/**
 * Snap to multiple snap points (centers of multiple plates)
 * Returns the closest snap point
 */
export function snapToMultiplePlateCenters(
  position: Point,
  heatPlates: HeatPlate[],
  threshold: number = 20,
  snapEnabled: boolean = true
): SnapResult {
  return snapToPlateCenter(position, heatPlates, threshold, snapEnabled)
}
