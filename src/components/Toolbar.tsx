import { Ruler, Trash2, Home, FileDown } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function Toolbar() {
  const { pdf, measurement, roomDrawing, setMeasurementActive, clearMeasurements, setRoomDrawingActive, cancelRoomDrawing, exportToPDF } = useStore()

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
    setRoomDrawingActive(!roomDrawing.isActive)
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
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-50 flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Tools</h3>
      
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
        title={!isScaleSet ? 'Complete calibration first' : 'Draw room polygon'}
      >
        <Home size={18} />
        <span className="text-sm">Draw Room</span>
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
        title={!isScaleSet ? 'Complete calibration first' : 'Measure distances'}
      >
        <Ruler size={18} />
        <span className="text-sm">Measure</span>
      </button>

      {/* Clear Measurements Button */}
      {hasMeasurements && (
        <button
          onClick={handleClearMeasurements}
          className="flex items-center gap-2 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
          title="Clear all measurements"
        >
          <Trash2 size={18} />
          <span className="text-sm">Clear</span>
        </button>
      )}

      {/* Export to PDF Button (Vector-Based) */}
      <div className="border-t border-gray-200 my-2"></div>
      <button
        onClick={exportToPDF}
        className="flex items-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold"
        title="Terv exportálása vektoros PDF formátumba (eredeti PDF + vektoros rajz)"
      >
        <FileDown size={18} />
        <span className="text-sm">PDF Mentés</span>
      </button>

      {/* Hint Text */}
      {roomDrawing.isActive && (
        <div className="text-xs text-gray-600 mt-1 max-w-[150px]">
          Click points to draw room. Double-click or click first point to close.
        </div>
      )}
      
      {measurement.isActive && (
        <div className="text-xs text-gray-600 mt-1 max-w-[150px]">
          Click two points to measure. Press ESC to exit.
        </div>
      )}
    </div>
  )
}
