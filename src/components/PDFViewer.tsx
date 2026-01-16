import { useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useStore } from '../store/useStore'
import CanvasOverlay from './CanvasOverlay'

// CRITICAL: Point to the static file in the public folder
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface PDFViewerProps {
  containerRef: React.RefObject<HTMLDivElement>
}

export default function PDFViewer({ containerRef }: PDFViewerProps) {
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
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    
    const zoomFactor = 0.1
    let newScale = pdf.viewScale

    if (e.deltaY < 0) {
      // Zoom in
      newScale = Math.min(pdf.viewScale + zoomFactor, 3.0)
    } else {
      // Zoom out
      newScale = Math.max(pdf.viewScale - zoomFactor, 0.3)
    }

    setViewScale(newScale)
  }

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
            onWheel={handleWheel}
            style={{
              width: hasValidDimensions ? scaledWidth : 'auto',
              height: hasValidDimensions ? scaledHeight : 'auto',
              minWidth: 100,
              minHeight: 100,
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
