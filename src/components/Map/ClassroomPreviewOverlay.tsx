import { useState, useRef, useEffect } from "react";
import { X, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Preset {
  id: string;
  label: string;
  ratioW: number;
  ratioH: number;
  resolution: string;
  /** Approximate timeline bar height AT this resolution (px). */
  timelinePx: number;
}

interface FrameRect {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Scaled timeline strip height inside the frame rect (px). */
  timelineStripH: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Classroom-mode timeline height at each reference resolution.
 * ⚠️  Adjust TIMELINE_PX values to match the actual rendered height of your
 *     classroom-mode <Timeline /> component at each target resolution.
 */
const PRESETS: Preset[] = [
  { id: "16-9-1080",  label: "16 : 9  —  1080p",   ratioW: 16, ratioH: 9,  resolution: "1920 × 1080", timelinePx: 56  },
  { id: "16-9-4k",    label: "16 : 9  —  4K",       ratioW: 16, ratioH: 9,  resolution: "3840 × 2160", timelinePx: 56  },
  { id: "16-10-1200", label: "16 : 10  —  1200p",   ratioW: 16, ratioH: 10, resolution: "1920 × 1200", timelinePx: 56  },
  { id: "4-3-768",    label: "4 : 3  —  XGA",       ratioW: 4,  ratioH: 3,  resolution: "1024 × 768",  timelinePx: 56  },
  { id: "21-9-1080",  label: "21 : 9  —  Ultrawide", ratioW: 21, ratioH: 9, resolution: "2560 × 1080", timelinePx: 56  },
];

const DEFAULT_PRESET_ID = "16-9-1080";

/** Dim level applied outside the classroom frame (0–1). */
const MASK_OPACITY = 0.55;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given the editor container dimensions and the chosen preset, calculate
 * the position/size of the classroom frame rect (letterboxed, centred).
 */
function calcFrame(
  containerW: number,
  containerH: number,
  preset: Preset
): FrameRect {
  const { ratioW, ratioH, timelinePx } = preset;

  // Fit the frame inside the container while maintaining aspect ratio.
  let frameW = containerW;
  let frameH = frameW * (ratioH / ratioW);

  if (frameH > containerH) {
    frameH = containerH;
    frameW = frameH * (ratioW / ratioH);
  }

  const left = (containerW - frameW) / 2;
  const top  = (containerH - frameH) / 2;

  // Scale the timeline strip height proportionally.
  // timelinePx is the real px height at the reference resolution height.
  const referenceH = preset.ratioH === 9 && preset.ratioW === 21
    ? 1080
    : preset.ratioH === 9
    ? 1080
    : preset.ratioH === 10
    ? 1200
    : 768; // 4:3

  const timelineStripH = (timelinePx / referenceH) * frameH;

  return { left, top, width: frameW, height: frameH, timelineStripH };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Four dark panels that surround the clear frame window. */
function Mask({
  containerW,
  containerH,
  frame,
}: {
  containerW: number;
  containerH: number;
  frame: FrameRect;
}) {
  const maskStyle: React.CSSProperties = {
    background: `rgba(0,0,0,${MASK_OPACITY})`,
    position: "absolute",
    pointerEvents: "none",
  };

  return (
    <>
      {/* Top */}
      <div style={{ ...maskStyle, top: 0, left: 0, width: containerW, height: frame.top }} />
      {/* Bottom */}
      <div
        style={{
          ...maskStyle,
          top: frame.top + frame.height,
          left: 0,
          width: containerW,
          height: containerH - frame.top - frame.height,
        }}
      />
      {/* Left */}
      <div
        style={{
          ...maskStyle,
          top: frame.top,
          left: 0,
          width: frame.left,
          height: frame.height,
        }}
      />
      {/* Right */}
      <div
        style={{
          ...maskStyle,
          top: frame.top,
          left: frame.left + frame.width,
          width: containerW - frame.left - frame.width,
          height: frame.height,
        }}
      />
    </>
  );
}

/** The classroom-frame border, resolution label, and timeline danger zone. */
function Frame({
  frame,
  preset,
}: {
  frame: FrameRect;
  preset: Preset;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
        pointerEvents: "none",
        boxSizing: "border-box",
        border: "2px dashed rgba(255,255,255,0.7)",
      }}
    >
      {/* Corner label — top-left */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(4px)",
          color: "#fff",
          fontSize: 11,
          fontFamily: "monospace",
          padding: "2px 8px",
          borderBottomRightRadius: 6,
          whiteSpace: "nowrap",
          lineHeight: "20px",
        }}
      >
        <Monitor
          size={11}
          style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}
        />
        {preset.resolution}
      </div>

      {/* Aspect ratio badge — top-right */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(4px)",
          color: "#fff",
          fontSize: 11,
          fontFamily: "monospace",
          padding: "2px 8px",
          borderBottomLeftRadius: 6,
          whiteSpace: "nowrap",
          lineHeight: "20px",
        }}
      >
        {preset.ratioW} : {preset.ratioH}
      </div>

      {/* Centre crosshairs */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(255,255,255,0.2)",
          transform: "translateY(-0.5px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 1,
          background: "rgba(255,255,255,0.2)",
          transform: "translateX(-0.5px)",
        }}
      />

      {/* Timeline danger zone — bottom of frame */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: frame.timelineStripH,
          background: "rgba(239,68,68,0.25)",   // red-500 at 25 %
          borderTop: "1.5px dashed rgba(239,68,68,0.8)",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "rgba(252,165,165,0.95)",   // red-300
            fontSize: 10,
            fontFamily: "monospace",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Timeline bar
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ClassroomPreviewOverlayProps {
  /** Called when the user closes the overlay. */
  onClose: () => void;
  /**
   * The CSS selector or React ref of the map container element.
   * The overlay mounts inside this element so it covers the Mapbox canvas.
   * Defaults to measuring its own wrapper div.
   */
  containerRef?: React.RefObject<HTMLElement>;
}

export function ClassroomPreviewOverlay({
  onClose,
}: ClassroomPreviewOverlayProps) {
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET_ID);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  // Measure the overlay wrapper (which should fill the map container via
  // position:absolute + inset-0 on the parent — see usage notes below).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: width, h: height });
    });

    ro.observe(el);
    // Seed immediately
    setDims({ w: el.offsetWidth, h: el.offsetHeight });

    return () => ro.disconnect();
  }, []);

  const preset = PRESETS.find((p) => p.id === selectedPresetId) ?? PRESETS[0];
  const frame = dims.w > 0 ? calcFrame(dims.w, dims.h, preset) : null;

  return (
    /**
     * USAGE: Render this component inside a `position: relative` wrapper that
     * exactly covers the Mapbox canvas. The simplest pattern:
     *
     *   <div style={{ position: "relative" }}>
     *     <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
     *     {previewOpen && (
     *       <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
     *         <ClassroomPreviewOverlay onClose={() => setPreviewOpen(false)} />
     *       </div>
     *     )}
     *   </div>
     *
     * The toolbar / close button inside this component re-enables pointer events
     * only on itself, so the map remains fully interactive underneath.
     */
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Mask panels */}
      {frame && (
        <Mask containerW={dims.w} containerH={dims.h} frame={frame} />
      )}

      {/* Frame border + annotations */}
      {frame && <Frame frame={frame} preset={preset} />}

      {/* Floating toolbar — pointer events re-enabled */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(15,15,15,0.82)",
          backdropFilter: "blur(8px)",
          borderRadius: 8,
          padding: "6px 10px",
          pointerEvents: "auto",
          zIndex: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        }}
      >
        <Monitor size={14} color="#9ca3af" />
        <span
          style={{
            color: "#d1d5db",
            fontSize: 12,
            fontFamily: "monospace",
            marginRight: 4,
            whiteSpace: "nowrap",
          }}
        >
          Classroom preview
        </span>

        <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
          <SelectTrigger
            style={{
              height: 28,
              fontSize: 12,
              minWidth: 180,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#f9fafb",
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          style={{
            height: 28,
            width: 28,
            color: "#9ca3af",
          }}
          title="Close classroom preview"
        >
          <X size={14} />
        </Button>
      </div>

      {/* Legend — bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          background: "rgba(15,15,15,0.75)",
          backdropFilter: "blur(6px)",
          borderRadius: 6,
          padding: "6px 10px",
          pointerEvents: "none",
          fontSize: 10,
          fontFamily: "monospace",
          color: "#9ca3af",
          lineHeight: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 2,
              borderTop: "1.5px dashed rgba(255,255,255,0.6)",
            }}
          />
          Classroom frame
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 8,
              background: "rgba(239,68,68,0.35)",
              borderTop: "1.5px dashed rgba(239,68,68,0.8)",
            }}
          />
          Timeline bar area
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 8,
              background: `rgba(0,0,0,${MASK_OPACITY})`,
            }}
          />
          Outside classroom view
        </div>
      </div>
    </div>
  );
}
