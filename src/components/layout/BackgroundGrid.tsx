'use client';

import React from 'react';

/**
 * Subtle tech-grid background with intersecting lines and dot nodes.
 * Creates the "connected" tech feel from the reference design.
 */
export function BackgroundGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(226, 232, 240, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(226, 232, 240, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Dot nodes at intersections */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(148, 163, 184, 0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Radial fade from center to keep hero area clean */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(255,255,255,0.8) 70%, white 100%)',
        }}
      />
    </div>
  );
}

/**
 * A softer version for portal pages (less prominent grid).
 */
export function BackgroundGridSubtle() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(226, 232, 240, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(226, 232, 240, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(148, 163, 184, 0.15) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  );
}
