"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ru } from "@/lib/i18n/ru";

const VIEW = 280; // сторона окна обрезки, px
const OUT = 512; // сторона итогового фото, px

/**
 * Обрезка в круг: фото можно двигать пальцем/мышью и увеличивать ползунком.
 * На выходе — квадрат 512×512 (WebP), который сервер ещё раз проверяет и сжимает.
 */
export function AvatarCropper({
  file,
  onCancel,
  onDone,
}: {
  file: File | null;
  onCancel: () => void;
  onDone: (blob: Blob) => Promise<void>;
}) {
  // Новый файл — новый экземпляр: состояние (масштаб, сдвиг) сбрасывается само
  return file ? <CropperDialog key={`${file.name}-${file.size}-${file.lastModified}`} file={file} onCancel={onCancel} onDone={onDone} /> : null;
}

function CropperDialog({ file, onCancel, onDone }: { file: File; onCancel: () => void; onDone: (blob: Blob) => Promise<void> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const clampOffset = useCallback((o: { x: number; y: number }, z: number) => {
    const img = image.current;
    if (!img) return o;
    const scale = (VIEW / Math.min(img.naturalWidth, img.naturalHeight)) * z;
    const maxX = Math.max(0, (img.naturalWidth * scale - VIEW) / 2);
    const maxY = Math.max(0, (img.naturalHeight * scale - VIEW) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  }, []);

  const draw = useCallback(
    (target: HTMLCanvasElement, side: number) => {
      const img = image.current;
      const ctx = target.getContext("2d");
      if (!img || !ctx) return;
      const k = side / VIEW;
      const scale = (VIEW / Math.min(img.naturalWidth, img.naturalHeight)) * zoom * k;
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.clearRect(0, 0, side, side);
      ctx.fillStyle = "#f5efe0";
      ctx.fillRect(0, 0, side, side);
      ctx.drawImage(img, side / 2 + offset.x * k - w / 2, side / 2 + offset.y * k - h / 2, w, h);
    },
    [zoom, offset],
  );

  // Загрузка выбранного файла
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      image.current = img;
      setReady(true);
    };
    img.src = url;
    return () => {
      URL.revokeObjectURL(url);
      image.current = null;
    };
  }, [file]);

  useEffect(() => {
    if (ready && canvas.current) draw(canvas.current, VIEW);
  }, [ready, draw]);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    setOffset(clampOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }, zoom));
  }
  function onZoom(next: number) {
    setZoom(next);
    setOffset((o) => clampOffset(o, next));
  }

  async function save() {
    const out = document.createElement("canvas");
    out.width = OUT;
    out.height = OUT;
    draw(out, OUT);
    setBusy(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/webp", 0.86));
      if (blob) await onDone(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent closeLabel={ru.common.close} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{ru.profile.cropTitle}</DialogTitle>
          <DialogDescription>{ru.profile.photoHint}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative touch-none overflow-hidden rounded-md bg-black/20"
            style={{ width: VIEW, height: VIEW, maxWidth: "100%" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            data-testid="crop-area"
          >
            <canvas ref={canvas} width={VIEW} height={VIEW} className="block cursor-grab active:cursor-grabbing" style={{ width: VIEW, height: VIEW }} />
            {/* Круглое «окно»: всё за кругом затемнено */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ boxShadow: "0 0 0 9999px rgb(20 12 6 / 0.55)", border: "2px solid rgb(255 255 255 / 0.85)" }}
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )}
          </div>
          <label className="flex w-full items-center gap-3 text-sm font-bold">
            {ru.profile.cropZoom}
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => onZoom(Number(e.target.value))}
              className="h-11 flex-1 accent-[#b8893a]"
              aria-label={ru.profile.cropZoom}
              data-testid="crop-zoom"
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {ru.common.cancel}
          </Button>
          <Button onClick={save} disabled={!ready || busy} data-testid="crop-save">
            {busy && <Loader2 className="animate-spin" />}
            {ru.profile.cropSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
