/**
 * PipeRouter.ts (8-PIPE REGISTER PATTERN)
 *
 * Strict 8-pipe register pattern with nested turns.
 * Turns are drawn as cubic bezier paths (Konva.Path).
 */

import { Point, HeatPlate, HeatingCircuit, Orientation, ConnectionSide } from '../types'

const MAX_CIRCUIT_LENGTH_MM = 100000 // 100 meters
const STUB_LENGTH_MM = 150 // Connection-side stub length
const MAX_TURN_DEPTH_MM = 250 // Outermost turn depth (max height)
const SMALL_TURN_DEPTH_MM = 150 // Connection-side small U-turn depth

const CIRCUIT_COLORS = [
  '#32CD32', // Lime Green (Circuit 1)
  '#228B22', // Forest Green (Circuit 2)
  '#FF6600', // Orange (Circuit 3)
  '#0066FF', // Blue (Circuit 4)
  '#9933FF', // Purple (Circuit 5)
  '#FF3399', // Pink (Circuit 6)
]

interface PlateEnds {
  connectionEnd: Point
  turnEnd: Point
}

interface BlockPath {
  pathData: string
  lengthMm: number
}

/**
 * Main routing function - 8-pipe register pattern
 */
export function calculateCircuits(
  heatPlates: HeatPlate[],
  connectionSide: ConnectionSide,
  orientation: Orientation,
  pxPerMeter: number
): HeatingCircuit[] {
  if (!heatPlates || heatPlates.length === 0) {
    return []
  }

  console.log('🧩 Starting 8-pipe register routing...')
  console.log(`  Plates: ${heatPlates.length}`)
  console.log(`  Connection Side: ${connectionSide}`)
  console.log(`  Orientation: ${orientation}`)

  // STEP 1: SORT plates
  const sortedPlates = sortPlates(heatPlates, orientation)

  // STEP 2: Split into blocks of 8
  const blocks = chunkPlates(sortedPlates, 8).filter((block) => block.length === 8)
  if (blocks.length === 0) {
    console.warn('⚠️ Not enough plates to form a full 8-pipe block')
    return []
  }

  // STEP 3: Generate block paths and group into 100m buckets
  const circuits: HeatingCircuit[] = []
  let currentPathParts: string[] = []
  let currentLengthMm = 0

  blocks.forEach((block, blockIndex) => {
    const blockPath = generatePatternPaths(block, connectionSide, orientation, pxPerMeter, blockIndex)
    if (!blockPath.pathData) {
      return
    }

    if (currentPathParts.length === 0 || (currentLengthMm + blockPath.lengthMm) <= MAX_CIRCUIT_LENGTH_MM) {
      currentPathParts.push(blockPath.pathData)
      currentLengthMm += blockPath.lengthMm
    } else {
      circuits.push({
        id: `circuit-${circuits.length}`,
        color: CIRCUIT_COLORS[circuits.length % CIRCUIT_COLORS.length],
        pathData: currentPathParts.join(' '),
        length: currentLengthMm,
      })

      currentPathParts = [blockPath.pathData]
      currentLengthMm = blockPath.lengthMm
    }

    console.log(`  ✓ Block ${blockIndex + 1}: length ${(blockPath.lengthMm / 1000).toFixed(2)}m`)
  })

  if (currentPathParts.length > 0) {
    circuits.push({
      id: `circuit-${circuits.length}`,
      color: CIRCUIT_COLORS[circuits.length % CIRCUIT_COLORS.length],
      pathData: currentPathParts.join(' '),
      length: currentLengthMm,
    })
  }

  console.log(`✓ Total circuits: ${circuits.length}`)
  return circuits
}

/**
 * Generate the strict 8-pipe register pattern for a block.
 * 
 * TURN SIDE (e.g., Top): Big Nest (Hagymahéj)
 * - Connect 1-8 (Widest)
 * - Connect 2-7
 * - Connect 3-6
 * - Connect 4-5 (Narrowest)
 * 
 * CONNECTION SIDE (e.g., Bottom): Double Nest Pattern
 * - Group 1 [1,2,3,4]: Connect 1-4 (Outer), 2-3 (Inner)
 * - Group 2 [5,6,7,8]: Connect 5-8 (Outer), 6-7 (Inner)
 * 
 * START BLOCK EXCEPTION (Indító):
 * - Pipe 1: Straight Stub (150mm)
 * - Pipe 2: Straight Stub (150mm)
 * - Pipe 3-4: Connect as loop
 * - Pipes 5-8: Follow standard Group 2 pattern
 */
