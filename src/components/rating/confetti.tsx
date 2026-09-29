"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const COLORS = ["#ecd08f", "#d9a93f", "#b8893a", "#f5efe0", "#a8231a", "#1f4a8a", "#2e8b57", "#7a3fa6"];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
}

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** Человек просит уменьшить движение (настройка системы). На сервере считаем, что нет. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/** Конфетти на canvas: два залпа снизу по углам. Сам убирается через ~3,5 секунды. Без внешних библиотек. */
export function Confetti() {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;
  return <ConfettiCanvas />;
}

function ConfettiCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const pieces: Piece[] = [];
    const burst = (fromX: number, dir: 1 | -1) => {
      for (let i = 0; i < 80; i++) {
        const angle = (-Math.PI / 2) + dir * (Math.random() * 0.9);
        const speed = 9 + Math.random() * 9;
        pieces.push({
          x: fromX,
          y: h * 0.85,
          vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.6),
          vy: Math.sin(angle) * speed,
          size: 6 + Math.random() * 6,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 1,
        });
      }
    };
    burst(w * 0.12, 1);
    burst(w * 0.88, -1);

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pieces) {
        p.vy += 0.32;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life = Math.max(0, 1 - (now - started - 1800) / 1700);
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (now - started < 3600) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60] size-full" data-testid="confetti" />;
}
