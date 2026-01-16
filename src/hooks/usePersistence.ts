import { useEffect } from 'react'
import { get, set } from 'idb-keyval'
import { useStore } from '../store/useStore'
import { Room } from '../types'

interface PersistedState {
  pdfBlob: Blob | null
  pdfFileName: string | null
  pxPerMeter: number | null
  rooms: Room[]
}

const STORAGE_KEY = 'ceiling-heating-designer-state'

export function usePersistence() {
  // Load persisted state on mount (CRITICAL: empty dependency array prevents infinite loops)
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        console.log('🔄 Loading persisted state...')
        const persisted = await get<PersistedState>(STORAGE_KEY)
        
        if (persisted) {
          // Restore PDF if it exists
          if (persisted.pdfBlob) {
            try {
              const file = new File([persisted.pdfBlob], persisted.pdfFileName || 'restored.pdf', {
                type: 'application/pdf',
              })
              useStore.getState().setPDFFile(file)
            } catch (err) {
              console.error('Failed to restore PDF:', err)
            }
          }

          // Restore scale
          if (persisted.pxPerMeter !== null && typeof persisted.pxPerMeter === 'number') {
            useStore.getState().setPxPerMeter(persisted.pxPerMeter)
          }

          // Restore rooms (SAFE: ensure it's an array)
          if (Array.isArray(persisted.rooms) && persisted.rooms.length > 0) {
            useStore.setState({ rooms: persisted.rooms })
            console.log(`✅ Restored ${persisted.rooms.length} room(s) from IndexedDB`)
          }

          console.log('✅ Restored state from IndexedDB')
        } else {
          console.log('ℹ️ No persisted state found, starting fresh')
        }
      } catch (error) {
        console.error('❌ Failed to load persisted state:', error)
        // Ensure rooms is an empty array on error
        useStore.setState({ rooms: [] })
      } finally {
        // CRITICAL: Mark as loaded in finally block to ensure it always runs
        useStore.getState().setIsLoaded(true)
        console.log('✅ Persistence loaded, saving enabled')
      }
    }

    loadPersistedState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty array: only run once on mount

  // Save state whenever PDF, scale, or rooms change
  const pdf = useStore((state) => state.pdf)
  const rooms = useStore((state) => state.rooms)
  const isLoaded = useStore((state) => state.isLoaded)

  // Save state whenever PDF, scale, or rooms change
  useEffect(() => {
    // GUARD CLAUSE: Do NOT save if data hasn't loaded yet
    // This prevents overwriting IndexedDB with empty state during initialization
    if (!isLoaded) {
      console.log('⏳ Save blocked: waiting for persistence to load')
      return
    }

    const saveState = async () => {
      try {
        // Safety check: ensure rooms is an array
        const safeRooms = Array.isArray(rooms) ? rooms : []
        
        if (!pdf.file && pdf.pxPerMeter === null && safeRooms.length === 0) {
          // Nothing to save
          console.log('ℹ️ No data to save')
          return
        }

        // Convert File to Blob for storage
        const pdfBlob = pdf.file ? await pdf.file.arrayBuffer().then(buffer => new Blob([buffer], { type: 'application/pdf' })) : null

        const stateToSave: PersistedState = {
          pdfBlob,
          pdfFileName: pdf.file?.name || null,
          pxPerMeter: pdf.pxPerMeter,
          rooms: safeRooms,
        }

        await set(STORAGE_KEY, stateToSave)
        console.log(`💾 State saved to IndexedDB (${safeRooms.length} room(s))`)
      } catch (error) {
        console.error('❌ Failed to save state:', error)
      }
    }

    // Debounce saves to avoid too frequent writes
    const timeoutId = setTimeout(saveState, 500)
    return () => clearTimeout(timeoutId)
  }, [pdf.file, pdf.pxPerMeter, rooms, isLoaded])
}
