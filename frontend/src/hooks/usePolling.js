import { useEffect, useRef } from 'react';

export const usePolling = (callback, intervalMs = 10000, enabled = true) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !intervalMs) return;

    savedCallback.current();

    const timerId = setInterval(() => {
      savedCallback.current();
    }, intervalMs);

    return () => clearInterval(timerId);
  }, [intervalMs, enabled]);
};

export default usePolling;
