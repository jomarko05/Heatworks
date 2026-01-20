import { useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useStore } from '../store/useStore'
import CanvasOverlay from './CanvasOverlay'

// CRITICAL: Use BASE_URL for GitHub Pages compatibility
// This ensures the worker loads from the correct subfolder path
// @ts-ignore - Vite env typing
pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`

interface PDFViewerProps {
  containerRef: React.RefObject<HTMLDivElement>
}

export default function PDFViewer({ containerRef: _containerRef }: PDFViewerProps) {
  const { pdf, setNumPages, setPageDimensions, setViewScale } = useStore()
  const wrapperRef = useRef<HTMLDivElement>(null)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  const onPageLoadSuccess = (page: any) => {
    // Capture natural PDF dimensions at base scale (1.0)
    const viewport = page.getViewport({ scale: 1.0 })
    const width = viewport.width
    const height = viewport.height
    
    console.log('PDF Dimensions captured:', { width, height })
    setPageDimensions(width, height)
  }

  // Unified zoom handler for PDF + Canvas
  // Use native event listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const node = wrapperRef.current
    if (!node) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault() // Now valid because of passive: false
      
      const zoomFactor = 0.1
      let newScale = pdf.viewScale

      if (e.deltaY < 0) {
        // Zoom in - Infinite zoom capability (50x max for professional CAD work)
        newScale = Math.min(pdf.viewScale + zoomFactor, 50.0)
      } else {
        // Zoom out
        newScale = Math.max(pdf.viewScale - zoomFactor, 0.1) // Allow zooming out further
      }

      setViewScale(newScale)
    }

    // CRITICAL: Add { passive: false } to allow preventDefault
    node.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      node.removeEventListener('wheel', handleWheel)
    }
  }, [pdf.viewScale, setViewScale])

  const hasValidDimensions = pdf.pageWidth > 0 && pdf.pageHeight > 0
  
  // Calculate scaled dimensions
  const scaledWidth = pdf.pageWidth * pdf.viewScale
  const scaledHeight = pdf.pageHeight * pdf.viewScale

  return (
    <div className="absolute inset-0 overflow-auto bg-gray-100 z-0">
      {!pdf.url && (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-lg">
            Upload a PDF floor plan to get started
          </div>
        </div>
      )}

      {pdf.url && (
        <div className="flex justify-center items-start p-4">
          {/* Unified Coordinate System Container */}
          <div
            ref={wrapperRef}
            className="relative inline-block"
            style={{
              width: hasValidDimensions ? scaledWidth : 'auto',
              height: hasValidDimensions ? scaledHeight : 'auto',
              minWidth: 100,
              minHeight: 100,
              touchAction: 'none', // Prevent default touch behaviors (scrolling, zooming)
            }}
          >
            {/* PDF Layer - Scales up the rendered PDF */}
            <Document
              file={pdf.url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center p-20">
                  <div className="text-gray-600">Loading PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center p-20">
                  <div className="text-red-600">Error loading PDF</div>
                </div>
              }
            >
              <Page
                pageNumber={pdf.currentPage}
                scale={pdf.viewScale}
                onLoadSuccess={onPageLoadSuccess}
                className="shadow-lg"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            {/* Canvas Layer - Absolutely positioned, uses Stage scale */}
            {hasValidDimensions && <CanvasOverlay />}
          </div>
        </div>
      )}
    </div>
  )
}
