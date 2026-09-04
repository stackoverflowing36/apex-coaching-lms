'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
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
  Download,
  CheckCircle2,
  Eraser,
  Award,
  MousePointerClick,
  Maximize2,
} from 'lucide-react';
import { toast } from 'sonner';

export type ToolType =
  | 'smart_check'
  | 'pen'
  | 'highlighter'
  | 'tick'
  | 'cross'
  | 'mark'
  | 'text'
  | 'eraser';

export interface AnnotationStroke {
  id: string;
  type: 'freehand' | 'tick' | 'cross' | 'mark' | 'text';
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  text?: string;
  color: string;
  size: number;
  isHighlighter?: boolean;
}

export interface HandwrittenAnnotationCanvasHandle {
  getExportBlob: () => Promise<Blob | null>;
  getStrokesCount: () => number;
}

interface HandwrittenAnnotationCanvasProps {
  imageUrl: string;
  isPdf?: boolean;
  onExportBlob?: (blob: Blob) => void;
  checkedCopyUrl?: string | null;
  readOnly?: boolean;
}

export const HandwrittenAnnotationCanvas = forwardRef<
  HandwrittenAnnotationCanvasHandle,
  HandwrittenAnnotationCanvasProps
>(function HandwrittenAnnotationCanvas(
  {
    imageUrl,
    isPdf = false,
    onExportBlob,
    checkedCopyUrl,
    readOnly = false,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Active Tool & Style State
  const [activeTool, setActiveTool] = useState<ToolType>('smart_check');
  const [activeColor, setActiveColor] = useState<string>('#ef4444'); // Default teacher red
  const [brushSize, setBrushSize] = useState<number>(3);
  const [selectedMark, setSelectedMark] = useState<string>('+1');
  const [zoom, setZoom] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // History State for Undo / Redo
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationStroke[][]>([]);

  // Text Tool State
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');

  // Click tracking for Single Click = Tick, Double Click = Cross
  const lastClickRef = useRef<{
    time: number;
    x: number;
    y: number;
    strokeId: string;
  } | null>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const colors = [
    { label: 'Teacher Red (Corrections)', value: '#ef4444', bg: 'bg-red-500' },
    { label: 'Scholar Green (Ticks & Approvals)', value: '#10b981', bg: 'bg-emerald-500' },
    { label: 'Ink Blue (Remarks)', value: '#2563eb', bg: 'bg-blue-600' },
    { label: 'Attention Orange', value: '#f97316', bg: 'bg-orange-500' },
    { label: 'Charcoal Black', value: '#0f172a', bg: 'bg-slate-900' },
  ];

  const quickMarks = ['+1', '+2', '+5', '-1', '-½', '10/10'];

  // Redraw Canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Synchronize canvas dimensions to image resolution
    if (imageRef.current && imageRef.current.naturalWidth > 0) {
      if (
        canvas.width !== imageRef.current.naturalWidth ||
        canvas.height !== imageRef.current.naturalHeight
      ) {
        canvas.width = imageRef.current.naturalWidth;
        canvas.height = imageRef.current.naturalHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imageRef.current, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Optional neutral page background if no image loaded yet
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Render all vectorized strokes
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
        // Render Green Tick Mark
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(2.5, stroke.size * 1.2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const size = Math.max(20, 22 * (stroke.size / 3));
        ctx.beginPath();
        ctx.moveTo(stroke.x - size * 0.42, stroke.y);
        ctx.lineTo(stroke.x - size * 0.1, stroke.y + size * 0.38);
        ctx.lineTo(stroke.x + size * 0.55, stroke.y - size * 0.48);
        ctx.stroke();
      } else if (stroke.type === 'cross' && stroke.x !== undefined && stroke.y !== undefined) {
        // Render Red Cross Mark
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(2.5, stroke.size * 1.2);
        ctx.lineCap = 'round';

        const size = Math.max(16, 18 * (stroke.size / 3));
        ctx.beginPath();
        ctx.moveTo(stroke.x - size * 0.45, stroke.y - size * 0.45);
        ctx.lineTo(stroke.x + size * 0.45, stroke.y + size * 0.45);
        ctx.moveTo(stroke.x + size * 0.45, stroke.y - size * 0.45);
        ctx.lineTo(stroke.x - size * 0.45, stroke.y + size * 0.45);
        ctx.stroke();
      } else if (stroke.type === 'mark' && stroke.x !== undefined && stroke.y !== undefined && stroke.text) {
        // Render Score / Mark Badge Circle
        const radius = Math.max(18, stroke.size * 5.5);
        ctx.beginPath();
        ctx.arc(stroke.x, stroke.y, radius, 0, Math.PI * 2);
        ctx.fillStyle =
          stroke.color === '#ef4444'
            ? 'rgba(239, 68, 68, 0.16)'
            : stroke.color === '#10b981'
            ? 'rgba(16, 185, 129, 0.16)'
            : 'rgba(37, 99, 235, 0.16)';
        ctx.fill();

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(1.8, stroke.size / 2);
        ctx.stroke();

        ctx.font = `bold ${Math.max(12, stroke.size * 3.8)}px Inter, sans-serif`;
        ctx.fillStyle = stroke.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stroke.text, stroke.x, stroke.y);
      } else if (stroke.type === 'text' && stroke.x !== undefined && stroke.y !== undefined && stroke.text) {
        // Render Handwritten Remark
        ctx.font = `bold ${Math.max(14, stroke.size * 4.5)}px Inter, sans-serif`;
        ctx.fillStyle = stroke.color;
        ctx.textBaseline = 'top';
        ctx.fillText(stroke.text, stroke.x, stroke.y);
      }

      ctx.restore();
    });
  }, [strokes]);

  // Export Canvas Helper
  const getCanvasBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);

      try {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          'image/png',
          0.95
        );
      } catch (err) {
        console.warn('Direct canvas.toBlob failed, creating non-tainted overlay:', err);
        try {
          const overlayCanvas = document.createElement('canvas');
          overlayCanvas.width = canvas.width;
          overlayCanvas.height = canvas.height;
          const oCtx = overlayCanvas.getContext('2d');
          if (oCtx) {
            strokes.forEach((stroke) => {
              // Draw strokes on clean canvas
              oCtx.save();
              if (stroke.type === 'tick' && stroke.x && stroke.y) {
                oCtx.strokeStyle = stroke.color;
                oCtx.lineWidth = Math.max(2.5, stroke.size * 1.2);
                oCtx.beginPath();
                oCtx.moveTo(stroke.x - 8, stroke.y);
                oCtx.lineTo(stroke.x - 2, stroke.y + 7);
                oCtx.lineTo(stroke.x + 10, stroke.y - 9);
                oCtx.stroke();
              }
              oCtx.restore();
            });
            overlayCanvas.toBlob((b) => resolve(b), 'image/png');
            return;
          }
        } catch {}
        resolve(null);
      }
    });
  }, [strokes]);

  // Expose methods to parent through ref
  useImperativeHandle(
    ref,
    () => ({
      getExportBlob: async () => {
        return await getCanvasBlob();
      },
      getStrokesCount: () => strokes.length,
    }),
    [getCanvasBlob, strokes.length]
  );

  // Auto-export blob when strokes change
  useEffect(() => {
    if (strokes.length > 0 && onExportBlob) {
      getCanvasBlob().then((blob) => {
        if (blob) onExportBlob(blob);
      });
    }
  }, [strokes, getCanvasBlob, onExportBlob]);

  // Load Image onto Canvas with CORS Resilience
  useEffect(() => {
    if (isPdf) {
      setImageLoaded(true);
      return;
    }

    let isMounted = true;
    const targetUrl = checkedCopyUrl || imageUrl;
    if (!targetUrl) return;

    const setupImage = async () => {
      let resolvedSrc = targetUrl;

      // Try fetching as local blob to completely avoid canvas tainting
      try {
        if (targetUrl.startsWith('http')) {
          const res = await fetch(targetUrl, { mode: 'cors' });
          if (res.ok) {
            const blob = await res.blob();
            resolvedSrc = URL.createObjectURL(blob);
          }
        }
      } catch (e) {
        console.warn('Local blob fetch fallback:', e);
      }

      if (!isMounted) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        if (!isMounted) return;
        imageRef.current = img;
        setImageLoaded(true);
        redrawCanvas();
      };

      img.onerror = () => {
        if (!isMounted) return;
        console.warn('Anonymous CORS failed, falling back to direct load.');
        const fallback = new Image();
        fallback.onload = () => {
          if (!isMounted) return;
          imageRef.current = fallback;
          setImageLoaded(true);
          redrawCanvas();
        };
        fallback.src = targetUrl;
      };

      img.src = resolvedSrc;
    };

    setupImage();

    return () => {
      isMounted = false;
    };
  }, [imageUrl, checkedCopyUrl, isPdf, redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [strokes, imageLoaded, redrawCanvas]);

  // Coordinate Helper
  const getCanvasCoords = (
    e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // History Stack Manager
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
    toast.info('All annotations cleared');
  };

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const coords = getCanvasCoords(e);
    if (!coords) return;

    // 1. SMART CHECK TOOL (Single click = Tick, Double click = Cross)
    if (activeTool === 'smart_check') {
      const now = Date.now();
      const last = lastClickRef.current;

      // Check if double-click within 320ms and within 40px radius
      const isDoubleClick =
        last &&
        now - last.time < 320 &&
        Math.hypot(coords.x - last.x, coords.y - last.y) < 45;

      if (isDoubleClick) {
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }

        const targetStrokeId = last.strokeId;
        const crossStroke: AnnotationStroke = {
          id: Math.random().toString(),
          type: 'cross',
          x: coords.x,
          y: coords.y,
          color: '#ef4444',
          size: brushSize,
        };

        setStrokes((prev) => {
          const filtered = prev.filter((s) => s.id !== targetStrokeId);
          return [...filtered, crossStroke];
        });

        lastClickRef.current = null;
        return;
      }

      // Single Click: Add Green Tick
      saveHistory();
      const tickStroke: AnnotationStroke = {
        id: Math.random().toString(),
        type: 'tick',
        x: coords.x,
        y: coords.y,
        color: '#10b981',
        size: brushSize,
      };

      setStrokes((prev) => [...prev, tickStroke]);
      lastClickRef.current = {
        time: now,
        x: coords.x,
        y: coords.y,
        strokeId: tickStroke.id,
      };

      clickTimerRef.current = setTimeout(() => {
        lastClickRef.current = null;
      }, 320);
      return;
    }

    // 2. TICK TOOL (Dedicated)
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

    // 3. CROSS TOOL (Dedicated)
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

    // 4. MARKS STAMP TOOL
    if (activeTool === 'mark') {
      saveHistory();
      const newStroke: AnnotationStroke = {
        id: Math.random().toString(),
        type: 'mark',
        x: coords.x,
        y: coords.y,
        text: selectedMark,
        color: selectedMark.startsWith('-') ? '#ef4444' : '#10b981',
        size: brushSize,
      };
      setStrokes((prev) => [...prev, newStroke]);
      return;
    }

    // 5. ERASER TOOL
    if (activeTool === 'eraser') {
      saveHistory();
      setStrokes((prev) => {
        return prev.filter((s) => {
          if (s.type === 'tick' || s.type === 'cross' || s.type === 'mark' || s.type === 'text') {
            if (s.x !== undefined && s.y !== undefined) {
              return Math.hypot(s.x - coords.x, s.y - coords.y) > 30;
            }
          } else if (s.type === 'freehand' && s.points) {
            const isNear = s.points.some(
              (p) => Math.hypot(p.x - coords.x, p.y - coords.y) < 25
            );
            return !isNear;
          }
          return true;
        });
      });
      return;
    }

    // 6. TEXT REMARK TOOL
    if (activeTool === 'text') {
      setTextInputPos(coords);
      return;
    }

    // 7. PEN / HIGHLIGHTER (Continuous Freehand)
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

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
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

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setIsDrawing(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
    }
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

  const handleDownloadLocalCopy = async () => {
    const blob = await getCanvasBlob();
    if (!blob) {
      toast.error('Could not generate image copy');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evaluated_copy_${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Evaluated copy saved to your computer');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-2xl overflow-hidden relative shadow-2xl">
      {/* Top Digital Correction Toolbar */}
      {!readOnly && !isPdf && (
        <div className="p-2.5 bg-slate-900/95 backdrop-blur border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 select-none z-20">
          {/* Main Primary Tools */}
          <div className="flex items-center gap-1 bg-slate-800/95 p-1 rounded-xl border border-slate-700/80 shadow-inner">
            {/* Smart Check (1-Click Tick, 2-Click Cross) */}
            <button
              type="button"
              onClick={() => setActiveTool('smart_check')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'smart_check'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-400/50'
                  : 'text-emerald-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Smart Check: Single click for Green Tick (✓), Double click for Red Cross (✗)"
            >
              <MousePointerClick className="h-4 w-4" />
              <span>Smart Check (✓ / ✗)</span>
            </button>

            {/* Freehand Pen */}
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'pen'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Freehand Correction Pen"
            >
              <Pen className="h-3.5 w-3.5" />
              <span>Pen</span>
            </button>

            {/* Explicit Tick */}
            <button
              type="button"
              onClick={() => setActiveTool('tick')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'tick'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400 hover:text-white hover:bg-slate-700'
              }`}
              title="Stamp Green Tick (✓)"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span className="hidden sm:inline">Tick</span>
            </button>

            {/* Explicit Cross */}
            <button
              type="button"
              onClick={() => setActiveTool('cross')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'cross'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-red-400 hover:text-white hover:bg-slate-700'
              }`}
              title="Stamp Red Cross (✗)"
            >
              <X className="h-3.5 w-3.5 stroke-[3]" />
              <span className="hidden sm:inline">Cross</span>
            </button>

            {/* Marks Stamp */}
            <button
              type="button"
              onClick={() => setActiveTool('mark')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'mark'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-blue-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Stamp Score Marks (+1, +2, -1)"
            >
              <Award className="h-3.5 w-3.5" />
              <span>Mark ({selectedMark})</span>
            </button>

            {/* Highlighter */}
            <button
              type="button"
              onClick={() => setActiveTool('highlighter')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'highlighter'
                  ? 'bg-yellow-500 text-slate-900 shadow-md'
                  : 'text-yellow-400 hover:text-yellow-300 hover:bg-slate-700'
              }`}
              title="Highlighter"
            >
              <Highlighter className="h-3.5 w-3.5" />
            </button>

            {/* Text Note */}
            <button
              type="button"
              onClick={() => setActiveTool('text')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'text'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Type Written Note / Remark"
            >
              <Type className="h-3.5 w-3.5" />
            </button>

            {/* Eraser */}
            <button
              type="button"
              onClick={() => setActiveTool('eraser')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTool === 'eraser'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title="Click on any mark or ink to erase"
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick Mark Pill Selector (visible when mark tool active) */}
          {activeTool === 'mark' && (
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              {quickMarks.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMark(m)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    selectedMark === m
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Colors & Brush Size */}
          <div className="flex items-center gap-2">
            {/* Color Swatches */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-full border border-slate-700">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setActiveColor(c.value)}
                  className={`w-5 h-5 rounded-full ${c.bg} transition-all flex items-center justify-center ${
                    activeColor === c.value
                      ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>

            {/* Stroke Thickness */}
            <div className="flex items-center gap-0.5 bg-slate-800/90 p-1 rounded-lg border border-slate-700 text-xs">
              {[2, 4, 7].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setBrushSize(s)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
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

          {/* Actions: Undo / Redo / Clear / Zoom / Download */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-slate-800 disabled:opacity-25"
              title="Clear all markings"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <div className="h-4 w-[1px] bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-400 w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleDownloadLocalCopy}
              className="ml-1 p-1 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
              title="Save / Download evaluated copy as PNG"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Drawing Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-950/90 relative flex items-center justify-center p-4"
        style={{
          cursor:
            activeTool === 'smart_check'
              ? 'cell'
              : activeTool === 'pen'
              ? 'crosshair'
              : activeTool === 'tick' || activeTool === 'cross' || activeTool === 'mark'
              ? 'cell'
              : activeTool === 'eraser'
              ? 'not-allowed'
              : 'default',
        }}
      >
        {isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center space-y-3 bg-slate-100 relative rounded-xl overflow-hidden">
            <div className="bg-blue-50/95 border border-blue-200 text-blue-800 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm">
              📄 Multi-page PDF Submission. To evaluate, please review in the viewer below and submit marks in the right console.
            </div>
            <iframe
              src={`${imageUrl}#toolbar=1`}
              className="w-full h-full rounded-xl border border-slate-300 bg-white"
              title="Student PDF Document"
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
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="max-w-none block bg-white touch-none"
            />

            {/* Floating Text Input Box when typing teacher remark */}
            {textInputPos && (
              <div
                className="absolute z-30 flex items-center gap-1.5 bg-slate-900/95 p-2 rounded-xl border border-slate-700 shadow-2xl"
                style={{
                  left:
                    (textInputPos.x / (canvasRef.current?.width || 1)) * 100 + '%',
                  top:
                    (textInputPos.y / (canvasRef.current?.height || 1)) * 100 + '%',
                }}
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
                  placeholder="Type teacher correction / note..."
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-white border border-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500 w-52"
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
          <span className="inline-flex items-center gap-1 font-semibold text-slate-300">
            {activeTool === 'smart_check' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Smart Check Mode:{' '}
                <strong className="text-emerald-400">Single click = ✓ Tick</strong> ·{' '}
                <strong className="text-red-400">Double click = ✗ Cross</strong>
              </>
            )}
            {activeTool === 'pen' && 'Freehand Pen Mode (Drag to draw ink)'}
            {activeTool === 'tick' && 'Tick Stamp Mode (Click to stamp ✓)'}
            {activeTool === 'cross' && 'Cross Stamp Mode (Click to stamp ✗)'}
            {activeTool === 'mark' && `Score Stamp Mode (Click to stamp ${selectedMark})`}
            {activeTool === 'eraser' && 'Eraser Mode (Click on markings to erase)'}
          </span>
          <span className="text-slate-500">|</span>
          <span>{strokes.length} annotations drawn</span>
        </div>

        {checkedCopyUrl && (
          <a
            href={checkedCopyUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-emerald-400 hover:underline font-semibold"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Checked Copy Available</span>
          </a>
        )}
      </div>
    </div>
  );
});
