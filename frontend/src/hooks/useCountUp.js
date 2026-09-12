import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

/**
 * Animates a number toward its new value.
 *
 * Used for beans and XP, where a figure that silently swaps from 84 to 97
 * reads as a glitch, and one that rolls up reads as a reward. Eases out so the
 * last few units land slowly.
 */
export const useCountUp = (target, { duration = 700 } = {}) => {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(target ?? 0);
  const frame = useRef(null);
  const from = useRef(target ?? 0);

  useEffect(() => {
    const to = Number(target) || 0;

    if (reduced || from.current === to) {
      setDisplay(to);
      from.current = to;
      return undefined;
    }

    const start = performance.now();
    const origin = from.current;
    const delta = to - origin;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(origin + delta * eased));

      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        from.current = to;
      }
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      from.current = to;
    };
  }, [target, duration, reduced]);

  return display;
};

export default useCountUp;
