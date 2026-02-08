import { useState, useRef, useCallback, RefObject } from "react";
import { Move } from "lucide-react";

interface DraggableWebcamProps {
  webcamVideoRef: RefObject<HTMLVideoElement>;
  isRecording: boolean;
}

export const DraggableWebcam = ({ webcamVideoRef, isRecording }: DraggableWebcamProps) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 148, y: window.innerHeight - 112 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 140, e.clientX - offset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 108, e.clientY - offset.current.y));
    setPosition({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 rounded-lg overflow-hidden shadow-lg border-2 border-primary cursor-grab active:cursor-grabbing select-none touch-none"
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <video
        ref={webcamVideoRef}
        autoPlay
        playsInline
        muted
        className="w-32 h-24 object-cover pointer-events-none"
      />
      {isRecording && (
        <div className="absolute top-1 left-1">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </div>
      )}
      <div className="absolute bottom-1 right-1 bg-black/50 rounded p-0.5">
        <Move className="h-3 w-3 text-white" />
      </div>
    </div>
  );
};
