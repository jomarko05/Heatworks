import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { SystemType, Orientation } from '../types'
import { GridCalculator } from '../utils/GridCalculator'

export default function RoomPropertiesModal() {
  const { roomDrawing, pdf, setPendingRoomProperties, finishRoom, cancelRoomDrawing } = useStore()
  const [name, setName] = useState('')
  const [systemType, setSystemType] = useState<SystemType>('System 4')
  const [orientation, setOrientation] = useState<Orientation>('Vertical')

  if (!roomDrawing.pendingRoom) {
    return null
  }

  const handleGenerate = () => {
    if (!name.trim()) {
      alert('Please enter a room name')
      return
    }

    if (!pdf.pxPerMeter) {
      alert('Please calibrate the scale first')
      return
    }

    // Set properties
    setPendingRoomProperties(name, systemType, orientation)

    // Generate grid
    const calculator = new GridCalculator(pdf.pxPerMeter)
    const roomWithGrid = calculator.generateRoomGrid({
      ...roomDrawing.pendingRoom,
      name,
      systemType,
      orientation,
    })

    // Update the pending room with generated data
    setPendingRoomProperties(roomWithGrid.name, roomWithGrid.systemType, roomWithGrid.orientation)
    
    // We need to also update the cdProfiles and area
    // Let's update the store to handle this
    useStore.setState((state) => ({
      roomDrawing: {
        ...state.roomDrawing,
        pendingRoom: roomWithGrid,
      },
    }))

    // Finish room
    finishRoom()
    
    setName('')
  }

  const handleCancel = () => {
    cancelRoomDrawing()
    setName('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div 
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Room Properties</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Nappali"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* System Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Type
            </label>
            <select
              value={systemType}
              onChange={(e) => setSystemType(e.target.value as SystemType)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="System 4">System 4</option>
              <option value="System 6">System 6</option>
            </select>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Orientation
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setOrientation('Vertical')}
                className={`flex-1 px-4 py-2 rounded transition-colors ${
                  orientation === 'Vertical'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Vertical
              </button>
              <button
                onClick={() => setOrientation('Horizontal')}
                className={`flex-1 px-4 py-2 rounded transition-colors ${
                  orientation === 'Horizontal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Horizontal
              </button>
            </div>
          </div>

          {/* Info Text */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p className="font-medium mb-1">Grid Settings:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Blue CD Profile: 60mm wide (6cm)</li>
              <li>Brown Heat Plates: 50mm wide (5cm)</li>
              <li>Profile spacing: 400mm center-to-center</li>
              <li>Brown plate offset: 31mm from blue axis</li>
              <li>Wall buffer: ≥ 250mm (Turning Zone)</li>
              <li>Length quantization: 100mm steps</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Generate Layout
          </button>
        </div>
      </div>
    </div>
  )
}
