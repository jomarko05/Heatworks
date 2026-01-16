import { useRef } from 'react'
import { useStore } from '../store/useStore'

export default function PDFUploader() {
  const { setPDFFile } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPDFFile(file)
    } else {
      alert('Please select a valid PDF file')
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={handleClick}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
      >
        Upload PDF Floor Plan
      </button>
    </div>
  )
}
