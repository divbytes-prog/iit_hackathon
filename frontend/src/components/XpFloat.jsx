import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import './xp-float.css';

/**
 * The "+32 xp · +13" that lifts off the checkbox you just clicked.
 *
 * Positioned from the click's own coordinates rather than anchored to a
 * container, so the reward appears exactly where the attention already is.
 * Purely decorative — the same information is announced through the toast's
 * live region, so nothing is lost when this is skipped for reduced motion.
 */
const XpFloat = ({ bursts, onDone }) => {
  const reduced = usePrefersReducedMotion();
  if (reduced) return null;

  return (
    <AnimatePresence>
      {bursts.map((burst) => (
        <motion.div
          key={burst.id}
          className="xpfloat"
          style={{ left: burst.x, top: burst.y }}
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 0], y: -62, scale: [0.8, 1.08, 1, 0.96] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1], times: [0, 0.18, 0.7, 1] }}
          onAnimationComplete={() => onDone(burst.id)}
          aria-hidden="true"
        >
          <span>+{burst.xp} xp</span>
          {burst.beans ? (
            <span className="xpfloat__beans">
              <Icon name="bean" size={12} />+{burst.beans}
            </span>
          ) : null}
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

export default XpFloat;
