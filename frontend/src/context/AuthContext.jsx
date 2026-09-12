import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth as authApi, character as characterApi } from '../api/endpoints.js';
import { getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

/**
 * Holds the session and the character snapshot.
 *
 * The snapshot is the single source of truth for level, XP, beans, streak and
 * attributes. Any mutation that changes them (completing an intention, buying
 * an item) returns a fresh snapshot, and callers hand it to `applySnapshot` —
 * so the header, the desk and the shelf can never disagree with each other.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authed | guest

  const [reachable, setReachable] = useState(true);

  /**
   * Restore the session on first paint.
   *
   * The two failure modes are deliberately treated differently. A 401 means
   * the session is genuinely over, so the token is cleared and the visitor
   * becomes a guest. A *network* failure means the API is unreachable — the
   * session may be perfectly valid — so signing the user out and bouncing
   * them to the login screen would lose their place over a blip. In that case
   * the stored token is kept and the app carries on in a degraded state, with
   * the offline banner explaining why nothing is saving.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await authApi.me();
        if (cancelled) return;
        setUser(data.user);
        setSnapshot(data.snapshot);
        setReachable(true);
        setStatus('authed');
      } catch (error) {
        if (cancelled) return;

        if (error.code === 'OFFLINE' && getToken()) {
          setReachable(false);
          setStatus('authed');
          return;
        }

        setToken(null);
        setStatus('guest');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Pull the real session down once the API comes back. */
  useEffect(() => {
    if (reachable) return undefined;

    const recover = async () => {
      try {
        const data = await authApi.me();
        setUser(data.user);
        setSnapshot(data.snapshot);
        setReachable(true);
      } catch {
        // Still down — the next event or interval will try again.
      }
    };

    window.addEventListener('hearthlog:online', recover);
    const timer = setInterval(recover, 15_000);

    return () => {
      window.removeEventListener('hearthlog:online', recover);
      clearInterval(timer);
    };
  }, [reachable]);

  const adopt = useCallback((data) => {
    setToken(data.accessToken ?? null);
    setUser(data.user);
    setSnapshot(data.snapshot);
    setStatus('authed');
    return data;
  }, []);

  const register = useCallback((payload) => authApi.register(payload).then(adopt), [adopt]);
  const login = useCallback((payload) => authApi.login(payload).then(adopt), [adopt]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the call fails, the local session ends.
    }
    setToken(null);
    setUser(null);
    setSnapshot(null);
    setStatus('guest');
  }, []);

  /** Merge a server-returned snapshot. Ignores nullish so callers can be lazy. */
  const applySnapshot = useCallback((next) => {
    if (!next) return;
    setSnapshot(next);
    setUser((previous) =>
      previous
        ? {
            ...previous,
            character: { ...previous.character, ...next.character },
            streak: { ...previous.streak, ...next.streak },
            preferences: { ...previous.preferences, ...next.preferences },
            unlockedThemes: next.unlockedThemes ?? previous.unlockedThemes,
            badges: next.badges ?? previous.badges,
          }
        : previous
    );
  }, []);

  /**
   * Optimistic preference save: the UI flips instantly (a theme change that
   * waits for a round trip feels broken), and rolls back if the server says no.
   */
  const savePreferences = useCallback(
    async (patch) => {
      const previous = user?.preferences;
      setUser((current) =>
        current ? { ...current, preferences: { ...current.preferences, ...patch } } : current
      );
      try {
        const data = await characterApi.savePreferences(patch);
        setUser(data.user);
        setSnapshot(data.snapshot);
        return data;
      } catch (error) {
        setUser((current) =>
          current && previous ? { ...current, preferences: previous } : current
        );
        throw error;
      }
    },
    [user?.preferences]
  );

  const value = useMemo(
    () => ({
      user,
      snapshot,
      status,
      reachable,
      isAuthed: status === 'authed',
      isLoading: status === 'loading',
      register,
      login,
      logout,
      applySnapshot,
      savePreferences,
    }),
    [user, snapshot, status, reachable, register, login, logout, applySnapshot, savePreferences]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
};

export default AuthContext;