function generatePatternPaths(
  plates: HeatPlate[],
  connectionSide: ConnectionSide,
  orientation: Orientation,
  pxPerMeter: number,
  blockIndex: number = 0
): BlockPath {
  const plateEnds = plates.map((plate) => getPlateEnds(plate, orientation, connectionSide))
  const turnSide = getTurnSide(connectionSide)

  const pathParts: string[] = []
  let lengthMm = 0

  const isStartBlock = blockIndex === 0

  // ============================================
  // TURN SIDE: Big Nest (Hagymahéj) Pattern
  // ============================================
  // Connect 1-8 (Widest), 2-7, 3-6, 4-5 (Narrowest)
  const turnPairs: Array<[number, number]> = [
    [0, 7], // 1-8 (Widest)
    [1, 6], // 2-7
    [2, 5], // 3-6
    [3, 4], // 4-5 (Narrowest)
  ]
  const pairCount = turnPairs.length

  turnPairs.forEach(([a, b], index) => {
    const depth = MAX_TURN_DEPTH_MM * ((pairCount - index) / pairCount)
    const result = createDXFStyleTurn(
      plateEnds[a].turnEnd,
      plateEnds[b].turnEnd,
      depth,
      turnSide,
      orientation,
      pxPerMeter
    )
    pathParts.push(result.pathData)
    lengthMm += result.lengthMm
  })

  // ============================================
  // CONNECTION SIDE: Double Nest Pattern
  // ============================================
  if (isStartBlock) {
    // START BLOCK EXCEPTION (Indító)
    const stubPx = mmToPx(STUB_LENGTH_MM, pxPerMeter)
    const connDir = getSideVector(connectionSide)

    // Pipe 1: Straight Stub (150mm)
    const pipe1Start = plateEnds[0].connectionEnd
    const pipe1End = {
      x: pipe1Start.x + connDir.x * stubPx,
      y: pipe1Start.y + connDir.y * stubPx,
    }
    pathParts.push(`M ${pipe1Start.x} ${pipe1Start.y} L ${pipe1End.x} ${pipe1End.y}`)
    lengthMm += STUB_LENGTH_MM

    // Pipe 2: Straight Stub (150mm)
    const pipe2Start = plateEnds[1].connectionEnd
    const pipe2End = {
      x: pipe2Start.x + connDir.x * stubPx,
      y: pipe2Start.y + connDir.y * stubPx,
    }
    pathParts.push(`M ${pipe2Start.x} ${pipe2Start.y} L ${pipe2End.x} ${pipe2End.y}`)
    lengthMm += STUB_LENGTH_MM

    // Pipe 3-4: Connect as loop
    const pipe34Result = createDXFStyleTurn(
      plateEnds[2].connectionEnd,
      plateEnds[3].connectionEnd,
      SMALL_TURN_DEPTH_MM,
      connectionSide,
      orientation,
      pxPerMeter
    )
    pathParts.push(pipe34Result.pathData)
    lengthMm += pipe34Result.lengthMm

    // Pipes 5-8: Follow standard Group 2 pattern
    // Group 2: Connect 5-8 (Outer), 6-7 (Inner)
    const group2Outer = createDXFStyleTurn(
      plateEnds[4].connectionEnd, // Pipe 5
      plateEnds[7].connectionEnd, // Pipe 8
      SMALL_TURN_DEPTH_MM,
      connectionSide,
      orientation,
      pxPerMeter
    )
    pathParts.push(group2Outer.pathData)
    lengthMm += group2Outer.lengthMm

    const group2Inner = createDXFStyleTurn(
      plateEnds[5].connectionEnd, // Pipe 6
      plateEnds[6].connectionEnd, // Pipe 7
      SMALL_TURN_DEPTH_MM,
      connectionSide,
      orientation,
      pxPerMeter
    )
    pathParts.push(group2Inner.pathData)
    lengthMm += group2Inner.lengthMm
  } else {
    // STANDARD BLOCK: Double Nest Pattern
    // Group 1 [1,2,3,4]: Connect 1-4 (Outer), 2-3 (Inner)
    const group1Outer = createDXFStyleTurn(
      plateEnds[0].connectionEnd, // Pipe 1
      plateEnds[3].connectionEnd, // Pipe 4
      SMALL_TURN_DEPTH_MM,
      connectionSide,
      orientation,
      pxPerMeter
    )
    pathParts.push(group1Outer.pathData)
    lengthMm += group1Outer.lengthMm

    const group1Inner = createDXFStyleTurn(
      plateEnds[1].connectionEnd, // Pipe 2
      plateEnds[2].connectionEnd, // Pipe 3
      SMALL_TURN_DEPTH_MM,
      connectionSide,
      orientation,
      pxPerMeter
    )
    pathParts.push(group1Inner.pathData)
    lengthMm += group1Inner.lengthMm

    // Group 2 [5,6,7,8]: Connect 5-8 (Outer), 6-7 (Inner)
    const group2Outer = createDXFStyleTurn(
      plateEnds[4].connectionEnd, // Pipe 5
      plateEnds[7].connectionEnd, // Pipe 8
      SMALL_TURN_DEPTH_MM,
      connectionSide,
      orientation,
      pxPerMeter
    )
    pathParts.push(group2Outer.pathData)
    lengthMm += group2Outer.lengthMm

    const group2Inner = createDXFStyleTurn(
      plateEnds[5].connectionEnd, // Pipe 6
      plateEnds[6].connectionEnd, // Pipe 7
      SMALL_TURN_DEPTH_MM,
      connectionSide,
      orientation,
      pxPerMeter
    )
    pathParts.push(group2Inner.pathData)
    lengthMm += group2Inner.lengthMm
  }

  return {
    pathData: pathParts.join(' '),
    lengthMm,
  }
}

