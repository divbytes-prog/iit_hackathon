import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import './auth.css';

const COPY = {
  login: {
    eyebrow: 'Welcome back',
    title: 'The lamp is still on',
    lede: 'Sign in and pick up where you left off.',
    submit: 'Sign in',
    swapText: 'New here?',
    swapLink: 'Create an account',
    swapTo: '/register',
  },
  register: {
    eyebrow: 'First time',
    title: 'Pull up a chair',
    lede: 'Forty seconds, and then one small thing finished.',
    submit: 'Create my account',
    swapText: 'Already have an account?',
    swapLink: 'Sign in',
    swapTo: '/login',
  },
};

/**
 * Sign in and sign up, sharing one form.
 *
 * Client validation exists to give an instant answer, not to be the gate — the
 * API re-checks everything. Server field errors are merged into the same
 * `errors` map so a message about a taken email appears under the email input
 * exactly like a local one would.
 */
const Auth = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const toast = useToast();
  const firstField = useRef(null);

  const copy = COPY[mode];
  const isRegister = mode === 'register';

  useDocumentTitle(
    isRegister ? 'Create an account' : 'Sign in',
    isRegister
      ? 'Create a free Hearthlog account and turn your everyday intentions into a progression system.'
      : 'Sign in to Hearthlog and pick up your streak where you left off.'
  );

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setErrors({});
    firstField.current?.focus();
  }, [mode]);

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined, _: undefined }));
  };

  const validate = () => {
    const next = {};

    if (isRegister && form.username.trim().length < 2) {
      next.username = 'At least two characters, please.';
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      next.email = 'That does not look like an email address.';
    }
    if (isRegister) {
      if (form.password.length < 8) next.password = 'Use at least 8 characters.';
      else if (!/[a-zA-Z]/.test(form.password)) next.password = 'Include at least one letter.';
      else if (!/[0-9]/.test(form.password)) next.password = 'Include at least one number.';
    } else if (!form.password) {
      next.password = 'Enter your password.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy || !validate()) return;

    setBusy(true);
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        ...(isRegister ? { username: form.username.trim() } : {}),
      };

      await (isRegister ? register(payload) : login(payload));
      toast.success(isRegister ? 'Your desk is ready.' : 'Welcome back.');
      navigate(location.state?.from?.pathname ?? '/app', { replace: true });
    } catch (error) {
      const fields = error?.fieldErrors ?? {};
      if (Object.keys(fields).length) setErrors(fields);
      else setErrors({ _: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      {/* --- the pitch, alongside --- */}
      <aside className="auth__aside" aria-hidden="true">
        <div className="auth__aside-inner">
          <span className="auth__mark">
            <Icon name="flame" size={22} />
          </span>

          <p className="auth__quote">
            “Reading a book pays off in a year. A game pays off in four seconds — which
            is why you finished the game.”
          </p>

          <ul className="auth__points">
            <li>
              <Icon name="check" size={14} />
              Experience the moment you tick the box
            </li>
            <li>
              <Icon name="check" size={14} />
              Five attributes that grow with what you do
            </li>
            <li>
              <Icon name="check" size={14} />
              Streaks, beans, and a shelf worth filling
            </li>
          </ul>
        </div>
      </aside>

      {/* --- the form --- */}
      <main className="auth__main" id="main">
        <motion.div
          className="auth__panel"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link to="/" className="auth__back">
            <Icon name="chevronLeft" size={14} />
            Hearthlog
          </Link>

          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="auth__title">{copy.title}</h1>
          <p className="auth__lede">{copy.lede}</p>

          <form className="auth__form" onSubmit={submit} noValidate>
            {isRegister ? (
              <div className="field">
                <label className="field__label" htmlFor="username">
                  What should we call you?
                </label>
                <input
                  ref={firstField}
                  id="username"
                  className="input"
                  value={form.username}
                  onChange={set('username')}
                  autoComplete="nickname"
                  placeholder="Alex"
                  maxLength={32}
                  aria-invalid={errors.username ? 'true' : undefined}
                  aria-describedby={errors.username ? 'username-err' : undefined}
                  required
                />
                {errors.username ? (
                  <p className="field__error" id="username-err">
                    <Icon name="alert" size={13} />
                    {errors.username}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="field">
              <label className="field__label" htmlFor="email">
                Email
              </label>
              <input
                ref={isRegister ? undefined : firstField}
                id="email"
                type="email"
                className="input"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                aria-invalid={errors.email ? 'true' : undefined}
                aria-describedby={errors.email ? 'email-err' : undefined}
                required
              />
              {errors.email ? (
                <p className="field__error" id="email-err">
                  <Icon name="alert" size={13} />
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="password">
                Password
              </label>

              <div className="auth__password">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
                  aria-invalid={errors.password ? 'true' : undefined}
                  aria-describedby={
                    errors.password ? 'password-err' : isRegister ? 'password-hint' : undefined
                  }
                  required
                />
                <button
                  type="button"
                  className="auth__reveal"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'moon' : 'sun'} size={15} />
                </button>
              </div>

              {errors.password ? (
                <p className="field__error" id="password-err">
                  <Icon name="alert" size={13} />
                  {errors.password}
                </p>
              ) : isRegister ? (
                <p className="field__hint" id="password-hint">
                  Eight characters or more, with at least one letter and one number.
                </p>
              ) : null}
            </div>

            {errors._ ? (
              <p className="auth__formerror" role="alert">
                <Icon name="alert" size={15} />
                {errors._}
              </p>
            ) : null}

            <button type="submit" className="btn btn--primary btn--lg auth__submit" disabled={busy}>
              {busy ? 'One moment…' : copy.submit}
            </button>
          </form>

          <p className="auth__swap">
            {copy.swapText} <Link to={copy.swapTo}>{copy.swapLink}</Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Auth;
