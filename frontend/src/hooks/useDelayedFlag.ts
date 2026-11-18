import { useEffect, useState } from "react";

/**
 * Becomes true only after `active` has stayed true for `delayMs`.
 * Used to avoid flashing UI for short events (brief disconnects, fast loads)
 * and to show the "server is starting" hint only when loading is actually slow.
 */
export const useDelayedFlag = (active: boolean, delayMs: number) => {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    if (!active) {
      setFlag(false);
      return;
    }
    const timer = setTimeout(() => setFlag(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);
  return flag;
};
