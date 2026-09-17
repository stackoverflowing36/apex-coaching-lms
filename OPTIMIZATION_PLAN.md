# HandwrittenAnnotationCanvas Refactoring Plan

## Phase 1: Core Infrastructure (High-DPI Layers)
- [x] Create layered canvas architecture (bgCanvasRef, annotCanvasRef, activeCanvasRef)
- [x] Implement high-DPI scaling (`dpr = Math.min(devicePixelRatio, 2)`)
- [x] Set up coordinate transforms (pointer → natural-pixel space)
- [x] Verified no render thrashing on pointer move

## Phase 2: Smooth Freehand Drawing
- [x] Implement midpoint quadratic Bézier interpolation (RAF loop)
- [x] Use RAF for active stroke updates
- [x] Removed setStrokes from pointer move (mutable ref only)
- [x] Tested 60 FPS drawing performance

## Phase 3: Multi-Page PDF Support
- [x] Partition strokes by page number (`Record<number, AnnotationStroke[]>`)
- [x] Implement page change handling with isolated stroke arrays
- [x] Update undo/redo per page (separate stacks per page)
- [x] Verify stroke isolation per page

## Phase 4: Pan & Zoom Controls
- [x] Add pan tool (Spacebar + drag / Hand button)
- [x] Add wheel zoom (zoom toward cursor)
- [x] Add Fit Width / Fit Page / 100% presets
- [x] Add zoom percentage display

## Phase 5: Storage Optimization
- [x] Compressed draft format (v2) storing per-page strokes
- [x] Storage quota protection (skip save if >4MB serialized)
- [x] Debounced local storage saving (500ms) with point decimation

## Phase 6: Mirror & Build Verification
- [x] Mirrored to lms-platform/src/
- [x] `npm run build` passed — 0 errors across all 20 routes
- [x] API backward compatibility verified (getExportBlob, getStrokesCount, getStrokes, clearSavedDraft)