import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { GlobalSettings } from '../types'
import { getAllAssets } from '../data/assets/AssetRegistry'

interface GlobalSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function GlobalSettingsModal({ isOpen, onClose }: GlobalSettingsModalProps) {
  const { settings, updateSettings, assetOverrides, setAssetOverride } = useStore()
  const [localSettings, setLocalSettings] = useState<GlobalSettings>(settings)
  const [isRotatedMode, setIsRotatedMode] = useState(false) // Toggle for 90° calibration mode
  
  // Get all available assets for calibration
  const allAssets = getAllAssets()

  if (!isOpen) {
    return null
  }

  const handleSave = () => {
    updateSettings(localSettings)
    onClose()
  }

  const handleCancel = () => {
    setLocalSettings(settings)
    onClose()
  }

  const updateLocalSetting = <K extends keyof GlobalSettings>(
    key: K,
    value: number
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Beállítások</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CD Profil Szélesség (mm)
            </label>
            <input
              type="number"
              value={localSettings.cdProfileWidth}
              onChange={(e) =>
                updateLocalSetting('cdProfileWidth', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CD Profil Tengelytáv (mm)
            </label>
            <input
              type="number"
              value={localSettings.cdProfileSpacing}
              onChange={(e) =>
                updateLocalSetting('cdProfileSpacing', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Szerelési Távolság Falaktól (mm)
            </label>
            <input
              type="number"
              value={localSettings.wallBuffer}
              onChange={(e) =>
                updateLocalSetting('wallBuffer', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raszter Minimum Margó (mm)
            </label>
            <input
              type="number"
              value={localSettings.gridMargin}
              onChange={(e) =>
                updateLocalSetting('gridMargin', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fűtőpanel Szélesség (mm)
            </label>
            <input
              type="number"
              value={localSettings.plateWidth}
              onChange={(e) =>
                updateLocalSetting('plateWidth', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rendszer 4 Hézag (mm)
            </label>
            <input
              type="number"
              value={localSettings.system4Gap}
              onChange={(e) =>
                updateLocalSetting('system4Gap', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rendszer 6 Hézag (mm)
            </label>
            <input
              type="number"
              value={localSettings.system6Gap}
              onChange={(e) =>
                updateLocalSetting('system6Gap', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vizuális Eltolás (mm)
            </label>
            <input
              type="number"
              value={localSettings.visualOffset}
              onChange={(e) =>
                updateLocalSetting('visualOffset', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Induló Csőhossz (Számításhoz) [mm]
            </label>
            <input
              type="number"
              value={localSettings.startPipeLength}
              onChange={(e) =>
                updateLocalSetting('startPipeLength', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              step="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ez az érték csak az anyaglistát befolyásolja, a rajzot nem.
            </p>
          </div>

          {/* Complete Calibration Dashboard */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Teljes Kalibráció (Minden Elem)
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Finomhangolja az összes SVG minta pozícióját valós időben. Minden érték mm-ben.
            </p>

            {/* Induló (Start) */}
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Induló (Start) - SVG Strukturális Beállítások
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    SVG Belső X Padding (mm)
                  </label>
                  <input
                    type="number"
                    value={localSettings.calibration.svgInternalPaddingX}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        calibration: {
                          ...prev.calibration,
                          svgInternalPaddingX: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Kompenzálja az SVG fájlban lévő üres területet az X tengelyen
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Hatékony Cső Szélesség (mm)
                  </label>
                  <input
                    type="number"
                    value={localSettings.calibration.effectivePipeWidth}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        calibration: {
                          ...prev.calibration,
                          effectivePipeWidth: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    A tényleges csövek szélessége tükrözéshez (303.85mm)
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Vizuális Cső Hossz (mm)
                  </label>
                  <input
                    type="number"
                    value={localSettings.calibration.visualPipeLength}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        calibration: {
                          ...prev.calibration,
                          visualPipeLength: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Felülírja a logikus hosszúságot rajzolási célokra (300mm)
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Induló Y Eltolás (mm)
                  </label>
                  <input
                    type="number"
                    value={localSettings.calibration.induloOffsetY}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        calibration: {
                          ...prev.calibration,
                          induloOffsetY: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Átforduló (Turn) */}
            <div className="mb-4 p-3 bg-green-50 rounded">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Átforduló (Turn)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Átforduló X Eltolás (mm)
                  </label>
                  <input
                    type="number"
                    value={localSettings.calibration.atforduloOffsetX}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        calibration: {
                          ...prev.calibration,
                          atforduloOffsetX: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Átforduló Y Eltolás (mm)
                  </label>
                  <input
                    type="number"
                    value={localSettings.calibration.atforduloOffsetY}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        calibration: {
                          ...prev.calibration,
                          atforduloOffsetY: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* Vége (End) */}
            <div className="mb-4 p-3 bg-purple-50 rounded">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vége (End)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Vége X Eltolás (mm)
                  </label>
                  <input
                    type="number"
                    value={localSettings.calibration.vegeOffsetX}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        calibration: {
                          ...prev.calibration,
                          vegeOffsetX: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Vége Y Eltolás (mm)
                  </label>
                  <input
                    type="number"
                    value={localSettings.calibration.vegeOffsetY}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        calibration: {
                          ...prev.calibration,
                          vegeOffsetY: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Asset Calibration Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">
                Asset Kalibráció (Mágneses Rögzítési Pontok)
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRotatedMode}
                  onChange={(e) => setIsRotatedMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Fekvő Mód (90°) Szerkesztése
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              {isRotatedMode 
                ? 'Állítsa be a mágneses rögzítési pontokat 90° elforgatású elemekhez. A canvas-on az asset 90°-ban jelenik meg.'
                : 'Állítsa be a mágneses rögzítési pontokat (snapX, snapY) minden asset típushoz valós időben. A piros pont a canvas-on mutatja a jelenlegi értéket.'}
            </p>

            {allAssets.map((asset) => {
              const override = assetOverrides[asset.id] || {}
              
              // Determine which anchors to edit based on mode
              if (isRotatedMode) {
                // 90° Mode: Edit anchors90
                const anchors90 = override.anchors90 || asset.anchors90 || (asset.anchors ? [{ ...asset.anchors[0] }] : [{ x: 100, y: 1100 }])
                const currentAnchor90 = anchors90[0] || { x: 100, y: 1100 }
                
                return (
                  <div key={asset.id} className="mb-4 p-3 bg-green-50 rounded border border-green-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {asset.name} ({asset.id}) - 90° Mód
                    </label>
                    {asset.description && (
                      <p className="text-xs text-gray-500 mb-2">{asset.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Snap X (90° mód)
                        </label>
                        <input
                          type="number"
                          value={currentAnchor90.x}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value)
                            if (!isNaN(value)) {
                              const newAnchors90 = [{ ...currentAnchor90, x: value }, ...anchors90.slice(1)]
                              setAssetOverride(asset.id, { anchors90: newAnchors90 })
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          step="1"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Vízszintes rögzítési pont 90° elforgatásnál
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Snap Y (90° mód)
                        </label>
                        <input
                          type="number"
                          value={currentAnchor90.y}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value)
                            if (!isNaN(value)) {
                              const newAnchors90 = [{ ...currentAnchor90, y: value }, ...anchors90.slice(1)]
                              setAssetOverride(asset.id, { anchors90: newAnchors90 })
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          step="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Függőleges rögzítési pont 90° elforgatásnál
                        </p>
                      </div>
                    </div>
                  </div>
                )
              } else {
                // 0° Mode: Edit standard anchors
                const currentSnapX = override.snapX !== undefined ? override.snapX : (asset.anchors?.[0]?.x ?? 200)
                const currentSnapY = override.snapY !== undefined ? override.snapY : (asset.anchors?.[0]?.y ?? 0)

                return (
                  <div key={asset.id} className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {asset.name} ({asset.id})
                    </label>
                    {asset.description && (
                      <p className="text-xs text-gray-500 mb-2">{asset.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Snap X (Inkscape units)
                        </label>
                        <input
                          type="number"
                          value={currentSnapX}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value)
                            if (!isNaN(value)) {
                              setAssetOverride(asset.id, { snapX: value })
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          step="1"
                          min="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Vízszintes rögzítési pont (alapértelmezett: {asset.anchors?.[0]?.x ?? 200})
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Snap Y (Inkscape units)
                        </label>
                        <input
                          type="number"
                          value={currentSnapY}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value)
                            if (!isNaN(value)) {
                              setAssetOverride(asset.id, { snapY: value })
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          step="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Függőleges rögzítési pont (alapértelmezett: {asset.anchors?.[0]?.y ?? 0})
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Mégse
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Mentés
          </button>
        </div>
      </div>
    </div>
  )
}
