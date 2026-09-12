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
  HelpCircle,
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
  Eye,
  ArrowLeft,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export type ToolType =
  | 'smart_check'
  | 'pen'
  | 'highlighter'
  | 'tick'
  | 'cross'
  | 'question'
  | 'mark'
  | 'text'
  | 'eraser';

export interface AnnotationStroke {
  id: string;
  type: 'freehand' | 'tick' | 'cross' | 'question' | 'mark' | 'text';
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
  getStrokes: () => AnnotationStroke[];
  clearSavedDraft: () => void;
}

interface HandwrittenAnnotationCanvasProps {
  imageUrl: string;
  isPdf?: boolean;
  onExportBlob?: (blob: Blob) => void;
  checkedCopyUrl?: string | null;
  readOnly?: boolean;
  /** Unique key used to persist strokes in localStorage (e.g. submissionId) */
  persistenceKey?: string;
}

const STORAGE_PREFIX = 'annotation_strokes_v2_';

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
    persistenceKey,
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

  // View mode: 'annotate' = live canvas, 'returned' = show checkedCopyUrl directly
  const [viewMode, setViewMode] = useState<'annotate' | 'returned'>('annotate');

  // History State for Undo / Redo
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationStroke[][]>([]);

  // Text Tool State
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');

  // Visual click ripple for instant tactile feedback
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number; color: string } | null>(null);

  const colors = [
    { label: 'Teacher Red (Corrections)', value: '#ef4444', bg: 'bg-red-500' },
    { label: 'Scholar Green (Ticks)', value: '#10b981', bg: 'bg-emerald-500' },
    { label: 'Ink Blue (Remarks)', value: '#2563eb', bg: 'bg-blue-600' },
    { label: 'Warning Amber (Clarifications)', value: '#f59e0b', bg: 'bg-amber-500' },
    { label: 'Charcoal Black', value: '#0f172a', bg: 'bg-slate-900' },
  ];

  const quickMarks = ['+1', '+2', '+5', '-1', '½', '10/10'];

  // ─── localStorage Persistence ───────────────────────────────────────────
  const storageKey = persistenceKey ? `${STORAGE_PREFIX}${persistenceKey}` : null;

  /** Load strokes from localStorage on initial mount */
  useEffect(() => {
    if (!storageKey || readOnly) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: AnnotationStroke[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStrokes(parsed);
          toast.info(`Restored ${parsed.length} annotation${parsed.length !== 1 ? 's' : ''} from draft`, {
            duration: 2500,
          });
        }
      }
    } catch {
      // Corrupt data — ignore silently
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  /** Save strokes to localStorage whenever they change */
  useEffect(() => {
    if (!storageKey || readOnly) return;
    try {
      if (strokes.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(strokes));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // Storage quota exceeded — ignore
    }
  }, [strokes, storageKey, readOnly]);

  const clearSavedDraft = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }, [storageKey]);

  // Trigger brief visual ripple at click point
  const triggerClickFeedback = (canvasX: number, canvasY: number, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setClickRipple({
      x: (canvasX / canvas.width) * 100,
      y: (canvasY / canvas.height) * 100,
      color,
    });
    setTimeout(() => {
      setClickRipple(null);
    }, 450);
  };

  // Render single annotation stroke on any 2D canvas context
  const renderAnnotationStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: AnnotationStroke,
    canvasScale: number
  ) => {
    ctx.save();

    if (stroke.isHighlighter) {
      ctx.globalAlpha = 0.35;
    }

    if (stroke.type === 'freehand' && stroke.points && stroke.points.length > 0) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * canvasScale;
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
      ctx.strokeStyle = stroke.color || '#10b981';
      ctx.lineWidth = Math.max(3, stroke.size * 1.3) * canvasScale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const size = Math.max(26, 28 * (stroke.size / 3)) * canvasScale;
      ctx.beginPath();
      ctx.moveTo(stroke.x - size * 0.42, stroke.y);
      ctx.lineTo(stroke.x - size * 0.1, stroke.y + size * 0.38);
      ctx.lineTo(stroke.x + size * 0.55, stroke.y - size * 0.48);
      ctx.stroke();
    } else if (stroke.type === 'cross' && stroke.x !== undefined && stroke.y !== undefined) {
      // Render Red Cross Mark
      ctx.strokeStyle = stroke.color || '#ef4444';
      ctx.lineWidth = Math.max(3, stroke.size * 1.3) * canvasScale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const size = Math.max(22, 24 * (stroke.size / 3)) * canvasScale;
      ctx.beginPath();
      ctx.moveTo(stroke.x - size * 0.45, stroke.y - size * 0.45);
      ctx.lineTo(stroke.x + size * 0.45, stroke.y + size * 0.45);
      ctx.moveTo(stroke.x + size * 0.45, stroke.y - size * 0.45);
      ctx.lineTo(stroke.x - size * 0.45, stroke.y + size * 0.45);
      ctx.stroke();
    } else if (stroke.type === 'question' && stroke.x !== undefined && stroke.y !== undefined) {
      // Render Question Mark in Badge Circle
      const radius = Math.max(16, stroke.size * 5) * canvasScale;
      ctx.beginPath();
      ctx.arc(stroke.x, stroke.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.fill();
      ctx.strokeStyle = stroke.color || '#f59e0b';
      ctx.lineWidth = Math.max(2, stroke.size * 0.8) * canvasScale;
      ctx.stroke();

      ctx.font = `bold ${Math.max(16, stroke.size * 4.2) * canvasScale}px Inter, sans-serif`;
      ctx.fillStyle = stroke.color || '#f59e0b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', stroke.x, stroke.y);
    } else if (stroke.type === 'mark' && stroke.x !== undefined && stroke.y !== undefined && stroke.text) {
      // Render Score / Mark Badge Circle
      const radius = Math.max(18, stroke.size * 5.5) * canvasScale;
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
      ctx.lineWidth = Math.max(2, stroke.size / 2) * canvasScale;
      ctx.stroke();

      ctx.font = `bold ${Math.max(12, stroke.size * 3.8) * canvasScale}px Inter, sans-serif`;
      ctx.fillStyle = stroke.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stroke.text, stroke.x, stroke.y);
    } else if (stroke.type === 'text' && stroke.x !== undefined && stroke.y !== undefined && stroke.text) {
      // Render Handwritten Remark
      ctx.font = `bold ${Math.max(14, stroke.size * 4.5) * canvasScale}px Inter, sans-serif`;
      ctx.fillStyle = stroke.color;
      ctx.textBaseline = 'top';
      ctx.fillText(stroke.text, stroke.x, stroke.y);
    }

    ctx.restore();
  };

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
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Dynamic resolution scaling so strokes/marks look bold and proportional on high-res camera scans
    const canvasScale = Math.max(1, canvas.width / 800);

    // Render all vectorized strokes
    strokes.forEach((stroke) => {
      renderAnnotationStroke(ctx, stroke, canvasScale);
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
            const canvasScale = Math.max(1, canvas.width / 800);
            strokes.forEach((stroke) => {
              renderAnnotationStroke(oCtx, stroke, canvasScale);
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
      getStrokes: () => strokes,
      clearSavedDraft,
    }),
    [getCanvasBlob, strokes, clearSavedDraft]
  );

  // Auto-export blob when strokes change
  useEffect(() => {
    if (strokes.length > 0 && onExportBlob) {
      getCanvasBlob().then((blob) => {
        if (blob) onExportBlob(blob);
      });
    }
  }, [strokes, getCanvasBlob, onExportBlob]);

  // Load Image onto Canvas with Taint-Proof Blob URL
  useEffect(() => {
    if (isPdf) {
      setImageLoaded(true);
      return;
    }

    let isMounted = true;
    const targetUrl = imageUrl;
    if (!targetUrl) return;

    let objectUrlToRevoke: string | null = null;

    const setupImage = async () => {
      let resolvedSrc = targetUrl;

      // Always fetch as blob in memory so the canvas is GUARANTEED NEVER TAINTED
      try {
        if (targetUrl.startsWith('http')) {
          const res = await fetch(targetUrl);
          if (res.ok) {
            const blob = await res.blob();
            resolvedSrc = URL.createObjectURL(blob);
            objectUrlToRevoke = resolvedSrc;
          }
        }
      } catch (e) {
        console.warn('Taint-proof blob fetch warning, falling back to direct URL:', e);
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
        console.warn('Image load error, retrying without CORS flag...');
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
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [imageUrl, isPdf, redrawCanvas]);

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

    const clientX = 'clientX' in e ? e.clientX : (e as any).touches?.[0]?.clientX;
    const clientY = 'clientY' in e ? e.clientY : (e as any).touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return null;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
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
    clearSavedDraft();
    toast.info('All annotations cleared');
  };

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    // Capture pointer for continuous freehand drawing tools
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      try {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {}
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;

    // 1. SMART CHECK TOOL (Single click = Tick, Click on Tick = Cross, Click on Cross = Tick)
    if (activeTool === 'smart_check') {
      saveHistory();
      const canvasScale = Math.max(1, (canvasRef.current?.width || 800) / 800);
      const hitRadius = 120 * canvasScale; // Increased hit radius for easier toggling

      // Check if clicked near an existing tick or cross
      const existingIndex = strokes.findIndex(
        (s) =>
          (s.type === 'tick' || s.type === 'cross') &&
          s.x !== undefined &&
          s.y !== undefined &&
          Math.hypot(s.x - coords.x, s.y - coords.y) < hitRadius
      );

      if (existingIndex !== -1) {
        // Toggle existing tick <-> cross
        const existing = strokes[existingIndex];
        const toggledType = existing.type === 'tick' ? 'cross' : 'tick';
        const toggledColor = toggledType === 'tick' ? '#10b981' : '#ef4444';
        setStrokes((prev) => {
          const updated = [...prev];
          updated[existingIndex] = {
            ...existing,
            type: toggledType,
            color: toggledColor,
          };
          return updated;
        });
        triggerClickFeedback(coords.x, coords.y, toggledColor);
        return;
      }

      // Empty area -> Stamp Green Tick
      const tickStroke: AnnotationStroke = {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'tick',
        x: coords.x,
        y: coords.y,
        color: '#10b981',
        size: brushSize,
      };
      setStrokes((prev) => [...prev, tickStroke]);
      triggerClickFeedback(coords.x, coords.y, '#10b981');
      return;
    }

    // 2. DEDICATED TICK TOOL
    if (activeTool === 'tick') {
      saveHistory();
      const newStroke: AnnotationStroke = {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'tick',
        x: coords.x,
        y: coords.y,
        color: '#10b981',
        size: brushSize,
      };
      setStrokes((prev) => [...prev, newStroke]);
      triggerClickFeedback(coords.x, coords.y, '#10b981');
      return;
    }

    // 3. DEDICATED CROSS TOOL
    if (activeTool === 'cross') {
      saveHistory();
      const newStroke: AnnotationStroke = {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'cross',
        x: coords.x,
        y: coords.y,
        color: '#ef4444',
        size: brushSize,
      };
      setStrokes((prev) => [...prev, newStroke]);
      triggerClickFeedback(coords.x, coords.y, '#ef4444');
      return;
    }

    // 4. QUESTION MARK TOOL
    if (activeTool === 'question') {
      saveHistory();
      const newStroke: AnnotationStroke = {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'question',
        x: coords.x,
        y: coords.y,
        color: '#f59e0b',
        size: brushSize,
      };
      setStrokes((prev) => [...prev, newStroke]);
      triggerClickFeedback(coords.x, coords.y, '#f59e0b');
      return;
    }

    // 5. SCORE MARK STAMP
    if (activeTool === 'mark') {
      saveHistory();
      const newStroke: AnnotationStroke = {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'mark',
        x: coords.x,
        y: coords.y,
        text: selectedMark,
        color: activeColor,
        size: brushSize,
      };
      setStrokes((prev) => [...prev, newStroke]);
      triggerClickFeedback(coords.x, coords.y, activeColor);
      return;
    }

    // 6. ERASER TOOL
    if (activeTool === 'eraser') {
      const canvasScale = Math.max(1, (canvasRef.current?.width || 800) / 800);
      const eraseRadius = 35 * canvasScale;
      const strokeToErase = strokes.findIndex((s) => {
        if (s.x !== undefined && s.y !== undefined) {
          return Math.hypot(s.x - coords.x, s.y - coords.y) < eraseRadius;
        }
        if (s.points) {
          return s.points.some((p) => Math.hypot(p.x - coords.x, p.y - coords.y) < eraseRadius);
        }
        return false;
      });
      if (strokeToErase !== -1) {
        saveHistory();
        setStrokes((prev) => prev.filter((_, i) => i !== strokeToErase));
        toast.info('Erased annotation', { duration: 1000 });
      }
      return;
    }

    // 7. TEXT TOOL
    if (activeTool === 'text') {
      setTextInputPos({ x: coords.x, y: coords.y });
      setTextInputValue('');
      return;
    }

    // 8. CONTINUOUS DRAWING (PEN / HIGHLIGHTER)
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      saveHistory();
      setIsDrawing(true);
      const isHighlighter = activeTool === 'highlighter';
      const effectiveSize = isHighlighter ? Math.max(12, brushSize * 3) : brushSize;
      const effectiveColor = isHighlighter ? (activeColor === '#ef4444' ? '#eab308' : activeColor) : activeColor;

      const newStroke: AnnotationStroke = {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'freehand',
        points: [coords],
        color: effectiveColor,
        size: effectiveSize,
        isHighlighter,
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
    }
    try {
      if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {}
  };

  // Add typed remark
  const handleAddText = () => {
    if (!textInputValue.trim() || !textInputPos) {
      setTextInputPos(null);
      return;
    }
    saveHistory();
    const newStroke: AnnotationStroke = {
      id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
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

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 select-none overflow-hidden rounded-2xl border border-slate-800">
      
      {/* ── Returned Checked Copy View Mode Switcher (if exists) ── */}
      {checkedCopyUrl && (
        <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">View Mode:</span>
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('annotate')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'annotate'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Annotate Student Paper
              </button>
              <button
                type="button"
                onClick={() => setViewMode('returned')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'returned'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                View Returned Checked Copy
              </button>
            </div>
          </div>
          {viewMode === 'annotate' && storageKey && strokes.length > 0 && (
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Draft Auto-saved Locally
            </span>
          )}
        </div>
      )}

      {/* ── Returned Checked Copy Viewer ── */}
      {viewMode === 'returned' && checkedCopyUrl ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/90">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300">Previously Returned Checked Copy</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('annotate')}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Annotation
              </button>
              <a
                href={checkedCopyUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-slate-950/90">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={checkedCopyUrl}
              alt="Previously returned teacher-annotated copy"
              className="max-w-full object-contain rounded-xl shadow-2xl border border-slate-700"
            />
          </div>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════════
              SEPARATE TOOL TRAYS HEADER
              ═══════════════════════════════════════════════════════════════════ */}
          {!readOnly && !isPdf && (
            <div className="p-2 bg-slate-900/95 backdrop-blur border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 select-none z-20">
              
              {/* Left Trays Group */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* ── TRAY 1: CORRECTION SYMBOLS & STAMPS ── */}
                <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1.5 hidden md:inline">
                    Stamps
                  </span>

                  {/* Smart Check (1-Click Tick, Double/Re-Click Cross) */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('smart_check')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'smart_check'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-400/50'
                        : 'text-emerald-300 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Smart Check: Click for Tick (✓), Click on Tick for Cross (✗)"
                  >
                    <MousePointerClick className="h-3.5 w-3.5" />
                    <span>Smart Check</span>
                  </button>

                  {/* Guaranteed Green Tick Stamp */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('tick')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'tick'
                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
                        : 'text-emerald-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Stamp Green Tick (✓) - 1 Click"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span className="hidden sm:inline">Tick</span>
                  </button>

                  {/* Guaranteed Red Cross Stamp */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('cross')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'cross'
                        ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400/50'
                        : 'text-red-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Stamp Red Cross (✗) - 1 Click"
                  >
                    <X className="h-4 w-4 stroke-[3]" />
                    <span className="hidden sm:inline">Cross</span>
                  </button>

                  {/* Question Mark Stamp */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('question')}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'question'
                        ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                        : 'text-amber-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Stamp Question (?) - Needs Clarification"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">?</span>
                  </button>

                  {/* Marks Stamp */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('mark')}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'mark'
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50'
                        : 'text-blue-300 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Stamp Score Badge (+1, +2, -1)"
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>{selectedMark}</span>
                  </button>
                </div>

                {/* ── TRAY 2: WRITING & DRAWING TOOLS ── */}
                <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1.5 hidden md:inline">
                    Draw
                  </span>

                  {/* Freehand Pen */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('pen')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'pen'
                        ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/50'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Freehand Correction Pen"
                  >
                    <Pen className="h-3.5 w-3.5" />
                    <span>Pen</span>
                  </button>

                  {/* Highlighter */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('highlighter')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'highlighter'
                        ? 'bg-yellow-500 text-slate-900 shadow-md ring-2 ring-yellow-300/50'
                        : 'text-yellow-400 hover:text-yellow-300 hover:bg-slate-700'
                    }`}
                    title="Semi-transparent Highlighter"
                  >
                    <Highlighter className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Highlight</span>
                  </button>

                  {/* Text Note */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('text')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'text'
                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/50'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Click anywhere to type written remark"
                  >
                    <Type className="h-3.5 w-3.5" />
                  </button>

                  {/* Eraser */}
                  <button
                    type="button"
                    onClick={() => setActiveTool('eraser')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTool === 'eraser'
                        ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Click any annotation to erase"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Score Mark Pill Selector (visible when mark tool active) */}
                {activeTool === 'mark' && (
                  <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 animate-in fade-in">
                    {quickMarks.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMark(m)}
                        className={`px-2 py-1 rounded-md text-[11px] font-extrabold transition-colors ${
                          selectedMark === m
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}

              </div>

              {/* Right Trays: Colors, Size & Canvas History */}
              <div className="flex items-center gap-2">
                
                {/* ── TRAY 3: COLOR PALETTE & SIZE ── */}
                <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setActiveColor(c.value)}
                      className={`w-5 h-5 rounded-full ${c.bg} transition-all ${
                        activeColor === c.value
                          ? 'ring-2 ring-white scale-110 shadow-sm'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      title={c.label}
                    />
                  ))}

                  <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                  {/* Stroke Size Selector */}
                  <div className="flex items-center gap-1 text-slate-300 text-xs px-1">
                    {[2, 4, 7].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setBrushSize(s)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] transition-colors ${
                          brushSize === s
                            ? 'bg-slate-600 text-white font-black'
                            : 'text-slate-400 hover:text-white hover:bg-slate-750'
                        }`}
                        title={`Stroke width: ${s}px`}
                      >
                        {s === 2 ? 'S' : s === 4 ? 'M' : 'L'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── TRAY 4: HISTORY & ZOOM ── */}
                <div className="flex items-center gap-0.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors"
                    title="Undo (Ctrl+Z)"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors"
                    title="Redo"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>

                  <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="px-1.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors"
                    title="Reset Zoom to 100%"
                  >
                    {Math.round(zoom * 100)}%
                  </button>

                  <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={strokes.length === 0}
                    className="p-1.5 text-red-400 hover:text-red-300 disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors"
                    title="Clear All Annotations"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* Canvas Viewport Container */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto bg-slate-950 flex items-start justify-center p-4 relative"
            style={{
              cursor:
                activeTool === 'pen'
                  ? 'crosshair'
                  : activeTool === 'highlighter'
                  ? 'crosshair'
                  : activeTool === 'smart_check'
                  ? 'pointer'
                  : activeTool === 'tick' || activeTool === 'cross' || activeTool === 'question' || activeTool === 'mark'
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

                {/* Instant Click Ripple Feedback */}
                {clickRipple && (
                  <div
                    className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping z-30"
                    style={{
                      left: `${clickRipple.x}%`,
                      top: `${clickRipple.y}%`,
                      width: '32px',
                      height: '32px',
                      backgroundColor: clickRipple.color,
                      opacity: 0.75,
                    }}
                  />
                )}

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

          {/* Bottom Canvas Status Bar */}
          <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">
                {activeTool === 'smart_check'
                  ? '⚡ Smart Check: Click for Tick (✓), Click on Tick for Cross (✗)'
                  : activeTool === 'tick'
                  ? '✅ 1-Click Green Tick (✓) Stamp'
                  : activeTool === 'cross'
                  ? '❌ 1-Click Red Cross (✗) Stamp'
                  : activeTool === 'question'
                  ? '❓ 1-Click Question Mark (?) Stamp'
                  : activeTool === 'pen'
                  ? '🖊️ Freehand Pen (Drag to draw)'
                  : activeTool === 'highlighter'
                  ? '🖍️ Highlighter Marker'
                  : activeTool === 'mark'
                  ? `🏆 Score Stamp: ${selectedMark}`
                  : activeTool === 'text'
                  ? '💬 Remark: Click anywhere to type'
                  : '🧽 Eraser: Click on any mark to delete'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span>{strokes.length} mark{strokes.length !== 1 ? 's' : ''}</span>
              {checkedCopyUrl && (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'annotate' ? 'returned' : 'annotate')}
                  className="text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2 flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  {viewMode === 'annotate' ? 'View Returned Copy' : 'Back to Annotating'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
});

HandwrittenAnnotationCanvas.displayName = 'HandwrittenAnnotationCanvas';
