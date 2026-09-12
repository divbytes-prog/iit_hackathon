import { motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import './streak-hearth.css';

/**
 * The streak, drawn as a mug that is either steaming, cooling or cold.
 *
 * The three states are honest rather than flattering: a streak that has
 * already lapsed says so instead of showing a number that is no longer true.
 * The copy underneath changes with the state, which is what makes it feel
 * like a room reacting rather than a counter incrementing.
 */
const COPY = {
  lit: {
    heading: 'The hearth is lit',
    line: 'You have kept it going today.',
  },
  'at-risk': {
    heading: 'Still warm',
    line: 'Finish one thing today to keep it.',
  },
  cold: {
    heading: 'Gone cold',
    line: 'Finish anything to light it again.',
  },
};

const StreakHearth = ({ streak }) => {
  const reduced = usePrefersReducedMotion();
  if (!streak) return null;

  const state = streak.state ?? 'cold';
  const copy = COPY[state] ?? COPY.cold;
  const days = streak.current ?? 0;

  return (
    <section className={`hearth hearth--${state}`} aria-labelledby="hearth-heading">
      <div className="hearth__art" aria-hidden="true">
        {/* Steam only when the streak is actually alive. */}
        {state !== 'cold' && !reduced ? (
          <div className="hearth__steam">
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="hearth__steam-wisp"
                animate={{
                  y: [-2, -20],
                  x: [0, index === 1 ? 4 : -3, 0],
                  opacity: [0, 0.6, 0],
                  scale: [0.8, 1.25],
                }}
                transition={{
                  duration: 3.2 + index * 0.5,
                  repeat: Infinity,
                  delay: index * 0.9,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        ) : null}

        <span className="hearth__mug">
          <Icon name={state === 'cold' ? 'mug' : 'flame'} size={30} strokeWidth={1.5} />
        </span>
      </div>

      <div className="hearth__body">
        <p className="eyebrow" id="hearth-heading">
          {copy.heading}
        </p>

        <p className="hearth__count">
          <span className="hearth__days numeral">{days}</span>
          <span className="hearth__unit">{days === 1 ? 'day' : 'days'}</span>
        </p>

        <p className="hearth__line">{streak.lapsed ? 'That run has ended.' : copy.line}</p>

        <div className="hearth__facts">
          <span title="Your longest run">
            best <strong className="numeral">{streak.longest ?? 0}</strong>
          </span>
          {streak.freezes > 0 ? (
            <span className="hearth__freeze" title="Dented Thermoses in reserve">
              <Icon name="thermos" size={13} />
              <strong className="numeral">{streak.freezes}</strong>
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default StreakHearth;
