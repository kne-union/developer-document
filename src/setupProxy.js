const { createProxyMiddleware } = require('http-proxy-middleware');

const LOCAL_SERVER = 'http://localhost:8061';

function isSseRequest(req) {
  const url = req.originalUrl || req.url || '';
  if (url.includes('/sse')) return true;
  const accept = req.headers.accept;
  return accept && String(accept).includes('text/event-stream');
}

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: LOCAL_SERVER,
      changeOrigin: true,
      // SSE 长连接（任务/消息统计等）需放宽超时，避免 dev proxy 提前断开
      timeout: 30 * 60 * 1000,
      proxyTimeout: 30 * 60 * 1000,
      on: {
        proxyReq(proxyReq, req) {
          if (!isSseRequest(req)) return;

          const abortUpstream = () => {
            if (proxyReq.destroyed) return;
            proxyReq.destroy();
          };

          req.once('aborted', abortUpstream);
          req.once('close', abortUpstream);
          req.socket?.once('close', abortUpstream);
        }
      }
    })
  );
  app.use(
    '/@kne-components',
    createProxyMiddleware({
      target: LOCAL_SERVER,
      changeOrigin: true
    })
  );
};
