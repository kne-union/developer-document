const loadNpmInfo = require('@kne/load-npm-info');

const runner = async (fastify, options, { task, polling, updateProgress, log }) => {
  const { models, services } = fastify.project;

  // 获取需要同步的 npm 包
  // 如果 task.targetId 是 'all'，则同步所有包，否则同步指定的包
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
      log({ data: { packageName: pkg.packageName, registry: pkg.registry }, message: `正在获取 ${pkg.packageName} 的信息` });

      // 使用支持自定义 registry 的方法获取包信息
      const npmInfo = await loadNpmInfo(pkg.packageName, { registry: pkg.registry });

      // 获取最新版本
      const latestVersion = npmInfo.version;

      await services.npmPackage.deployExamples({ id: pkg.id });

      // 更新数据库
      await pkg.update({
        latestVersion,
        readme: npmInfo.readme,
        distTags: npmInfo.distTags,
        versions: npmInfo.versions,
        description: pkg.description || (npmInfo.readme ? npmInfo.readme.slice(0, 1000) : null),
        keywords: pkg.keywords?.length > 0 ? pkg.keywords : []
      });

      results.push({
        packageName: pkg.packageName,
        success: true,
        latestVersion
      });

      log({ data: { packageName: pkg.packageName, latestVersion }, message: '同步成功' });

      // 避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      log({ data: { error: error.message }, message: `同步 ${pkg.packageName} 失败` });
      results.push({
        packageName: pkg.packageName,
        success: false,
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return {
    success: true,
    message: `同步完成：成功 ${successCount} 个，失败 ${failCount} 个`,
    total: packages.length,
    successCount,
    failCount,
    results
  };
};

module.exports = runner;
