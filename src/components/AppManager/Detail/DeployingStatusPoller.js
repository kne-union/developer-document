import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_MS = 90000;

/** status === deploying 时轮询 reload，直到变为终态或超时 */
const DeployingStatusPoller = ({ status, reload }) => {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (status !== 'deploying' || typeof reloadRef.current !== 'function') {
      return undefined;
    }
    const startedAt = Date.now();
    const tick = () => {
      if (Date.now() - startedAt > POLL_MAX_MS) {
        return;
      }
      reloadRef.current();
    };
    const timer = setInterval(tick, POLL_INTERVAL_MS);
    // 稍后再拉一次，避免与刚完成的 onSuccess reload 挤在一起
    const first = setTimeout(tick, 600);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, [status]);

  return null;
};

export default DeployingStatusPoller;
