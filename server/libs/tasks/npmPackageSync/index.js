const loadNpmInfo = require('@kne/load-npm-info');
const { withRetry } = require('../../utils/retry');

const runner = async (fastify, options, { task, polling, updateProgress, log }) => {
  const { models, services } = fastify.project;
  const targetVersion = task.input?.version || null;

  const where = task.targetId === 'all' ? {} : { id: task.targetId };
  const packages = await models.npmPackage.findAll({ where });

  if (packages.length === 0) {
    return {
      success: true,
      message: '没有需要同步的 npm 包'
    };
  }

  const results = [];
  const total = packages.length;

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    updateProgress(Math.round(((i + 1) / total) * 100));

    try {
      log({ data: { packageName: pkg.packageName, registry: pkg.registry, targetVersion }, message: `正在获取 ${pkg.packageName} 的信息` });

      const npmInfo = await withRetry(() => loadNpmInfo(pkg.packageName, { registry: pkg.registry }), {
        retries: 3,
        delays: [2000, 5000, 10000]
      });

      const latestVersion = npmInfo.version;
      const indexVersion = targetVersion || latestVersion;

      await services.npmPackage.deployExamples({ id: pkg.id });

      await pkg.update({
        latestVersion,
        readme: npmInfo.readme,
        distTags: npmInfo.distTags,
        versions: npmInfo.versions,
        description: pkg.description || npmInfo.description || (npmInfo.readme ? npmInfo.readme.slice(0, 1000) : null),
        keywords: Array.isArray(npmInfo.keywords) && npmInfo.keywords.length > 0 ? npmInfo.keywords : pkg.keywords || []
      });

      let indexOk = false;
      if (npmInfo.readme) {
        try {
          await services.documentIndex.buildFromNpmPackage({
            packageName: pkg.packageName,
            version: indexVersion,
            registry: pkg.registry
          });
          indexOk = true;
          log({ data: { packageName: pkg.packageName, indexVersion }, message: '文档索引构建成功' });
        } catch (indexError) {
          log({ data: { error: indexError.message }, message: `文档索引构建失败: ${pkg.packageName}` });
        }
      } else {
        log({ data: { packageName: pkg.packageName }, message: '无 README，跳过文档索引' });
      }

      results.push({
        packageName: pkg.packageName,
        success: true,
        latestVersion,
        indexVersion,
        indexOk
      });

      log({ data: { packageName: pkg.packageName, latestVersion, indexOk }, message: '同步成功' });
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      log({ data: { error: error.message }, message: `同步 ${pkg.packageName} 失败` });
      results.push({
        packageName: pkg.packageName,
        success: false,
        indexOk: false,
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const indexFailCount = results.filter(r => r.success && r.indexOk === false).length;

  return {
    success: true,
    message: `同步完成：成功 ${successCount} 个，失败 ${failCount} 个，索引失败 ${indexFailCount} 个`,
    total: packages.length,
    successCount,
    failCount,
    indexFailCount,
    results
  };
};

module.exports = runner;
