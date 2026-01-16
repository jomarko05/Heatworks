import { useRef, useEffect } from 'react'
import PDFViewer from './components/PDFViewer'
import PDFUploader from './components/PDFUploader'
import CalibrationTool from './components/CalibrationTool'
import Toolbar from './components/Toolbar'
import RoomPropertiesModal from './components/RoomPropertiesModal'
import RoomList from './components/RoomList'
import { usePersistence } from './hooks/usePersistence'
import { useStore } from './store/useStore'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isLoaded = useStore((state) => state.isLoaded)
  
  // Auto-save and restore state
  usePersistence()

  // ==========================================
  // GLOBAL ESC KEY HANDLER (Cancel All Active States)
  // ==========================================
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('🔥 ESC PRESSED: Canceling all active states')
        
        const store = useStore.getState()
        
        // Action 1: Deselect room (hide anchors and dimension labels)
        if (store.selectedRoomId) {
          console.log('  → Deselecting room:', store.selectedRoomId)
          store.selectRoom(null)
        }
        
        // Action 2: Cancel measurement mode
        if (store.measurement.isActive) {
          console.log('  → Canceling measurement mode')
          store.setMeasurementActive(false)
        }
        
        // Action 3: Cancel room drawing mode
        if (store.roomDrawing.isActive) {
          console.log('  → Canceling room drawing mode')
          store.cancelRoomDrawing()
        }
        
        // Action 4: Blur any focused element (inputs, buttons)
        if (document.activeElement instanceof HTMLElement) {
          console.log('  → Blurring active element:', document.activeElement.tagName)
          document.activeElement.blur()
        }
        
        // Action 5: Stop any drag operations (Konva stage)
        // Note: Konva stages don't have a global stopDrag, but releasing ESC
        // while dragging will naturally stop on next mouseup
        
        console.log('✓ ESC: All active states canceled, returned to view mode')
      }
    }

    // Attach global listener
    window.addEventListener('keydown', handleEscapeKey)
    console.log('✓ Global ESC handler attached')

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleEscapeKey)
      console.log('✓ Global ESC handler removed')
    }
  }, [])

  // LOADING SCREEN: Show while persistence is initializing
  if (!isLoaded) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Betöltés...</p>
          <p className="text-sm text-gray-500 mt-2">Loading application state</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Ceiling Heating Designer
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Design ceiling heating systems on architectural floor plans
        </p>
      </header>

      {/* Main workspace */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {/* PDF Viewer with Canvas Overlay (Locked Together) */}
        <PDFViewer containerRef={containerRef} />

        {/* UI Controls */}
        <PDFUploader />
        <CalibrationTool />
        <Toolbar />
        <RoomList />
      </div>

      {/* Modals */}
      <RoomPropertiesModal />
    </div>
  )
}

export default App
