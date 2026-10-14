import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 10 * 60 * 1000;

/** 部署进行中时轮询 reload（准备部署包阶段 status 仍是旧值，需同时看 deployment），直到结束或超时 */
const DeployingStatusPoller = ({ active, reload }) => {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!active || typeof reloadRef.current !== 'function') {
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
  }, [active]);

  return null;
};

export default DeployingStatusPoller;
