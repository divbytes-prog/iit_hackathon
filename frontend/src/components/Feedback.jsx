import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import './feedback.css';

/* ==========================================================================
   Loading, empty, error and confirmation states.

   These four are the difference between an app that feels finished and one
   that feels like a demo — most of the time a user spends in an unusual state
   is spent in one of them.
   ========================================================================== */

/** A single shimmering block. Sizes are passed so layout does not jump. */
export const Skeleton = ({ width = '100%', height = 14, radius = 'var(--r-sm)', style }) => (
  <span
    className="skeleton"
    style={{ display: 'block', width, height, borderRadius: radius, ...style }}
    aria-hidden="true"
  />
);

/**
 * A placeholder shaped like the intention list it is standing in for, so the
 * page does not reflow when real data lands.
 */
export const IntentionSkeleton = ({ count = 4 }) => (
  <ul className="skelist" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <li key={index} className="skelist__row">
        <Skeleton width={23} height={23} radius="7px" />
        <div className="skelist__lines">
          <Skeleton width={`${58 + ((index * 13) % 30)}%`} height={15} />
          <div className="skelist__chips">
            <Skeleton width={62} height={16} radius="var(--r-round)" />
            <Skeleton width={54} height={16} radius="var(--r-round)" />
          </div>
        </div>
      </li>
    ))}
  </ul>
);

export const CardSkeleton = ({ height = 160 }) => (
  <div className="card" style={{ padding: 'var(--s-5)' }} aria-hidden="true">
    <Skeleton height={height} radius="var(--r-md)" />
  </div>
);

/** Announces that something is loading, for anyone who cannot see the shimmer. */
export const LoadingRegion = ({ label = 'Loading', children }) => (
  <div role="status" aria-live="polite" aria-busy="true">
    <span className="visually-hidden">{label}</span>
    {children}
  </div>
);

/**
 * The empty state. Every list in the app has one, with copy specific to what
 * is missing and, where it helps, a button that fixes it.
 */
export const EmptyState = ({ icon = 'scroll', title, children, action }) => (
  <div className="empty">
    <span className="empty__icon" aria-hidden="true">
      <Icon name={icon} size={26} strokeWidth={1.4} />
    </span>
    <h3 className="empty__title">{title}</h3>
    {children ? <p className="empty__body">{children}</p> : null}
    {action ? <div className="empty__action">{action}</div> : null}
  </div>
);

/**
 * The failure state. Shows what went wrong in plain words and, crucially,
 * offers a retry — a dead end with a red icon is not an error state.
 */
export const ErrorState = ({ title = 'That did not work', children, onRetry }) => (
  <div className="errstate" role="alert">
    <span className="errstate__icon" aria-hidden="true">
      <Icon name="alert" size={22} />
    </span>
    <div className="errstate__body">
      <h3 className="errstate__title">{title}</h3>
      {children ? <p className="errstate__text">{children}</p> : null}
    </div>
    {onRetry ? (
      <button type="button" className="btn btn--sm" onClick={onRetry}>
        <Icon name="undo" size={14} />
        Try again
      </button>
    ) : null}
  </div>
);

/**
 * A confirmation dialog with a real focus trap.
 *
 * Used for deletion, which is the only destructive action in the app. Escape
 * and the backdrop both cancel; focus returns to the control that opened it.
 */
export const ConfirmDialog = ({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  cancelLabel = 'Keep it',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const panel = useRef(null);
  useFocusTrap(panel, open, onCancel);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="confirm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
        >
          <motion.div
            ref={panel}
            className="confirm__panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={body ? 'confirm-body' : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <h2 id="confirm-title" className="confirm__title">
              {title}
            </h2>

            {body ? (
              <p id="confirm-body" className="confirm__body">
                {body}
              </p>
            ) : null}

            <div className="confirm__actions">
              <button type="button" className="btn" onClick={onCancel} disabled={busy}>
                {cancelLabel}
              </button>
              <button
                type="button"
                className={`btn ${tone === 'danger' ? 'confirm__destroy' : 'btn--primary'}`}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? 'Working…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default { Skeleton, IntentionSkeleton, EmptyState, ErrorState, ConfirmDialog };
