import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import './level-up.css';

/**
 * "A new chapter" — the level-up celebration.
 *
 * Deliberately brief and dismissable: a modal that hijacks the screen for four
 * seconds is charming once and infuriating by the tenth time. It closes on
 * click, on Escape, and on its own after a moment.
 *
 * With reduced motion on, the same information arrives as a still card with no
 * drift, no particles and no scale — the reward is not withheld, only the
 * movement.
 */
const SEEDS = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  x: (index * 37) % 100,
  delay: (index % 7) * 0.055,
  drift: ((index % 5) - 2) * 16,
  size: 5 + ((index * 3) % 6),
}));

const LevelUpCurtain = ({ event, onClose }) => {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!event) return undefined;
    const timer = setTimeout(onClose, 3600);
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [event, onClose]);

  const seeds = useMemo(() => SEEDS, []);

  return (
    <AnimatePresence>
      {event ? (
        <motion.div
          className="levelup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="levelup-title"
          aria-describedby="levelup-desc"
        >
          <motion.div
            className="levelup__card"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.86, rotateX: -22 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
            transition={
              reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 22 }
            }
          >
            {/* Coffee beans, tossed. Skipped entirely under reduced motion. */}
            {!reduced ? (
              <div className="levelup__beans" aria-hidden="true">
                {seeds.map((seed) => (
                  <motion.span
                    key={seed.id}
                    className="levelup__bean"
                    style={{ left: `${seed.x}%`, width: seed.size, height: seed.size * 1.4 }}
                    initial={{ y: 0, opacity: 0, rotate: 0 }}
                    animate={{
                      y: [-10, -130 - seed.size * 4],
                      x: [0, seed.drift],
                      opacity: [0, 1, 0],
                      rotate: seed.drift * 9,
                    }}
                    transition={{ duration: 1.5, delay: seed.delay, ease: 'easeOut' }}
                  />
                ))}
              </div>
            ) : null}

            <span className="levelup__seal" aria-hidden="true">
              <Icon name="sparkle" size={22} />
            </span>

            <p className="eyebrow levelup__eyebrow">A new chapter</p>

            <h2 id="levelup-title" className="levelup__num numeral">
              {event.level}
            </h2>

            <p id="levelup-desc" className="levelup__title">
              {event.title}
            </p>

            <p className="levelup__hint">Click anywhere to carry on</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default LevelUpCurtain;
