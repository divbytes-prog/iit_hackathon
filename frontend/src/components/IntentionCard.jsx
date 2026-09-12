import { memo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { ATTRIBUTES, DIFFICULTIES, attributeColor, dueState, isDone } from '../utils/domain.js';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import './intention-card.css';

/**
 * One intention.
 *
 * The checkbox is the most important 36 pixels in the application, so it gets
 * the most attention: a real `<button>` with `aria-pressed`, a spring that
 * overshoots slightly on press, and an SVG tick that draws itself along its
 * own path rather than fading in. Finishing something should feel like a
 * physical act.
 */
const IntentionCard = memo(
  ({ task, onComplete, onReopen, onEdit, onDelete, busy = false, index = 0 }) => {
    const reduced = usePrefersReducedMotion();
    const [pressed, setPressed] = useState(false);

    const done = isDone(task);
    const attribute = ATTRIBUTES[task.attribute] ?? ATTRIBUTES.order;
    const difficulty = DIFFICULTIES[task.difficulty] ?? DIFFICULTIES.easy;
    const due = dueState(task.dueDate);

    const toggle = () => {
      if (busy) return;
      setPressed(true);
      setTimeout(() => setPressed(false), 320);
      if (done) onReopen?.(task);
      else onComplete?.(task);
    };

    return (
      <motion.li
        layout={!reduced}
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, x: 28, scale: 0.97, transition: { duration: 0.2 } }
        }
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 34,
          delay: reduced ? 0 : Math.min(index * 0.028, 0.22),
        }}
        className={`intent ${done ? 'intent--done' : ''} ${busy ? 'intent--busy' : ''}`}
        style={{ '--attr-hue': attributeColor(task.attribute) }}
      >
        {/* --- the check ------------------------------------------------- */}
        <button
          type="button"
          className="intent__check"
          onClick={toggle}
          aria-pressed={done}
          aria-label={
            done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`
          }
          disabled={busy}
        >
          <motion.span
            className="intent__check-box"
            animate={
              reduced
                ? {}
                : { scale: pressed ? 0.82 : 1, rotate: pressed && !done ? -6 : 0 }
            }
            transition={{ type: 'spring', stiffness: 640, damping: 16 }}
          >
            <AnimatePresence initial={false}>
              {done ? (
                <motion.svg
                  key="tick"
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                >
                  <motion.path
                    d="M4.5 12.6 9.2 17.4 19.6 6.8"
                    initial={reduced ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                  />
                </motion.svg>
              ) : null}
            </AnimatePresence>
          </motion.span>
        </button>

        {/* --- the content ----------------------------------------------- */}
        <div className="intent__body">
          <p className="intent__title">{task.title}</p>

          {task.notes ? <p className="intent__notes">{task.notes}</p> : null}

          <div className="intent__tags">
            <span className="intent__chip intent__chip--attr">
              <Icon name={attribute.icon} size={12} />
              {attribute.label}
            </span>

            <span
              className="intent__chip intent__chip--diff"
              title={`${difficulty.xp} xp · ${difficulty.beans} beans`}
            >
              <span className="intent__pips" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((pip) => (
                  <i
                    key={pip}
                    className={pip <= Object.keys(DIFFICULTIES).indexOf(task.difficulty) ? 'on' : ''}
                  />
                ))}
              </span>
              {difficulty.label}
            </span>

            {task.recurrence !== 'none' ? (
              <span className="intent__chip intent__chip--repeat">
                <Icon name="repeat" size={12} />
                {task.recurrence === 'daily' ? 'Daily' : 'Weekly'}
              </span>
            ) : null}

            {due ? (
              <span className={`intent__chip intent__chip--due intent__chip--${due.tone}`}>
                <Icon name="clock" size={12} />
                {due.label}
              </span>
            ) : null}

            {done && task.xpAwarded > 0 ? (
              <span className="intent__chip intent__chip--earned">
                +<span className="numeral">{task.xpAwarded}</span> xp
              </span>
            ) : null}

            {task.tags?.map((tag) => (
              <span key={tag} className="intent__chip intent__chip--tag">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* --- the controls ---------------------------------------------- */}
        <div className="intent__actions">
          <button
            type="button"
            className="btn btn--ghost btn--icon intent__action"
            onClick={() => onEdit?.(task)}
            aria-label={`Edit "${task.title}"`}
          >
            <Icon name="pencil" size={15} />
          </button>

          <button
            type="button"
            className="btn btn--ghost btn--icon intent__action intent__action--danger"
            onClick={() => onDelete?.(task)}
            aria-label={`Delete "${task.title}"`}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </motion.li>
    );
  }
);

IntentionCard.displayName = 'IntentionCard';

export default IntentionCard;
