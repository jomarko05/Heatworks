# Ceiling Heating Designer

A React-based web application to design ceiling heating systems on top of architectural PDF floor plans.

## Features (Phase 1 - Complete)

- ✅ PDF floor plan upload and rendering
- ✅ Canvas overlay with react-konva for drawing
- ✅ Calibration tool for scale calculation
- ✅ Perfect layer alignment between PDF and canvas

## Tech Stack

- **React** + **TypeScript** (Vite)
- **TailwindCSS** for styling
- **react-pdf** for PDF rendering
- **react-konva** for canvas drawing layer
- **Zustand** for state management
- **flatten-js** for geometry calculations (for future phases)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will open at http://localhost:3000

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── PDFViewer.tsx        # PDF rendering component
│   ├── CanvasOverlay.tsx    # Konva canvas overlay
│   ├── PDFUploader.tsx      # File upload component
│   └── CalibrationTool.tsx  # Scale calibration tool
├── store/
│   └── useStore.ts          # Zustand state management
├── types/
│   └── index.ts             # TypeScript type definitions
├── App.tsx                  # Main app component
├── main.tsx                 # Entry point
└── index.css                # Global styles (TailwindCSS)
```

## Usage

1. **Upload PDF**: Click "Upload PDF Floor Plan" and select your floor plan PDF
2. **Calibrate**: Click "Start Calibration", draw a line on a known dimension, and enter the real-world length in meters
3. The system will calculate the scale (px/m) for accurate measurements

## Roadmap

- **Phase 2**: Room polygon definition and grid generation (CD profiles & heat transfer plates)
- **Phase 3**: Heating loop pathfinding algorithm
- **Phase 4**: Manufacturing calculations and BOM generation

## License

MIT
# Heatworks
# Heatworks
