import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon.jsx';
import './toast.css';

const ToastContext = createContext(null);

const TONE_ICON = {
  success: 'check',
  error: 'alert',
  info: 'info',
  reward: 'bean',
};

/**
 * Toasts.
 *
 * Hand-rolled rather than pulled from a library so they can match the paper
 * theme exactly and, more importantly, so the live region is right: successes
 * are announced politely, failures assertively, and the visual stack is
 * `aria-hidden` from the second copy onward to avoid double-reading.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, { tone = 'info', detail, duration = 4200 } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current.slice(-3), { id, message, detail, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      );
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (message, options) => push(message, { ...options, tone: 'success' }),
      error: (message, options) => push(message, { ...options, tone: 'error', duration: 6000 }),
      info: (message, options) => push(message, { ...options, tone: 'info' }),
      reward: (message, options) => push(message, { ...options, tone: 'reward' }),
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toaster" role="region" aria-label="Notifications">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.16 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`toast toast--${toast.tone}`}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
            >
              <span className="toast__glyph" aria-hidden="true">
                <Icon name={TONE_ICON[toast.tone] ?? 'info'} size={17} />
              </span>

              <div className="toast__body">
                <p className="toast__message">{toast.message}</p>
                {toast.detail ? <p className="toast__detail">{toast.detail}</p> : null}
              </div>

              <button
                type="button"
                className="toast__close"
                onClick={() => dismiss(toast.id)}
                aria-label={`Dismiss: ${toast.message}`}
              >
                <Icon name="close" size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
};

export default ToastContext;
