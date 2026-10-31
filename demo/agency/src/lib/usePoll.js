import { useEffect, useRef } from "react";

// Calls `fn` every `ms` while the tab is visible, and right away when the
// person comes back to the tab. Replaces the socket server: the API is asked
// for news on a short interval instead of pushing it, which works on any host.
export default function usePoll(fn, ms, enabled = true) {
  const latest = useRef(fn);
  latest.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let timer = null;
    const tick = () => {
      if (document.visibilityState === "visible") latest.current();
    };
    const start = () => {
      clearInterval(timer);
      timer = setInterval(tick, ms);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        latest.current();
        start();
      } else {
        clearInterval(timer);
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [ms, enabled]);
}
