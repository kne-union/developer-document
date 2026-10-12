const crypto = require('node:crypto');

// 本地开发时前端 dev server（craco，端口 3040）代理 /api、/oidc、/app 到后端，对外地址以前端为准
const LOCAL_ORIGIN = 'http://localhost:3040';

const resolveOidcOptions = config => {
  const origin = (config.ORIGIN || (config.ENV === 'local' ? LOCAL_ORIGIN : '')).replace(/\/+$/, '');
  if (!origin) {
    throw new Error('缺少环境变量 ORIGIN：本系统对外访问地址（如 https://doc.example.com），OIDC 认证依赖它生成 issuer 与回调地址');
  }
  const keySecret = config.OIDC_KEY_SECRET || undefined;
  const derive = label =>
    crypto
      .createHmac('sha256', keySecret || 'developer-document-insecure-key')
      .update(label)
      .digest('base64url');
  const serviceClientId = config.OIDC_SERVICE_CLIENT_ID;
  return {
    origin,
    issuer: `${origin}/oidc`,
    audience: `${origin}/api`,
    serviceAudience: `${origin}/api/oidc`,
    devTokenAudience: `${origin}/api/dev-token`,
    keySecret,
    serviceClient: {
      clientId: serviceClientId,
      // 未配置时由 OIDC_KEY_SECRET 派生；client 只在首次启动时登记，之后修改需在认证管理里重置 secret
      clientSecret: config.OIDC_SERVICE_CLIENT_SECRET || derive(`service-client:${serviceClientId}`)
    }
  };
};

module.exports = resolveOidcOptions;
