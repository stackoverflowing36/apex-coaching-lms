# HandwrittenAnnotationCanvas Refactoring Plan

## Phase 1: Core Infrastructure (High-DPI Layers)
- [ ] Create layered canvas architecture
- [ ] Implement high-DPI scaling
- [ ] Set up coordinate transforms
- [ ] Verify no render thrashing on pointer move

## Phase 2: Smooth Freehand Drawing
- [ ] Implement midpoint quadratic Bézier interpolation
- [ ] Use RAF for active stroke updates
- [ ] Remove setStrokes from pointer move
- [ ] Test 60 FPS drawing performance

## Phase 3: Multi-Page PDF Support
- [ ] Partition strokes by page number
- [ ] Implement page change handling
- [ ] Update undo/redo per page
- [ ] Verify stroke isolation per page

## Phase 4: Pan & Zoom Controls
- [ ] Add pan tool (Space + drag)
- [ ] Add wheel zoom
- [ ] Add fit-to-width / fit-to-page
- [ ] Add zoom percentage display

## Phase 5: Storage Optimization
- [ ] Implement compressed draft format (v2)
- [ ] Add storage quota protection
- [ ] Test localStorage boundary conditions

## Phase 6: Mirror & Build Verification
- [ ] Mirror changes to lms-platform/src/
- [ ] Run `npm run build` in lms-platform/
- [ ] Fix any TypeScript errors
- [ ] Verify backward API compatibility