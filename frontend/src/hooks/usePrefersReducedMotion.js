import { useEffect, useState } from 'react';

/**
 * True when the operating system asks for reduced motion *or* the user has
 * turned animation off in Settings (which sets data-motion="reduced" on the
 * document element).
 *
 * Components read this to skip celebratory effects entirely rather than just
 * shortening them — a particle burst at 1ms is still a flash.
 */
export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    const os = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const inApp = document.documentElement.dataset.motion === 'reduced';
    return os || inApp;
  });

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = () => {
      setReduced(query.matches || document.documentElement.dataset.motion === 'reduced');
    };

    query.addEventListener('change', sync);

    // The in-app toggle mutates a data attribute, so watch for that too.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    return () => {
      query.removeEventListener('change', sync);
      observer.disconnect();
    };
  }, []);

  return reduced;
};

export default usePrefersReducedMotion;
