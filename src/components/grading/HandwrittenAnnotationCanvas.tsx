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
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Hand,
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
  persistenceKey?: string;
  onSaveAnnotations?: () => Promise<void> | void;
  isSavingAnnotations?: boolean;
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
    onSaveAnnotations,
    isSavingAnnotations = false,
  },
  ref
) {
  // ── Layout refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Three stacked layers — only active one receives pointer events.
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Document dimensions (natural pixel space). Canvas buffers are sized * DPR.
  const [docWidth, setDocWidth] = useState(800);
  const [docHeight, setDocHeight] = useState(1100);
  const [imageLoaded, setImageLoaded] = useState(false);

  // ── High-DPI ──
  const dprRef = useRef(Math.min(window.devicePixelRatio || 1, 2));

  // ── Pan / Zoom ──
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const panRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const isPanningRef = useRef(false);
  const spaceHeldRef = useRef(false);

  // ── Active drawing (RAF-driven, no React state updates while dragging) ──
  const isDrawingRef = useRef(false);
  const activePointsRef = useRef<{ x: number; y: number }[]>([]);
  const activeStyleRef = useRef<{ color: string; size: number; isHighlighter: boolean }>({
    color: '#ef4444',
    size: 3,
    isHighlighter: false,
  });
  const rafIdRef = useRef<number>(0);

  // ── State: per-page strokes + per-page undo/redo ──
  const [strokes, setStrokes] = useState<Record<number, AnnotationStroke[]>>({ 1: [] });
  const [undoStack, setUndoStack] = useState<Record<number, AnnotationStroke[][]>>({ 1: [] });
  const [redoStack, setRedoStack] = useState<Record<number, AnnotationStroke[][]>>({ 1: [] });

  // Multi-page PDF State
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(1);
  const pdfDocRef = useRef<any>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  // Active Tool & Style State
  const [activeTool, setActiveTool] = useState<ToolType>('smart_check');
  const [activeColor, setActiveColor] = useState<string>('#ef4444');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [selectedMark, setSelectedMark] = useState<string>('+1');

  // View mode
  const [viewMode, setViewMode] = useState<'annotate' | 'returned'>('annotate');

  // Text Tool State
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');

  // Visual click ripple
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number; color: string } | null>(
    null
  );

  const colors = [
    { label: 'Teacher Red (Corrections)', value: '#ef4444', bg: 'bg-red-500' },
    { label: 'Scholar Green (Ticks)', value: '#10b981', bg: 'bg-emerald-500' },
    { label: 'Ink Blue (Remarks)', value: '#2563eb', bg: 'bg-blue-600' },
    { label: 'Warning Amber (Clarifications)', value: '#f59e0b', bg: 'bg-amber-500' },
    { label: 'Charcoal Black', value: '#0f172a', bg: 'bg-slate-900' },
  ];

  const quickMarks = ['+1', '+2', '+5', '-1', '½', '10/10'];

  const storageKey = persistenceKey ? `${STORAGE_PREFIX}${persistenceKey}` : null;

  // ── Helpers ──
  const pageStrokes = useCallback((page: number) => strokes[page] || [], [strokes]);
  const pageUndo = useCallback((page: number) => undoStack[page] || [], [undoStack]);
  const pageRedo = useCallback((page: number) => redoStack[page] || [], [redoStack]);

  const setPageStrokes = useCallback(
    (updater: (prev: AnnotationStroke[]) => AnnotationStroke[]) => {
      setStrokes((prev) => ({ ...prev, [pdfPage]: updater(prev[pdfPage] || []) }));
    },
    [pdfPage]
  );
  const setPageUndo = useCallback(
    (updater: (prev: AnnotationStroke[][]) => AnnotationStroke[][]) => {
      setUndoStack((prev) => ({ ...prev, [pdfPage]: updater(prev[pdfPage] || []) }));
    },
    [pdfPage]
  );
  const setPageRedo = useCallback(
    (updater: (prev: AnnotationStroke[][]) => AnnotationStroke[][]) => {
      setRedoStack((prev) => ({ ...prev, [pdfPage]: updater(prev[pdfPage] || []) }));
    },
    [pdfPage]
  );

  // ── Canvas sizing (DPR-scaled buffers) ──
  const syncCanvases = useCallback(() => {
    const dpr = dprRef.current;
    [bgCanvasRef, annotCanvasRef, activeCanvasRef].forEach(({ current }) => {
      if (!current) return;
      current.width = Math.round(docWidth * dpr);
      current.height = Math.round(docHeight * dpr);
      current.style.width = `${docWidth}px`;
      current.style.height = `${docHeight}px`;
      const ctx = current.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }, [docWidth, docHeight]);

  // ── localStorage Persistence (debounced v2) ──
  useEffect(() => {
    if (!storageKey || readOnly) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setStrokes(parsed);
          const count = Object.values(parsed).reduce(
            (sum: number, arr: AnnotationStroke[]) => sum + (Array.isArray(arr) ? arr.length : 0),
            0
          );
          if (count > 0)
            toast.info(`Restored ${count} annotation${count !== 1 ? 's' : ''} from draft`, {
              duration: 2500,
            });
        }
      }
    } catch {}
  }, [storageKey, readOnly]);

  const saveDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!storageKey || readOnly) return;
    if (saveDraftTimerRef.current) clearTimeout(saveDraftTimerRef.current);
    saveDraftTimerRef.current = setTimeout(() => {
      try {
        const compact = decimateStrokesForStorage(strokes);
        const sizeKB = new Blob([JSON.stringify(compact)]).size / 1024;
        if (sizeKB > 4 * 1024) {
          // Exceeds safe localStorage quota — skip
          if (storageKey) localStorage.removeItem(storageKey);
          return;
        }
        if (Object.values(compact).some((arr) => arr.length > 0)) {
          localStorage.setItem(storageKey, JSON.stringify(compact));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {}
    }, 500);
    return () => {
      if (saveDraftTimerRef.current) clearTimeout(saveDraftTimerRef.current);
    };
  }, [strokes, storageKey, readOnly]);

  const clearSavedDraft = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }, [storageKey]);

  const triggerClickFeedback = (canvasX: number, canvasY: number, color: string) => {
    setClickRipple({ x: (canvasX / docWidth) * 100, y: (canvasY / docHeight) * 100, color });
    setTimeout(() => setClickRipple(null), 450);
  };

  // ── Drawing primitives (natural-pixel coords, DPR applied via canvas transform) ──
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: AnnotationStroke) => {
    ctx.save();
    if (stroke.isHighlighter) ctx.globalAlpha = 0.35;

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
      ctx.strokeStyle = stroke.color || '#10b981';
      ctx.lineWidth = Math.max(3, stroke.size * 1.3);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const size = Math.max(26, 28 * (stroke.size / 3));
      ctx.beginPath();
      ctx.moveTo(stroke.x - size * 0.42, stroke.y);
      ctx.lineTo(stroke.x - size * 0.1, stroke.y + size * 0.38);
      ctx.lineTo(stroke.x + size * 0.55, stroke.y - size * 0.48);
      ctx.stroke();
    } else if (stroke.type === 'cross' && stroke.x !== undefined && stroke.y !== undefined) {
      ctx.strokeStyle = stroke.color || '#ef4444';
      ctx.lineWidth = Math.max(3, stroke.size * 1.3);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const size = Math.max(22, 24 * (stroke.size / 3));
      ctx.beginPath();
      ctx.moveTo(stroke.x - size * 0.45, stroke.y - size * 0.45);
      ctx.lineTo(stroke.x + size * 0.45, stroke.y + size * 0.45);
      ctx.moveTo(stroke.x + size * 0.45, stroke.y - size * 0.45);
      ctx.lineTo(stroke.x - size * 0.45, stroke.y + size * 0.45);
      ctx.stroke();
    } else if (stroke.type === 'question' && stroke.x !== undefined && stroke.y !== undefined) {
      const radius = Math.max(16, stroke.size * 5);
      ctx.beginPath();
      ctx.arc(stroke.x, stroke.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.fill();
      ctx.strokeStyle = stroke.color || '#f59e0b';
      ctx.lineWidth = Math.max(2, stroke.size * 0.8);
      ctx.stroke();
      ctx.font = `bold ${Math.max(16, stroke.size * 4.2)}px Inter, sans-serif`;
      ctx.fillStyle = stroke.color || '#f59e0b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', stroke.x, stroke.y);
    } else if (
      stroke.type === 'mark' &&
      stroke.x !== undefined &&
      stroke.y !== undefined &&
      stroke.text
    ) {
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
      ctx.lineWidth = Math.max(2, stroke.size / 2);
      ctx.stroke();
      ctx.font = `bold ${Math.max(12, stroke.size * 3.8)}px Inter, sans-serif`;
      ctx.fillStyle = stroke.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stroke.text, stroke.x, stroke.y);
    } else if (stroke.type === 'text' && stroke.x !== undefined && stroke.y !== undefined && stroke.text) {
      ctx.font = `bold ${Math.max(14, stroke.size * 4.5)}px Inter, sans-serif`;
      ctx.fillStyle = stroke.color;
      ctx.textBaseline = 'top';
      ctx.fillText(stroke.text, stroke.x, stroke.y);
    }
    ctx.restore();
  }, []);

  // ── Layer renderers ──
  const drawBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, docWidth, docHeight);
    if (imageRef.current && imageRef.current.naturalWidth > 0) {
      ctx.drawImage(imageRef.current, 0, 0, docWidth, docHeight);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, docWidth, docHeight);
    }
  }, [docWidth, docHeight]);

  const drawAnnotations = useCallback(() => {
    const canvas = annotCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, docWidth, docHeight);
    pageStrokes(pdfPage).forEach((stroke) => drawStroke(ctx, stroke));
  }, [docWidth, docHeight, pdfPage, pageStrokes, drawStroke]);

  const startActiveLoop = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    const loop = () => {
      const canvas = activeCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
      ctx.clearRect(0, 0, docWidth, docHeight);
      const pts = activePointsRef.current;
      if (pts.length >= 2) {
        const { color, size, isHighlighter } = activeStyleRef.current;
        ctx.save();
        if (isHighlighter) ctx.globalAlpha = 0.35;
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const mid = { x: (p1.x + pts[i + 1].x) / 2, y: (p1.y + pts[i + 1].y) / 2 };
          ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
        }
        const last = pts[pts.length - 1];
        if (pts.length >= 2) {
          const prev = pts[pts.length - 2];
          ctx.lineTo(last.x, last.y);
        }
        ctx.stroke();
        ctx.restore();
      }
      if (isDrawingRef.current) rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
  }, [docWidth, docHeight]);

  const stopActiveLoop = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
  }, []);

  // ── Persistence: point decimation for localStorage quota guard ──
  const decimateStrokesForStorage = useCallback((data: Record<number, AnnotationStroke[]>) => {
    const out: Record<number, AnnotationStroke[]> = {};
    for (const [page, list] of Object.entries(data)) {
      out[page] = list.map((s) => {
        if (!s.points || s.points.length < 3) return s;
        const keep: { x: number; y: number }[] = [s.points[0]];
        const step = Math.max(1, Math.floor(s.points.length / 60));
        for (let i = 1; i < s.points.length - 1; i += step) keep.push(s.points[i]);
        keep.push(s.points[s.points.length - 1]);
        return { ...s, points: keep };
      });
    }
    return out;
  }, []);

  // ── PDF ──
  const loadPdfJs = async () => {
    if (typeof window === 'undefined') return null;
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(lib);
        } else resolve(null);
      };
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  };

  const renderPdfPageToCanvas = useCallback(
    async (pdfDoc: any, pageNumber: number) => {
      try {
        setIsProcessingPdf(true);
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = viewport.width;
        offscreenCanvas.height = viewport.height;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        if (offscreenCtx) {
          await page.render({ canvasContext: offscreenCtx, viewport }).promise;
          const dataUrl = offscreenCanvas.toDataURL('image/png');
          const img = new Image();
          img.onload = () => {
            imageRef.current = img;
            const w = img.naturalWidth || viewport.width;
            const h = img.naturalHeight || viewport.height;
            setDocWidth(w);
            setDocHeight(h);
            setImageLoaded(true);
            setIsProcessingPdf(false);
          };
          img.src = dataUrl;
        }
      } catch (pdfErr) {
        console.warn('PDF page rendering error:', pdfErr);
        setIsProcessingPdf(false);
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;
    const targetUrl = imageUrl;
    if (!targetUrl) return;
    let objectUrlToRevoke: string | null = null;

    const setupDocument = async () => {
      const isPdfFile =
        isPdf || targetUrl.toLowerCase().endsWith('.pdf') || targetUrl.toLowerCase().includes('.pdf');
      if (isPdfFile) {
        setIsProcessingPdf(true);
        try {
          const pdfjs = await loadPdfJs();
          if (pdfjs && isMounted) {
            const proxyUrl = `/api/proxy-file?url=${encodeURIComponent(targetUrl)}`;
            const loadingTask = pdfjs.getDocument(proxyUrl);
            const loadedPdf = await loadingTask.promise;
            if (isMounted) {
              pdfDocRef.current = loadedPdf;
              setPdfTotalPages(loadedPdf.numPages);
              setPdfPage(1);
              await renderPdfPageToCanvas(loadedPdf, 1);
            }
            return;
          }
        } catch (pdfLoadErr) {
          console.warn('PDF.js setup warning, falling back to image handler:', pdfLoadErr);
        }
      }

      let resolvedSrc = targetUrl;
      try {
        const proxyUrl = targetUrl.startsWith('http')
          ? `/api/proxy-file?url=${encodeURIComponent(targetUrl)}`
          : targetUrl;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const blob = await res.blob();
          resolvedSrc = URL.createObjectURL(blob);
          objectUrlToRevoke = resolvedSrc;
        }
      } catch (e) {
        console.warn('Taint-proof proxy fetch warning, using direct URL:', e);
      }

      if (!isMounted) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!isMounted) return;
        imageRef.current = img;
        setDocWidth(img.naturalWidth);
        setDocHeight(img.naturalHeight);
        setImageLoaded(true);
      };
      img.onerror = () => {
        if (!isMounted) return;
        const fallback = new Image();
        fallback.onload = () => {
          if (!isMounted) return;
          imageRef.current = fallback;
          setDocWidth(fallback.naturalWidth);
          setDocHeight(fallback.naturalHeight);
          setImageLoaded(true);
        };
        fallback.src = targetUrl;
      };
      img.src = resolvedSrc;
    };

    setupDocument();
    return () => {
      isMounted = false;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [imageUrl, isPdf, renderPdfPageToCanvas]);

  // ── Layer rendering when deps change ──
  useEffect(() => {
    drawBackground();
    drawAnnotations();
  }, [drawBackground, drawAnnotations]);

  const handlePageChange = (newPage: number) => {
    if (!pdfDocRef.current || newPage < 1 || newPage > pdfTotalPages) return;
    setPdfPage(newPage);
    renderPdfPageToCanvas(pdfDocRef.current, newPage);
  };

  // ── Coordinate mapping (canvas/pan-zoom aware) ──
  const getCanvasCoords = (
    e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement> | MouseEvent
  ): { x: number; y: number } | null => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return null;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const clientX = 'clientX' in e ? e.clientX : (e as any).touches?.[0]?.clientX;
    const clientY = 'clientY' in e ? e.clientY : (e as any).touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return null;
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  };

  // ── Undo / Redo (per-page) ──
  const saveHistory = useCallback(() => {
    setPageUndo((prev) => [...prev, [...pageStrokes(pdfPage)]]);
    setPageRedo(() => []);
  }, [pdfPage, pageStrokes, setPageUndo, setPageRedo]);

  const handleUndo = useCallback(() => {
    const stack = pageUndo(pdfPage);
    if (stack.length === 0) return;
    const previous = stack[stack.length - 1];
    setPageRedo((prev) => [...prev, [...pageStrokes(pdfPage)]]);
    setPageStrokes(() => previous);
    setPageUndo((prev) => prev.slice(0, -1));
  }, [pdfPage, pageStrokes, pageUndo, setPageStrokes, setPageUndo, setPageRedo]);

  const handleRedo = useCallback(() => {
    const stack = pageRedo(pdfPage);
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    setPageUndo((prev) => [...prev, [...pageStrokes(pdfPage)]]);
    setPageStrokes(() => next);
    setPageRedo((prev) => prev.slice(0, -1));
  }, [pdfPage, pageStrokes, pageRedo, setPageStrokes, setPageUndo, setPageRedo]);

  const handleClear = useCallback(() => {
    if (pageStrokes(pdfPage).length === 0) return;
    saveHistory();
    setPageStrokes(() => []);
    clearSavedDraft();
    toast.info('All annotations cleared');
  }, [pdfPage, pageStrokes, saveHistory, setPageStrokes, clearSavedDraft]);

  // ── Pointer Handlers ──
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    if (spaceHeldRef.current || isPanningRef.current) return;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      try {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {}
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (activeTool === 'smart_check') {
      saveHistory();
      const hitRadius = 120;
      const existingIndex = pageStrokes(pdfPage).findIndex(
        (s) =>
          (s.type === 'tick' || s.type === 'cross') &&
          s.x !== undefined &&
          s.y !== undefined &&
          Math.hypot(s.x - coords.x, s.y - coords.y) < hitRadius
      );
      if (existingIndex !== -1) {
        const existing = pageStrokes(pdfPage)[existingIndex];
        const toggledType = existing.type === 'tick' ? 'cross' : 'tick';
        const toggledColor = toggledType === 'tick' ? '#10b981' : '#ef4444';
        setPageStrokes((prev) => {
          const updated = [...prev];
          updated[existingIndex] = { ...existing, type: toggledType, color: toggledColor };
          return updated;
        });
        triggerClickFeedback(coords.x, coords.y, toggledColor);
        return;
      }
      const tickStroke: AnnotationStroke = {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'tick',
        x: coords.x,
        y: coords.y,
        color: '#10b981',
        size: brushSize,
      };
      setPageStrokes((prev) => [...prev, tickStroke]);
      triggerClickFeedback(coords.x, coords.y, '#10b981');
      return;
    }

    if (activeTool === 'tick') {
      saveHistory();
      setPageStrokes((prev) => [
        ...prev,
        {
          id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          type: 'tick',
          x: coords.x,
          y: coords.y,
          color: '#10b981',
          size: brushSize,
        },
      ]);
      triggerClickFeedback(coords.x, coords.y, '#10b981');
      return;
    }

    if (activeTool === 'cross') {
      saveHistory();
      setPageStrokes((prev) => [
        ...prev,
        {
          id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          type: 'cross',
          x: coords.x,
          y: coords.y,
          color: '#ef4444',
          size: brushSize,
        },
      ]);
      triggerClickFeedback(coords.x, coords.y, '#ef4444');
      return;
    }

    if (activeTool === 'question') {
      saveHistory();
      setPageStrokes((prev) => [
        ...prev,
        {
          id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          type: 'question',
          x: coords.x,
          y: coords.y,
          color: '#f59e0b',
          size: brushSize,
        },
      ]);
      triggerClickFeedback(coords.x, coords.y, '#f59e0b');
      return;
    }

    if (activeTool === 'mark') {
      saveHistory();
      setPageStrokes((prev) => [
        ...prev,
        {
          id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          type: 'mark',
          x: coords.x,
          y: coords.y,
          text: selectedMark,
          color: activeColor,
          size: brushSize,
        },
      ]);
      triggerClickFeedback(coords.x, coords.y, activeColor);
      return;
    }

    if (activeTool === 'eraser') {
      const eraseRadius = 35;
      const strokeToErase = pageStrokes(pdfPage).findIndex((s) => {
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
        setPageStrokes((prev) => prev.filter((_, i) => i !== strokeToErase));
        toast.info('Erased annotation', { duration: 1000 });
      }
      return;
    }

    if (activeTool === 'text') {
      setTextInputPos({ x: coords.x, y: coords.y });
      setTextInputValue('');
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      saveHistory();
      isDrawingRef.current = true;
      activePointsRef.current = [coords];
      activeStyleRef.current = {
        color: activeTool === 'highlighter'
          ? activeColor === '#ef4444'
            ? '#eab308'
            : activeColor
          : activeColor,
        size: activeTool === 'highlighter' ? Math.max(12, brushSize * 3) : brushSize,
        isHighlighter: activeTool === 'highlighter',
      };
      startActiveLoop();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || readOnly) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const pts = activePointsRef.current;
    // Point decimation: skip points closer than ~1.5 natural px
    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      if (Math.hypot(coords.x - last.x, coords.y - last.y) < 1.5) return;
    }
    pts.push(coords);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {}
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      stopActiveLoop();
      const pts = activePointsRef.current;
      if (pts.length >= 2) {
        const { color, size, isHighlighter } = activeStyleRef.current;
        const stroke: AnnotationStroke = {
          id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          type: 'freehand',
          points: pts,
          color,
          size,
          isHighlighter,
        };
        drawAnnotations();
        setPageStrokes((prev) => [...prev, stroke]);
      }
      activePointsRef.current = [];
    }
  };

  // ── Pan handlers on the wrapper (when space held / hand tool) ──
  const onWrapperPointerDown = (e: React.PointerEvent) => {
    if (!spaceHeldRef.current) return;
    e.preventDefault();
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
  };
  const onWrapperPointerMove = (e: React.PointerEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPanX(panStartRef.current.panX + dx);
    setPanY(panStartRef.current.panY + dy);
  };
  const onWrapperPointerUp = () => {
    isPanningRef.current = false;
  };

  // Wheel zoom (zoom around cursor)
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const px = (e.clientX - rect.left) / zoom;
    const py = (e.clientY - rect.top) / zoom;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.max(0.3, Math.min(3, zoom * factor));
    const newPanX = panX + (1 - newZoom / zoom) * (e.clientX - rect.left - panX);
    const newPanY = panY + (1 - newZoom / zoom) * (e.clientY - rect.top - panY);
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  };

  // Zoom presets
  const handleFitWidth = () => {
    const container = containerRef.current;
    if (!container || docWidth === 0) return;
    const z = container.clientWidth / docWidth;
    setZoom(z);
    setPanX(0);
    setPanY(0);
  };
  const handleFitPage = () => {
    const container = containerRef.current;
    if (!container || docWidth === 0 || docHeight === 0) return;
    const z = Math.min(container.clientWidth / docWidth, container.clientHeight / docHeight);
    setZoom(z);
    setPanX(0);
    setPanY(0);
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // ── Text tool ──
  const handleAddText = () => {
    if (!textInputValue.trim() || !textInputPos) {
      setTextInputPos(null);
      return;
    }
    saveHistory();
    setPageStrokes((prev) => [
      ...prev,
      {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: 'text',
        x: textInputPos.x,
        y: textInputPos.y,
        text: textInputValue.trim(),
        color: activeColor,
        size: brushSize,
      },
    ]);
    setTextInputPos(null);
    setTextInputValue('');
  };

  // ── Export (composite bg + annotations + active) ──
  const getCanvasBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      try {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = Math.round(docWidth * dprRef.current);
        exportCanvas.height = Math.round(docHeight * dprRef.current);
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, docWidth, docHeight);
        if (imageRef.current && imageRef.current.naturalWidth > 0) {
          ctx.drawImage(imageRef.current, 0, 0, docWidth, docHeight);
        }
        pageStrokes(pdfPage).forEach((stroke) => drawStroke(ctx, stroke));
        exportCanvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
      } catch {
        resolve(null);
      }
    });
  }, [docWidth, docHeight, pdfPage, pageStrokes, drawStroke]);

  useImperativeHandle(
    ref,
    () => ({
      getExportBlob: async () => await getCanvasBlob(),
      getStrokesCount: () => pageStrokes(pdfPage).length,
      getStrokes: () => pageStrokes(pdfPage),
      clearSavedDraft,
    }),
    [getCanvasBlob, pdfPage, pageStrokes, clearSavedDraft]
  );

  useEffect(() => {
    if (onExportBlob) {
      getCanvasBlob().then((blob) => {
        if (blob) onExportBlob(blob);
      });
    }
  }, [getCanvasBlob, onExportBlob]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === ' ') {
        e.preventDefault();
        spaceHeldRef.current = true;
        return;
      }
      if (!e.ctrlKey && !e.metaKey) {
        if (k === '1' || k === 'v') setActiveTool('smart_check');
        else if (k === '2' || k === 'x') setActiveTool('cross');
        else if (k === '3' || k === 'p') setActiveTool('pen');
        else if (k === '4' || k === 'h') setActiveTool('highlighter');
        else if (k === '5' || k === 'e') setActiveTool('eraser');
        else if (k === '6' || k === 't') setActiveTool('text');
        else if (k === '[') setBrushSize((s) => Math.max(1, s - 1));
        else if (k === ']') setBrushSize((s) => Math.min(20, s + 1));
      } else {
        if (k === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (k === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (k === 's') {
          e.preventDefault();
          onSaveAnnotations?.();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceHeldRef.current = false;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleUndo, handleRedo, onSaveAnnotations]);

  // Sync pan ref to state
  panRef.current = { x: panX, y: panY };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 select-none overflow-hidden rounded-2xl border border-slate-800">
      {/* ── Returned Checked Copy View Mode Switcher ── */}
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
                Annotate Paper
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
                View Evaluated Copy
              </button>
            </div>
          </div>
          {viewMode === 'annotate' && storageKey && Object.values(strokes).some((arr) => arr.length > 0) && (
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Draft Auto-saved Locally
            </span>
          )}
        </div>
      )}

      {/* ── Returned Checked Copy Viewer Mode ── */}
      {viewMode === 'returned' && checkedCopyUrl ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/90">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300">
                Previously Returned Checked Copy
              </span>
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
        /* ═══════════════════════════════════════════════════════════════════
           SIDE-BY-SIDE INTERFACE: VERTICAL SIDE TRAY ON THE LEFT + CANVAS
           ═══════════════════════════════════════════════════════════════════ */
        <div className="flex flex-row flex-1 overflow-hidden relative">
          {/* ── VERTICAL SIDE TOOL TRAY ── */}
          {!readOnly && (
            <aside className="w-14 sm:w-16 md:w-52 shrink-0 bg-slate-900/95 backdrop-blur border-r border-slate-800 flex flex-col justify-between p-2 select-none z-20 overflow-y-auto gap-3">
              <div className="space-y-3">
                {/* 1. CORRECTION STAMPS */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 hidden md:block">
                    Stamps
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTool('smart_check')}
                    className={`w-full flex items-center justify-center md:justify-start gap-2 p-2 rounded-xl text-xs font-bold transition-all ${
                      activeTool === 'smart_check'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-400/50'
                        : 'text-emerald-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Smart Check: Click for Tick (✓), Click on Tick for Cross (✗)"
                  >
                    <MousePointerClick className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="hidden md:inline font-semibold">Smart Check</span>
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTool('tick')}
                      className={`flex items-center justify-center md:justify-start gap-1.5 p-2 rounded-xl text-xs font-bold transition-all ${
                        activeTool === 'tick'
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
                          : 'text-emerald-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Stamp Green Tick (✓)"
                    >
                      <Check className="h-4 w-4 stroke-[3] shrink-0" />
                      <span className="hidden md:inline">Tick</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('cross')}
                      className={`flex items-center justify-center md:justify-start gap-1.5 p-2 rounded-xl text-xs font-bold transition-all ${
                        activeTool === 'cross'
                          ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400/50'
                          : 'text-red-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Stamp Red Cross (✗)"
                    >
                      <X className="h-4 w-4 stroke-[3] shrink-0" />
                      <span className="hidden md:inline">Cross</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTool('question')}
                      className={`flex items-center justify-center md:justify-start gap-1.5 p-2 rounded-xl text-xs font-bold transition-all ${
                        activeTool === 'question'
                          ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                          : 'text-amber-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Stamp Question (?) - Needs Clarification"
                    >
                      <HelpCircle className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">Clarify</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('mark')}
                      className={`flex items-center justify-center md:justify-start gap-1.5 p-2 rounded-xl text-xs font-bold transition-all ${
                        activeTool === 'mark'
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50'
                          : 'text-blue-300 hover:text-white hover:bg-slate-800'
                      }`}
                      title={`Stamp Score Badge (${selectedMark})`}
                    >
                      <Award className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline font-mono">{selectedMark}</span>
                    </button>
                  </div>
                  {activeTool === 'mark' && (
                    <div className="flex flex-wrap gap-1 p-1 bg-slate-800/80 rounded-xl border border-slate-700">
                      {quickMarks.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSelectedMark(m)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            selectedMark === m ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-full h-[1px] bg-slate-800" />

                {/* 2. DRAWING & WRITING */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 hidden md:block">
                    Draw &amp; Text
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTool('pen')}
                      className={`flex items-center justify-center md:justify-start gap-1.5 p-2 rounded-xl text-xs font-bold transition-all ${
                        activeTool === 'pen'
                          ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/50'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Freehand Pen"
                    >
                      <Pen className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">Pen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('highlighter')}
                      className={`flex items-center justify-center md:justify-start gap-1.5 p-2 rounded-xl text-xs font-bold transition-all ${
                        activeTool === 'highlighter'
                          ? 'bg-yellow-500 text-slate-900 shadow-md ring-2 ring-yellow-300/50'
                          : 'text-yellow-400 hover:text-yellow-300 hover:bg-slate-800'
                      }`}
                      title="Highlighter"
                    >
                      <Highlighter className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">Highlt</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTool('text')}
                      className={`flex items-center justify-center md:justify-start gap-1.5 p-2 rounded-xl text-xs font-bold transition-all ${
                        activeTool === 'text'
                          ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/50'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Click anywhere on page to type remark"
                    >
                      <Type className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">Note</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('eraser')}
                      className={`flex items-center justify-center md:justify-start gap-1.5 p-2 rounded-xl text-xs font-bold transition-all ${
                        activeTool === 'eraser'
                          ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Eraser: Click on any mark to delete"
                    >
                      <Eraser className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">Erase</span>
                    </button>
                  </div>
                </div>

                <div className="w-full h-[1px] bg-slate-800" />

                {/* 3. COLOR PALETTE & STROKE SIZE */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 hidden md:block">
                    Color &amp; Size
                  </span>
                  <div className="flex items-center justify-center md:justify-start gap-1.5 flex-wrap px-1">
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
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-1 px-1 pt-1">
                    {[2, 4, 7].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setBrushSize(s)}
                        className={`w-6 h-5 rounded-md flex items-center justify-center font-bold text-[10px] transition-colors ${
                          brushSize === s
                            ? 'bg-slate-700 text-white font-black'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={`Size: ${s}px`}
                      >
                        {s === 2 ? 'Fine' : s === 4 ? 'Med' : 'Bold'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full h-[1px] bg-slate-800" />

                {/* 4. CANVAS HISTORY & ZOOM */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 hidden md:block">
                    Controls
                  </span>
                  <div className="flex items-center justify-between gap-1 px-1">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={pageUndo(pdfPage).length === 0}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Undo (Ctrl+Z)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={pageRedo(pdfPage).length === 0}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Redo"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const container = containerRef.current;
                        if (!container || docWidth === 0) return;
                        setZoom((z) => Math.min(3, z * 1.2));
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const container = containerRef.current;
                        if (!container || docWidth === 0) return;
                        setZoom((z) => Math.max(0.3, z / 1.2));
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-1 px-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleFitWidth}
                        className="px-1.5 py-0.5 text-[9px] font-bold text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        title="Fit Width"
                      >
                        Fit W
                      </button>
                      <button
                        type="button"
                        onClick={handleFitPage}
                        className="px-1.5 py-0.5 text-[9px] font-bold text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        title="Fit Page"
                      >
                        Fit P
                      </button>
                      <button
                        type="button"
                        onClick={handleResetZoom}
                        className={`px-1.5 py-0.5 text-[9px] font-bold rounded hover:bg-slate-800 ${
                          zoom === 1 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                        title="100%"
                      >
                        100%
                      </button>
                      <span className="px-1 py-0.5 text-[9px] font-bold text-slate-300 font-mono">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={pageStrokes(pdfPage).length === 0}
                      className="p-1 text-red-400 hover:text-red-300 disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
                      title="Clear All Annotations"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. SAVE BUTTON ── */}
              <div className="pt-2 border-t border-slate-800 space-y-1">
                {onSaveAnnotations && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (onSaveAnnotations) await onSaveAnnotations();
                    }}
                    disabled={isSavingAnnotations}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                    title="Save Checked Copy & Annotations"
                  >
                    {isSavingAnnotations ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden md:inline">
                      {isSavingAnnotations ? 'Saving...' : 'Save Annotations'}
                    </span>
                  </button>
                )}
                <div className="text-[10px] text-slate-500 text-center font-medium">
                  {pageStrokes(pdfPage).length} mark{pageStrokes(pdfPage).length !== 1 ? 's' : ''}
                </div>
              </div>
            </aside>
          )}

          {/* ── MAIN CANVAS VIEWPORT ── */}
          <div
            className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950"
            onPointerDown={onWrapperPointerDown}
            onPointerMove={onWrapperPointerMove}
            onPointerUp={onWrapperPointerUp}
            onPointerCancel={onWrapperPointerUp}
          >
            {pdfTotalPages > 1 && (
              <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <FileText className="h-3.5 w-3.5 text-red-400" />
                  <span>PDF Document: Page {pdfPage} of {pdfTotalPages}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pdfPage - 1)}
                    disabled={pdfPage <= 1 || isProcessingPdf}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px] font-bold">
                    {pdfPage} / {pdfTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(pdfPage + 1)}
                    disabled={pdfPage >= pdfTotalPages || isProcessingPdf}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                    title="Next Page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div
              ref={containerRef}
              className="flex-1 overflow-auto bg-slate-950 p-4 relative text-center whitespace-nowrap"
              style={{ cursor: spaceHeldRef.current ? 'grab' : 'default' }}
              onWheel={onWheel}
            >
              {isProcessingPdf && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-white gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  <p className="text-xs font-semibold text-slate-300">
                    Rendering PDF page onto canvas...
                  </p>
                </div>
              )}

              <div
                ref={wrapperRef}
                className="transition-transform duration-150 relative shadow-2xl rounded-xl overflow-hidden border border-slate-700/60 bg-white inline-block align-top"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                  width: `${docWidth}px`,
                  height: `${docHeight}px`,
                  cursor: spaceHeldRef.current
                    ? 'grab'
                    : activeTool === 'pen' || activeTool === 'highlighter'
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
                <canvas
                  ref={bgCanvasRef}
                  style={{ pointerEvents: 'none' }}
                  className="absolute inset-0 block bg-white touch-none"
                />
                <canvas
                  ref={annotCanvasRef}
                  style={{ pointerEvents: 'none' }}
                  className="absolute inset-0 block bg-white touch-none"
                />
                <canvas
                  ref={activeCanvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="block bg-white touch-none"
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

                {/* Floating Text Input Box */}
                {textInputPos && (
                  <div
                    className="absolute z-30 flex items-center gap-1.5 bg-slate-900/95 p-2 rounded-xl border border-slate-700 shadow-2xl"
                    style={{
                      left: `${(textInputPos.x / docWidth) * 100}%`,
                      top: `${(textInputPos.y / docHeight) * 100}%`,
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
            </div>

            {/* Bottom Status Bar */}
            <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
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
              <span className="text-slate-500">
                {spaceHeldRef.current ? 'Space=Pan · ' : ''}
                Zoom {Math.round(zoom * 100)}%
              </span>
              {checkedCopyUrl && (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'annotate' ? 'returned' : 'annotate')}
                  className="text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2 flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  {viewMode === 'annotate' ? 'View Evaluated Copy' : 'Back to Annotating'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

HandwrittenAnnotationCanvas.displayName = 'HandwrittenAnnotationCanvas';
