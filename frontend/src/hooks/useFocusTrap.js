import { useEffect } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab inside a dialog and restores focus to whatever opened it.
 *
 * Without this, tabbing out of a modal lands on the page behind it — which is
 * invisible to a sighted mouse user and completely disorienting to anyone
 * relying on the keyboard.
 */
export const useFocusTrap = (ref, active, onEscape) => {
  useEffect(() => {
    if (!active || !ref.current) return undefined;

    const node = ref.current;
    const previouslyFocused = document.activeElement;

    const focusFirst = () => {
      const targets = node.querySelectorAll(FOCUSABLE);
      (targets[0] ?? node).focus?.();
    };

    // Wait a frame so the element is painted and focusable.
    const raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const targets = [...node.querySelectorAll(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null
      );
      if (targets.length === 0) return;

      const first = targets[0];
      const last = targets[targets.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [ref, active, onEscape]);
};

export default useFocusTrap;
