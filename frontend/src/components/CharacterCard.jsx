import { motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import './character-card.css';

const RING_SIZE = 108;
const RING_STROKE = 7;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The character card — the first thing on the desk and the anchor of the
 * whole interface.
 *
 * The ring is a single SVG circle animated by `stroke-dashoffset`, which the
 * compositor can handle on its own thread; the alternative (redrawing an arc
 * path every frame) stutters on a mid-range phone.
 */
const CharacterCard = ({ snapshot, username, equipped = {}, badgeCount = 0 }) => {
  const reduced = usePrefersReducedMotion();
  const character = snapshot?.character;

  const beans = useCountUp(character?.beans ?? 0);
  const xp = useCountUp(character?.xp ?? 0);

  const percent = character?.percent ?? 0;
  const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
  const remaining = Math.max(0, (character?.xpToNext ?? 0) - (character?.xp ?? 0));

  return (
    <section className="charcard" aria-labelledby="charcard-title">
      <div className="charcard__ringwrap">
        <svg
          className="charcard__ring"
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          aria-hidden="true"
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--paper-sunk)"
            strokeWidth={RING_STROKE}
          />
          <motion.circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--terracotta)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={
              reduced ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 20 }
            }
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </svg>

        <div className="charcard__level">
          <span className="charcard__level-word">Chapter</span>
          <span className="charcard__level-num numeral">{character?.level ?? 1}</span>
        </div>
      </div>

      <div className="charcard__detail">
        <p className="eyebrow">{username}</p>
        <h2 id="charcard-title" className="charcard__title">
          {character?.title ?? 'Kettle Novice'}
        </h2>

        <div className="charcard__xp">
          <div
            className="charcard__bar"
            role="progressbar"
            aria-valuenow={character?.xp ?? 0}
            aria-valuemin={0}
            aria-valuemax={character?.xpToNext ?? 100}
            aria-label={`Experience toward chapter ${(character?.level ?? 1) + 1}`}
          >
            <motion.span
              className="charcard__bar-fill"
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={
                reduced ? { duration: 0 } : { type: 'spring', stiffness: 110, damping: 22 }
              }
            />
          </div>

          <p className="charcard__xp-text">
            <span className="numeral">{xp}</span>
            <span className="charcard__xp-sep"> / </span>
            <span className="numeral">{character?.xpToNext ?? 0}</span>
            <span className="charcard__xp-label"> xp</span>
            <span className="charcard__xp-rest">
              {remaining > 0 ? `${remaining} to go` : 'ready to turn the page'}
            </span>
          </p>
        </div>

        <dl className="charcard__meta">
          <div className="charcard__meta-item">
            <dt>
              <Icon name="bean" size={15} />
              <span className="visually-hidden">Beans</span>
            </dt>
            <dd className="numeral">{beans}</dd>
          </div>

          {equipped?.mug ? (
            <div className="charcard__meta-item" title="Equipped mug">
              <dt>
                <Icon name="mug" size={15} />
                <span className="visually-hidden">Mug</span>
              </dt>
              <dd className="charcard__meta-word">on the desk</dd>
            </div>
          ) : null}

          {badgeCount > 0 ? (
            <div className="charcard__meta-item">
              <dt>
                <Icon name="sparkle" size={15} />
                <span className="visually-hidden">Badges</span>
              </dt>
              <dd className="numeral">{badgeCount}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
};

export default CharacterCard;
