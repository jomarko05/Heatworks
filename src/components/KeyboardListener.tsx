/**
 * KeyboardListener - Clean Keyboard Shortcuts
 * 
 * Provides keyboard shortcuts for the CAD designer.
 */

import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export default function KeyboardListener() {
  const {
    selectedElementIds,
    setSelectedElementIds,
    selectedRoomId,
    selectRoom,
    deleteRoom,
    removeManualElement,
    setIsSettingConnectionPoint,
    setMeasurementActive,
    measurement,
    copyToClipboard,
    pasteFromClipboard,
    toggleAssetMenu,
    mirrorMode,
    setMirrorMode,
    mirrorSelected,
    rotationMode,
    setRotationMode,
    setElementRotation,
    activeAxisLock,
    setAxisLock,
    placementRotation,
    setPlacementRotation,
  } = useStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input fields
      const activeTag = document.activeElement?.tagName
      const isInputActive = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT'
      
      // Get fresh state on each keypress
      const store = useStore.getState()
      const isCtrl = e.ctrlKey || e.metaKey
      const isShift = e.shiftKey
      const key = e.key.toLowerCase()

      // =========================================================
      // SPACE - Toggle Asset Menu
      // =========================================================
      if (key === ' ' && !isCtrl && !isShift) {
        if (!isInputActive) {
          e.preventDefault()
          toggleAssetMenu()
        }
        return
      }

      // =========================================================
      // V - Set Placement Rotation to 0° (Vertical)
      // =========================================================
      if (key === 'v' && !isCtrl && !isShift) {
        if (!isInputActive) {
          e.preventDefault()
          setPlacementRotation(0)
          console.log('↕️ Placement Rotation: Vertical (0°)')
        }
        return
      }

      // =========================================================
      // H - Set Placement Rotation to 90° (Horizontal)
      // =========================================================
      if (key === 'h' && !isCtrl && !isShift) {
        if (!isInputActive) {
          e.preventDefault()
          setPlacementRotation(90)
          console.log('↔️ Placement Rotation: Horizontal (90°)')
        }
        return
      }

      // =========================================================
      // ESC - Cancel / Deselect
      // =========================================================
      if (e.key === 'Escape') {
        if (!isInputActive) {
          e.preventDefault()
          if (store.mirrorMode) {
            setMirrorMode(false)
          } else if (store.rotationMode) {
            setRotationMode(false)
          } else {
            setSelectedElementIds([])
            selectRoom(null)
            setIsSettingConnectionPoint(false)
            if (measurement.isActive) {
              setMeasurementActive(false)
            }
          }
        }
        return
      }

      // =========================================================
      // DELETE / BACKSPACE - Remove selection (with input safety)
      // =========================================================
      if ((key === 'delete' || key === 'backspace') && !isInputActive) {
        e.preventDefault()
        
        // Delete selected room
        if (selectedRoomId) {
          deleteRoom(selectedRoomId)
          selectRoom(null)
        }
        
        // Delete selected manual elements
        if (store.selectedElementIds.length > 0) {
          store.selectedElementIds.forEach(id => {
            removeManualElement(id)
          })
          setSelectedElementIds([])
          console.log(`🗑️ Deleted ${store.selectedElementIds.length} element(s)`)
        }
        return
      }

      // =========================================================
      // M - Mirror Mode Toggle
      // =========================================================
      if (key === 'm' && !isCtrl && !isShift && !isInputActive) {
        e.preventDefault()
        if (store.selectedElementIds.length > 0) {
          const newMode = !store.mirrorMode
          setMirrorMode(newMode)
          console.log(newMode ? '🪞 Mirror Mode: ON - Press X or Y to flip' : '🪞 Mirror Mode: OFF')
        } else {
          setMeasurementActive(!measurement.isActive)
        }
        return
      }

      // =========================================================
      // X - Mirror Horizontally (if in mirror mode)
      // =========================================================
      if (key === 'x' && !isCtrl && !isShift && !isInputActive) {
        if (store.mirrorMode && store.selectedElementIds.length > 0) {
          e.preventDefault()
          mirrorSelected('x')
          setMirrorMode(false)
          console.log('🪞 Mirrored horizontally (X-axis)')
        }
        return
      }

      // =========================================================
      // Y - Mirror Vertically (if in mirror mode)
      // =========================================================
      if (key === 'y' && !isCtrl && !isShift && !isInputActive) {
        if (store.mirrorMode && store.selectedElementIds.length > 0) {
          e.preventDefault()
          mirrorSelected('y')
          setMirrorMode(false)
          console.log('🪞 Mirrored vertically (Y-axis)')
        }
        return
      }

      // =========================================================
      // E - Toggle Rotation Mode
      // =========================================================
      if (key === 'e' && !isCtrl && !isShift && !isInputActive) {
        e.preventDefault()
        if (store.selectedElementIds.length > 0) {
          const newMode = !store.rotationMode
          setRotationMode(newMode)
          console.log(newMode ? '🔄 Rotation Mode: ON - Use Arrow Keys to rotate' : '🔄 Rotation Mode: OFF')
        }
        return
      }

      // =========================================================
      // SHIFT + X / Y - Axis Locking
      // =========================================================
      if (isShift && !isCtrl && !isInputActive) {
        if (key === 'x') {
          e.preventDefault()
          setAxisLock('x')
          console.log('🔒 Axis Lock: X (Horizontal movement only)')
          return
        }
        if (key === 'y') {
          e.preventDefault()
          setAxisLock('y')
          console.log('🔒 Axis Lock: Y (Vertical movement only)')
          return
        }
      }

      // =========================================================
      // ARROW KEYS - Rotate Selected Elements (if in rotation mode)
      // =========================================================
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isCtrl && !isInputActive) {
        if (store.rotationMode && store.selectedElementIds.length > 0) {
          e.preventDefault()
          const rotationStep = 45
          const direction = e.key === 'ArrowLeft' ? -rotationStep : rotationStep
          
          store.selectedElementIds.forEach(id => {
            const element = store.manualElements.find(el => el.id === id)
            if (element) {
              const newAngle = ((element.rotation + direction) % 360 + 360) % 360
              setElementRotation(id, newAngle)
            }
          })
          
          console.log(`🔄 Rotated ${direction > 0 ? '+' : ''}${direction}°`)
        }
        return
      }

      // =========================================================
      // CTRL + C - Copy
      // =========================================================
      if (isCtrl && key === 'c' && !isShift && !isInputActive) {
        e.preventDefault()
        copyToClipboard()
        return
      }

      // =========================================================
      // CTRL + V - Paste
      // =========================================================
      if (isCtrl && key === 'v' && !isShift && !isInputActive) {
        e.preventDefault()
        pasteFromClipboard()
        return
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release axis lock when X, Y, or Shift is released
      const key = e.key.toLowerCase()
      if (key === 'x' || key === 'y' || e.key === 'Shift') {
        const store = useStore.getState()
        if (store.activeAxisLock !== null) {
          setAxisLock(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [
    selectedElementIds,
    setSelectedElementIds,
    selectedRoomId,
    selectRoom,
    deleteRoom,
    removeManualElement,
    setIsSettingConnectionPoint,
    setMeasurementActive,
    measurement.isActive,
    copyToClipboard,
    pasteFromClipboard,
    toggleAssetMenu,
    mirrorMode,
    setMirrorMode,
    mirrorSelected,
    rotationMode,
    setRotationMode,
    setElementRotation,
    activeAxisLock,
    setAxisLock,
    placementRotation,
    setPlacementRotation,
  ])

  return null
}
