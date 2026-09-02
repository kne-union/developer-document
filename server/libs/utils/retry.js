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

module.exports = {
  sleep,
  withRetry
};