/**
 * Sort plates by orientation
 * Vertical: Left → Right
 * Horizontal: Top → Bottom
 */
function sortPlates(plates: HeatPlate[], orientation: Orientation): HeatPlate[] {
  const sorted = [...plates]
  if (orientation === 'Vertical') {
    sorted.sort((a, b) => a.x1 - b.x1)
  } else {
    sorted.sort((a, b) => a.y1 - b.y1)
  }
  return sorted
}

function chunkPlates(plates: HeatPlate[], size: number): HeatPlate[][] {
  const chunks: HeatPlate[][] = []
  for (let i = 0; i < plates.length; i += size) {
    chunks.push(plates.slice(i, i + size))
  }
  return chunks
}

function getPlateEnds(
  plate: HeatPlate,
  orientation: Orientation,
  connectionSide: ConnectionSide
): PlateEnds {
  const p1 = { x: plate.x1, y: plate.y1 }
  const p2 = { x: plate.x2, y: plate.y2 }

  if (orientation === 'Vertical') {
  if (connectionSide === 'bottom') {
      return p1.y > p2.y
        ? { connectionEnd: p1, turnEnd: p2 }
        : { connectionEnd: p2, turnEnd: p1 }
    }
    return p1.y < p2.y
      ? { connectionEnd: p1, turnEnd: p2 }
      : { connectionEnd: p2, turnEnd: p1 }
  }

  if (connectionSide === 'left') {
    return p1.x < p2.x
      ? { connectionEnd: p1, turnEnd: p2 }
      : { connectionEnd: p2, turnEnd: p1 }
  }
  return p1.x > p2.x
    ? { connectionEnd: p1, turnEnd: p2 }
    : { connectionEnd: p2, turnEnd: p1 }
}

function getTurnSide(connectionSide: ConnectionSide): ConnectionSide {
  if (connectionSide === 'top') return 'bottom'
  if (connectionSide === 'bottom') return 'top'
  if (connectionSide === 'left') return 'right'
  return 'left'
}

function getSideVector(side: ConnectionSide): Point {
  if (side === 'top') return { x: 0, y: -1 }
  if (side === 'bottom') return { x: 0, y: 1 }
  if (side === 'left') return { x: -1, y: 0 }
  return { x: 1, y: 0 }
}

/**
 * Create DXF-style 'Flattened U' turn path
 * Pattern: Line -> Arc -> Line -> Arc -> Line
 * Radius: 50mm (or half the gap width, whichever is smaller)
 * 
 * @param p1 - Start point
 * @param p2 - End point
 * @param depth - Turn depth in mm
 * @param side - Which side the turn extends to (turnSide or connectionSide)
 * @param orientation - 'Vertical' or 'Horizontal'
 * @param pxPerMeter - Pixels per meter calibration
 * @returns SVG path data and length
 */
