import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|blackberry|android.*mobile|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getOrCreateSessionId(): string {
  const key = 'pinlly_visitor_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function useVisitorTracking() {
  const location = useLocation();
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendHeartbeat = (page: string) => {
    const payload = {
      sessionId: sessionIdRef.current,
      page,
      device: getDeviceType(),
      startTime: startTimeRef.current,
      userAgent: navigator.userAgent,
      referrer: document.referrer || '',
      language: navigator.language || 'en',
      screenWidth: window.screen.width,
    };

    // Use sendBeacon for reliability, fall back to fetch
    const data = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon('/api/visitors/heartbeat', blob);
    } else {
      fetch('/api/visitors/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
      }).catch(() => {/* silent */});
    }
  };

  useEffect(() => {
    const page = location.pathname;

    // Send immediately on page change
    sendHeartbeat(page);

    // Then every 15 seconds
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => sendHeartbeat(page), 15_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [location.pathname]);

  // Send final heartbeat on tab close
  useEffect(() => {
    const handleUnload = () => sendHeartbeat(location.pathname);
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [location.pathname]);
}
