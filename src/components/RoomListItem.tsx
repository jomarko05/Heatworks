import { Trash2, ChevronDown, ChevronUp, ArrowUpDown, ArrowLeftRight } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { SystemType } from '../types'

interface RoomListItemProps {
  roomId: string
}

/**
 * RoomListItem - NUCLEAR REWRITE
 * Direct store subscription, guaranteed reactivity
 */
export default function RoomListItem({ roomId }: RoomListItemProps) {
  // ==========================================
  // DIRECT STORE ACCESS (No prop passing)
  // ==========================================
  const room = useStore((state) => state.rooms.find((r) => r.id === roomId))
  const updateRoom = useStore((state) => state.updateRoom)
  const deleteRoom = useStore((state) => state.deleteRoom)
  const setHoveredRoomId = useStore((state) => state.setHoveredRoomId)
  const selectRoom = useStore((state) => state.selectRoom)
  const selectedRoomId = useStore((state) => state.selectedRoomId)

  // Local state
  const [isExpanded, setIsExpanded] = useState(false)

  // ==========================================
  // FAIL-SAFE: Room not found (deleted)
  // ==========================================
  if (!room) {
    console.warn(`⚠️ RoomListItem: Room ${roomId} not found (deleted?)`)
    return null
  }

  console.log(`🎨 RoomListItem: Rendering ${roomId}`, {
    name: room.name,
    system: room.systemType,
    orientation: room.orientation,
    profiles: room.cdProfiles?.length || 0,
    plates: room.heatPlates?.length || 0,
  })

  // ==========================================
  // EVENT HANDLERS (with debug logs)
  // ==========================================

  const handleSystemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    const newSystem = e.target.value as SystemType
    console.log(`🔥 CLICKED: System change ${room.systemType} → ${newSystem}`)
    updateRoom(roomId, { systemType: newSystem })
    console.log(`✓ Store action called`)
  }

  const handleOrientationToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newOrientation = room.orientation === 'Vertical' ? 'Horizontal' : 'Vertical'
    console.log(`🔥 CLICKED: Orientation toggle ${room.orientation} → ${newOrientation}`)
    updateRoom(roomId, { orientation: newOrientation })
    console.log(`✓ Store action called`)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log(`🔥 CLICKED: Delete room ${roomId}`)
    deleteRoom(roomId)
  }

  const handleCardClick = () => {
    console.log(`🔥 CLICKED: Select room ${roomId}`)
    selectRoom(roomId)
  }

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log(`🔥 CLICKED: Toggle material list (expanded: ${!isExpanded})`)
    setIsExpanded(!isExpanded)
  }

  // ==========================================
  // RENDER
  // ==========================================
  const isSelected = selectedRoomId === roomId

  return (
    <div
      className={`border rounded-lg p-3 hover:border-blue-400 transition-colors cursor-pointer ${
        isSelected ? 'border-blue-600 border-2 bg-blue-50' : 'border-gray-200'
      }`}
      onClick={handleCardClick}
      onMouseEnter={() => setHoveredRoomId(roomId)}
      onMouseLeave={() => setHoveredRoomId(null)}
    >
      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <div className="font-semibold text-gray-800">{room.name}</div>
          <div className="text-sm text-gray-500">{room.area?.toFixed(1) || '0.0'} m²</div>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Helyiség törlése"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* ========== CONTROLS (System + Orientation) ========== */}
      <div className="flex items-end gap-2 mb-2">
        {/* System Type Dropdown */}
        <div className="flex-1" onClick={(e) => e.stopPropagation()}>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Rendszer
          </label>
          <select
            value={room.systemType}
            onChange={handleSystemChange}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="System 4">Rendszer 4</option>
            <option value="System 6">Rendszer 6</option>
          </select>
        </div>

        {/* Orientation Toggle Button */}
        <button
          onClick={handleOrientationToggle}
          className="p-2 border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors"
          title={room.orientation === 'Vertical' ? 'Függőleges (kattints a váltáshoz)' : 'Vízszintes (kattints a váltáshoz)'}
        >
          {room.orientation === 'Vertical' ? (
            <ArrowUpDown size={20} className="text-gray-700" />
          ) : (
            <ArrowLeftRight size={20} className="text-gray-700" />
          )}
        </button>
      </div>

      {/* ========== MATERIAL LIST (Accordion) ========== */}
      {room.plateMaterials && room.plateMaterials.length > 0 && (
        <div className="border-t border-gray-200 pt-2 mt-2">
          <button
            onClick={handleToggleExpand}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <span>Anyaglista</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Collapsible Content */}
          {isExpanded && (
            <div className="mt-2 space-y-1">
              {/* Material List */}
              <div className="bg-gray-50 rounded p-2 text-xs space-y-0.5">
                {room.plateMaterials.map((material, idx) => (
                  <div key={idx} className="flex justify-between text-gray-700">
                    <span className="font-medium">{material.lengthMm} mm</span>
                    <span>{material.count} db</span>
                  </div>
                ))}
              </div>

              {/* Total Meters Summary */}
              <div className="text-xs text-gray-600 font-medium pt-1 border-t border-gray-200">
                Összesen: {(
                  room.plateMaterials.reduce(
                    (sum, m) => sum + (m.lengthMm * m.count / 1000),
                    0
                  )
                ).toFixed(2)} m
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
