// Alignment Guides - Shows visual guides and spacing measurements during drag/resize

import { useEffect, useState } from 'react';

export interface Guide {
  type: 'vertical' | 'horizontal';
  position: number;
  label?: string;
}

export interface SpacingLabel {
  x: number;
  y: number;
  value: number;
  orientation: 'horizontal' | 'vertical';
}

interface AlignmentGuidesProps {
  guides: Guide[];
  spacings: SpacingLabel[];
}

export function AlignmentGuides({ guides, spacings }: AlignmentGuidesProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {/* Render guide lines */}
      {guides.map((guide, idx) => (
        <div
          key={`guide-${idx}`}
          className="absolute bg-primary/60"
          style={
            guide.type === 'vertical'
              ? { left: guide.position, top: 0, bottom: 0, width: 1 }
              : { top: guide.position, left: 0, right: 0, height: 1 }
          }
        >
          {guide.label && (
            <div
              className="absolute bg-primary text-primary-foreground text-[9px] px-1 rounded"
              style={
                guide.type === 'vertical'
                  ? { left: 2, top: 4 }
                  : { top: 2, left: 4 }
              }
            >
              {guide.label}
            </div>
          )}
        </div>
      ))}

      {/* Render spacing measurements */}
      {spacings.map((spacing, idx) => (
        <div
          key={`spacing-${idx}`}
          className="absolute"
          style={{ left: spacing.x, top: spacing.y }}
        >
          <div className="bg-accent text-accent-foreground text-[9px] px-1.5 py-0.5 rounded font-mono shadow-sm border border-accent-foreground/20">
            {spacing.value}px
          </div>
          {spacing.orientation === 'horizontal' && (
            <>
              <div className="absolute top-1/2 left-0 w-1 h-px bg-accent-foreground/40" style={{ transform: 'translateX(-100%)' }} />
              <div className="absolute top-1/2 right-0 w-1 h-px bg-accent-foreground/40" style={{ transform: 'translateX(100%)' }} />
            </>
          )}
          {spacing.orientation === 'vertical' && (
            <>
              <div className="absolute left-1/2 top-0 h-1 w-px bg-accent-foreground/40" style={{ transform: 'translateY(-100%)' }} />
              <div className="absolute left-1/2 bottom-0 h-1 w-px bg-accent-foreground/40" style={{ transform: 'translateY(100%)' }} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function computeAlignmentGuides(
  draggedRect: { x: number; y: number; width: number; height: number },
  otherWidgets: Array<{ x: number; y: number; width: number; height: number; id: string }>,
  threshold = 5
): { guides: Guide[]; snapX: number | null; snapY: number | null; spacings: SpacingLabel[] } {
  const guides: Guide[] = [];
  const spacings: SpacingLabel[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  const draggedLeft = draggedRect.x;
  const draggedRight = draggedRect.x + draggedRect.width;
  const draggedCenterX = draggedRect.x + draggedRect.width / 2;
  const draggedTop = draggedRect.y;
  const draggedBottom = draggedRect.y + draggedRect.height;
  const draggedCenterY = draggedRect.y + draggedRect.height / 2;

  otherWidgets.forEach(widget => {
    const left = widget.x;
    const right = widget.x + widget.width;
    const centerX = widget.x + widget.width / 2;
    const top = widget.y;
    const bottom = widget.y + widget.height;
    const centerY = widget.y + widget.height / 2;

    // Vertical alignment checks
    if (Math.abs(draggedLeft - left) < threshold) {
      guides.push({ type: 'vertical', position: left, label: 'Left' });
      if (snapX === null) snapX = left;
    }
    if (Math.abs(draggedRight - right) < threshold) {
      guides.push({ type: 'vertical', position: right, label: 'Right' });
      if (snapX === null) snapX = right - draggedRect.width;
    }
    if (Math.abs(draggedCenterX - centerX) < threshold) {
      guides.push({ type: 'vertical', position: centerX, label: 'Center' });
      if (snapX === null) snapX = centerX - draggedRect.width / 2;
    }
    if (Math.abs(draggedLeft - right) < threshold) {
      guides.push({ type: 'vertical', position: right });
      if (snapX === null) snapX = right;
    }
    if (Math.abs(draggedRight - left) < threshold) {
      guides.push({ type: 'vertical', position: left });
      if (snapX === null) snapX = left - draggedRect.width;
    }

    // Horizontal alignment checks
    if (Math.abs(draggedTop - top) < threshold) {
      guides.push({ type: 'horizontal', position: top, label: 'Top' });
      if (snapY === null) snapY = top;
    }
    if (Math.abs(draggedBottom - bottom) < threshold) {
      guides.push({ type: 'horizontal', position: bottom, label: 'Bottom' });
      if (snapY === null) snapY = bottom - draggedRect.height;
    }
    if (Math.abs(draggedCenterY - centerY) < threshold) {
      guides.push({ type: 'horizontal', position: centerY, label: 'Center' });
      if (snapY === null) snapY = centerY - draggedRect.height / 2;
    }
    if (Math.abs(draggedTop - bottom) < threshold) {
      guides.push({ type: 'horizontal', position: bottom });
      if (snapY === null) snapY = bottom;
    }
    if (Math.abs(draggedBottom - top) < threshold) {
      guides.push({ type: 'horizontal', position: top });
      if (snapY === null) snapY = top - draggedRect.height;
    }

    // Spacing measurements (when widgets are close but not touching)
    const horizontalGap = Math.min(
      Math.abs(draggedRight - left),
      Math.abs(left - draggedRight),
      Math.abs(right - draggedLeft),
      Math.abs(draggedLeft - right)
    );
    
    const verticalGap = Math.min(
      Math.abs(draggedBottom - top),
      Math.abs(top - draggedBottom),
      Math.abs(bottom - draggedTop),
      Math.abs(draggedTop - bottom)
    );

    // Show horizontal spacing
    if (horizontalGap < 50 && horizontalGap > 2) {
      if (draggedRight < left && Math.abs(draggedRight - left) === horizontalGap) {
        spacings.push({
          x: (draggedRight + left) / 2,
          y: Math.max(draggedTop, top),
          value: Math.round(horizontalGap),
          orientation: 'horizontal'
        });
      } else if (right < draggedLeft && Math.abs(draggedLeft - right) === horizontalGap) {
        spacings.push({
          x: (right + draggedLeft) / 2,
          y: Math.max(draggedTop, top),
          value: Math.round(horizontalGap),
          orientation: 'horizontal'
        });
      }
    }

    // Show vertical spacing
    if (verticalGap < 50 && verticalGap > 2) {
      if (draggedBottom < top && Math.abs(draggedBottom - top) === verticalGap) {
        spacings.push({
          x: Math.max(draggedLeft, left),
          y: (draggedBottom + top) / 2,
          value: Math.round(verticalGap),
          orientation: 'vertical'
        });
      } else if (bottom < draggedTop && Math.abs(draggedTop - bottom) === verticalGap) {
        spacings.push({
          x: Math.max(draggedLeft, left),
          y: (bottom + draggedTop) / 2,
          value: Math.round(verticalGap),
          orientation: 'vertical'
        });
      }
    }
  });

  return { guides, snapX, snapY, spacings };
}
