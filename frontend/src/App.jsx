import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import AppLayout from './components/AppLayout.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Desk from './pages/Desk.jsx';

/**
 * The four secondary pages are code-split.
 *
 * The Desk and the auth screens are what a first visit actually needs, so they
 * ship in the main chunk; the Shelf, Logbook and Settings load when someone
 * navigates to them. It keeps the initial bundle small without making the
 * common path wait on a second request.
 */
const Intentions = lazy(() => import('./pages/Intentions.jsx'));
const Shelf = lazy(() => import('./pages/Shelf.jsx'));
const Logbook = lazy(() => import('./pages/Logbook.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

/** A neutral hold while the session is being restored or a chunk is loading. */
const Holding = ({ label = 'Loading' }) => (
  <div
    style={{ display: 'grid', placeItems: 'center', minHeight: '55dvh' }}
    role="status"
    aria-live="polite"
  >
    <span className="visually-hidden">{label}</span>
    <span className="skeleton" style={{ width: 200, height: 12, borderRadius: 999 }} />
  </div>
);

/** Sends signed-out visitors to the sign-in page, remembering where they were. */
const Protected = ({ children }) => {
  const { isAuthed, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Holding label="Checking your session" />;
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};

/** Keeps signed-in visitors out of the marketing and auth pages. */
const GuestOnly = ({ children }) => {
  const { isAuthed, isLoading } = useAuth();
  if (isLoading) return <Holding label="Checking your session" />;
  if (isAuthed) return <Navigate to="/app" replace />;
  return children;
};

const App = () => {
  const { user } = useAuth();
  const location = useLocation();

  /**
   * Apply the character's chosen record (theme) and motion preference to the
   * document element, where the CSS expects them.
   */
  useEffect(() => {
    const root = document.documentElement;
    const theme = user?.preferences?.theme;

    if (theme && theme !== 'daylight') root.dataset.theme = theme;
    else delete root.dataset.theme;

    if (user?.preferences?.reducedMotion) root.dataset.motion = 'reduced';
    else delete root.dataset.motion;
  }, [user?.preferences?.theme, user?.preferences?.reducedMotion]);

  /** Scroll to the top on navigation — the browser does not for a SPA. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <Suspense fallback={<Holding />}>
      <Routes>
        <Route
          path="/"
          element={
            <GuestOnly>
              <Landing />
            </GuestOnly>
          }
        />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Auth mode="login" />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <Auth mode="register" />
            </GuestOnly>
          }
        />

        <Route
          path="/app"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<Desk />} />
          <Route path="intentions" element={<Intentions />} />
          <Route path="shelf" element={<Shelf />} />
          <Route path="logbook" element={<Logbook />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default App;
