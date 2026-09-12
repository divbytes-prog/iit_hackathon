import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { useCountUp } from '../hooks/useCountUp.js';
import './app-layout.css';

const NAV = [
  { to: '/app', label: 'Desk', icon: 'desk', end: true },
  { to: '/app/intentions', label: 'Intentions', icon: 'scroll' },
  { to: '/app/shelf', label: 'The Shelf', icon: 'shelf' },
  { to: '/app/logbook', label: 'Logbook', icon: 'clock' },
];

/**
 * The frame every signed-in page sits in.
 *
 * On desktop the navigation is a horizontal rail in the header; below 720px it
 * becomes a fixed bottom bar with 48px targets, because a nav tucked behind a
 * hamburger on a productivity app you open twenty times a day is a tax.
 */
const AppLayout = () => {
  const { user, snapshot, logout, reachable } = useAuth();
  // Two sources: the browser's own connectivity, and whether our API actually
  // answered. Either being false means writes will not land.
  const online = useOnlineStatus() && reachable;
  const location = useLocation();

  const beans = useCountUp(snapshot?.character?.beans ?? 0);
  const level = snapshot?.character?.level ?? 1;
  const streak = snapshot?.streak?.current ?? 0;
  const streakLit = snapshot?.streak?.state === 'lit';

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="appbar">
        <div className="appbar__inner shell">
          <NavLink to="/app" className="appbar__brand" aria-label="Hearthlog, go to the desk">
            <span className="appbar__mark" aria-hidden="true">
              <Icon name="flame" size={17} />
            </span>
            <span className="appbar__word">Hearthlog</span>
          </NavLink>

          <nav className="appbar__nav" aria-label="Sections">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `appbar__link ${isActive ? 'appbar__link--on' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                    {isActive ? (
                      <motion.span
                        layoutId="nav-underline"
                        className="appbar__underline"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="appbar__stats">
            <span className="appbar__stat" title={`Chapter ${level}`}>
              <span className="appbar__stat-key">Ch.</span>
              <span className="numeral">{level}</span>
            </span>

            <span className="appbar__stat appbar__stat--beans" title={`${beans} beans`}>
              <Icon name="bean" size={14} />
              <span className="numeral">{beans}</span>
              <span className="visually-hidden">beans</span>
            </span>

            <span
              className={`appbar__stat appbar__stat--streak ${streakLit ? 'is-lit' : ''}`}
              title={`${streak} day streak`}
            >
              <Icon name="flame" size={14} />
              <span className="numeral">{streak}</span>
              <span className="visually-hidden">day streak</span>
            </span>
          </div>

          <div className="appbar__account">
            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                `btn btn--ghost btn--icon ${isActive ? 'appbar__link--on' : ''}`
              }
              aria-label="Settings"
            >
              <Icon name="settings" size={17} />
            </NavLink>

            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={logout}
              aria-label={`Sign out of ${user?.username ?? 'your account'}`}
              title="Sign out"
            >
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </header>

      {!online ? (
        <div className="offline" role="status">
          <Icon name="alert" size={14} />
          Cannot reach the kitchen — changes will not be saved until the connection
          returns.
        </div>
      ) : null}

      <main id="main" className="app__main" tabIndex={-1} key={location.pathname}>
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Sections">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `tabbar__link ${isActive ? 'tabbar__link--on' : ''}`}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/app/settings"
          className={({ isActive }) => `tabbar__link ${isActive ? 'tabbar__link--on' : ''}`}
        >
          <Icon name="settings" size={19} />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default AppLayout;
