import { motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { ATTRIBUTES, attributeColor } from '../utils/domain.js';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import './attribute-bars.css';

/**
 * The five attributes as labelled progress bars.
 *
 * Each is a real `<progressbar>` with min/max/now, so a screen reader reads
 * "Mind, level 4, 62 of 130 experience" rather than announcing a decorative
 * div. The colour is carried in a custom property so the icon chip, the fill
 * and the level badge all tint together from one value.
 */
const AttributeBars = ({ attributes, heading = 'Attributes', highlight = null }) => {
  const reduced = usePrefersReducedMotion();
  if (!attributes) return null;

  const entries = Object.entries(ATTRIBUTES).map(([key, meta]) => ({
    ...meta,
    ...(attributes[key] ?? { level: 1, xp: 0, xpToNext: 75, percent: 0 }),
    key,
  }));

  return (
    <section className="attrs" aria-labelledby="attrs-heading">
      <div className="attrs__head">
        <h3 className="attrs__title" id="attrs-heading">
          {heading}
        </h3>
        <p className="eyebrow">what grows</p>
      </div>

      <dl className="attrs__list">
        {entries.map((entry) => (
          <div
            key={entry.key}
            className="attr"
            style={{ '--attr-hue': attributeColor(entry.key) }}
            data-highlight={highlight === entry.key ? 'true' : undefined}
          >
            <dt className="attr__icon" title={entry.blurb}>
              <Icon name={entry.icon} size={15} />
              <span className="visually-hidden">{entry.label}</span>
            </dt>

            <dd className="attr__main">
              <div className="attr__label-row">
                <span className="attr__label">{entry.label}</span>
                <span className="attr__xp numeral">
                  {entry.xp} / {entry.xpToNext}
                </span>
              </div>

              <div
                className="attr__bar"
                role="progressbar"
                aria-valuenow={entry.xp}
                aria-valuemin={0}
                aria-valuemax={entry.xpToNext}
                aria-label={`${entry.label}, level ${entry.level}`}
              >
                <motion.span
                  className="attr__bar-fill"
                  initial={false}
                  animate={{ width: `${entry.percent}%` }}
                  transition={
                    reduced ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 24 }
                  }
                />
              </div>
            </dd>

            <span className="attr__level numeral" aria-hidden="true">
              {entry.level}
            </span>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default AttributeBars;
