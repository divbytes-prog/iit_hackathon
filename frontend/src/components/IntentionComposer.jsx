import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { ATTRIBUTE_LIST, DIFFICULTY_LIST, attributeColor } from '../utils/domain.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import './composer.css';

const BLANK = {
  title: '',
  notes: '',
  attribute: 'mind',
  difficulty: 'easy',
  recurrence: 'none',
  dueDate: '',
};

/**
 * The create / edit sheet.
 *
 * Validation runs on the client purely so the user gets an instant answer —
 * the server validates everything again and is the only opinion that counts.
 * Server-side field errors are merged into the same `errors` object, so a
 * message looks identical whether it came from here or from the API.
 */
const IntentionComposer = ({ open, initial, onSubmit, onClose, busy = false }) => {
  const panel = useRef(null);
  const titleInput = useRef(null);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});

  useFocusTrap(panel, open, onClose);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      initial
        ? {
            title: initial.title ?? '',
            notes: initial.notes ?? '',
            attribute: initial.attribute ?? 'mind',
            difficulty: initial.difficulty ?? 'easy',
            recurrence: initial.recurrence ?? 'none',
            dueDate: initial.dueDate ? initial.dueDate.slice(0, 10) : '',
          }
        : BLANK
    );
    // Put the cursor in the title straight away — the whole point of the sheet.
    setTimeout(() => titleInput.current?.focus(), 60);
  }, [open, initial]);

  const set = (key) => (event) => {
    const value = event?.target?.value ?? event;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    const title = form.title.trim();
    if (!title) next.title = 'Give the intention a name.';
    else if (title.length > 140) next.title = 'Keep the name under 140 characters.';
    if (form.notes.length > 2000) next.notes = 'Notes top out at 2000 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy || !validate()) return;

    const payload = {
      title: form.title.trim(),
      attribute: form.attribute,
      difficulty: form.difficulty,
      recurrence: form.recurrence,
      notes: form.notes.trim(),
      dueDate: form.dueDate ? new Date(`${form.dueDate}T12:00:00`).toISOString() : null,
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      // Surface per-field messages from the API next to the right input.
      const fields = error?.fieldErrors ?? {};
      setErrors(Object.keys(fields).length ? fields : { _: error.message });
    }
  };

  const preview = DIFFICULTY_LIST.find((d) => d.key === form.difficulty);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="composer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            ref={panel}
            className="composer__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="composer-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            <header className="composer__head">
              <h2 id="composer-title" className="composer__title">
                {initial ? 'Edit intention' : 'New intention'}
              </h2>
              <button
                type="button"
                className="btn btn--ghost btn--icon"
                onClick={onClose}
                aria-label="Close"
              >
                <Icon name="close" size={16} />
              </button>
            </header>

            <form className="composer__form" onSubmit={submit} noValidate>
              {/* --- title ------------------------------------------------ */}
              <div className="field">
                <label className="field__label" htmlFor="c-title">
                  What do you mean to do?
                </label>
                <input
                  ref={titleInput}
                  id="c-title"
                  className="input"
                  value={form.title}
                  onChange={set('title')}
                  placeholder="Read one chapter"
                  maxLength={140}
                  autoComplete="off"
                  aria-invalid={errors.title ? 'true' : undefined}
                  aria-describedby={errors.title ? 'c-title-err' : undefined}
                  required
                />
                {errors.title ? (
                  <p className="field__error" id="c-title-err">
                    <Icon name="alert" size={13} />
                    {errors.title}
                  </p>
                ) : null}
              </div>

              {/* --- attribute -------------------------------------------- */}
              <fieldset className="composer__group">
                <legend className="field__label">What does it grow?</legend>
                <div className="composer__attrs" role="radiogroup" aria-label="Attribute">
                  {ATTRIBUTE_LIST.map((attribute) => (
                    <button
                      key={attribute.key}
                      type="button"
                      role="radio"
                      aria-checked={form.attribute === attribute.key}
                      className={`composer__attr ${
                        form.attribute === attribute.key ? 'is-on' : ''
                      }`}
                      style={{ '--attr-hue': attributeColor(attribute.key) }}
                      onClick={() => set('attribute')(attribute.key)}
                      title={attribute.blurb}
                    >
                      <Icon name={attribute.icon} size={17} />
                      <span>{attribute.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* --- difficulty ------------------------------------------- */}
              <fieldset className="composer__group">
                <legend className="field__label">
                  How much of a lift?
                  <span className="composer__preview">
                    worth <strong className="numeral">{preview?.xp}</strong> xp ·{' '}
                    <strong className="numeral">{preview?.beans}</strong> beans
                  </span>
                </legend>
                <div className="composer__diffs" role="radiogroup" aria-label="Difficulty">
                  {DIFFICULTY_LIST.map((difficulty) => (
                    <button
                      key={difficulty.key}
                      type="button"
                      role="radio"
                      aria-checked={form.difficulty === difficulty.key}
                      className={`composer__diff ${
                        form.difficulty === difficulty.key ? 'is-on' : ''
                      }`}
                      onClick={() => set('difficulty')(difficulty.key)}
                      title={difficulty.hint}
                    >
                      {difficulty.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* --- extras ------------------------------------------------ */}
              <div className="composer__pair">
                <div className="field">
                  <label className="field__label" htmlFor="c-repeat">
                    Repeats
                  </label>
                  <select
                    id="c-repeat"
                    className="select"
                    value={form.recurrence}
                    onChange={set('recurrence')}
                  >
                    <option value="none">Just once</option>
                    <option value="daily">Every day</option>
                    <option value="weekly">Every week</option>
                  </select>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="c-due">
                    Due <span className="field__hint">optional</span>
                  </label>
                  <input
                    id="c-due"
                    type="date"
                    className="input"
                    value={form.dueDate}
                    onChange={set('dueDate')}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="c-notes">
                  Notes <span className="field__hint">optional</span>
                </label>
                <textarea
                  id="c-notes"
                  className="textarea"
                  value={form.notes}
                  onChange={set('notes')}
                  placeholder="Anything worth remembering about it."
                  maxLength={2000}
                  rows={3}
                />
              </div>

              {errors._ ? (
                <p className="field__error" role="alert">
                  <Icon name="alert" size={13} />
                  {errors._}
                </p>
              ) : null}

              <div className="composer__actions">
                <button type="button" className="btn" onClick={onClose} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? 'Saving…' : initial ? 'Save changes' : 'Add to the desk'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default IntentionComposer;
