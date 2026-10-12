const fp = require('fastify-plugin');
const { createDevTokenAuthenticate } = require('../utils/dev-token');

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const readField = (file, name) => {
  const field = file?.fields?.[name];
  const value = Array.isArray(field) ? field[0]?.value : field?.value;
  return value == null ? '' : String(value).trim();
};

module.exports = fp(async (fastify, options) => {
  const authenticateDevToken = createDevTokenAuthenticate(fastify);

  fastify.post(
    `${options.prefix}/app-package/upload`,
    {
      onRequest: [authenticateDevToken, fastify.account.authenticate.admin],
      schema: {
        summary: '上传应用部署包（长期令牌，管理员）：存入文件管理「应用中心/{name}」并返回 fileId，供版本上传使用',
        query: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '应用 name；也可作为 multipart 字段在 file 之前传入' },
            version: { type: 'string', description: '版本号，仅用于文件命名' }
          }
        }
      }
    },
    async request => {
      if (!fastify.appManager) {
        throw httpError(400, '应用中心未启用');
      }
      const file = await request.file();
      if (!file) {
        throw httpError(400, '缺少上传文件');
      }
      const name = request.query.name || readField(file, 'name');
      const version = request.query.version || readField(file, 'version');
      if (!name) {
        throw httpError(400, '缺少应用 name');
      }
      await fastify.appManager.services.app.detail({ name });
      const filename = version ? `${name}-${version}.zip` : file.filename || `${name}.zip`;
      const result = await fastify.fileManager.services.folder.upload({
        type: 'admin-file-system',
        path: `应用中心/${name}`,
        file: Object.assign({}, file, { filename })
      });
      return {
        fileId: String(result.file.id),
        filename: result.file.filename,
        size: result.file.size
      };
    }
  );
});
