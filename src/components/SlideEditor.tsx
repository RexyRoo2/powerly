"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Slide as SlideType, SlideElement, Theme } from "@/lib/schema";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/schema";
import { boxStyle, pixelDeltaToLogical } from "@/lib/coordinates";
import { THEMES, resolveColor } from "@/lib/themes";
import ChartGraphic from "./ChartGraphic";
import TableGraphic from "./TableGraphic";

type DragState = {
  id: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

/**
 * An editable version of a slide: click an element to select it, drag it to
 * move it, double-click a text element to edit its content.
 *
 * Controlled component — the slide's content lives in the parent (so it
 * survives switching to another slide and back); this component only owns
 * transient UI state (what's selected, what's being edited, the in-flight
 * drag).
 */
export default function SlideEditor({
  slide,
  theme,
  onChange,
}: {
  slide: SlideType;
  theme: Theme;
  onChange: (slide: SlideType) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);

  const updateElement = (id: string, patch: Record<string, unknown>) => {
    onChange({
      ...slide,
      elements: slide.elements.map((el) =>
        el.id === id ? ({ ...el, ...patch } as SlideElement) : el
      ),
    });
  };

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
        backgroundColor: resolveColor(slide.background, theme),
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
          theme={theme}
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
  theme,
  selected,
  editing,
  onPointerDown,
  onDoubleClick,
  onCommitText,
}: {
  element: SlideElement;
  theme: Theme;
  selected: boolean;
  editing: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
  onDoubleClick: () => void;
  onCommitText: (text: string) => void;
}) {
  const style = boxStyle(element);
  const tokens = THEMES[theme];
  // Selection chrome is a Powerly editor affordance, not part of the slide's
  // own design — it stays brand-clay regardless of the active slide theme.
  const selectionOutline = selected ? "2px solid #D97A52" : "2px solid transparent";

  switch (element.type) {
    case "text": {
      const fontFamilyVar = element.fontFamily === "display" ? tokens.fontDisplay : tokens.fontBody;
      const textStyle = {
        fontFamily: fontFamilyVar,
        fontSize: `${(element.fontSize / SLIDE_HEIGHT) * 100}cqh`,
        fontWeight: element.fontWeight,
        color: resolveColor(element.color, theme),
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
    case "shape": {
      const fill = resolveColor(element.fill, theme);
      const stroke = element.stroke ? resolveColor(element.stroke, theme) : undefined;
      return (
        <div
          onPointerDown={onPointerDown}
          style={{
            ...style,
            backgroundColor: fill,
            border: stroke ? `1px solid ${stroke}` : undefined,
            borderRadius:
              element.shape === "ellipse" ? "50%" : `${(element.radius / SLIDE_WIDTH) * 100}%`,
            cursor: "grab",
            outline: selectionOutline,
            outlineOffset: 2,
          }}
        />
      );
    }
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
            backgroundColor: resolveColor(element.color, theme),
            height: element.thickness,
            cursor: "grab",
            outline: selectionOutline,
          }}
        />
      );
    case "chart":
      return (
        <div onPointerDown={onPointerDown} style={{ ...style, cursor: "grab", outline: selectionOutline, outlineOffset: 2 }}>
          <ChartGraphic element={element} theme={theme} />
        </div>
      );
    case "table":
      return (
        <div onPointerDown={onPointerDown} style={{ ...style, cursor: "grab", outline: selectionOutline, outlineOffset: 2 }}>
          <TableGraphic element={element} theme={theme} />
        </div>
      );
    // Icon and group elements become editable in a later milestone.
    default:
      return null;
  }
}
