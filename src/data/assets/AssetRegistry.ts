/**
 * Asset Registry
 * 
 * Central registry for all SVG assets used in the CAD designer.
 * Assets are organized by category for easy lookup and menu display.
 */

import { SYSTEM4_ASSETS, SVGAsset } from './System4'

// Import store to access asset overrides
let getStoreState: (() => any) | null = null

/**
 * Set the store getter function (called from useStore)
 * This allows getAssetById to access assetOverrides from the store
 */
export function setStoreGetter(getter: () => any) {
  getStoreState = getter
}

export type AssetCategory = 'SYSTEM_4' | 'SYSTEM_6' | 'FITTINGS' | 'TOOLS'

export interface RegisteredAsset extends SVGAsset {
  category: AssetCategory
}

/**
 * Asset Registry
 * Organized by category for menu display and selection
 */
export const ASSET_REGISTRY: Record<AssetCategory, RegisteredAsset[]> = {
  SYSTEM_4: [
    SYSTEM4_ASSETS.indulo,
    SYSTEM4_ASSETS.atfordulo,
    SYSTEM4_ASSETS.vege,
    SYSTEM4_ASSETS.egyenes,
  ],
  SYSTEM_6: [], // To be added later
  FITTINGS: [], // To be added later
  TOOLS: [], // To be added later
}

/**
 * Get all assets by category
 */
export function getAssetsByCategory(category: AssetCategory): RegisteredAsset[] {
  return ASSET_REGISTRY[category] || []
}

/**
 * Get asset by ID (static version - no overrides)
 * For the version with store overrides, use getAssetById from useStore.ts
 */
export function getAssetById(id: string): RegisteredAsset | undefined {
  for (const category of Object.keys(ASSET_REGISTRY) as AssetCategory[]) {
    const asset = ASSET_REGISTRY[category].find(a => a.id === id)
    if (asset) return asset
  }
  return undefined
}

/**
 * Get all assets (flattened)
 */
export function getAllAssets(): RegisteredAsset[] {
  return Object.values(ASSET_REGISTRY).flat()
}
