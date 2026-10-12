const { createProxyMiddleware } = require('http-proxy-middleware');

const LOCAL_SERVER = 'http://localhost:8061';

function isSseRequest(req) {
  const url = req.originalUrl || req.url || '';
  if (url.includes('/sse') || url.includes('/logs/stream')) return true;
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
    '/app',
    createProxyMiddleware({
      target: LOCAL_SERVER,
      changeOrigin: true
    })
  );
  // IdP 的 issuer 是前端地址（http://localhost:3040/oidc），保留 Host 让 oidc-provider 生成的 cookie / 跳转地址与 issuer 一致
  app.use(
    '/oidc',
    createProxyMiddleware({
      target: LOCAL_SERVER,
      changeOrigin: false,
      xfwd: true
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
