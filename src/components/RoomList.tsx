import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import RoomListItem from './RoomListItem'

export default function RoomList() {
  // DIRECT STORE SUBSCRIPTION - Only subscribe to rooms array
  const rooms = useStore((state) => state.rooms)
  const [isOpen, setIsOpen] = useState(true)

  // Debug: Log when rooms state changes
  useEffect(() => {
    console.log('🔄 RoomList: Rooms state updated', rooms?.length || 0, 'rooms')
    if (rooms && rooms.length > 0) {
      rooms.forEach(room => {
        console.log(`  Room ${room.id}: ${room.name}, System: ${room.systemType}, Orientation: ${room.orientation}`)
      })
    }
  }, [rooms])

  // NULL GUARD: Prevent crash if rooms is undefined
  if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
    return null
  }

  return (
    <>
      {/* Toggle Button - Always Visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-24 right-4 bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 transition-all z-50"
        title={isOpen ? 'Sidebar bezárása' : 'Sidebar megnyitása'}
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Collapsible Sidebar */}
      <div 
        className={`fixed top-20 right-4 bg-white rounded-lg shadow-xl z-40 max-h-[calc(100vh-120px)] overflow-y-auto transition-all duration-300 ease-in-out ${
          isOpen ? 'w-80 p-4 opacity-100' : 'w-0 p-0 opacity-0 overflow-hidden'
        }`}
        style={{ 
          transitionProperty: 'width, padding, opacity',
        }}
      >
      <h2 className="text-lg font-bold text-gray-800 mb-3">Helyiségek</h2>
      
      <div className="space-y-3">
        {/* ID-BASED SUBSCRIPTION PATTERN - Each RoomListItem subscribes directly to store */}
        {rooms.map((room) => (
          <RoomListItem key={room.id} roomId={room.id} />
        ))}
      </div>
      </div>
    </>
  )
}
