"use client";

import { useEffect, useRef } from "react";

/**
 * Число «набегает» от 0 до значения. Итоговый текст сразу в разметке (data-value и содержимое):
 * без JavaScript и при prefers-reduced-motion человек видит готовое число, без мерцания.
 */
export function CountUp({
  value,
  decimals = 1,
  duration = 1000,
  className,
  ...rest
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
} & Omit<React.ComponentProps<"span">, "children">) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = value.toFixed(decimals);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now() + 200; // после появления карточки
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (value * eased).toFixed(decimals);
      if (t < 1) frame = requestAnimationFrame(tick);
      else el.textContent = final;
    };
    el.textContent = (0).toFixed(decimals);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.textContent = final;
    };
  }, [value, decimals, duration, final]);

  return (
    <span ref={ref} className={className} data-value={final} {...rest}>
      {final}
    </span>
  );
}