function createDXFStyleTurn(
  p1: Point,
  p2: Point,
  depth: number,
  side: ConnectionSide,
  _orientation: Orientation,
  pxPerMeter: number
): { pathData: string; lengthMm: number } {
  const depthPx = mmToPx(depth, pxPerMeter)
  const dir = getSideVector(side)
  const radiusMm = 50 // Fixed 50mm radius

  // Calculate gap width (distance between p1 and p2)
  const gapPx = distance(p1, p2)
  const gapMm = (gapPx / pxPerMeter) * 1000
  const halfGapMm = gapMm / 2

  // Use smaller radius: 50mm or half gap width
  const actualRadiusMm = Math.min(radiusMm, halfGapMm)
  const actualRadiusPx = mmToPx(actualRadiusMm, pxPerMeter)

  // Calculate the line direction from p1 to p2
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const span = Math.sqrt(dx * dx + dy * dy)

  if (span < actualRadiusPx * 2) {
    // Gap too small for turn, use straight line
    const pathData = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
    const lengthMm = (span / pxPerMeter) * 1000
    return { pathData, lengthMm }
  }

  // Normalize direction along the line
  const unitX = dx / span
  const unitY = dy / span

  // Midpoint of the line
  const midX = (p1.x + p2.x) / 2
  const midY = (p1.y + p2.y) / 2

  // Turn point: extend in the direction of 'side' (perpendicular to the line)
  // For vertical plates: dir is vertical (up/down), extend perpendicular (vertical)
  // For horizontal plates: dir is horizontal (left/right), extend perpendicular (horizontal)
  const turnX = midX + dir.x * depthPx
  const turnY = midY + dir.y * depthPx

  // Calculate corner points
  // Corner start: p1 + radius along the line direction
  const cornerStart = {
    x: p1.x + unitX * actualRadiusPx,
    y: p1.y + unitY * actualRadiusPx,
  }

  // Corner end: turn point - radius along the line direction
  const cornerEnd = {
    x: turnX - unitX * actualRadiusPx,
    y: turnY - unitY * actualRadiusPx,
  }

  // Bridge end: turn point + radius along the line direction
  const bridgeEnd = {
    x: turnX + unitX * actualRadiusPx,
    y: turnY + unitY * actualRadiusPx,
  }

  // End start: p2 - radius along the line direction
  const endStart = {
    x: p2.x - unitX * actualRadiusPx,
    y: p2.y - unitY * actualRadiusPx,
  }

  // Determine arc sweep direction based on turn direction
  // For a proper U-turn, the first arc curves toward the turn point,
  // and the second arc curves away from the turn point (back toward p2)
  // Use cross product to determine which side of the line the turn point is on
  const crossProduct = (p2.x - p1.x) * (turnY - p1.y) - (p2.y - p1.y) * (turnX - p1.x)
  const sweepFlag1 = crossProduct > 0 ? 1 : 0
  const sweepFlag2 = 1 - sweepFlag1 // Opposite direction for the second arc

  // Build SVG path: M start -> L corner_start -> A arc1 -> L bridge_end -> A arc2 -> L end
  const pathData = [
    `M ${p1.x} ${p1.y}`,
    `L ${cornerStart.x} ${cornerStart.y}`,
    `A ${actualRadiusPx} ${actualRadiusPx} 0 0 ${sweepFlag1} ${cornerEnd.x} ${cornerEnd.y}`,
    `L ${bridgeEnd.x} ${bridgeEnd.y}`,
    `A ${actualRadiusPx} ${actualRadiusPx} 0 0 ${sweepFlag2} ${endStart.x} ${endStart.y}`,
    `L ${p2.x} ${p2.y}`,
  ].join(' ')

  // Calculate approximate path length
  const lengthPx =
    distance(p1, cornerStart) +
    (Math.PI * actualRadiusPx) / 2 + // Quarter circle arc
    distance(cornerEnd, bridgeEnd) +
    (Math.PI * actualRadiusPx) / 2 + // Quarter circle arc
    distance(endStart, p2)

  const lengthMm = (lengthPx / pxPerMeter) * 1000

  return { pathData, lengthMm }
}


function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

function mmToPx(mm: number, pxPerMeter: number): number {
  return (mm / 1000) * pxPerMeter
}
