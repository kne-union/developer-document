const runner = async (fastify, options, { task, polling, updateProgress, log }) => {
  const { models, services } = fastify.project;

  // 获取需要部署的远程组件
  // 如果 task.targetId 是 'all'，则部署所有有 packageName 的组件，否则部署指定的组件
  const where = task.targetId === 'all' ? { packageName: { [fastify.sequelize.Sequelize.Op.ne]: null } } : { id: task.targetId };

  const components = await models.remoteComponent.findAll({ where });

  if (components.length === 0) {
    return {
      success: true,
      message: '没有需要部署的远程组件'
    };
  }

  const results = [];
  const total = components.length;

  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    updateProgress(Math.round(((i + 1) / total) * 100));

    try {
      log({ data: { remote: component.remote, packageName: component.packageName }, message: `正在部署 ${component.remote}` });

      await services.remoteComponent.deployComponents({ id: component.id });

      results.push({
        remote: component.remote,
        packageName: component.packageName,
        success: true
      });

      log({ data: { remote: component.remote }, message: '部署成功' });

      // 避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      log({ data: { error: error.message }, message: `部署 ${component.remote} 失败` });
      results.push({
        remote: component.remote,
        packageName: component.packageName,
        success: false,
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return {
    success: true,
    message: `部署完成：成功 ${successCount} 个，失败 ${failCount} 个`,
    total: components.length,
    successCount,
    failCount,
    results
  };
};

module.exports = runner;
