import { useState, useEffect } from 'react';

export const useRelativeTime = (timestamp) => {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!timestamp) return;

    const update = () => {
      const now = Date.now();
      const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
      setSecondsAgo(Math.max(0, Math.floor((now - time) / 1000)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return secondsAgo;
};

export default useRelativeTime;
