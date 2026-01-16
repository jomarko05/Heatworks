import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function CalibrationTool() {
  const { pdf, calibration, setIsCalibrating, setRealLengthMeters, completeCalibration } = useStore()
  const [inputValue, setInputValue] = useState('')

  const handleStartCalibration = () => {
    setIsCalibrating(true)
    setInputValue('')
  }

  const handleCancelCalibration = () => {
    setIsCalibrating(false)
    setInputValue('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleConfirmLength = () => {
    const meters = parseFloat(inputValue)
    if (isNaN(meters) || meters <= 0) {
      alert('Please enter a valid positive number')
      return
    }

    setRealLengthMeters(meters)
    
    // If line is already drawn, complete calibration immediately
    if (calibration.line && !calibration.isDrawingLine) {
      completeCalibration()
      setInputValue('')
    }
  }

  const handleCompleteCalibration = () => {
    if (!calibration.line) {
      alert('Please draw a line first')
      return
    }
    if (!calibration.line.realLengthMeters) {
      alert('Please enter the real length in meters')
      return
    }
    completeCalibration()
    setInputValue('')
  }

  if (!pdf.url) {
    return null
  }

  return (
    <div 
      className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-50 min-w-[300px]"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-semibold mb-3">Calibration Tool</h3>
      
      {!calibration.isCalibrating ? (
        <div>
          <button
            onClick={handleStartCalibration}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Start Calibration
          </button>
          {pdf.pxPerMeter !== null && (
            <div className="mt-3 text-sm text-gray-600">
              Current scale: <strong>{pdf.pxPerMeter.toFixed(2)} px/m</strong>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-700 mb-2">
              1. Draw a line on the PDF by clicking two points
            </p>
            <p className="text-sm text-gray-700 mb-3">
              2. Enter the real-world length of that line in meters:
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="e.g., 4.55"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="self-center text-sm text-gray-600">m</span>
            </div>
          </div>
          
          {calibration.line && !calibration.isDrawingLine && (
            <div className="flex gap-2">
              <button
                onClick={handleConfirmLength}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                Confirm Length
              </button>
              <button
                onClick={handleCompleteCalibration}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                disabled={!calibration.line.realLengthMeters}
              >
                Complete
              </button>
            </div>
          )}

          <button
            onClick={handleCancelCalibration}
            className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
