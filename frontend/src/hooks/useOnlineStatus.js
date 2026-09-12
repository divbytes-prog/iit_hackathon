import { useEffect, useState } from 'react';

/**
 * Browser connectivity.
 *
 * `navigator.onLine` only knows about the network interface, not whether the
 * API is actually reachable — so the app also flips this false when a request
 * throws a NetworkError, via the `hearthlog:offline` event.
 */
export const useOnlineStatus = () => {
  const [online, setOnline] = useState(() => navigator.onLine ?? true);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('hearthlog:offline', goOffline);
    window.addEventListener('hearthlog:online', goOnline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('hearthlog:offline', goOffline);
      window.removeEventListener('hearthlog:online', goOnline);
    };
  }, []);

  return online;
};

export default useOnlineStatus;
