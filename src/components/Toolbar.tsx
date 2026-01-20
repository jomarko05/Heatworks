import { useState } from 'react'
import { Ruler, Trash2, Home, FileDown, Settings, Plug, ArrowUpDown, ArrowLeftRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import GlobalSettingsModal from './GlobalSettingsModal'

export default function Toolbar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { 
    pdf, 
    measurement, 
    roomDrawing, 
    selectedRoomId,
    isSettingConnectionPoint,
    setMeasurementActive, 
    clearMeasurements, 
    setRoomDrawingActive, 
    cancelRoomDrawing,
    setIsSettingConnectionPoint,
    exportToPDF,
    placementRotation,
    setPlacementRotation,
    showSnapPoints,
    toggleSnapPoints,
  } = useStore()

  const handleToggleMeasure = () => {
    if (roomDrawing.isActive) {
      cancelRoomDrawing()
    }
    setMeasurementActive(!measurement.isActive)
  }

  const handleToggleRoomDrawing = () => {
    if (measurement.isActive) {
      setMeasurementActive(false)
    }
    if (isSettingConnectionPoint) {
      setIsSettingConnectionPoint(false)
    }
    setRoomDrawingActive(!roomDrawing.isActive)
  }

  const handleToggleConnectionPoint = () => {
    if (roomDrawing.isActive) {
      cancelRoomDrawing()
    }
    if (measurement.isActive) {
      setMeasurementActive(false)
    }
    setIsSettingConnectionPoint(!isSettingConnectionPoint)
  }

  const handleClearMeasurements = () => {
    clearMeasurements()
  }

  const isScaleSet = pdf.pxPerMeter !== null
  const hasMeasurements = measurement.measurements.length > 0

  if (!pdf.url) {
    return null
  }

  return (
    <>
      <GlobalSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-50 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Eszközök</h3>
        
        {/* Placement Rotation Controls */}
        <div className="border-b border-gray-200 pb-2 mb-2">
          <p className="text-xs text-gray-600 mb-1">Lerakási Irány (Placement Dir)</p>
          <div className="flex gap-1">
            <button
              onClick={() => setPlacementRotation(0)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-sm transition-colors ${
                placementRotation === 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Vertical (0°) - Press V"
            >
              <ArrowUpDown size={14} />
              <span className="text-xs">V (0°)</span>
            </button>
            <button
              onClick={() => setPlacementRotation(90)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-sm transition-colors ${
                placementRotation === 90
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Horizontal (90°) - Press H"
            >
              <ArrowLeftRight size={14} />
              <span className="text-xs">H (90°)</span>
            </button>
          </div>
        </div>
        
        {/* Snap Points Toggle */}
        <button
          onClick={toggleSnapPoints}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
            showSnapPoints
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          title="Mágneses rögzítési pontok megjelenítése/elrejtése"
        >
          <span className="text-lg">🧲</span>
          <span className="text-sm">Mágnesek</span>
        </button>
        
        {/* Draw Room Button */}
        <button
          onClick={handleToggleRoomDrawing}
          disabled={!isScaleSet}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
            roomDrawing.isActive
              ? 'bg-green-600 text-white hover:bg-green-700'
              : isScaleSet
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!isScaleSet ? 'Először kalibrálja a léptéket' : 'Szoba rajzolása'}
        >
          <Home size={18} />
          <span className="text-sm">Szoba Rajzolása</span>
        </button>

        {/* Measurement Tool Button */}
        <button
          onClick={handleToggleMeasure}
          disabled={!isScaleSet}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
            measurement.isActive
              ? 'bg-red-600 text-white hover:bg-red-700'
              : isScaleSet
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!isScaleSet ? 'Először kalibrálja a léptéket' : 'Távolság mérése'}
        >
          <Ruler size={18} />
          <span className="text-sm">Mérés</span>
        </button>

        {/* Connection Point Button */}
        <button
          onClick={handleToggleConnectionPoint}
          disabled={!isScaleSet || !selectedRoomId}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
            isSettingConnectionPoint
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : isScaleSet && selectedRoomId
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!isScaleSet ? 'Először kalibrálja a léptéket' : !selectedRoomId ? 'Válasszon ki egy szobát' : 'Bekötési pont beállítása'}
        >
          <Plug size={18} />
          <span className="text-sm">Bekötési Pont</span>
        </button>

        {/* Clear Measurements Button */}
        {hasMeasurements && (
          <button
            onClick={handleClearMeasurements}
            className="flex items-center gap-2 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
            title="Összes mérés törlése"
          >
            <Trash2 size={18} />
            <span className="text-sm">Törlés</span>
          </button>
        )}

        {/* Settings Button */}
        <div className="border-t border-gray-200 my-2"></div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
          title="Beállítások"
        >
          <Settings size={18} />
          <span className="text-sm">Beállítások</span>
        </button>

        {/* Export to PDF Button (Vector-Based) */}
        <button
          onClick={exportToPDF}
          className="flex items-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold"
          title="Terv exportálása vektoros PDF formátumba (eredeti PDF + vektoros rajz)"
        >
          <FileDown size={18} />
          <span className="text-sm">DXF Exportálás</span>
        </button>

        {/* Hint Text */}
        {roomDrawing.isActive && (
          <div className="text-xs text-gray-600 mt-1 max-w-[150px]">
            Kattintson pontokra a szoba rajzolásához. Dupla kattintással vagy az első pontra kattintva zárja be.
          </div>
        )}
        
        {measurement.isActive && (
          <div className="text-xs text-gray-600 mt-1 max-w-[150px]">
            Kattintson két pontra a méréshez. ESC-re kilépés.
          </div>
        )}
        
        {isSettingConnectionPoint && (
          <div className="text-xs text-gray-600 mt-1 max-w-[150px]">
            Kattintson a vászonra a bekötési pont beállításához.
          </div>
        )}
      </div>
    </>
  )
}
