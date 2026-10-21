const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ retries?: number, delays?: number[] }} [options]
 * @returns {Promise<T>}
 */
const withRetry = async (fn, { retries = 3, delays = [2000, 5000, 10000] } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        break;
      }
      await sleep(delays[attempt] ?? delays[delays.length - 1]);
    }
  }
  throw lastError;
};

const VERSION_RETRY_INITIAL_DELAY = 60;
const VERSION_RETRY_MAX_DELAY = 24 * 60 * 60;

/**
 * 目标版本未就绪时下一次重试的等待秒数（指数退避，封顶一天）；已按封顶等待过仍失败则返回 null，不再重试
 * @param {number} [prevDelay] 上一次重试的等待秒数，首次为空
 * @returns {number|null}
 */
const nextVersionRetryDelay = prevDelay => {
  if (!prevDelay || prevDelay <= 0) {
    return VERSION_RETRY_INITIAL_DELAY;
  }
  if (prevDelay >= VERSION_RETRY_MAX_DELAY) {
    return null;
  }
  return Math.min(prevDelay * 2, VERSION_RETRY_MAX_DELAY);
};

module.exports = {
  sleep,
  withRetry,
  nextVersionRetryDelay
};
