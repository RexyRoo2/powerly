"use client";

import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Slide as SlideType, SlideElement } from "@/lib/schema";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/schema";
import { boxStyle, pixelDeltaToLogical } from "@/lib/coordinates";

type DragState = {
  id: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

/**
 * An editable version of a slide: click an element to select it, drag it to
 * move it, double-click a text element to edit its content. State is local
 * to this component — nothing persists yet, that's a later milestone.
 */
export default function SlideEditor({ slide: initialSlide }: { slide: SlideType }) {
  const [slide, setSlide] = useState(initialSlide);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);

  const updateElement = useCallback((id: string, patch: Record<string, unknown>) => {
    setSlide((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? ({ ...el, ...patch } as SlideElement) : el
      ),
    }));
  }, []);

  const handleElementPointerDown = (e: ReactPointerEvent, element: SlideElement) => {
    if (editingId === element.id) return; // typing — don't start a drag
    e.stopPropagation();
    setSelectedId(element.id);
    dragState.current = {
      id: element.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: element.x,
      startY: element.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    const drag = dragState.current;
    if (!drag || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { dx, dy } = pixelDeltaToLogical(
      e.clientX - drag.startClientX,
      e.clientY - drag.startClientY,
      rect.width,
      rect.height
    );
    updateElement(drag.id, { x: drag.startX + dx, y: drag.startY + dy });
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-2xl shadow-2xl"
      style={{
        aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}`,
        backgroundColor: slide.background,
        containerType: "size",
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerDown={() => {
        setSelectedId(null);
        setEditingId(null);
      }}
    >
      {slide.elements.map((element) => (
        <EditableElement
          key={element.id}
          element={element}
          selected={selectedId === element.id}
          editing={editingId === element.id}
          onPointerDown={(e) => handleElementPointerDown(e, element)}
          onDoubleClick={() => {
            if (element.type === "text") setEditingId(element.id);
          }}
          onCommitText={(content) => {
            updateElement(element.id, { content });
            setEditingId(null);
          }}
        />
      ))}
    </div>
  );
}

function EditableElement({
  element,
  selected,
  editing,
  onPointerDown,
  onDoubleClick,
  onCommitText,
}: {
  element: SlideElement;
  selected: boolean;
  editing: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
  onDoubleClick: () => void;
  onCommitText: (text: string) => void;
}) {
  const style = boxStyle(element);
  const selectionOutline = selected ? "2px solid #D97A52" : "2px solid transparent";

  switch (element.type) {
    case "text": {
      const fontFamilyVar =
        element.fontFamily === "display" ? "var(--font-display)" : "var(--font-sans)";
      const textStyle = {
        fontFamily: fontFamilyVar,
        fontSize: `${(element.fontSize / SLIDE_HEIGHT) * 100}cqh`,
        fontWeight: element.fontWeight,
        color: element.color,
        textAlign: element.align,
        lineHeight: element.lineHeight,
      } as const;

      if (editing) {
        return (
          <textarea
            autoFocus
            defaultValue={element.content}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => onCommitText(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") e.currentTarget.blur();
            }}
            style={{
              ...style,
              ...textStyle,
              background: "rgba(217, 122, 82, 0.1)",
              border: "2px solid #D97A52",
              borderRadius: 4,
              resize: "none",
              outline: "none",
              padding: 0,
            }}
          />
        );
      }

      return (
        <div
          onPointerDown={onPointerDown}
          onDoubleClick={onDoubleClick}
          style={{
            ...style,
            ...textStyle,
            whiteSpace: "pre-wrap",
            cursor: "grab",
            outline: selectionOutline,
            outlineOffset: 2,
            borderRadius: 2,
          }}
        >
          {element.content}
        </div>
      );
    }
    case "shape":
      return (
        <div
          onPointerDown={onPointerDown}
          style={{
            ...style,
            backgroundColor: element.fill,
            border: element.stroke ? `1px solid ${element.stroke}` : undefined,
            borderRadius:
              element.shape === "ellipse" ? "50%" : `${(element.radius / SLIDE_WIDTH) * 100}%`,
            cursor: "grab",
            outline: selectionOutline,
            outlineOffset: 2,
          }}
        />
      );
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          onPointerDown={onPointerDown}
          src={element.src}
          alt={element.alt}
          style={{
            ...style,
            objectFit: element.fit,
            borderRadius: `${(element.radius / SLIDE_WIDTH) * 100}%`,
            cursor: "grab",
            outline: selectionOutline,
            outlineOffset: 2,
          }}
        />
      );
    case "line":
      return (
        <div
          onPointerDown={onPointerDown}
          style={{
            ...style,
            backgroundColor: element.color,
            height: element.thickness,
            cursor: "grab",
            outline: selectionOutline,
          }}
        />
      );
    // Icon, chart, table, and group elements become editable in a later milestone.
    default:
      return null;
  }
}
