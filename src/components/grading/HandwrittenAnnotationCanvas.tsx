'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Check,
  X,
  Type,
  RotateCcw,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Download,
  CheckCircle2,
  Eraser,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export type ToolType = 'pen' | 'highlighter' | 'tick' | 'cross' | 'text' | 'eraser';

export interface AnnotationStroke {
  id: string;
  type: 'freehand' | 'tick' | 'cross' | 'text';
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  text?: string;
  color: string;
  size: number;
  isHighlighter?: boolean;
}

interface HandwrittenAnnotationCanvasProps {
  imageUrl: string;
  isPdf?: boolean;
  onExportBlob?: (blob: Blob) => void;
  checkedCopyUrl?: string | null;
  readOnly?: boolean;
}

export function HandwrittenAnnotationCanvas({
  imageUrl,
  isPdf = false,
  onExportBlob,
  checkedCopyUrl,
  readOnly = false,
}: HandwrittenAnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [activeColor, setActiveColor] = useState<string>('#ef4444'); // Default red pen
  const [brushSize, setBrushSize] = useState<number>(3);
  const [zoom, setZoom] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // History state for Undo / Redo
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationStroke[][]>([]);

  // Text tool state
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');

  const colors = [
    { label: 'Red (Corrections)', value: '#ef4444', bg: 'bg-red-500' },
    { label: 'Green (Ticks & Marks)', value: '#10b981', bg: 'bg-emerald-500' },
    { label: 'Blue (Remarks)', value: '#3b82f6', bg: 'bg-blue-500' },
    { label: 'Orange (Notice)', value: '#f97316', bg: 'bg-orange-500' },
  ];

  // Load Image onto Canvas
  useEffect(() => {
    if (isPdf) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = checkedCopyUrl || imageUrl;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      redrawCanvas();
    };
  }, [imageUrl, checkedCopyUrl, isPdf]);

  // Redraw All Annotations
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match image if loaded
    if (imageRef.current) {
      if (canvas.width !== imageRef.current.naturalWidth || canvas.height !== imageRef.current.naturalHeight) {
        canvas.width = imageRef.current.naturalWidth;
        canvas.height = imageRef.current.naturalHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imageRef.current, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Draw all strokes
    strokes.forEach((stroke) => {
      ctx.save();
      if (stroke.isHighlighter) {
        ctx.globalAlpha = 0.35;
      }

      if (stroke.type === 'freehand' && stroke.points && stroke.points.length > 0) {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.type === 'tick' && stroke.x !== undefined && stroke.y !== undefined) {
        // Draw green tick checkmark
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size + 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const size = 18 * (stroke.size / 3);
        ctx.beginPath();
        ctx.moveTo(stroke.x - size * 0.4, stroke.y);
        ctx.lineTo(stroke.x - size * 0.1, stroke.y + size * 0.35);
        ctx.lineTo(stroke.x + size * 0.5, stroke.y - size * 0.45);
        ctx.stroke();
      } else if (stroke.type === 'cross' && stroke.x !== undefined && stroke.y !== undefined) {
        // Draw red cross
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size + 1.5;
        ctx.lineCap = 'round';

        const size = 14 * (stroke.size / 3);
        ctx.beginPath();
        ctx.moveTo(stroke.x - size * 0.4, stroke.y - size * 0.4);
        ctx.lineTo(stroke.x + size * 0.4, stroke.y + size * 0.4);
        ctx.moveTo(stroke.x + size * 0.4, stroke.y - size * 0.4);
        ctx.lineTo(stroke.x - size * 0.4, stroke.y + size * 0.4);
        ctx.stroke();
      } else if (stroke.type === 'text' && stroke.x !== undefined && stroke.y !== undefined && stroke.text) {
        ctx.font = `bold ${Math.max(14, stroke.size * 5)}px Inter, sans-serif`;
        ctx.fillStyle = stroke.color;
        ctx.fillText(stroke.text, stroke.x, stroke.y);
      }

      ctx.restore();
    });
  }, [strokes]);

  useEffect(() => {
    redrawCanvas();
  }, [strokes, redrawCanvas]);

  // Coordinate helper relative to canvas
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (activeTool === 'tick') {
      saveHistory();
      const newStroke: AnnotationStroke = {
        id: Math.random().toString(),
        type: 'tick',
        x: coords.x,
        y: coords.y,
        color: activeColor === '#ef4444' ? '#10b981' : activeColor,
        size: brushSize,
      };
      setStrokes((prev) => [...prev, newStroke]);
      return;
    }

    if (activeTool === 'cross') {
      saveHistory();
      const newStroke: AnnotationStroke = {
        id: Math.random().toString(),
        type: 'cross',
        x: coords.x,
        y: coords.y,
        color: activeColor === '#10b981' ? '#ef4444' : activeColor,
        size: brushSize,
      };
      setStrokes((prev) => [...prev, newStroke]);
      return;
    }

    if (activeTool === 'text') {
      setTextInputPos(coords);
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      saveHistory();
      setIsDrawing(true);
      const newStroke: AnnotationStroke = {
        id: Math.random().toString(),
        type: 'freehand',
        points: [coords],
        color: activeTool === 'highlighter' ? '#fde047' : activeColor,
        size: activeTool === 'highlighter' ? brushSize * 4 : brushSize,
        isHighlighter: activeTool === 'highlighter',
      };
      setStrokes((prev) => [...prev, newStroke]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const lastStroke = { ...prev[prev.length - 1] };
      if (lastStroke.type === 'freehand' && lastStroke.points) {
        lastStroke.points = [...lastStroke.points, coords];
        return [...prev.slice(0, -1), lastStroke];
      }
      return prev;
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // History management
  const saveHistory = () => {
    setUndoStack((prev) => [...prev, [...strokes]]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, [...strokes]]);
    setStrokes(previous);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, [...strokes]]);
    setStrokes(next);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    saveHistory();
    setStrokes([]);
    toast.info('Canvas cleared');
  };

  const handleAddText = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      setTextInputValue('');
      return;
    }

    saveHistory();
    const newStroke: AnnotationStroke = {
      id: Math.random().toString(),
      type: 'text',
      x: textInputPos.x,
      y: textInputPos.y,
      text: textInputValue.trim(),
      color: activeColor,
      size: brushSize,
    };
    setStrokes((prev) => [...prev, newStroke]);
    setTextInputPos(null);
    setTextInputValue('');
  };

  // Export Flattened Canvas to Blob
  const exportFlattenedImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob && onExportBlob) {
        onExportBlob(blob);
      }
    }, 'image/png');
  };

  // Expose export trigger via effect or parent button
  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-2xl overflow-hidden relative shadow-2xl">
      
      {/* Top Digital Correction Toolbar */}
      {!readOnly && (
        <div className="p-3 bg-slate-900/95 backdrop-blur border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 select-none z-20">
          
          {/* Main Pen / Stamp Tools */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-full border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTool === 'pen'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Red/Color Pen (Freehand corrections)"
            >
              <Pen className="h-3.5 w-3.5" />
              <span>Pen</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('tick')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTool === 'tick'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-700'
              }`}
              title="Stamp Green Tick (✓)"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Tick (✓)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('cross')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTool === 'cross'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-red-400 hover:text-red-300 hover:bg-slate-700'
              }`}
              title="Stamp Red Cross (✗)"
            >
              <X className="h-4 w-4 stroke-[3]" />
              <span>Cross (✗)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTool === 'text'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Add Typed Teacher Remark"
            >
              <Type className="h-3.5 w-3.5" />
              <span>Note</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('highlighter')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTool === 'highlighter'
                  ? 'bg-yellow-500 text-slate-900 shadow-md'
                  : 'text-yellow-400 hover:text-yellow-300 hover:bg-slate-700'
              }`}
              title="Highlighter"
            >
              <Highlighter className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Colors & Brush Size */}
          <div className="flex items-center gap-3">
            {/* Color Swatches */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-full border border-slate-700">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setActiveColor(c.value)}
                  className={`w-6 h-6 rounded-full ${c.bg} transition-all flex items-center justify-center ${
                    activeColor === c.value
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>

            {/* Stroke Size */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-full border border-slate-700 text-xs">
              {[2, 4, 7].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setBrushSize(s)}
                  className={`px-2 py-1 rounded-full font-bold ${
                    brushSize === s
                      ? 'bg-slate-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s === 2 ? 'Fine' : s === 4 ? 'Med' : 'Thick'}
                </button>
              ))}
            </div>
          </div>

          {/* Undo / Redo / Clear / Zoom Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
              title="Redo"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="p-1.5 rounded-full text-red-400 hover:text-red-300 hover:bg-slate-800 disabled:opacity-30"
              title="Clear All Annotations"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <div className="h-4 w-[1px] bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-400 w-9 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-950/80 relative flex items-center justify-center p-4"
        style={{ cursor: activeTool === 'pen' ? 'crosshair' : activeTool === 'tick' || activeTool === 'cross' ? 'cell' : 'default' }}
      >
        {isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
            <iframe
              src={`${imageUrl}#toolbar=1`}
              className="w-full h-full rounded-xl border border-slate-700 bg-white"
              title="PDF Document"
            />
          </div>
        ) : (
          <div
            className="transition-transform origin-center duration-150 relative shadow-2xl rounded-xl overflow-hidden border border-slate-700/60 bg-white"
            style={{ transform: `scale(${zoom})` }}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={1100}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="max-w-none block bg-white"
            />

            {/* Floating Text Input Box when clicking on sheet */}
            {textInputPos && (
              <div
                className="absolute z-30 flex items-center gap-1.5 bg-slate-900/95 p-2 rounded-xl border border-slate-700 shadow-2xl"
                style={{ left: textInputPos.x / (canvasRef.current?.width || 1) * 100 + '%', top: textInputPos.y / (canvasRef.current?.height || 1) * 100 + '%' }}
              >
                <input
                  type="text"
                  autoFocus
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddText();
                    if (e.key === 'Escape') setTextInputPos(null);
                  }}
                  placeholder="Type teacher note..."
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-white border border-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500 w-48"
                />
                <button
                  type="button"
                  onClick={handleAddText}
                  className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setTextInputPos(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
            {isPdf ? 'PDF Mode' : `${strokes.length} Annotations Drawn`}
          </Badge>
          {!readOnly && (
            <span className="hidden sm:inline">
              Tip: Click with <strong className="text-emerald-400">Tick (✓)</strong> or <strong className="text-red-400">Cross (✗)</strong> to mark student working steps.
            </span>
          )}
        </div>

        {checkedCopyUrl && (
          <a
            href={checkedCopyUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-emerald-400 hover:underline font-semibold"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Checked Copy Attached</span>
          </a>
        )}
      </div>

    </div>
  );
}
