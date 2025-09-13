import { useEffect, useRef, useState } from 'react';

export function useSignalPoller<T>(fetcher: () => Promise<T>, intervalMs = 30000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | null>(null);

  async function tick() {
    try {
      const res = await fetcher();
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    tick();
    timer.current = window.setInterval(tick, intervalMs);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [intervalMs]);

  return { data, loading, refresh: tick };
}