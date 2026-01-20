/**
 * AssetMenuOverlay - Asset Selection Menu
 * 
 * Displays available SVG assets (System 4 patterns) for manual placement.
 * Opens on SPACE key press, closes on ESC or click outside.
 */

import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { ASSET_REGISTRY, RegisteredAsset } from '../data/assets/AssetRegistry'

export default function AssetMenuOverlay() {
  const { isAssetMenuOpen, closeAssetMenu, setPlacingAsset } = useStore()
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on ESC key
  useEffect(() => {
    if (!isAssetMenuOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAssetMenu()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isAssetMenuOpen, closeAssetMenu])

  // Close on click outside
  useEffect(() => {
    if (!isAssetMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeAssetMenu()
      }
    }

    // Use capture phase to catch clicks before they bubble
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [isAssetMenuOpen, closeAssetMenu])

  if (!isAssetMenuOpen) {
    return null
  }

  const handleAssetClick = (asset: RegisteredAsset) => {
    console.log('📦 Asset selected:', asset.id, asset.name)
    setPlacingAsset(asset)
    closeAssetMenu()
  }

  // Calculate viewBox from paths (rough approximation)
  const getViewBox = (paths: string[]): string => {
    // These are Inkscape coordinates - approximate bounds
    // Indulo: roughly -32 to 700 in X, 177 to 1122 in Y
    // Atfordulo: roughly -30 to 2100 in X, 238 to 1122 in Y  
    // Vege: roughly -32 to 500 in X, 812 to 1122 in Y
    // Use a generous viewBox that fits all patterns
    return '0 0 2200 1200'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={menuRef}
        className="bg-white rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Asset Menu</h2>
          <button
            onClick={closeAssetMenu}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* System 4 Assets */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">System 4 Patterns</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ASSET_REGISTRY.SYSTEM_4.map((asset) => (
              <button
                key={asset.id}
                onClick={() => handleAssetClick(asset)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left flex flex-col"
              >
                {/* SVG Preview */}
                <div className="w-full h-32 mb-3 bg-gray-50 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                  <svg
                    viewBox={getViewBox(asset.paths)}
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ maxHeight: '128px' }}
                  >
                    {asset.paths.map((pathData, pathIndex) => (
                      <path
                        key={pathIndex}
                        d={pathData}
                        fill="#32CD32"
                        stroke="none"
                        strokeWidth="0"
                      />
                    ))}
                  </svg>
                </div>
                
                {/* Asset Info */}
                <div className="font-semibold text-gray-800 mb-1">{asset.name}</div>
                {asset.description && (
                  <div className="text-sm text-gray-600 mb-2">{asset.description}</div>
                )}
                <div className="text-xs text-gray-500">
                  {asset.paths.length} path{asset.paths.length !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Other Categories (Empty for now) */}
        {ASSET_REGISTRY.SYSTEM_6.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">System 6 Patterns</h3>
            <div className="text-gray-500 text-sm">Coming soon...</div>
          </div>
        )}

        {/* Footer Hint */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
          Press <kbd className="px-2 py-1 bg-gray-100 rounded">ESC</kbd> or click outside to close
        </div>
      </div>
    </div>
  )
}
